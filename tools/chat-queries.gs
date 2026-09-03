/**
 * Open-query ledger for the DA dashboard.
 *
 * Reads Zalo conversations from a "Chat log" sheet, asks Claude which
 * customer messages are real questions or requests, logs each one as an
 * open query, and keeps tracking the thread until a real answer lands.
 * A DA saying "để em kiểm tra" does not close a query: it marks it
 * promised and starts a clock. A customer asking again marks it chased.
 *
 * Sheets (created by setup()):
 *   Chat log  Thread | Time | Sender | Text | Clinic | DA | Zalo tag
 *             Sender is "customer" or "da". One row per message, any
 *             order. Paste the Salework / Zalo OA export here, or feed
 *             it from a webhook. Phone numbers should be stripped first.
 *   Queries   one row per query, written by this script. Status can be
 *             edited by hand (e.g. set to "resolved" after a phone call,
 *             or "dismissed" if it was not a real question).
 *
 * Setup (once):
 *   1. Make a Google Sheet, Extensions -> Apps Script, paste this file.
 *   2. Project settings -> Script properties: add ANTHROPIC_API_KEY.
 *      Set TOKEN below to match QUERIES.token in the dashboard.
 *   3. Run setup() once (creates the sheets), then scan() by hand to test.
 *   4. Triggers -> add a time-driven trigger: scan() every 15 minutes.
 *   5. Deploy -> Web app (execute as me, anyone) and put the /exec URL
 *      into QUERIES.url in index.html. The page then shows each DA's
 *      open queries.
 *
 * Cost: only threads with new messages are sent, with their last
 * MAX_MESSAGES messages and that thread's open queries. At a few hundred
 * active threads a day this is a few dollars a day on Claude Opus 5.
 */

var TOKEN = "change-me";            /* must match QUERIES.token in index.html */
var MODEL = "claude-opus-5";
var MAX_MESSAGES = 40;              /* context sent per thread */
var SHEET_LOG = "Chat log", SHEET_Q = "Queries";
var CATEGORIES = ["price", "delivery", "appointment", "usage", "complaint", "product", "other"];
var STATUSES = ["open", "promised", "chased", "resolved", "dismissed"];
var Q_HEADERS = ["ID", "Thread", "Zalo tag", "Clinic", "DA", "Asked at", "Category", "Query",
                 "Status", "Promised at", "Chased", "Resolved at", "Response hours", "Last update", "Confidence", "Evidence"];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
  if (log.getLastRow() === 0) log.appendRow(["Thread", "Time", "Sender", "Text", "Clinic", "DA", "Zalo tag"]);
  var q = ss.getSheetByName(SHEET_Q) || ss.insertSheet(SHEET_Q);
  if (q.getLastRow() === 0) q.appendRow(Q_HEADERS);
  q.setFrozenRows(1); log.setFrozenRows(1);
}

/* ---------------- scan: new messages -> Claude -> Queries sheet ---------------- */
function scan() {
  var props = PropertiesService.getScriptProperties();
  var since = props.getProperty("lastScan") || "1970-01-01T00:00:00Z";
  var started = new Date().toISOString();
  var threads = readLog();
  var queries = readQueries();
  var touched = 0;

  Object.keys(threads).forEach(function (tid) {
    var msgs = threads[tid];
    var hasNew = msgs.some(function (m) { return m.time > since; });
    if (!hasNew) return;
    var open = queries.filter(function (q) { return q.thread === tid && (q.status === "open" || q.status === "promised" || q.status === "chased"); });
    var recent = msgs.slice(-MAX_MESSAGES);
    var out = classifyThread(recent, open);
    if (!out) return;
    var last = msgs[msgs.length - 1];

    out.updates.forEach(function (u) {
      var q = open.filter(function (x) { return x.id === u.id; })[0];
      if (!q || q.status === u.status) return;
      var at = recent[u.message_index] ? recent[u.message_index].time : last.time;
      q.status = u.status; q.evidence = u.evidence || ""; q.lastUpdate = at;
      if (u.status === "promised" && !q.promisedAt) q.promisedAt = at;
      if (u.status === "chased") q.chased = (q.chased || 0) + 1;
      if (u.status === "resolved") { q.resolvedAt = at; q.responseHours = hoursBetween(q.askedAt, at); }
    });
    out.new_queries.forEach(function (n) {
      if (!n.query) return;
      var m = recent[n.message_index] || last;
      if (m.time <= since) return;            /* already seen in an earlier scan */
      var dup = queries.some(function (q) { return q.thread === tid && q.query === n.query && q.status !== "resolved" && q.status !== "dismissed"; });
      if (dup) return;
      queries.push({
        id: Utilities.getUuid().slice(0, 8), thread: tid, tag: last.tag, clinic: last.clinic, da: last.da,
        askedAt: m.time, category: CATEGORIES.indexOf(n.category) === -1 ? "other" : n.category, query: n.query,
        status: "open", promisedAt: "", chased: 0, resolvedAt: "", responseHours: "", lastUpdate: m.time,
        confidence: n.confidence || "medium", evidence: n.evidence || ""
      });
    });
    touched++;
  });

  writeQueries(queries);
  props.setProperty("lastScan", started);
  Logger.log("scan: " + touched + " threads updated, " + queries.length + " queries in ledger");
}

/* One thread -> {new_queries, updates}. Returns null on refusal or error
   so the thread is retried on the next scan. */
function classifyThread(msgs, open) {
  var lines = msgs.map(function (m, i) {
    return "[" + i + "] " + m.time + " " + (m.sender === "da" ? "CLINIC" : "CUSTOMER") + ": " + m.text.replace(/\s+/g, " ").trim();
  }).join("\n");
  var openTxt = open.length
    ? open.map(function (q) { return "- id " + q.id + " (" + q.status + ", asked " + q.askedAt + "): " + q.query; }).join("\n")
    : "(none)";

  var system = [
    "You read Zalo customer-service conversations for an eye clinic. Messages are mostly Vietnamese.",
    "Your job is to keep a ledger of the customer's open queries: things the customer asked or requested that need an answer or an action from the clinic.",
    "A query is a real question or request: price, delivery date, appointment, how to use a product, a complaint, a product question, or anything else that needs a reply.",
    "Not a query: greetings, thanks, acknowledgements, emoji, the customer answering the clinic's question, or small talk.",
    "For each currently open query, decide from the newer messages whether it is now:",
    "- resolved: the clinic gave an actual answer or confirmed the action (not just 'let me check').",
    "- promised: the clinic said it would check / call back / get back later, and has not yet answered.",
    "- chased: the customer asked again or asked for an update while it was still unanswered.",
    "- open: nothing changed.",
    "Only report an update when the status changes. Quote the message index that justifies it.",
    "Paraphrase each new query in one short sentence in the customer's language. Do not invent details."
  ].join("\n");
  var user = "OPEN QUERIES:\n" + openTxt + "\n\nCONVERSATION (oldest first, index in brackets):\n" + lines;

  var schema = {
    type: "object",
    properties: {
      new_queries: { type: "array", items: { type: "object", properties: {
        query: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
        message_index: { type: "integer" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        evidence: { type: "string" }
      }, required: ["query", "category", "message_index", "confidence", "evidence"], additionalProperties: false } },
      updates: { type: "array", items: { type: "object", properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["open", "promised", "chased", "resolved"] },
        message_index: { type: "integer" },
        evidence: { type: "string" }
      }, required: ["id", "status", "message_index", "evidence"], additionalProperties: false } }
    },
    required: ["new_queries", "updates"],
    additionalProperties: false
  };
  return callClaude(system, user, schema);
}

/* Raw HTTP to the Messages API (Apps Script has no SDK). Structured
   output guarantees the JSON shape; fallbacks: "default" re-runs a
   classifier decline on another model server-side. */
function callClaude(system, user, schema) {
  var key = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!key) throw new Error("Set ANTHROPIC_API_KEY in Script properties");
  var body = {
    model: MODEL,
    max_tokens: 4000,
    fallbacks: "default",
    system: system,
    messages: [{ role: "user", content: user }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: schema } }
  };
  var res = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" },
    payload: JSON.stringify(body)
  });
  var code = res.getResponseCode(), txt = res.getContentText();
  if (code !== 200) { Logger.log("Claude HTTP " + code + ": " + txt.slice(0, 300)); return null; }
  var j = JSON.parse(txt);
  if (j.stop_reason === "refusal") { Logger.log("Claude declined this thread"); return null; }
  if (j.stop_reason === "max_tokens") { Logger.log("Claude output truncated"); return null; }
  var text = (j.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
  try { return JSON.parse(text); } catch (e) { Logger.log("Bad JSON: " + text.slice(0, 200)); return null; }
}

/* ---------------- sheets ---------------- */
function readLog() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
  var v = sh.getDataRange().getValues(), threads = {};
  for (var r = 1; r < v.length; r++) {
    var row = v[r]; if (!row[0] || !row[3]) continue;
    var t = iso(row[1]);
    (threads[String(row[0])] = threads[String(row[0])] || []).push({
      time: t, sender: /^(da|clinic|agent|staff)$/i.test(String(row[2])) ? "da" : "customer",
      text: String(row[3]), clinic: String(row[4] || ""), da: String(row[5] || ""), tag: String(row[6] || row[0])
    });
  }
  Object.keys(threads).forEach(function (k) { threads[k].sort(function (a, b) { return a.time < b.time ? -1 : 1; }); });
  return threads;
}
function readQueries() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_Q);
  var v = sh.getDataRange().getValues(), out = [];
  for (var r = 1; r < v.length; r++) {
    var x = v[r]; if (!x[0]) continue;
    out.push({ id: String(x[0]), thread: String(x[1]), tag: String(x[2]), clinic: String(x[3]), da: String(x[4]),
      askedAt: iso(x[5]), category: String(x[6]), query: String(x[7]), status: String(x[8] || "open").toLowerCase(),
      promisedAt: iso(x[9]), chased: +x[10] || 0, resolvedAt: iso(x[11]), responseHours: x[12] === "" ? "" : +x[12],
      lastUpdate: iso(x[13]), confidence: String(x[14] || ""), evidence: String(x[15] || "") });
  }
  return out;
}
function writeQueries(qs) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_Q);
  var rows = qs.map(function (q) { return [q.id, q.thread, q.tag, q.clinic, q.da, q.askedAt, q.category, q.query,
    q.status, q.promisedAt, q.chased, q.resolvedAt, q.responseHours, q.lastUpdate, q.confidence, q.evidence]; });
  sh.clearContents();
  sh.getRange(1, 1, 1, Q_HEADERS.length).setValues([Q_HEADERS]);
  if (rows.length) sh.getRange(2, 1, rows.length, Q_HEADERS.length).setValues(rows);
}
function iso(v) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString();
  if (typeof v === "number" && v > 30000 && v < 60000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString();
  var s = String(v || "").trim(); if (!s) return "";
  var d = new Date(s); return isNaN(d) ? s : d.toISOString();
}
function hoursBetween(a, b) { var x = Date.parse(a), y = Date.parse(b); return (isNaN(x) || isNaN(y)) ? "" : Math.round((y - x) / 36e5 * 10) / 10; }

/* ---------------- web app: the dashboard reads this ---------------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (TOKEN && p.token !== TOKEN) return out({ error: "forbidden" });
  var cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
  var qs = readQueries().filter(function (q) { return q.status !== "dismissed" && (q.status !== "resolved" || q.resolvedAt >= cutoff); });
  return out({ generated: new Date().toISOString(), queries: qs.map(function (q) {
    return { id: q.id, tag: q.tag, clinic: q.clinic, da: q.da, askedAt: q.askedAt, category: q.category, query: q.query,
      status: q.status, promisedAt: q.promisedAt, chased: q.chased, resolvedAt: q.resolvedAt, responseHours: q.responseHours };
  }) });
}
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* Run from the editor: shows what one scan would send for the first thread. */
function test() {
  var threads = readLog(), ids = Object.keys(threads);
  if (!ids.length) { Logger.log("Chat log is empty"); return; }
  var r = classifyThread(threads[ids[0]].slice(-MAX_MESSAGES), []);
  Logger.log(JSON.stringify(r, null, 2));
}
