/**
 * DA Zalo Dashboard — Apps Script web app.
 *
 * The page (zalo/) holds no data and no secret. Every call carries the username and the
 * SHA-256 of the password; this script holds the reference hash, reads the CRM workbook and
 * writes to it. See zalo/README.md §2.8 (API), §2.10 (deployment).
 *
 * Deploy once: script.google.com → New project → paste this file → fill CLINICS and PW_HASHES
 * → run setup() from the editor → Deploy → New deployment → Web app, execute as Me, access
 * Anyone → copy the /exec URL into API.url at the top of zalo/app.js.
 * After editing: Deploy → Manage deployments → Edit → Version: New version.
 *
 * Reviewers (1.4.0): a username listed in REVIEWERS signs in on the same page and gets the QA
 * audit view instead of the DA's task list. The reviewer path only READS the clinics' CRM
 * workbooks (never ensureTabs, never a write there); everything a reviewer records goes to the
 * reviewer's own tracker workbook (tabs created by ensureTracker) and screenshots to Drive.
 * See zalo/README.md §2.14. After adding this section, run setupReviewer() once from the
 * editor (it asks for the Drive permission the screenshots need), then publish a new version.
 *
 * Head office (1.6.0): a username listed in HO_USERS gets the same tracker in review mode: it
 * takes a week the reviewer completed, corrects ticks and the Vietnamese wording the DA will
 * read (the reviewer's originals are never overwritten; every change is logged), publishes it
 * with the approver's name, or sends it back with a note. Remarks are translated zh / en / vi
 * through the Claude API (key in Script properties, ANTHROPIC_API_KEY; see setAnthropicKey)
 * with Google Translate as the fallback. Run testTranslation() once from the editor so the
 * script gets the external-request permission before you publish the new version.
 */

var CLINICS = {
  /* clinic code → the CRM workbook and its Membership tab */
  "NGT": { id: "1IdKCJ58wJHrjFkaQmnTKwPo3rWtAvAA3CUYRkH_4IJI", sheet: "Membership_NGT" }
};
/* Usernames are matched without regard to case (the keys here are upper case). */
var USERS = { "NGT_DA": "NGT", "NGT_DA1": "NGT" };    /* username → clinic; only names listed here can sign in (NGT_DA1 kept as an alias) */
/* QA reviewers: username → own password hash and, per clinic they audit, their tracker workbook. */
var REVIEWERS = {
  "CHENGYF": { name: "ChengYF", hash: "105741eec6f7b596060f6d8c3f6be260d63b0a7490f5bb6317617fa9f0971207",
               clinics: { "NGT": "1ki5FZBdnNDM83S5kYSKYk2uLVuSEoMa3559y4Av7OG8" } }
};
/* Head office: username → name, own password hash and, when the login belongs to one person, the
   name to preselect in "approved by". One shared login (OptoHO) leaves `approver` empty, so Publish
   asks every time. HO sees every clinic that has a reviewer tracker (REVIEWERS) in review mode. */
var HO_USERS = {
  "OPTOHO": { name: "OptoHO", hash: "602c1f796dd1597b4a92ad0bd7bf6cc4d2f69e004f29758a5ad5cba9d417e648", approver: "" }
};
var HO_APPROVERS = ["SL", "Anh"];   /* the names offered at Publish to DA, plus "Other" with a typed name */
/* sha256 of the DA password. Several are accepted during a changeover; remove the old one once everyone is on the new password. */
var PW_HASHES = ["48a495c2722686b5907a142bf3009e12856f690280cd0e37e91497fdeb597075",   /* Tasklist_456 */
                 "d006b3f546ac914c34dfc209ad535ea530f32a1e8e0ae822ea049b3a783e4d20"];  /* the password in use before 1.6.1 */
var TZ = "Asia/Ho_Chi_Minh";
var CADENCE_SHEET = "Cadence (VN)";
var TABS = { tasks: "DA_Tasks", imports: "DA_Imports", details: "DA_Details", settings: "DA_Settings", log: "DA_Log" };
var HEADERS = {
  DA_Tasks:    ["key", "clinic", "da", "stage", "due", "bits", "score", "sent_at", "undone_at", "note"],
  DA_Imports:  ["code", "clinic", "uploaded_at", "uploaded_by", "deposit", "appointment", "status", "name", "phone", "patient_code", "lens", "product", "state", "result", "last_seen", "collected", "note"],
  DA_Details:  ["key", "clinic", "parent_name", "relation", "gender", "pending_tag", "updated_at", "updated_by"],
  DA_Settings: ["key", "value", "note"],
  DA_Log:      ["at", "by", "action", "key", "row", "cell", "old", "new"]
};
var SETTINGS_DEFAULT = [
  ["go_live", "2026-10-16", "Milestones due before this date are never shown or counted."],
  ["import_cutoff", "2026-07-20", "Uploaded QK orders placed before this date are ignored."],
  ["late_grace_weeks", "1", "Weeks a low-touch (mass send) item stays in its group after its week, before it counts as missed."],
  ["overdue_fold_days", "14", "Overdue items older than this fold behind a button."],
  ["week_start", "Mon", "First day of the task week."]
];
/* Membership_NGT columns (1-based). Formula columns (A, D, P–U, W–AH) are never written. */
var COL = { stt: 1, friend: 2, name: 3, age: 4, dob: 5, phone: 6, product: 7, da: 8, tag: 9, status: 10, dep: 11, coll: 12, warranty: 13, note: 14, kid2: 22 };
var WRITABLE = { friend: 1, name: 1, dob: 1, phone: 1, product: 1, da: 1, tag: 1, status: 1, dep: 1, coll: 1, note: 1, kid2: 1 };
var DATE_FIELDS = { dob: 1, dep: 1, coll: 1 };
var PRODUCTS = ["MC", "Kính", "OK", "Atropine", "Exam"];
/* High / low touch seeded into the Cadence (VN) tab by setup(). README §2.3. */
var TOUCH_HIGH = {
  "MC": ["D1", "D6-7", "CD", "CD+3-5"], "Kính": ["D1", "D6-7", "CD", "CD+3-5", "CD+7"],
  "OK": ["D1", "D6-7", "CD", "CDN", "CD+1", "CD+3-5", "CD+7"], "Atropine": ["D1", "D6-7", "CD", "CD+7"]
};

/* ---------------------------------------------------------------- entry points */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    var rv = reviewerOf(p.u, p.h) || hoOf(p.u, p.h);
    if (rv) return out(reviewerGet(rv, p));
    var clinic = auth(p.u, p.h);
    if (p.action === "ping") return out({ ok: 1, clinic: clinic, at: now() });
    if (p.action === "shot") return out(daShot(clinic, p.id));
    return out(bootstrap(clinic, p));
  } catch (err) { return out({ error: String(err && err.message || err) }); }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return out({ error: "bad json" }); }
  try {
    var rv = reviewerOf(body.u, body.h) || hoOf(body.u, body.h);
    if (rv) {
      var rlock = LockService.getScriptLock(); rlock.waitLock(25000);
      try { return out(reviewerPost(rv, body)); } finally { rlock.releaseLock(); }
    }
    var clinic = auth(body.u, body.h), by = String(body.da || body.u || "").slice(0, 80);
    var lock = LockService.getScriptLock(); lock.waitLock(25000);
    try { return out(dispatch(clinic, by, body)); } finally { lock.releaseLock(); }
  } catch (err) { return out({ error: String(err && err.message || err) }); }
}

function dispatch(clinic, by, body) {
  var ss = openClinic(clinic); ensureTabs(ss);
  switch (body.action) {
    case "bootstrap":       return bootstrap(clinic, body);
    case "addCustomer":     return addCustomer(ss, clinic, by, body.fields || {}, body.details || null);
    case "updateCustomer":  return updateCustomer(ss, clinic, by, body.ref || {}, body.changes || {});
    case "setCollected":    return updateCustomer(ss, clinic, by, body.ref || {}, { coll: body.date, status: "Đã là hội viên" });
    case "confirmTag":      return updateCustomer(ss, clinic, by, body.ref || {}, { tag: body.tag });
    case "markSent":        return markSent(ss, clinic, by, body.items || [], body.undo || []);
    case "storeImports":    return storeImports(ss, clinic, by, body.orders || []);
    case "confirmImports":  return confirmImports(ss, clinic, by, body);
    case "saveDetails":     return saveDetails(ss, clinic, by, body.key, body.details || {});
    case "removeCustomer":  return removeCustomer(ss, clinic, by, body.ref || {});
    case "removeImport":    return removeImport(ss, clinic, by, body.code);
    case "daSeen":          return daSeen(clinic, body.keys || [], body.weeks || []);
    case "askQuestion":     return askQuestion(clinic, by, body);
    default: throw new Error("unknown action: " + body.action);
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------- auth */
function auth(u, h) {
  u = String(u || "").trim().toUpperCase();
  var clinic = USERS[u] || "";
  if (!clinic || !CLINICS[clinic]) throw new Error("unknown user");
  if (PW_HASHES.indexOf(String(h || "").toLowerCase()) === -1) throw new Error("forbidden");
  return clinic;
}
function openClinic(clinic) { return SpreadsheetApp.openById(CLINICS[clinic].id); }
function membership(ss, clinic) {
  var sh = ss.getSheetByName(CLINICS[clinic].sheet);
  if (!sh) throw new Error("sheet " + CLINICS[clinic].sheet + " not found");
  return sh;
}
function now() { return new Date().toISOString(); }

/* ---------------------------------------------------------------- dates */
function iso(v, today) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  if (typeof v === "number") { if (v > 30000 && v < 80000) return Utilities.formatDate(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000), "UTC", "yyyy-MM-dd"); return ""; }
  var s = String(v || "").trim(), m;
  if (!s) return "";
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return ymd(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*$/.exec(s))) { var y = +m[3]; if (y < 100) y += 2000; return ymd(y, +m[2], +m[1]); }
  if ((m = /^(\d{1,2})[\/\-.](\d{1,2})\s*$/.exec(s))) {
    var base = today || Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"), by = +base.slice(0, 4), best = "";
    [by - 1, by, by + 1].forEach(function (yy) { var c = ymd(yy, +m[2], +m[1]); if (!c) return; var d = (Date.parse(c) - Date.parse(base)) / 86400000; if (d >= -335 && d <= 35) best = c; });
    return best;
  }
  return "";
}
function ymd(y, m, d) {
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return dt.toISOString().slice(0, 10);
}
/* a sheet date for an ISO day: noon in Vietnam so no timezone can move it to another day */
function toDate(isoDay) { return new Date(isoDay + "T12:00:00+07:00"); }
function dmy(isoDay) { return isoDay ? isoDay.slice(8, 10) + "/" + isoDay.slice(5, 7) + "/" + isoDay.slice(0, 4) : ""; }

/* ---------------------------------------------------------------- normalising */
function normText(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[\t\r\n ]+/g, " ").replace(/[.,;:'"()]/g, " ").replace(/\s+/g, " ").trim();
}
function normPhone(s) {
  var d = String(s || "").replace(/\D/g, "");
  if (d.length === 11 && d.slice(0, 2) === "84") d = "0" + d.slice(2);
  if (d.length === 9 && d.charAt(0) !== "0") d = "0" + d;
  return d.length === 10 && d.charAt(0) === "0" ? d : "";
}
function cellText(v) { return v === null || v === undefined ? "" : String(v); }

/* ---------------------------------------------------------------- reading */
function readMembership(ss, clinic) {
  var sh = membership(ss, clinic), last = sh.getLastRow(), outRows = [];
  if (last < 2) return outRows;
  var vals = sh.getRange(2, 1, last - 1, COL.kid2).getValues(), today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i], name = cellText(v[COL.name - 1]).trim(), tag = cellText(v[COL.tag - 1]).trim(), phone = cellText(v[COL.phone - 1]).trim();
    if (!name && !tag && !phone) continue;
    outRows.push({
      row: i + 2, stt: cellText(v[COL.stt - 1]), friend: cellText(v[COL.friend - 1]), name: name,
      dob: iso(v[COL.dob - 1], today), phone: phone, product: cellText(v[COL.product - 1]).trim(), da: cellText(v[COL.da - 1]).trim(),
      tag: tag, status: cellText(v[COL.status - 1]).trim(), dep: iso(v[COL.dep - 1], today), coll: iso(v[COL.coll - 1], today),
      depRaw: cellText(v[COL.dep - 1]), collRaw: cellText(v[COL.coll - 1]), note: cellText(v[COL.note - 1]), kid2: cellText(v[COL.kid2 - 1])
    });
  }
  return outRows;
}
function readCadence(ss) {
  var sh = ss.getSheetByName(CADENCE_SHEET); if (!sh) return [];
  var last = sh.getLastRow(); if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, 5).getValues(), rows = [];
  vals.forEach(function (v) {
    var product = cellText(v[0]).trim(), stage = cellText(v[1]).trim();
    if (!product || !stage || !/^(D1|D6-7|CD|CDN|CD\+\d+(-\d+)?)$/.test(stage)) return;
    rows.push({ product: product, stage: stage, text: cellText(v[2]).trim(), touch: cellText(v[4]).trim() });
  });
  return rows;
}
function readTab(ss, name, clinic) {
  var sh = ss.getSheetByName(name); if (!sh) return [];
  var last = sh.getLastRow(); if (last < 2) return [];
  var hdr = HEADERS[name], vals = sh.getRange(2, 1, last - 1, hdr.length).getValues(), rows = [];
  vals.forEach(function (v, i) {
    var o = { _row: i + 2 }, empty = true;
    hdr.forEach(function (h, j) { var x = v[j]; if (x instanceof Date) x = x.toISOString(); o[h] = cellText(x); if (o[h] !== "") empty = false; });
    if (empty) return;
    if (clinic && o.clinic !== undefined && o.clinic && o.clinic !== clinic) return;
    rows.push(o);
  });
  return rows;
}
function readSettings(ss) {
  var o = {}; readTab(ss, TABS.settings).forEach(function (r) { if (r.key) o[r.key] = r.value; });
  SETTINGS_DEFAULT.forEach(function (d) { if (o[d[0]] === undefined || o[d[0]] === "") o[d[0]] = d[1]; });
  return o;
}
function bootstrap(clinic, p) {
  var ss = openClinic(clinic); ensureTabs(ss);
  var customers = readMembership(ss, clinic), das = {};
  customers.forEach(function (c) { if (c.da) das[c.da] = (das[c.da] || 0) + 1; });
  return {
    ok: 1, clinic: clinic, generated: now(), today: Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"),
    settings: readSettings(ss), cadence: readCadence(ss), das: das, customers: customers,
    tasks: readTab(ss, TABS.tasks, clinic), imports: readTab(ss, TABS.imports, clinic), details: readTab(ss, TABS.details, clinic),
    feedback: daFeedbackSafe(clinic)
  };
}
/* ---------------------------------------------------------------- the DA's side of the audit (1.7.0)
   What head office approved for her, the published weekly feedback, her questions and the answers, and
   the resources, all read from the clinic's tracker workbook. A tracker problem never blocks her page. */
function daTracker(clinic) {
  var id = hoClinics()[clinic]; if (!id) return null;
  var ss = SpreadsheetApp.openById(id); ensureTracker(ss); return ss;
}
function daFeedbackSafe(clinic) {
  try { return daFeedback(clinic); } catch (err) { return { audits: [], weekly: [], questions: [], resources: [], error: String(err && err.message || err) }; }
}
function daFeedback(clinic) {
  var ss = daTracker(clinic); if (!ss) return { audits: [], weekly: [], questions: [], resources: [] };
  var byCust = {};
  readShots(ss).forEach(function (x) { if (x.clinic && x.clinic !== clinic) return; (byCust[x.week + "|" + x.custKey] = byCust[x.week + "|" + x.custKey] || []).push({ id: x.id, file: x.file }); });
  var audits = readAudits(ss).filter(function (a) { return a.clinic === clinic && a.publishedAt && a.visible; }).map(function (a) {
    return { key: a.key, week: a.week, custKey: a.custKey, tag: a.tag, name: a.name, product: a.product, da: a.da, due: a.due, verdict: a.verdict, score: a.score, notFound: Number(a.notFound) || 0,
             remark: a.remark, remarkVi: a.remarkVi, remarkEn: a.remarkEn, remarkZh: a.remarkZh, marks: a.hoMarks || a.marks || {}, data: a.data,
             approvedBy: a.approvedBy, publishedAt: a.publishedAt, seenAt: a.seenAt, shots: byCust[a.week + "|" + a.custKey] || [] };
  });
  var weekly = readWeekly(ss).filter(function (w) { return w.clinic === clinic && (w.status === "published" || w.status === "acknowledged"); }).map(function (w) {
    return { week: w.week, status: w.status, remark: w.remark, remarkVi: w.remarkVi, remarkEn: w.remarkEn, remarkZh: w.remarkZh, approvedBy: w.approvedBy, publishedAt: w.publishedAt, seenAt: w.seenAt };
  });
  return { audits: audits, weekly: weekly, questions: readQuestions(ss).filter(function (q) { return q.clinic === clinic; }),
           resources: readResources(ss).filter(function (r) { return r.visible && (!r.clinic || r.clinic === clinic); }) };
}
function daShot(clinic, id) {
  var ss = daTracker(clinic); if (!ss) throw new Error("no tracker for " + clinic);
  var sh = ss.getSheetByName(RV_TABS.shots), r = rvFindRow(sh, String(id || "")); if (!r) throw new Error("screenshot not found");
  var v = sh.getRange(r, 1, 1, RV_HEADERS.shots.length).getValues()[0];
  if ((cellText(v[2]) && cellText(v[2]) !== clinic) || cellText(v[10])) throw new Error("screenshot not found");
  var blob = DriveApp.getFileById(cellText(v[7])).getBlob();
  return { ok: 1, id: String(id), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
/* the DA pressed "seen" on chats and on weeks: the first time is kept */
function daSeen(clinic, keys, weeks) {
  var ss = daTracker(clinic); if (!ss) throw new Error("no tracker for " + clinic);
  var at = now(), n = 0, sh = ss.getSheetByName(RV_TABS.audit), wk = ss.getSheetByName(RV_TABS.weekly);
  keys.forEach(function (k) { var r = rvFindRow(sh, String(k)); if (r && !cellText(sh.getRange(r, 36).getValue())) { sh.getRange(r, 36).setValue(at); n++; } });
  weeks.forEach(function (w) { var r = rvFindRow(wk, String(w) + "|" + clinic); if (r && !cellText(wk.getRange(r, 33).getValue())) { wk.getRange(r, 33).setValue(at); n++; } });
  return { ok: 1, seen: n, at: at };
}
/* b: {week, custKey?, tag?, text} — the DA asks about a chat or a week; translated for head office and the reviewer */
function askQuestion(clinic, by, b) {
  var ss = daTracker(clinic); if (!ss) throw new Error("no tracker for " + clinic);
  var text = cellText(b.text).trim(); if (!text) throw new Error("the question is empty");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.week || ""))) throw new Error("week needed");
  var id = "q" + new Date().getTime().toString(36), at = now(), tr = trText(ss, text, "vi"), sh = ss.getSheetByName(RV_TABS.questions);
  sh.getRange(sh.getLastRow() + 1, 1, 1, RV_HEADERS.questions.length).setValues([[id, "'" + b.week, clinic, cellText(b.custKey), cellText(b.tag).slice(0, 300), cellText(by).slice(0, 80), text.slice(0, 4000), tr.en || "", tr.zh || "", at, "open", "", "", "", "", "", "", ""]]);
  return { ok: 1, id: id, askedAt: at, qEn: tr.en || "", qZh: tr.zh || "" };
}
/* one text into the two other languages, through the same translator as the remarks; never throws */
function trText(ss, text, from) {
  try {
    var set = rvSettings(ss), mode = String(set.translate || "claude").toLowerCase(); if (mode === "off") return {};
    var res = { errors: [] }, out = translateBatch([{ id: "t", text: text, from: from || detectLang(text) }], mode, set.translate_model, res), o = out.map.t || {};
    o[from || detectLang(text)] = text; return o;
  } catch (err) { return {}; }
}

/* ---------------------------------------------------------------- setup */
function setup() {
  var report = [];
  Object.keys(CLINICS).forEach(function (c) {
    var ss = openClinic(c); ensureTabs(ss); report.push(c + ": tabs ok");
    var sh = ss.getSheetByName(CADENCE_SHEET);
    if (!sh) { report.push(c + ": no " + CADENCE_SHEET + " tab, touch column skipped"); return; }
    var last = sh.getLastRow();
    if (cellText(sh.getRange(1, 5).getValue()).trim() === "") sh.getRange(1, 5).setValue("Touch");
    var vals = sh.getRange(2, 1, Math.max(last - 1, 1), 5).getValues(), filled = 0;
    for (var i = 0; i < vals.length; i++) {
      var product = cellText(vals[i][0]).trim(), stage = cellText(vals[i][1]).trim();
      if (!product || !stage || cellText(vals[i][4]).trim() || !/^(D1|D6-7|CD|CDN|CD\+\d+(-\d+)?)$/.test(stage)) continue;
      var high = (TOUCH_HIGH[productKey(product)] || []).indexOf(stage) !== -1;
      if (TOUCH_HIGH[productKey(product)]) { sh.getRange(i + 2, 5).setValue(high ? "High" : "Low"); filled++; }
    }
    report.push(c + ": touch column filled for " + filled + " rows");
  });
  Logger.log(report.join("\n"));
  return report;
}
function productKey(text) {
  var s = normText(text);
  if (/\bmc\b/.test(s)) return "MC"; if (/\b(kinh|kt)\b/.test(s)) return "Kính"; if (/\bok\b/.test(s)) return "OK"; if (/atr/.test(s)) return "Atropine"; if (/exam/.test(s)) return "Exam";
  return "";
}
function ensureTabs(ss) {
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name), hdr = HEADERS[name];
    if (!sh) { sh = ss.insertSheet(name); if (sh.getMaxColumns() < hdr.length) sh.insertColumnsAfter(sh.getMaxColumns(), hdr.length - sh.getMaxColumns()); sh.getRange(1, 1, 1, hdr.length).setValues([hdr]); sh.setFrozenRows(1); }
    else {
      /* columns added in later versions get their header; existing data is untouched */
      if (sh.getMaxColumns() < hdr.length) sh.insertColumnsAfter(sh.getMaxColumns(), hdr.length - sh.getMaxColumns());
      var cur = sh.getRange(1, 1, 1, hdr.length).getValues()[0];
      for (var i = 0; i < hdr.length; i++) if (cellText(cur[i]).trim() === "") sh.getRange(1, i + 1).setValue(hdr[i]);
    }
    if (name === TABS.settings && sh.getLastRow() < 2) sh.getRange(2, 1, SETTINGS_DEFAULT.length, 3).setValues(SETTINGS_DEFAULT);
  });
}

/* ---------------------------------------------------------------- locating a row */
/* ref: {row, name, phone}. The row is trusted only if its name and phone still match. */
function findRow(sh, ref) {
  var last = sh.getLastRow(), wantName = normText(ref.name), wantPhone = normPhone(ref.phone);
  function matches(r) {
    var v = sh.getRange(r, COL.name, 1, COL.phone - COL.name + 1).getValues()[0];
    return normText(v[0]) === wantName && normPhone(v[COL.phone - COL.name]) === wantPhone;
  }
  if (ref.row && ref.row >= 2 && ref.row <= last && matches(ref.row)) return ref.row;
  var vals = sh.getRange(2, COL.name, Math.max(last - 1, 1), COL.phone - COL.name + 1).getValues(), hits = [];
  for (var i = 0; i < vals.length; i++) if (normText(vals[i][0]) === wantName && normPhone(vals[i][COL.phone - COL.name]) === wantPhone && wantName) hits.push(i + 2);
  if (hits.length === 1) return hits[0];
  throw new Error(hits.length ? "row is ambiguous: " + hits.length + " rows match" : "row not found: the name or phone changed in the sheet");
}
function firstEmptyRow(sh) {
  var last = sh.getLastRow(), max = sh.getMaxRows();
  var names = sh.getRange(2, COL.name, Math.max(last - 1, 1), 1).getValues();
  for (var i = 0; i < names.length; i++) if (cellText(names[i][0]).trim() === "") {
    var v = sh.getRange(i + 2, 1, 1, COL.kid2).getValues()[0];
    if (cellText(v[COL.tag - 1]).trim() === "" && cellText(v[COL.phone - 1]).trim() === "") return i + 2;
  }
  var r = last + 1;
  if (r > max) { sh.insertRowsAfter(max, 50); }
  if (last >= 2 && r <= sh.getMaxRows()) {
    /* carry the formula columns down from the row above */
    sh.getRange(last, 1, 1, sh.getLastColumn()).copyTo(sh.getRange(r, 1, 1, sh.getLastColumn()), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    var keep = [COL.friend, COL.name, COL.dob, COL.phone, COL.product, COL.da, COL.tag, COL.status, COL.dep, COL.coll, COL.warranty, COL.note, COL.kid2];
    keep.forEach(function (c) { sh.getRange(r, c).clearContent(); });
  }
  return r;
}

/* ---------------------------------------------------------------- writes */
function writeCell(sh, r, field, value, log) {
  var c = COL[field], rng = sh.getRange(r, c), old = rng.getValue();
  if (DATE_FIELDS[field]) {
    var d = iso(value);
    if (value && !d) throw new Error("bad date for " + field + ": " + value);
    if (d) { rng.setValue(toDate(d)); rng.setNumberFormat("dd/MM/yyyy"); } else rng.clearContent();
  } else if (field === "phone") {
    rng.setNumberFormat("@"); rng.setValue(cellText(value).trim());
  } else rng.setValue(cellText(value));
  if (log) log.push([field, old instanceof Date ? iso(old) : cellText(old), cellText(value)]);
}
function logRows(ss, by, action, key, row, entries) {
  var sh = ss.getSheetByName(TABS.log), at = now(), rows = entries.map(function (e) { return [at, by, action, key, row, e[0], e[1], e[2]]; });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.DA_Log.length).setValues(rows);
}
function keyOf(phone, name) { return normPhone(phone) + "|" + normText(String(name || "").split(/[,&;\n]/)[0]); }

function addCustomer(ss, clinic, by, f, details) {
  var sh = membership(ss, clinic);
  var name = cellText(f.name).trim(); if (!name) throw new Error("name is required");
  var product = cellText(f.product).trim(); if (PRODUCTS.indexOf(product) === -1) throw new Error("product must be one of " + PRODUCTS.join(", "));
  if (f.dep && !iso(f.dep)) throw new Error("bad deposit date"); if (f.coll && !iso(f.coll)) throw new Error("bad collection date");
  if (f.coll && f.dep && iso(f.coll) < iso(f.dep)) throw new Error("collection date is before the deposit date");
  var phone = normPhone(f.phone) || cellText(f.phone).trim(), key = cellText(f.key).trim() || keyOf(phone, name);
  if (!f.allowDuplicate) {
    var last = sh.getLastRow(), vals = last >= 2 ? sh.getRange(2, COL.name, last - 1, COL.phone - COL.name + 1).getValues() : [];
    for (var i = 0; i < vals.length; i++) if (keyOf(vals[i][COL.phone - COL.name], vals[i][0]) === keyOf(phone, name)) throw new Error("already in the form at row " + (i + 2));
  }
  var r = firstEmptyRow(sh), log = [];
  writeCell(sh, r, "friend", f.friend ? dmy(iso(f.friend)) : dmy(Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd")), log);
  writeCell(sh, r, "name", name, log);
  if (f.dob) writeCell(sh, r, "dob", f.dob, log);
  if (phone) writeCell(sh, r, "phone", phone, log);
  writeCell(sh, r, "product", product, log);
  writeCell(sh, r, "da", cellText(f.da || by).trim(), log);
  writeCell(sh, r, "tag", cellText(f.tag).trim(), log);
  writeCell(sh, r, "status", f.status !== undefined ? cellText(f.status) : (f.coll ? "Đã là hội viên" : ""), log);
  if (f.dep) writeCell(sh, r, "dep", f.dep, log);
  if (f.coll) writeCell(sh, r, "coll", f.coll, log);
  if (f.note) writeCell(sh, r, "note", f.note, log);
  if (f.kid2) writeCell(sh, r, "kid2", f.kid2, log);
  logRows(ss, by, "addCustomer", key, r, log);
  if (details && (details.parent_name || details.relation || details.gender || details.pending_tag)) upsertDetails(ss, clinic, by, key, details);
  return { ok: 1, row: r, key: key };
}

function updateCustomer(ss, clinic, by, ref, changes) {
  var sh = membership(ss, clinic), r = findRow(sh, ref), log = [], applied = {};
  Object.keys(changes).forEach(function (field) {
    if (!WRITABLE[field]) throw new Error("field " + field + " is not writable");
    if (field === "product" && changes[field] && PRODUCTS.indexOf(changes[field]) === -1) throw new Error("product must be one of " + PRODUCTS.join(", "));
    writeCell(sh, r, field, changes[field], log); applied[field] = changes[field];
  });
  if (changes.coll) {
    var dep = iso(sh.getRange(r, COL.dep).getValue());
    if (dep && iso(changes.coll) < dep) { log.forEach(function (e) { writeCell(sh, r, e[0], e[1], null); }); throw new Error("collection date is before the deposit date"); }
  }
  logRows(ss, by, "updateCustomer", keyOf(sh.getRange(r, COL.phone).getValue(), sh.getRange(r, COL.name).getValue()), r, log);
  return { ok: 1, row: r, changes: applied };
}

function markSent(ss, clinic, by, items, undo) {
  var sh = ss.getSheetByName(TABS.tasks), at = now(), rows = [];
  items.forEach(function (it) {
    if (!it.key || !it.stage) throw new Error("item needs key and stage");
    rows.push([it.key, clinic, cellText(it.da || by), it.stage, cellText(it.due), cellText(it.bits || "1"), it.score === 0.5 ? 0.5 : 1, at, "", cellText(it.note || "").slice(0, 200)]);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.DA_Tasks.length).setValues(rows);
  var undone = 0;
  if (undo.length) {
    var last = sh.getLastRow(), vals = last >= 2 ? sh.getRange(2, 1, last - 1, HEADERS.DA_Tasks.length).getValues() : [];
    undo.forEach(function (u) {
      for (var i = vals.length - 1; i >= 0; i--) if (vals[i][0] === u.key && vals[i][3] === u.stage && cellText(vals[i][8]) === "") { sh.getRange(i + 2, 9).setValue(at); vals[i][8] = at; undone++; break; }
    });
  }
  return { ok: 1, sent: rows.length, undone: undone, at: at };
}

function storeImports(ss, clinic, by, orders) {
  var sh = ss.getSheetByName(TABS.imports), hdr = HEADERS.DA_Imports, last = sh.getLastRow(), at = now();
  var existing = last >= 2 ? sh.getRange(2, 1, last - 1, hdr.length).getValues() : [], byCode = {};
  existing.forEach(function (v, i) { if (v[0]) byCode[String(v[0])] = i + 2; });
  var added = 0, updated = 0, newRows = [];
  orders.forEach(function (o) {
    if (!o.code) return;
    var r = byCode[o.code];
    if (r) {
      var v = sh.getRange(r, 1, 1, hdr.length).getValues()[0];
      v[6] = cellText(o.status || v[6]); v[5] = cellText(o.appointment || o.appt || v[5]); v[14] = at;
      if (o.collected !== undefined) v[15] = cellText(o.collected);
      if (o.note !== undefined) v[16] = cellText(o.note).slice(0, 500);
      if (o.state) v[12] = o.state; if (o.result !== undefined) v[13] = cellText(o.result);
      if (o.product) v[11] = o.product;
      sh.getRange(r, 1, 1, hdr.length).setValues([v]); updated++;
    } else {
      newRows.push([o.code, clinic, at, by, cellText(o.deposit || o.dep), cellText(o.appointment || o.appt), cellText(o.status), cellText(o.name), cellText(o.phone),
        cellText(o.patient || o.patient_code), cellText(o.lens), cellText(o.product), o.state || "parked", cellText(o.result), at, cellText(o.collected), cellText(o.note).slice(0, 500)]);
      byCode[o.code] = -1; added++;
    }
  });
  if (newRows.length) sh.getRange(sh.getLastRow() + 1, 1, newRows.length, hdr.length).setValues(newRows);
  return { ok: 1, added: added, updated: updated };
}

/* body: {adds:[{code, fields, details}], collections:[{code, ref, date}], park:[code], dismiss:[code], orders:[…]} */
function confirmImports(ss, clinic, by, body) {
  var results = {}, states = [];
  (body.adds || []).forEach(function (a) {
    try { var res = addCustomer(ss, clinic, by, a.fields || {}, a.details || null); results[a.code] = { ok: 1, row: res.row, key: res.key }; states.push({ code: a.code, state: "confirmed", result: "added:" + res.key, collected: (a.fields || {}).coll || "" }); }
    catch (err) { results[a.code] = { error: String(err.message || err) }; }
  });
  (body.collections || []).forEach(function (c) {
    try { var res = updateCustomer(ss, clinic, by, c.ref || {}, { coll: c.date, status: "Đã là hội viên" }); results[c.code] = { ok: 1, row: res.row }; states.push({ code: c.code, state: "confirmed", result: "collected:" + keyOf((c.ref || {}).phone, (c.ref || {}).name), collected: c.date }); }
    catch (err) { results[c.code] = { error: String(err.message || err) }; }
  });
  (body.park || []).forEach(function (code) { states.push({ code: code, state: "parked" }); results[code] = { ok: 1, parked: 1 }; });
  (body.dismiss || []).forEach(function (code) { states.push({ code: code, state: "dismissed" }); results[code] = { ok: 1, dismissed: 1 }; });
  /* every uploaded order is remembered; the state rows above override */
  var byCode = {}; (body.orders || []).forEach(function (o) { byCode[o.code] = o; });
  states.forEach(function (s) { byCode[s.code] = Object.assign({}, byCode[s.code] || { code: s.code }, s); });
  var store = storeImports(ss, clinic, by, Object.keys(byCode).map(function (k) { return byCode[k]; }));
  return { ok: 1, results: results, stored: store };
}

function upsertDetails(ss, clinic, by, key, d) {
  var sh = ss.getSheetByName(TABS.details), hdr = HEADERS.DA_Details, last = sh.getLastRow(), at = now();
  var vals = last >= 2 ? sh.getRange(2, 1, last - 1, hdr.length).getValues() : [], r = 0, cur = null;
  for (var i = 0; i < vals.length; i++) if (vals[i][0] === key && (vals[i][1] === clinic || !vals[i][1])) { r = i + 2; cur = vals[i]; break; }
  /* only the fields given change; the rest keep their value */
  var row = [key, clinic, pick("parent_name", 2), pick("relation", 3), pick("gender", 4), pick("pending_tag", 5), at, by];
  function pick(f, i) { return d[f] !== undefined ? cellText(d[f]) : (cur ? cellText(cur[i]) : ""); }
  if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.getRange(last + 1, 1, 1, row.length).setValues([row]);
  return { ok: 1, key: key };
}
function saveDetails(ss, clinic, by, key, d) { if (!key) throw new Error("key is required"); return upsertDetails(ss, clinic, by, key, d); }

/* Undo of an add: clears the data cells of a row, but only one the dashboard itself wrote
   (there is an addCustomer entry for it in DA_Log). Formula columns are untouched. */
function removeCustomer(ss, clinic, by, ref) {
  var sh = membership(ss, clinic), r = findRow(sh, ref), key = keyOf(sh.getRange(r, COL.phone).getValue(), sh.getRange(r, COL.name).getValue());
  var lg = ss.getSheetByName(TABS.log), last = lg.getLastRow(), ok = false;
  if (last >= 2) { var vals = lg.getRange(2, 1, last - 1, 5).getValues(); for (var i = 0; i < vals.length; i++) if (vals[i][2] === "addCustomer" && String(vals[i][3]) === key && String(vals[i][4]) === String(r)) { ok = true; break; } }
  if (!ok) throw new Error("only rows added by the dashboard can be removed");
  var log = [];
  Object.keys(WRITABLE).forEach(function (f) { var rng = sh.getRange(r, COL[f]), old = rng.getValue(); if (old !== "" && old !== null) { log.push([f, old instanceof Date ? iso(old) : cellText(old), ""]); rng.clearContent(); } });
  logRows(ss, by, "removeCustomer", key, r, log);
  return { ok: 1, row: r, key: key };
}
/* Undo of a typed-in "Zalo not added" entry: the DA_Imports row goes away. */
function removeImport(ss, clinic, by, code) {
  if (!code) throw new Error("code is required");
  var sh = ss.getSheetByName(TABS.imports), last = sh.getLastRow();
  var vals = last >= 2 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === String(code) && (!vals[i][1] || vals[i][1] === clinic)) { sh.deleteRow(i + 2); logRows(ss, by, "removeImport", String(code), i + 2, [["row", "", ""]]); return { ok: 1, removed: 1 }; }
  return { ok: 1, removed: 0 };
}


/* ================================================================ reviewers (QA audit, 1.4.0)
   README §2.15. The reviewer reads each clinic's CRM workbook (customers, the DA's ticks in
   DA_Tasks, the Cadence tab, DA_Settings) and writes only to the tracker workbook named for that
   clinic in REVIEWERS: tabs Audit, Weekly, Screenshots, Settings. Screenshots are Drive files in a
   folder next to the tracker; the page fetches them through this script, so they need no sharing.
   ================================================================ */
var RV_TABS = { audit: "审核 Audit", weekly: "周总评 Weekly", shots: "截图 Screenshots", settings: "设置 Settings", questions: "问题 Questions", resources: "资源 Resources" };
var RV_HEADERS = {
  audit: ["键 Key", "周 Week", "诊所 Clinic", "客户键 Customer key", "Zalo 标签 Zalo tag", "客户 Customer", "产品 Product", "助理 DA",
          "本周到期 Due this week", "状态 Status", "结论 Verdict", "得分 Score", "已发送 Found", "缺失 Missing", "助理已勾未见 DA ticked, not found",
          "备注 Remark", "数据问题 Data issue", "截图 Screenshots", "检查时间 Checked at", "审核人 By", "更新时间 Updated", "评分明细 Marks", "来源 Source", "抽样时间 Added",
          /* 1.6.0, head office: the reviewer's columns above are never changed by HO */
          "HO 备注 HO note", "备注 EN Remark EN", "备注 VI Remark VI", "备注 ZH Remark ZH", "对助理可见 Visible to DA", "HO 修改记录 HO edits", "HO 评分明细 HO marks", "翻译时间 Translated at", "翻译来源 Translated by",
          /* 1.6.5: head office approves chats one by one for the DA; 1.7.0: the DA has seen it */
          "审批人 Approved by", "发布时间 Published at", "助理已读 DA seen at"],
  weekly: ["键 Key", "周 Week", "诊所 Clinic", "到期客户 Customers due", "到期节点 Cadences due", "抽样 Sampled", "已检查 Checked", "合规 Pass", "部分 Partial",
           "未合规 Fail", "数据问题 Data issues", "得分 Score %", "本周节点得分 This week's cadences %", "助理已勾未见 DA ticked, not found", "助理自报已发 DA reported sent %",
           "本周总评 Overall remark", "审核人 By", "更新时间 Updated", "状态 Status", "提交时间 Submitted at", "审批人 Approved by", "发布时间 Published at",
           "总评 EN Remark EN", "总评 VI Remark VI", "总评 ZH Remark ZH", "HO 备注 HO note", "退回说明 Send-back note", "HO 修改记录 HO edits", "翻译时间 Translated at", "翻译来源 Translated by", "审核开始 Taken at", "HO 审核人 HO reviewer", "助理已读 DA seen at"],
  shots: ["编号 ID", "周 Week", "诊所 Clinic", "客户键 Customer key", "Zalo 标签 Zalo tag", "文件 File", "链接 Link", "Drive ID", "上传时间 Uploaded", "审核人 By", "已删除 Removed"],
  settings: ["键 Key", "值 Value", "说明 Note"],
  /* 1.7.0: the DA's questions and the answers; the training decks, photos and template scripts head office uploads */
  questions: ["编号 ID", "周 Week", "诊所 Clinic", "客户键 Customer key", "Zalo 标签 Zalo tag", "提问人 From", "问题 Question", "问题 EN Question EN", "问题 ZH Question ZH", "提问时间 Asked at",
              "状态 Status", "回复 Answer", "回复 VI Answer VI", "回复 EN Answer EN", "回复 ZH Answer ZH", "回复人 Answered by", "回复时间 Answered at", "助理已读 DA seen at"],
  resources: ["编号 ID", "类型 Kind", "诊所 Clinic", "标题 Title", "日期 Date", "语言 Lang", "文件 File", "类型 Mime", "Drive ID", "链接 Link", "文本 Text", "顺序 Order", "可见 Visible", "上传时间 Uploaded", "上传人 By", "更新时间 Updated", "已删除 Removed"]
};
var RV_SETTINGS_DEFAULT = [
  ["sample_size", "15", "每周每个诊所抽样数 / Chats to sample per clinic per week"],
  ["start_week", "2026-10-12", "审核起始周（周一）/ First audited week (its Monday)"],
  ["screenshot_folder", "", "截图文件夹 ID（首次上传时自动创建）/ Drive folder for screenshots, created on the first upload"],
  ["switched_over", "", "旧周表导入时间（W 表已隐藏）/ When the old week sheets were imported and hidden"],
  ["email_ho", "sinlong.koh@kkr.com, anh.lhn@matsaigon.com", "完成本周时通知的 HO 邮箱（逗号分隔）/ HO addresses emailed when a week is completed"],
  ["app_url", "https://kohsinlong.github.io/DA-Dashboard-/zalo/", "邮件中的链接 / Link used in the emails"],
  ["email_cz", "", "HO 发布或退回时通知的审核人邮箱 / Reviewer address emailed when HO publishes or sends a week back"],
  ["translate", "claude", "翻译方式：claude（需在脚本属性中设置 ANTHROPIC_API_KEY，否则自动退回 google）、google、off / Translation: claude (needs ANTHROPIC_API_KEY in Script properties, falls back to google), google, or off"],
  ["translate_model", "claude-opus-5-5", "Claude 模型 / Claude model used for translations"],
  ["resources_folder", "", "资料文件夹 ID（首次上传时自动创建）/ Drive folder for the training decks, photos and posters, created on the first upload"],
  ["resources_public", "Y", "上传的资料设为“知道链接的人可查看”，助理页面才能直接打开 / Uploaded resources viewable by anyone with the link, so the DA's page can show them (Y / N)"]
];
var RV_LOCKED = { submitted: 1, review: 1, published: 1, acknowledged: 1 };   /* the reviewer cannot write */
var HO_OPEN = { submitted: 1, review: 1 };                                       /* HO can edit */
var RV_AUDIT_COLS = RV_HEADERS.audit.length;
var RV_AUDIT_RV_COLS = 24;                                                       /* the reviewer's own columns (A–X) */
var RV_WEEKLY_COLS = RV_HEADERS.weekly.length;

function reviewerOf(u, h) {
  var id = String(u || "").trim().toUpperCase(), r = REVIEWERS[id];
  if (!r) return null;
  if (!r.hash || String(h || "").toLowerCase() !== r.hash) throw new Error("forbidden");
  return { id: id, name: r.name || id, role: "reviewer", clinics: r.clinics || {}, cache: {} };
}
/* Head office signs in with its own username and sees every clinic that has a reviewer tracker. */
function hoOf(u, h) {
  var id = String(u || "").trim().toUpperCase(), r = HO_USERS[id];
  if (!r) return null;
  if (!r.hash || String(h || "").toLowerCase() !== r.hash) throw new Error("forbidden");
  return { id: id, name: r.name || id, role: "ho", approver: r.approver === undefined ? (r.name || id) : r.approver, clinics: hoClinics(), cache: {} };
}
function hoClinics() {
  var o = {};
  Object.keys(REVIEWERS).forEach(function (rid) { var cl = REVIEWERS[rid].clinics || {}; Object.keys(cl).forEach(function (code) { if (!o[code]) o[code] = cl[code]; }); });
  return o;
}
function reviewerFor(code) {
  var ids = Object.keys(REVIEWERS);
  for (var i = 0; i < ids.length; i++) if ((REVIEWERS[ids[i]].clinics || {})[code]) return { id: ids[i], name: REVIEWERS[ids[i]].name || ids[i] };
  return { id: "", name: "the reviewer" };
}
function approverNames() { return HO_APPROVERS.slice(); }
function hoNames() { var o = {}; Object.keys(HO_USERS).forEach(function (k) { o[k] = HO_USERS[k].name || k; }); return o; }
function parseJson(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }
function rvTracker(rv, clinic) {
  var id = rv.clinics[clinic];
  if (!id) throw new Error("clinic " + clinic + " is not in your list");
  if (!rv.cache[id]) { rv.cache[id] = SpreadsheetApp.openById(id); ensureTracker(rv.cache[id]); }
  return rv.cache[id];
}
function rvToday() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }
function rvDay(v) { if (v instanceof Date) return iso(v); return cellText(v).replace(/^'/, "").trim().slice(0, 10); }
function rvStamp(v) { return v instanceof Date && !isNaN(v) ? v.toISOString() : cellText(v); }

/* ---------------------------------------------------------------- tracker tabs */
function ensureTracker(ss) {
  ["settings", "audit", "weekly", "shots", "questions", "resources"].forEach(function (k) {
    var name = RV_TABS[k], hdr = RV_HEADERS[k], sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); if (sh.getMaxColumns() < hdr.length) sh.insertColumnsAfter(sh.getMaxColumns(), hdr.length - sh.getMaxColumns()); sh.getRange(1, 1, 1, hdr.length).setValues([hdr]); sh.setFrozenRows(1); }
    else {
      if (sh.getMaxColumns() < hdr.length) sh.insertColumnsAfter(sh.getMaxColumns(), hdr.length - sh.getMaxColumns());
      var cur = sh.getRange(1, 1, 1, hdr.length).getValues()[0];
      for (var i = 0; i < hdr.length; i++) if (cellText(cur[i]).trim() === "") sh.getRange(1, i + 1).setValue(hdr[i]);
    }
    if (k === "settings") {
      var have = {}, last = sh.getLastRow();
      if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { have[cellText(r[0]).trim()] = 1; });
      var add = RV_SETTINGS_DEFAULT.filter(function (d) { return !have[d[0]]; });
      if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add);
    }
  });
}
function rvSettings(ss) {
  var sh = ss.getSheetByName(RV_TABS.settings), o = {};
  RV_SETTINGS_DEFAULT.forEach(function (d) { o[d[0]] = d[1]; });
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    var k = cellText(r[0]).trim(); if (!k) return;
    var v = r[1] instanceof Date ? iso(r[1]) : cellText(r[1]).trim();
    if (v !== "" || o[k] === undefined) o[k] = v;
  });
  return o;
}
function setRvSetting(ss, key, value) {
  var sh = ss.getSheetByName(RV_TABS.settings), last = sh.getLastRow();
  var keys = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
  for (var i = 0; i < keys.length; i++) if (cellText(keys[i][0]).trim() === key) { sh.getRange(i + 2, 2).setValue(value); return; }
  sh.getRange(last + 1, 1, 1, 3).setValues([[key, value, ""]]);
}
/* rows of a tracker tab as arrays, with their sheet row numbers */
function rvRows(ss, tab) {
  var sh = ss.getSheetByName(RV_TABS[tab]); if (!sh) return [];
  var last = sh.getLastRow(), n = RV_HEADERS[tab].length; if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, n).getValues().map(function (v, i) { return { row: i + 2, v: v }; })
    .filter(function (r) { return cellText(r.v[0]).trim() !== ""; });
}
function rvFindRow(sh, key) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var keys = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) if (cellText(keys[i][0]) === key) return i + 2;
  return 0;
}
function readAudits(ss) {
  return rvRows(ss, "audit").map(function (r) {
    var v = r.v, marks = {};
    try { marks = v[21] ? JSON.parse(v[21]) : {}; } catch (e) { marks = {}; }
    var hoMarks = parseJson(cellText(v[30]), null); if (hoMarks && typeof hoMarks !== "object") hoMarks = null;
    return { key: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), custKey: cellText(v[3]), tag: cellText(v[4]), name: cellText(v[5]),
             product: cellText(v[6]), da: cellText(v[7]), due: cellText(v[8]), status: cellText(v[9]), verdict: cellText(v[10]), score: v[11] === "" ? "" : Number(v[11]),
             found: cellText(v[12]), missing: cellText(v[13]), notFound: cellText(v[14]), remark: cellText(v[15]), data: cellText(v[16]) ? 1 : 0,
             shots: Number(v[17]) || 0, checkedAt: rvStamp(v[18]), by: cellText(v[19]), updated: rvStamp(v[20]), marks: marks, source: cellText(v[22]), added: rvStamp(v[23]),
             /* head office */
             hoNote: cellText(v[24]), remarkEn: cellText(v[25]), remarkVi: cellText(v[26]), remarkZh: cellText(v[27]), visible: cellText(v[28]) === "N" ? 0 : 1,
             hoEdits: parseJson(cellText(v[29]), []), hoMarks: hoMarks, translatedAt: rvStamp(v[31]), translatedBy: cellText(v[32]),
             approvedBy: cellText(v[33]), publishedAt: rvStamp(v[34]), seenAt: rvStamp(v[35]) };
  });
}
function readWeekly(ss) {
  return rvRows(ss, "weekly").map(function (r) {
    var v = r.v;
    return { key: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), remark: cellText(v[15]), by: cellText(v[16]), updated: rvStamp(v[17]),
             status: cellText(v[18]) || "marking", submittedAt: rvStamp(v[19]), approvedBy: cellText(v[20]), publishedAt: rvStamp(v[21]),
             remarkEn: cellText(v[22]), remarkVi: cellText(v[23]), remarkZh: cellText(v[24]), hoNote: cellText(v[25]), sendBack: cellText(v[26]),
             hoEdits: parseJson(cellText(v[27]), []), translatedAt: rvStamp(v[28]), translatedBy: cellText(v[29]), takenAt: rvStamp(v[30]), hoBy: cellText(v[31]), seenAt: rvStamp(v[32]) };
  });
}
function readShots(ss) {
  return rvRows(ss, "shots").filter(function (r) { return !cellText(r.v[10]); }).map(function (r) {
    var v = r.v;
    return { id: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), custKey: cellText(v[3]), tag: cellText(v[4]), file: cellText(v[5]), url: cellText(v[6]), uploaded: rvStamp(v[8]), by: cellText(v[9]) };
  });
}
function readQuestions(ss) {
  return rvRows(ss, "questions").map(function (r) {
    var v = r.v;
    return { id: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), custKey: cellText(v[3]), tag: cellText(v[4]), from: cellText(v[5]), q: cellText(v[6]), qEn: cellText(v[7]), qZh: cellText(v[8]),
             askedAt: rvStamp(v[9]), status: cellText(v[10]) || "open", a: cellText(v[11]), aVi: cellText(v[12]), aEn: cellText(v[13]), aZh: cellText(v[14]), answeredBy: cellText(v[15]), answeredAt: rvStamp(v[16]), seenAt: rvStamp(v[17]) };
  });
}
function readResources(ss) {
  return rvRows(ss, "resources").filter(function (r) { return !cellText(r.v[16]); }).map(function (r) {
    var v = r.v;
    return { id: cellText(v[0]), kind: cellText(v[1]), clinic: cellText(v[2]), title: cellText(v[3]), date: rvDay(v[4]), lang: cellText(v[5]), file: cellText(v[6]), mime: cellText(v[7]), driveId: cellText(v[8]),
             url: cellText(v[9]), text: cellText(v[10]), order: Number(v[11]) || 0, visible: cellText(v[12]) === "N" ? 0 : 1, uploaded: rvStamp(v[13]), by: cellText(v[14]), updated: rvStamp(v[15]) };
  });
}
/* Cadence (CN): the reviewer's own wording per product and milestone, shown in Chinese */
function readCadenceCN(ss) {
  var sh = ss.getSheetByName("Cadence (CN)"); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().filter(function (v) { return cellText(v[0]).trim() && cellText(v[1]).trim(); })
    .map(function (v) { return { product: productKey(v[0]) || cellText(v[0]).trim(), stage: cellText(v[1]).trim(), text: cellText(v[2]).trim() }; });
}

/* ---------------------------------------------------------------- reading for the page */
function reviewerGet(rv, p) {
  if (p.action === "ping") return { ok: 1, role: rv.role, reviewer: rv.id, at: now() };
  if (p.action === "shot") return getShot(rv, p.id);
  return reviewerBootstrap(rv);
}
function reviewerBootstrap(rv) {
  var res = { ok: 1, role: rv.role, reviewer: rv.id, name: rv.name, approver: rv.approver || "", approvers: approverNames(), hoNames: hoNames(), reviewers: {}, generated: now(), today: rvToday(),
              clinics: {}, audits: [], weekly: [], shots: [], settings: {}, cadenceCN: [] }, done = {};
  Object.keys(rv.clinics).forEach(function (code) {
    if (!CLINICS[code]) { res.clinics[code] = { error: "clinic not configured" }; return; }
    var crm = openClinic(code);                         /* read only on this path */
    var customers = readMembership(crm, code), das = {};
    customers.forEach(function (c) { if (c.da) das[c.da] = (das[c.da] || 0) + 1; });
    res.clinics[code] = { customers: customers, das: das, cadence: readCadence(crm), tasks: readTab(crm, TABS.tasks, code), settings: readSettings(crm) };
  });
  Object.keys(rv.clinics).forEach(function (code) {
    if (!res.clinics[code] || res.clinics[code].error) return;
    var ss = rvTracker(rv, code);
    if (rv.role === "reviewer") switchOver(ss, rv, code, res.clinics[code].customers);
    res.reviewers[code] = reviewerFor(code).name;
    var mine = function (x) { return !x.clinic || x.clinic === code; };
    res.audits = res.audits.concat(readAudits(ss).filter(mine));
    res.weekly = res.weekly.concat(readWeekly(ss).filter(mine));
    res.shots = res.shots.concat(readShots(ss).filter(mine));
    res.questions = (res.questions || []).concat(readQuestions(ss).filter(mine));
    res.resources = (res.resources || []).concat(readResources(ss).filter(function (x) { return !x.clinic || x.clinic === code; }));
    if (!done[rv.clinics[code]]) { done[rv.clinics[code]] = 1; res.settings[code] = rvSettings(ss); if (!res.cadenceCN.length) res.cadenceCN = readCadenceCN(ss); }
    else res.settings[code] = rvSettings(ss);
  });
  return res;
}

/* ---------------------------------------------------------------- switch-over from the week sheets
   Once per tracker: the marks typed into the old week sheets (W42, W43 …) from start_week on are
   copied into the Audit and Weekly tabs, and every W sheet is hidden (never deleted). */
function switchOver(ss, rv, clinic, customers) {
  var set = rvSettings(ss);
  if (set.switched_over) return { skipped: 1 };
  var start = set.start_week || "", byTag = {}, byPhone = {}, imported = 0, weeks = [];
  customers.forEach(function (c) {
    var t = compactTag(c.tag); if (t && !byTag[t]) byTag[t] = c;
    var ph = normPhone(c.phone); if (ph) (byPhone[ph] = byPhone[ph] || []).push(c);
  });
  function match(tag){
    var c = byTag[compactTag(tag)]; if (c) return c;
    var m = /(0\d{9})\s*$/.exec(String(tag || "").replace(/\s+/g, " ").trim()), list = m ? byPhone[m[1]] : null;
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    var words = normText(tag), best = list.filter(function (x) { var nm = normText(x.name).split(" "); return nm.length && words.indexOf(nm[nm.length - 1]) !== -1; });
    return best[0] || list[0];
  }
  var auditSh = ss.getSheetByName(RV_TABS.audit), at = now();
  ss.getSheets().forEach(function (sh) {
    if (!/^W\d{1,2}$/.test(sh.getName())) return;
    var last = sh.getLastRow(); if (last < 1) return;
    var vals = sh.getRange(1, 1, last, 10).getValues();
    var m = /(\d{4}-\d{2}-\d{2})/.exec(cellText(vals[0][0])), week = m ? m[1] : "";
    if (!week || (start && week < start)) return;
    var hdrRow = -1;
    for (var i = 0; i < Math.min(vals.length, 20); i++) if (/Zalo/.test(cellText(vals[i][1])) && /客户|Customer/.test(cellText(vals[i][2]))) { hdrRow = i; break; }
    var remark = "";
    for (var j = 0; j < Math.min(vals.length, 9); j++) if (/综合评述|Overall remark/.test(cellText(vals[j][0]))) remark = cellText(vals[j][1]).trim();
    var rows = [];
    if (hdrRow >= 0) for (var r = hdrRow + 1; r < vals.length; r++) {
      var v = vals[r], tag = cellText(v[1]).split("\n")[0].replace(/\s+/g, " ").trim(), miss = cellText(v[8]).trim(), fb = cellText(v[9]).trim();
      if (!tag || (!miss && !fb)) continue;
      var c = match(tag), ck = c ? keyOf(c.phone, c.name) : "tag:" + compactTag(tag);
      var key = week + "|" + clinic + "|" + ck;
      if (rvFindRow(auditSh, key)) continue;
      var line = []; for (var k = 0; k < RV_AUDIT_COLS; k++) line.push("");
      line[0] = key; line[1] = "'" + week; line[2] = clinic; line[3] = ck; line[4] = tag; line[5] = c ? c.name : cellText(v[2]);
      line[6] = c ? (productKey(c.product) || cellText(v[4])) : cellText(v[4]); line[7] = c ? c.da : cellText(v[3]); line[8] = cellText(v[6]);
      line[9] = "checked"; line[10] = "noted"; line[13] = miss; line[15] = fb; line[18] = at; line[19] = rv.id; line[20] = at; line[21] = "{}"; line[22] = "sheet " + sh.getName(); line[23] = at;
      rows.push(line);
    }
    if (rows.length) { auditSh.getRange(auditSh.getLastRow() + 1, 1, rows.length, RV_AUDIT_COLS).setValues(rows); imported += rows.length; }
    if (remark) upsertWeekly(ss, rv, { week: week, clinic: clinic, remark: remark });
    weeks.push(sh.getName() + ":" + rows.length);
  });
  ss.getSheets().forEach(function (sh) { if (/^W\d{1,2}$/.test(sh.getName())) { try { sh.hideSheet(); } catch (e) {} } });
  setRvSetting(ss, "switched_over", at + " · " + (weeks.join(", ") || "no marks"));
  return { imported: imported, weeks: weeks };
}
function compactTag(t) { return String(t || "").split("\n")[0].replace(/\s+/g, "").toLowerCase(); }

/* ---------------------------------------------------------------- writes */
function reviewerPost(rv, body) {
  var a = body.action;
  if (rv.role === "ho") {
    switch (a) {
      case "hoEdit":       return hoEdit(rv, body);
      case "hoApprove":    return hoApprove(rv, body);
      case "hoFeedback":   return hoFeedback(rv, body);
      case "hoTranslate":  return hoTranslate(rv, body);
      case "weekStatus":   return weekStatus(rv, body);
      case "answerQuestion": return answerQuestion(rv, body);
      case "resourceUpload": return resourceUpload(rv, body.resource || {});
      case "resourceSave":   return resourceSave(rv, body);
      case "resourceRemove": return resourceRemove(rv, body);
      case "shotUpload":   return shotUpload(rv, body.shot || {});
      case "shotRemove":   return shotSetRemoved(rv, body.clinic, body.id, true);
      case "shotRestore":  return shotSetRemoved(rv, body.clinic, body.id, false);
      default: throw new Error("unknown action: " + a);
    }
  }
  switch (a) {
    case "auditSave":     return auditSave(rv, body.audits || [], body.stats || []);
    case "auditRemove":   return auditRemove(rv, body.keys || [], body.clinic, body.stats || []);
    case "feedbackSave":  return feedbackSave(rv, body);
    case "weekStatus":    return weekStatus(rv, body);
    case "hoTranslate":   return hoTranslate(rv, body);
    case "answerQuestion": return answerQuestion(rv, body);
    case "shotUpload":    return shotUpload(rv, body.shot || {});
    case "shotRemove":    return shotSetRemoved(rv, body.clinic, body.id, true);
    case "shotRestore":   return shotSetRemoved(rv, body.clinic, body.id, false);
    default: throw new Error("unknown action: " + a);
  }
}
function auditLine(rv, a) {
  if (!a.key || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.week || ""))) throw new Error("audit needs key and week");
  var at = now(), line = [
    String(a.key), "'" + a.week, String(a.clinic), cellText(a.custKey), cellText(a.tag).slice(0, 300), cellText(a.name).slice(0, 200), cellText(a.product), cellText(a.da),
    cellText(a.due), a.status === "checked" ? "checked" : "sampled", cellText(a.verdict), a.score === "" || a.score === null || a.score === undefined ? "" : Number(a.score),
    cellText(a.found).slice(0, 500), cellText(a.missing).slice(0, 2000), Number(a.notFound) || 0, cellText(a.remark).slice(0, 5000),
    a.data ? "Y" : "", Number(a.shots) || 0, cellText(a.checkedAt), rv.id, at, JSON.stringify(a.marks || {}).slice(0, 20000), cellText(a.source || "app"), cellText(a.added || at)];
  return line;
}
function weekRowStatus(ss, week, clinic) {
  var sh = ss.getSheetByName(RV_TABS.weekly), r = rvFindRow(sh, week + "|" + clinic);
  return r ? (cellText(sh.getRange(r, 19).getValue()) || "marking") : "marking";
}
function assertOpen(ss, week, clinic) {
  var s = weekRowStatus(ss, week, clinic);
  if (RV_LOCKED[s]) throw new Error("week " + week + " is " + s + "; reopen it first");
}
function auditSave(rv, audits, stats) {
  var saved = 0, at = now(), translated = { by: "none", rows: {}, weekly: null, errors: [] }, withdrawn = [];
  audits.forEach(function (a) {
    var ss = rvTracker(rv, a.clinic); assertOpen(ss, a.week, a.clinic);
    var sh = ss.getSheetByName(RV_TABS.audit), line = auditLine(rv, a), r = rvFindRow(sh, line[0]);
    if (r) {
      var cur = sh.getRange(r, 1, 1, RV_AUDIT_COLS).getValues()[0], oldMarks = cellText(cur[21]);
      sh.getRange(r, 1, 1, RV_AUDIT_RV_COLS).setValues([line]);
      /* head office's tick corrections survive a re-save unless the reviewer's own marks changed (the log keeps them either way) */
      if (oldMarks !== line[21] && cellText(cur[30])) sh.getRange(r, 31).setValue("");
      /* a chat already approved for the DA loses the approval when its marks, remark, status or data flag change */
      if (cellText(cur[33]) && (oldMarks !== line[21] || cellText(cur[15]) !== line[15] || line[9] !== "checked" || cellText(cur[16]) !== line[16])) {
        var lg = parseJson(cellText(cur[29]), []); lg.push({ at: at, by: rv.id, f: "approval", old: cellText(cur[33]), "new": "", what: "approval withdrawn: the reviewer changed the chat" });
        sh.getRange(r, 30).setValue(appendLog(lg, [])); sh.getRange(r, 34, 1, 2).setValues([["", ""]]); withdrawn.push(line[0]);
      }
    } else sh.getRange(sh.getLastRow() + 1, 1, 1, RV_AUDIT_RV_COLS).setValues([line]);
    saved++;
    /* a checked chat is ready for head office: translate its remark now (nothing happens when it was translated already) */
    if (line[9] === "checked") {
      var tr = safeTranslate(ss, rv, a.clinic, a.week, { keys: [line[0]], weekly: 0 });
      if (tr && tr.rows) Object.keys(tr.rows).forEach(function (k) { translated.rows[k] = tr.rows[k]; });
      if (tr && tr.by && tr.by !== "none") translated.by = tr.by;
      if (tr && tr.errors) translated.errors = translated.errors.concat(tr.errors);
      if (tr && tr.error) translated.errors.push(tr.error);
    }
  });
  stats.forEach(function (s) { upsertWeekly(rvTracker(rv, s.clinic), rv, s); });
  return { ok: 1, saved: saved, at: at, translated: translated, withdrawn: withdrawn };
}
function auditRemove(rv, keys, clinic, stats) {
  var ss = rvTracker(rv, clinic), sh = ss.getSheetByName(RV_TABS.audit), removed = 0;
  keys.forEach(function (k) { var r = rvFindRow(sh, String(k)); if (r) { assertOpen(ss, cellText(String(k)).split("|")[0], clinic); sh.deleteRow(r); removed++; } });
  stats.forEach(function (s) { upsertWeekly(rvTracker(rv, s.clinic), rv, s); });
  return { ok: 1, removed: removed };
}
/* s: {week, clinic, remark?, dueCustomers, dueCadences, sampled, checked, pass, partial, fail, data, score, weekScore, notFound, daSent,
       status?, submittedAt?, approvedBy?, publishedAt?, remarkEn?, remarkVi?, remarkZh?, hoNote?, sendBack?, hoEdits?, translatedAt?, translatedBy?, takenAt?, hoBy?}
   Fields left undefined keep their cell. "By" (the reviewer) is only rewritten by a reviewer; HO's identity goes to "HO reviewer". */
function upsertWeekly(ss, rv, s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.week || ""))) throw new Error("weekly row needs week");
  var sh = ss.getSheetByName(RV_TABS.weekly), key = s.week + "|" + s.clinic, r = rvFindRow(sh, key), n = RV_WEEKLY_COLS;
  var cur = r ? sh.getRange(r, 1, 1, n).getValues()[0] : [];
  function keep(i, v) { return v === undefined ? (cur[i] === undefined ? "" : cur[i]) : v; }
  function text(i, v, max) { return v === undefined ? cellText(cur[i]) : cellText(v).slice(0, max || 8000); }
  var line = [key, "'" + s.week, s.clinic, keep(3, s.dueCustomers), keep(4, s.dueCadences), keep(5, s.sampled), keep(6, s.checked), keep(7, s.pass), keep(8, s.partial),
              keep(9, s.fail), keep(10, s.data), keep(11, s.score), keep(12, s.weekScore), keep(13, s.notFound), keep(14, s.daSent),
              text(15, s.remark), rv.role === "reviewer" || !r ? rv.id : cellText(cur[16]), now(),
              s.status === undefined ? (cellText(cur[18]) || "marking") : s.status, text(19, s.submittedAt), text(20, s.approvedBy, 200), text(21, s.publishedAt),
              text(22, s.remarkEn), text(23, s.remarkVi), text(24, s.remarkZh), text(25, s.hoNote), text(26, s.sendBack, 4000),
              s.hoEdits === undefined ? cellText(cur[27]) : JSON.stringify(s.hoEdits || []).slice(0, 20000), text(28, s.translatedAt), text(29, s.translatedBy, 100), text(30, s.takenAt), text(31, s.hoBy, 80)];
  line = line.map(function (v) { return v === null ? "" : v; });
  if (r) sh.getRange(r, 1, 1, n).setValues([line]); else sh.getRange(sh.getLastRow() + 1, 1, 1, n).setValues([line]);
  return { ok: 1, key: key };
}
function feedbackSave(rv, b) {
  var ss = rvTracker(rv, b.clinic); assertOpen(ss, b.week, b.clinic);
  var s = Object.assign({}, b.stats || {}, { week: b.week, clinic: b.clinic, remark: cellText(b.text) });
  upsertWeekly(ss, rv, s);
  var translated = cellText(b.text) ? safeTranslate(ss, rv, b.clinic, b.week, { keys: [], weekly: 1 }) : null;
  return { ok: 1, at: now(), translated: translated };
}
/* body: {week, clinic, status, stats, note?, approvedBy?}.
   Reviewer: marking → submitted (Complete: locks the week, translates what is left, emails HO once when email_ho is set);
             submitted → marking (Reopen, no email).
   HO:       submitted → review (Start review); submitted | review → published (Publish, needs approvedBy,
             emails the reviewer); submitted | review → marking (Send back, needs a note, emails the reviewer);
             published → review (Reopen review). */
function weekStatus(rv, b) {
  var ss = rvTracker(rv, b.clinic), cur = weekRowStatus(ss, b.week, b.clinic), next = String(b.status || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.week || ""))) throw new Error("week needed");
  var at = now(), s = Object.assign({}, b.stats || {}, { week: b.week, clinic: b.clinic, status: next }), emailed = 0, translated = null, log = null;
  if (rv.role === "ho") {
    var wk = readWeeklyRow(ss, b.week, b.clinic), edits = wk.hoEdits || [];
    function logIt(what, extra) { edits.push(Object.assign({ at: at, by: rv.id, f: "status", old: cur, "new": next, what: what }, extra || {})); }
    if (next === "review") {
      if (cur !== "submitted" && cur !== "published") throw new Error("only a submitted or published week can be reviewed; it is " + cur);
      if (!wk.takenAt || cur === "published") { s.takenAt = at; s.hoBy = rv.id; }
      if (cur === "published") { logIt("reopened review", { approvedBy: wk.approvedBy, publishedAt: wk.publishedAt }); s.publishedAt = ""; }
      else logIt("took for review");
    } else if (next === "published") {
      if (!HO_OPEN[cur]) throw new Error("only a submitted week or one under review can be published; it is " + cur);
      var ap = cellText(b.approvedBy).trim(); if (!ap) throw new Error("approvedBy is required: who approved this week");
      s.approvedBy = ap; s.publishedAt = at; if (!wk.takenAt) { s.takenAt = at; s.hoBy = rv.id; }
      translated = safeTranslate(ss, rv, b.clinic, b.week, { force: false });
      s.approvedChats = stampApprovals(ss, b.week, b.clinic, ap, at);
      logIt("published", { approvedBy: ap });
    } else if (next === "marking") {
      if (!HO_OPEN[cur]) throw new Error("only a submitted week or one under review can be sent back; it is " + cur);
      var note = cellText(b.note).trim(); if (!note) throw new Error("a note for the reviewer is required to send a week back");
      s.sendBack = note; logIt("sent back", { note: note });
    } else throw new Error("unknown status: " + next);
    s.hoEdits = edits;
    upsertWeekly(ss, rv, s);
    if (next === "published") emailed = notifyCz(ss, rv, b.clinic, b.week, "published", { approvedBy: s.approvedBy, stats: b.stats || {} });
    if (next === "marking") emailed = notifyCz(ss, rv, b.clinic, b.week, "sent back", { note: s.sendBack, stats: b.stats || {} });
    return { ok: 1, status: next, at: at, emailed: emailed, translated: translated, takenAt: s.takenAt || wk.takenAt || "", hoBy: s.hoBy || wk.hoBy || "", approvedChats: s.approvedChats || [] };
  }
  if (next === "submitted") { if (cur !== "marking") throw new Error("week is already " + cur); s.submittedAt = at; s.sendBack = ""; }
  else if (next === "marking") { if (cur !== "submitted") throw new Error("only a submitted week can be reopened; it is " + cur); s.submittedAt = ""; }
  else throw new Error("unknown status: " + next);
  upsertWeekly(ss, rv, s);
  if (next === "submitted") { translated = safeTranslate(ss, rv, b.clinic, b.week, { force: false }); emailed = notifyHo(ss, rv, b.clinic, b.week, b.stats || {}); }
  return { ok: 1, status: next, at: at, emailed: emailed, translated: translated };
}
function readWeeklyRow(ss, week, clinic) {
  var hit = readWeekly(ss).filter(function (w) { return w.week === week && w.clinic === clinic; })[0];
  return hit || { key: week + "|" + clinic, week: week, clinic: clinic, status: "marking", hoEdits: [] };
}
function safeTranslate(ss, rv, clinic, week, opt) {
  try { return translateWeek(ss, rv, clinic, week, opt || {}); }
  catch (err) { return { ok: 0, error: String(err && err.message || err) }; }
}
function notifyHo(ss, rv, clinic, week, st) {
  var set = rvSettings(ss), to = String(set.email_ho || "").split(/[,;\s]+/).filter(Boolean);
  if (!to.length) return 0;
  var link = String(set.app_url || "") + "#/clinic-" + String(clinic).toLowerCase();
  var subject = "[Zalo SOP] " + rv.name + " completed " + clinic + " week of " + week;
  var body = rv.name + " has completed the Zalo SOP audit for " + clinic + ", week of " + week + ".\n\n"
    + "Sampled: " + (st.sampled || 0) + " chats · checked: " + (st.checked || 0) + "\n"
    + "Items sent: " + (st.score === "" || st.score === undefined ? "—" : st.score + "%") + " · DA reported: " + (st.daSent === "" || st.daSent === undefined ? "—" : st.daSent + "%")
    + " · DA ticked, not found: " + (st.notFound || 0) + "\n"
    + "Pass " + (st.pass || 0) + " · partial " + (st.partial || 0) + " · fail " + (st.fail || 0) + " · data issues " + (st.data || 0) + "\n\n"
    + "Open it: " + link + "\n";
  try { MailApp.sendEmail({ to: to.join(","), subject: subject, body: body }); return to.length; }
  catch (err) { return 0; }
}
/* HO published a week, or sent it back: one email to the reviewer (email_cz in the tracker's settings). */
function notifyCz(ss, rv, clinic, week, what, x) {
  var set = rvSettings(ss), to = String(set.email_cz || "").split(/[,;\s]+/).filter(Boolean);
  if (!to.length) return 0;
  var st = x.stats || {}, link = String(set.app_url || "") + "#/clinic-" + String(clinic).toLowerCase();
  var subject = "[Zalo SOP] " + rv.name + " " + what + " " + clinic + " week of " + week + (what === "published" ? " (approved by " + x.approvedBy + ")" : "");
  var body = rv.name + " (head office) has " + what + " the Zalo SOP audit for " + clinic + ", week of " + week + ".\n\n"
    + (what === "published" ? "Approved by: " + x.approvedBy + "\n" : "Note: " + x.note + "\n\n")
    + (what === "published" ? "" : "The week is open for marking again; its entries can be changed and the week completed once more.\n\n")
    + "Sampled: " + (st.sampled || 0) + " chats · checked: " + (st.checked || 0) + " · items sent: " + (st.score === "" || st.score === undefined ? "—" : st.score + "%") + "\n\n"
    + "Open it: " + link + "\n";
  try { MailApp.sendEmail({ to: to.join(","), subject: subject, body: body }); return to.length; }
  catch (err) { return 0; }
}

/* ================================================================ head office (1.6.0)
   HO edits live in their own columns of the Audit and Weekly tabs; the reviewer's cells are never
   rewritten by HO. Every change carries who and when in the "HO edits" log. README §2.14.
   ================================================================ */
/* HO may edit while the week is marking (chats the reviewer has checked), submitted or under review; not once published */
function assertHoOpen(ss, week, clinic) {
  var s = weekRowStatus(ss, week, clinic);
  if (s !== "marking" && !HO_OPEN[s]) throw new Error("week " + week + " is " + s + "; reopen the review first");
  return s;
}
/* a first HO write on a submitted week takes it into review */
function takeWeek(ss, rv, week, clinic, status) {
  if (status !== "submitted") return;
  var wk = readWeeklyRow(ss, week, clinic), edits = wk.hoEdits || [], at = now();
  edits.push({ at: at, by: rv.id, f: "status", old: "submitted", "new": "review", what: "took for review" });
  upsertWeekly(ss, rv, { week: week, clinic: clinic, status: "review", takenAt: wk.takenAt || at, hoBy: rv.id, hoEdits: edits });
}
/* b: {clinic, week, key, ho: {hoMarks, remarkVi, remarkEn, remarkZh, hoNote, visible}, log: [new edit entries], derived: {verdict, score, found, missing, notFound}, stats}
   Writes HO's columns of one audit row (fields left undefined keep their cell), appends the page's new log
   entries, and the derived verdict columns, which the page recomputes from the corrected marks. */
function hoEdit(rv, b) {
  var ss = rvTracker(rv, b.clinic), status = assertHoOpen(ss, b.week, b.clinic);
  var sh = ss.getSheetByName(RV_TABS.audit), r = rvFindRow(sh, String(b.key || "")); if (!r) throw new Error("audit row not found: " + b.key);
  if (status === "marking" && cellText(sh.getRange(r, 10).getValue()) !== "checked") throw new Error("the reviewer has not checked this chat yet");
  if (cellText(sh.getRange(r, 34).getValue())) throw new Error("this chat is approved for the DA; withdraw the approval first");
  takeWeek(ss, rv, b.week, b.clinic, status);
  var h = b.ho || {}, d = b.derived || {}, cur = sh.getRange(r, 25, 1, 7).getValues()[0];
  function text(i, v, max) { return v === undefined ? cellText(cur[i]) : cellText(v).slice(0, max || 5000); }
  var line = [text(0, h.hoNote), text(1, h.remarkEn), text(2, h.remarkVi), text(3, h.remarkZh),
              h.visible === undefined ? cellText(cur[4]) : (h.visible ? "Y" : "N"),
              appendLog(parseJson(cellText(cur[5]), []), b.log),
              h.hoMarks === undefined ? cellText(cur[6]) : (h.hoMarks ? JSON.stringify(h.hoMarks).slice(0, 20000) : "")];
  sh.getRange(r, 25, 1, 7).setValues([line]);
  if (d.verdict !== undefined) sh.getRange(r, 11, 1, 5).setValues([[cellText(d.verdict), d.score === "" || d.score === null || d.score === undefined ? "" : Number(d.score), cellText(d.found).slice(0, 500), cellText(d.missing).slice(0, 2000), Number(d.notFound) || 0]]);
  if (b.stats) upsertWeekly(ss, rv, Object.assign({}, b.stats, { week: b.week, clinic: b.clinic }));
  return { ok: 1, key: String(b.key), at: now(), status: status === "submitted" ? "review" : status };
}
/* b: {clinic, week, keys, approvedBy, undo?} — head office approves checked chats for the DA one by one (or several at once),
   without waiting for the week to be completed; undo withdraws. Every approval is logged on the chat. */
function hoApprove(rv, b) {
  var ss = rvTracker(rv, b.clinic), status = assertHoOpen(ss, b.week, b.clinic), sh = ss.getSheetByName(RV_TABS.audit), at = now(), done = [], ap = cellText(b.approvedBy).trim();
  if (!b.undo && !ap) throw new Error("approvedBy is required: who approved");
  (b.keys || []).forEach(function (k) {
    var r = rvFindRow(sh, String(k)); if (!r) throw new Error("audit row not found: " + k);
    if (!b.undo && status === "marking" && cellText(sh.getRange(r, 10).getValue()) !== "checked") throw new Error("the reviewer has not checked this chat yet: " + k);
    var lg = parseJson(cellText(sh.getRange(r, 30).getValue()), []);
    lg.push({ at: at, by: rv.id, f: "approval", old: cellText(sh.getRange(r, 34).getValue()), "new": b.undo ? "" : ap, what: b.undo ? "approval withdrawn" : "approved for the DA" });
    sh.getRange(r, 30).setValue(appendLog(lg, []));
    sh.getRange(r, 34, 1, 2).setValues([[b.undo ? "" : ap, b.undo ? "" : at]]);
    done.push(String(k));
  });
  return { ok: 1, keys: done, approvedBy: b.undo ? "" : ap, at: b.undo ? "" : at, status: status };
}
/* publishing the week approves every checked, visible chat that has no approval yet */
function stampApprovals(ss, week, clinic, ap, at) {
  var sh = ss.getSheetByName(RV_TABS.audit), keys = [];
  rvRows(ss, "audit").forEach(function (r) {
    var v = r.v; if (rvDay(v[1]) !== week || cellText(v[2]) !== clinic) return;
    if (cellText(v[9]) !== "checked" || cellText(v[28]) === "N" || cellText(v[33])) return;
    sh.getRange(r.row, 34, 1, 2).setValues([[ap, at]]); keys.push(cellText(v[0]));
  });
  return keys;
}
/* b: {clinic, week, remarkVi?, hoNote?, log?: [new edit entries], stats?} — HO's wording of the week's overall feedback */
function hoFeedback(rv, b) {
  var ss = rvTracker(rv, b.clinic), status = assertHoOpen(ss, b.week, b.clinic);
  takeWeek(ss, rv, b.week, b.clinic, status);
  var s = Object.assign({}, b.stats || {}, { week: b.week, clinic: b.clinic });
  ["remarkVi", "remarkEn", "remarkZh", "hoNote"].forEach(function (f) { if (b[f] !== undefined) s[f] = b[f]; });
  if (b.log && b.log.length) s.hoEdits = JSON.parse(appendLog(readWeeklyRow(ss, b.week, b.clinic).hoEdits || [], b.log));
  upsertWeekly(ss, rv, s);
  return { ok: 1, at: now(), status: status === "submitted" ? "review" : status };
}
/* the edit log as a cell: existing entries plus the new ones, oldest dropped past 20000 characters */
function appendLog(cur, add) {
  var list = (cur || []).concat(add || []), text = JSON.stringify(list);
  while (text.length > 20000 && list.length > 1) { list.shift(); text = JSON.stringify(list); }
  return text;
}
/* b: {clinic, week, keys?: [audit keys], weekly?: 1, force?: 1} — translate on demand (both roles) */
function hoTranslate(rv, b) {
  var ss = rvTracker(rv, b.clinic);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.week || ""))) throw new Error("week needed");
  return translateWeek(ss, rv, b.clinic, b.week, { keys: b.keys, weekly: b.weekly === undefined ? 1 : b.weekly, force: !!b.force });
}

/* ---------------------------------------------------------------- translation
   Each remark is kept in the language it was written in plus the other two. The reviewer's remark
   (usually Chinese) feeds en + vi; once HO has edited the Vietnamese, that Vietnamese is what the DA
   reads and feeds en + zh, so the reviewer can read back what was published. A row is translated when
   its source is newer than its last translation (or force). Claude via the Messages API when
   ANTHROPIC_API_KEY is set and the setting `translate` is claude; otherwise Google Translate. */
var TR_GLOSSARY = [
  ["会员权益", "quyền lợi hội viên", "member benefits"], ["转介绍 / 引导推荐", "mời giới thiệu", "referral request"], ["回访 / 关心", "hỏi thăm", "check-in"],
  ["使用指南 / 使用说明", "hướng dẫn sử dụng", "usage guide"], ["介绍消息", "tin nhắn giới thiệu", "intro message"], ["预计制镜时间", "thời gian dự kiến làm kính", "production ETA"],
  ["到货通知", "báo kính về", "glasses arrived"], ["取镜预约", "hẹn ngày lấy kính", "pickup appointment"], ["取镜", "nhận kính", "glass collection"], ["定金", "đặt cọc", "deposit"],
  ["复诊", "tái khám", "recall visit"], ["调整镜架", "chỉnh gọng", "frame adjustment"], ["提醒佩戴", "nhắc đeo", "wear reminder"], ["滴药指导", "hướng dẫn nhỏ thuốc", "drop instructions"],
  ["助理", "trợ lý", "DA (clinic assistant)"], ["截图", "ảnh chụp màn hình", "screenshot"], ["Zalo 标签", "tag Zalo", "Zalo tag"], ["节点", "mốc / cadence", "cadence"], ["客户", "khách hàng", "customer"]
];
function detectLang(text) {
  var s = String(text || "");
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(s)) return "zh";
  if (/[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹĂÂĐÊÔƠƯ]/.test(s) || /\b(và|không|của|được|khách|chưa|đã)\b/i.test(s)) return "vi";
  return "en";
}
function anthropicKey() { try { return PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY") || ""; } catch (e) { return ""; } }
/* translateWeek: rows of the week (the sample, or opt.keys) and the weekly remark. Returns what changed. */
function translateWeek(ss, rv, clinic, week, opt) {
  var set = rvSettings(ss), mode = String(set.translate || "claude").toLowerCase();
  var res = { ok: 1, by: "none", rows: {}, weekly: null, skipped: 0, errors: [] };
  if (mode === "off") { res.by = "off"; return res; }
  var sh = ss.getSheetByName(RV_TABS.audit), items = [], targets = {}, want = opt.keys ? {} : null;
  (opt.keys || []).forEach(function (k) { want[String(k)] = 1; });
  rvRows(ss, "audit").forEach(function (r) {
    var v = r.v; if (rvDay(v[1]) !== week || cellText(v[2]) !== clinic) return;
    if (want && !want[cellText(v[0])]) return;
    var src = pickSource({ remark: cellText(v[15]), remarkVi: cellText(v[26]), hoEdits: parseJson(cellText(v[29]), []), translatedAt: rvStamp(v[31]), translatedBy: cellText(v[32]) }, opt.force);
    if (!src) { res.skipped++; return; }
    items.push({ id: cellText(v[0]), text: src.text, from: src.from }); targets[cellText(v[0])] = { row: r.row, from: src.from, text: src.text };
  });
  var wk = null;
  if (opt.weekly === undefined || opt.weekly) {
    wk = readWeeklyRow(ss, week, clinic);
    var wsrc = pickSource(wk, opt.force);
    if (wsrc) { items.push({ id: "weekly", text: wsrc.text, from: wsrc.from }); targets.weekly = { from: wsrc.from, text: wsrc.text }; }
  }
  if (!items.length) return res;
  var out = translateBatch(items, mode, set.translate_model, res), at = now();
  Object.keys(targets).forEach(function (key) {
    var t = out.map[key]; if (!t || key === "weekly") return;
    var tg = targets[key], line = [t.en || "", t.vi || "", t.zh || ""], by = out.by + " " + tg.from + ":" + fp(tg.text);
    /* the source language's slot keeps the original wording; "translated by" also records which text was translated */
    sh.getRange(tg.row, 26, 1, 3).setValues([line]); sh.getRange(tg.row, 32, 1, 2).setValues([[at, by]]);
    res.rows[key] = { en: line[0], vi: line[1], zh: line[2], translatedAt: at, translatedBy: by };
  });
  if (out.map.weekly && targets.weekly) {
    var w = out.map.weekly, wby = out.by + " " + targets.weekly.from + ":" + fp(targets.weekly.text);
    upsertWeekly(ss, rv, { week: week, clinic: clinic, remarkEn: w.en || "", remarkVi: w.vi || "", remarkZh: w.zh || "", translatedAt: at, translatedBy: wby });
    res.weekly = { en: w.en || "", vi: w.vi || "", zh: w.zh || "", translatedAt: at, translatedBy: wby };
  }
  res.by = out.by;
  return res;
}
/* Which text feeds a row's translation, and whether it needs doing. HO's Vietnamese edit is the source
   while it was made against the reviewer's current remark (the edit log carries `base`); otherwise the
   reviewer's remark is. A text already translated (its fingerprint sits in "translated by") is skipped. */
function pickSource(x, force) {
  var edits = x.hoEdits || [], e = null;
  for (var i = 0; i < edits.length; i++) if (edits[i].f === "remarkVi" && (!e || edits[i].at > e.at)) e = edits[i];
  var viValid = !!(e && x.remarkVi && (e.base === undefined || e.base === (x.remark || "")));
  var src = viValid ? { text: x.remarkVi, from: "vi" } : x.remark ? { text: x.remark, from: detectLang(x.remark) } : null;
  if (!src) return null;
  if (force || !x.translatedAt) return src;
  return String(x.translatedBy || "").indexOf(src.from + ":" + fp(src.text)) !== -1 ? null : src;
}
function fp(s) { s = String(s || ""); var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
/* items: [{id, text, from}] → {by, map: {id: {en, vi, zh}}} */
function translateBatch(items, mode, model, res) {
  var key = mode === "claude" ? anthropicKey() : "";
  if (mode === "claude" && key) {
    try { return { by: "claude:" + (model || "claude-opus-5-5"), map: claudeTranslate(items, key, model || "claude-opus-5-5") }; }
    catch (err) { res.errors.push("claude: " + String(err && err.message || err)); }
  } else if (mode === "claude") res.errors.push("claude: no ANTHROPIC_API_KEY in Script properties");
  var map = {};
  items.forEach(function (it) {
    var o = {}; o[it.from] = it.text;
    ["en", "vi", "zh"].forEach(function (to) { if (to === it.from) return; try { o[to] = LanguageApp.translate(it.text, it.from, to === "zh" ? "zh-CN" : to); } catch (err) { o[to] = ""; res.errors.push("google: " + String(err && err.message || err)); } });
    map[it.id] = o;
  });
  return { by: "google", map: map };
}
var TR_SYSTEM = "You translate quality-audit feedback for the Zalo customer-care SOP of an eye-care clinic group in Vietnam (Bệnh viện Mắt Sài Gòn). "
  + "A Chinese-speaking QA reviewer writes how a clinic assistant (DA, 助理, trợ lý) followed up customers on Zalo; head office reads it in English; the assistant reads it in Vietnamese. "
  + "For every item, give the text in all three languages: keep the field of the source language exactly as written and translate into the other two. "
  + "Rules: faithful and complete, nothing added or dropped; natural and polite in Vietnamese (the assistant is addressed as 'em' or 'bạn', not scolded); concise in English. "
  + "Keep cadence codes (D1, D6-7, CD, CDN, CD+1, CD+3-5, CD+7, CD+14, CD+30, CD+90, CD+180, CD+270, CD+365, also written CD3-5 or D90), product codes (MC, Kính, OK, Ortho-K, Atropine), "
  + "names, phone numbers, dates, counts and Zalo tags exactly as written. Use this glossary (zh = vi = en): "
  + TR_GLOSSARY.map(function (g) { return g[0] + " = " + g[1] + " = " + g[2]; }).join("; ") + ". "
  + "Reply with only a JSON array, one object per input item in the same order: {\"id\": …, \"en\": …, \"vi\": …, \"zh\": …}. No markdown, no commentary.";
function claudeTranslate(items, key, model) {
  var payload = { model: model, max_tokens: 16000, system: TR_SYSTEM, output_config: { effort: "low" },
                  messages: [{ role: "user", content: JSON.stringify(items.map(function (it) { return { id: it.id, from: it.from, text: it.text }; })) }] };
  var resp = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post", contentType: "application/json", headers: { "x-api-key": key, "anthropic-version": "2026-10-21" }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  var code = resp.getResponseCode(), text = resp.getContentText();
  if (code !== 200) throw new Error("HTTP " + code + " " + text.slice(0, 300));
  var j = JSON.parse(text);
  if (j.stop_reason === "refusal") throw new Error("the model declined to translate");
  if (j.stop_reason === "max_tokens") throw new Error("translation cut off (max_tokens)");
  var body = (j.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("").trim();
  body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  var arr = JSON.parse(body), map = {};
  if (!Array.isArray(arr)) throw new Error("unexpected reply shape");
  arr.forEach(function (o) { if (o && o.id !== undefined) map[String(o.id)] = { en: cellText(o.en), vi: cellText(o.vi), zh: cellText(o.zh) }; });
  items.forEach(function (it) { if (!map[it.id]) throw new Error("item " + it.id + " missing from the reply"); map[it.id][it.from] = it.text; });
  return map;
}
/* Paste the key, run once from the editor, then put PASTE-KEY-HERE back (the key lives in Script
   properties, never in this file). Or add it by hand: Project settings → Script properties. */
function setAnthropicKey() {
  var key = "PASTE-KEY-HERE";
  if (!/^sk-/.test(key)) throw new Error("paste the key into setAnthropicKey() first");
  PropertiesService.getScriptProperties().setProperty("ANTHROPIC_API_KEY", key);
  Logger.log("ANTHROPIC_API_KEY saved (" + key.slice(0, 7) + "…)");
}
/* Run once from the editor before publishing 1.6.0: asks for the external-request permission and shows a sample. */
function testTranslation() {
  var r = { errors: [] }, out = translateBatch([{ id: "t", text: "会员权益已发，但 CD3-5 没有回访。", from: "zh" }], anthropicKey() ? "claude" : "google", "claude-opus-5-5", r);
  Logger.log(JSON.stringify({ by: out.by, result: out.map.t, errors: r.errors }));
  return out;
}

/* ---------------------------------------------------------------- screenshots */
function shotFolder(ss) {
  var id = rvSettings(ss).screenshot_folder;
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var parent = null;
  try { var it = DriveApp.getFileById(ss.getId()).getParents(); if (it.hasNext()) parent = it.next(); } catch (e) {}
  var f = null, title = "CZ 审核截图 Audit screenshots";
  if (parent) { try { f = parent.createFolder(title); } catch (e) { f = null; } }
  if (!f) f = DriveApp.createFolder(title);
  setRvSetting(ss, "screenshot_folder", f.getId());
  return f;
}
function weekFolder(root, name) {
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
/* shot: {id, week, clinic, custKey, tag, name, mime, data (base64, or a data: URL)} */
function shotUpload(rv, s) {
  var ss = rvTracker(rv, s.clinic), data = String(s.data || ""), m = /^data:([^;]+);base64,/.exec(data), mime = m ? m[1] : String(s.mime || "image/jpeg");
  if (m) data = data.slice(m[0].length);
  if (!/^image\//.test(mime)) throw new Error("screenshots must be images");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.week || ""))) throw new Error("screenshot needs a week");
  var bytes = Utilities.base64Decode(data);
  if (bytes.length > 8 * 1024 * 1024) throw new Error("screenshot is larger than 8 MB");
  var id = String(s.id || ("s" + new Date().getTime())), ext = mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
  var fname = [s.week, s.clinic, cellText(s.tag).replace(/[\\/:*?"<>|]/g, "").slice(0, 60), id].join(" ") + ext;
  var file = weekFolder(shotFolder(ss), s.week + " " + s.clinic).createFile(Utilities.newBlob(bytes, mime, fname));
  var sh = ss.getSheetByName(RV_TABS.shots), at = now();
  sh.getRange(sh.getLastRow() + 1, 1, 1, RV_HEADERS.shots.length).setValues([[id, "'" + s.week, s.clinic, cellText(s.custKey), cellText(s.tag), fname, file.getUrl(), file.getId(), at, rv.id, ""]]);
  return { ok: 1, id: id, url: file.getUrl(), file: fname, uploaded: at };
}
function shotRow(rv, clinic, id) {
  var codes = clinic ? [clinic] : Object.keys(rv.clinics);
  for (var i = 0; i < codes.length; i++) {
    var ss = rvTracker(rv, codes[i]), sh = ss.getSheetByName(RV_TABS.shots), r = rvFindRow(sh, String(id));
    if (r) return { ss: ss, sh: sh, row: r, v: sh.getRange(r, 1, 1, RV_HEADERS.shots.length).getValues()[0] };
  }
  throw new Error("screenshot not found");
}
function getShot(rv, id) {
  var f = shotRow(rv, "", id), file = DriveApp.getFileById(cellText(f.v[7])), blob = file.getBlob();
  return { ok: 1, id: String(id), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
function shotSetRemoved(rv, clinic, id, removed) {
  var f = shotRow(rv, clinic, id);
  try { DriveApp.getFileById(cellText(f.v[7])).setTrashed(removed); } catch (e) {}
  f.sh.getRange(f.row, 11).setValue(removed ? "Y" : "");
  return { ok: 1, id: String(id), removed: removed ? 1 : 0 };
}

/* ---------------------------------------------------------------- questions (1.7.0): head office or the reviewer answers the DA */
function answerQuestion(rv, b) {
  var ss = rvTracker(rv, b.clinic), sh = ss.getSheetByName(RV_TABS.questions), r = rvFindRow(sh, String(b.id || "")); if (!r) throw new Error("question not found");
  var text = cellText(b.text).trim(); if (!text) throw new Error("the answer is empty");
  var from = detectLang(text), tr = trText(ss, text, from), at = now();
  sh.getRange(r, 11, 1, 7).setValues([["answered", text.slice(0, 4000), tr.vi || "", tr.en || "", tr.zh || "", rv.id, at]]);
  return { ok: 1, id: String(b.id), answeredAt: at, a: text, aVi: tr.vi || "", aEn: tr.en || "", aZh: tr.zh || "", answeredBy: rv.id };
}

/* ---------------------------------------------------------------- resources (1.7.0): head office uploads for the DA's Resources page
   Decks and photos go to a Drive folder next to the tracker and, when resources_public is Y, become viewable by anyone
   with the link so the DA's page can show them; template scripts are text only. Rows live in the Resources tab. */
var RES_KINDS = { deck: 1, photo: 1, script: 1 };
function resFolder(ss) {
  var id = rvSettings(ss).resources_folder;
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var parent = null;
  try { var it = DriveApp.getFileById(ss.getId()).getParents(); if (it.hasNext()) parent = it.next(); } catch (e) {}
  var f = null, title = "资料 Resources";
  if (parent) { try { f = parent.createFolder(title); } catch (e) { f = null; } }
  if (!f) f = DriveApp.createFolder(title);
  setRvSetting(ss, "resources_folder", f.getId());
  return f;
}
/* x: {kind, clinic?, title, date?, lang?, text?, name?, mime?, data? (base64 or data: URL)} */
function resourceUpload(rv, x) {
  if (rv.role !== "ho") throw new Error("only head office uploads resources");
  var code = x.clinic || Object.keys(rv.clinics)[0], ss = rvTracker(rv, code), kind = String(x.kind || "");
  if (!RES_KINDS[kind]) throw new Error("kind must be deck, photo or script");
  var title = cellText(x.title).trim(); if (!title) throw new Error("title is required");
  var date = iso(x.date) || "", id = "r" + new Date().getTime().toString(36), at = now(), file = null, fname = "", mime = "", url = "", driveId = "";
  if (kind !== "script") {
    var data = String(x.data || ""), m = /^data:([^;]+);base64,/.exec(data); mime = m ? m[1] : String(x.mime || "application/octet-stream");
    if (m) data = data.slice(m[0].length);
    if (!data) throw new Error("file is empty");
    if (kind === "photo" && !/^image\//.test(mime)) throw new Error("photos and posters must be images");
    var bytes = Utilities.base64Decode(data);
    if (bytes.length > 25 * 1024 * 1024) throw new Error("file is larger than 25 MB; export the deck as PDF or split it");
    fname = cellText(x.name).replace(/[\\/:*?"<>|]/g, "").slice(0, 120) || (title + (kind === "photo" ? ".jpg" : ".pdf"));
    file = resFolder(ss).createFile(Utilities.newBlob(bytes, mime, fname));
    if (String(rvSettings(ss).resources_public || "Y").toUpperCase() !== "N") { try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {} }
    url = file.getUrl(); driveId = file.getId();
  }
  var sh = ss.getSheetByName(RV_TABS.resources), order = sh.getLastRow();
  sh.getRange(sh.getLastRow() + 1, 1, 1, RV_HEADERS.resources.length).setValues([[id, kind, x.clinic ? code : "", title.slice(0, 200), date ? "'" + date : "", cellText(x.lang).slice(0, 5), fname, mime, driveId, url,
    cellText(x.text).slice(0, 20000), order, "Y", at, rv.id, at, ""]]);
  return { ok: 1, id: id, kind: kind, title: title, date: date, lang: cellText(x.lang), file: fname, mime: mime, driveId: driveId, url: url, text: cellText(x.text), order: order, visible: 1, uploaded: at, by: rv.id };
}
/* b: {id, clinic?, fields: {title, date, lang, text, order, visible, clinic}} */
function resourceSave(rv, b) {
  if (rv.role !== "ho") throw new Error("only head office edits resources");
  var ss = rvTracker(rv, b.clinic || Object.keys(rv.clinics)[0]), sh = ss.getSheetByName(RV_TABS.resources), r = rvFindRow(sh, String(b.id || "")); if (!r) throw new Error("resource not found");
  var f = b.fields || {}, cols = { title: 4, date: 5, lang: 6, text: 11, order: 12, visible: 13, clinic: 3 };
  Object.keys(f).forEach(function (k) {
    if (!cols[k]) return;
    var v = f[k];
    if (k === "date") v = iso(v) ? "'" + iso(v) : ""; else if (k === "visible") v = v ? "Y" : "N"; else if (k === "order") v = Number(v) || 0; else v = cellText(v).slice(0, k === "text" ? 20000 : 200);
    sh.getRange(r, cols[k]).setValue(v);
  });
  sh.getRange(r, 16).setValue(now());
  return { ok: 1, id: String(b.id) };
}
function resourceRemove(rv, b) {
  if (rv.role !== "ho") throw new Error("only head office removes resources");
  var ss = rvTracker(rv, b.clinic || Object.keys(rv.clinics)[0]), sh = ss.getSheetByName(RV_TABS.resources), r = rvFindRow(sh, String(b.id || "")); if (!r) throw new Error("resource not found");
  var driveId = cellText(sh.getRange(r, 9).getValue());
  if (driveId) { try { DriveApp.getFileById(driveId).setTrashed(true); } catch (e) {} }
  sh.getRange(r, 17).setValue("Y"); sh.getRange(r, 16).setValue(now());
  return { ok: 1, id: String(b.id) };
}

/* Run once from the editor after adding the reviewer section: creates the tracker tabs and the
   screenshot folder, which makes Apps Script ask for the Drive permission before deploying. */
function setupReviewer() {
  var report = [];
  Object.keys(REVIEWERS).forEach(function (id) {
    var r = REVIEWERS[id];
    Object.keys(r.clinics).forEach(function (code) {
      var ss = SpreadsheetApp.openById(r.clinics[code]); ensureTracker(ss);
      var f = shotFolder(ss);
      report.push(id + " / " + code + ": tracker tabs ok, screenshots in " + f.getName());
    });
  });
  report.push("HO users: " + Object.keys(HO_USERS).join(", ") + " · Claude key " + (anthropicKey() ? "set" : "NOT set (translations fall back to Google Translate; see setAnthropicKey)"));
  Logger.log(report.join("\n"));
  return report;
}

/* Run from the editor to check reading works before deploying. */
function test() {
  var b = bootstrap(Object.keys(CLINICS)[0], {});
  Logger.log(b.customers.length + " customers, " + b.cadence.length + " cadence rows, settings " + JSON.stringify(b.settings));
}
