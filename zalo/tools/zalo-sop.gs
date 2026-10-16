/**
 * DA Zalo Dashboard — Apps Script web app.
 *
 * The page (zalo/) holds no data and no secret. Every call carries the username and the
 * SHA-256 of the password; this script holds the reference hash, reads the CRM workbook and
 * writes to it. See zalo/README.md §2.8 (API), §2.10 (deployment).
 *
 * Deploy once: script.google.com → New project → paste this file → fill CLINICS and PW_HASH
 * → run setup() from the editor → Deploy → New deployment → Web app, execute as Me, access
 * Anyone → copy the /exec URL into API.url at the top of zalo/app.js.
 * After editing: Deploy → Manage deployments → Edit → Version: New version.
 */

var CLINICS = {
  /* clinic code → the CRM workbook and its Membership tab */
  "NGT": { id: "1IdKCJ58wJHrjFkaQmnTKwPo3rWtAvAA3CUYRkH_4IJI", sheet: "Membership_NGT" }
};
var USERS = { "NGT_DA": "NGT" };     /* extra usernames; <CLINIC>_DA works for every clinic above */
var PW_HASH = "48a495c2722686b5907a142bf3009e12856f690280cd0e37e91497fdeb597075";   /* sha256 of the shared password */
var TZ = "Asia/Ho_Chi_Minh";
var CADENCE_SHEET = "Cadence (VN)";
var TABS = { tasks: "DA_Tasks", imports: "DA_Imports", details: "DA_Details", settings: "DA_Settings", log: "DA_Log" };
var HEADERS = {
  DA_Tasks:    ["key", "clinic", "da", "stage", "due", "bits", "score", "sent_at", "undone_at", "note"],
  DA_Imports:  ["code", "clinic", "uploaded_at", "uploaded_by", "deposit", "appointment", "status", "name", "phone", "patient_code", "lens", "product", "state", "result", "last_seen", "collected"],
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
    var clinic = auth(p.u, p.h);
    if (p.action === "ping") return out({ ok: 1, clinic: clinic, at: now() });
    return out(bootstrap(clinic, p));
  } catch (err) { return out({ error: String(err && err.message || err) }); }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); }
  catch (err) { return out({ error: "bad json" }); }
  try {
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
  if (!clinic) Object.keys(CLINICS).forEach(function (c) { if (c.replace(/\s+/g, "").toUpperCase() + "_DA" === u) clinic = c; });
  if (!clinic || !CLINICS[clinic]) throw new Error("unknown user");
  if (!PW_HASH || String(h || "").toLowerCase() !== PW_HASH) throw new Error("forbidden");
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
    tasks: readTab(ss, TABS.tasks, clinic), imports: readTab(ss, TABS.imports, clinic), details: readTab(ss, TABS.details, clinic)
  };
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
    var sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]); sh.setFrozenRows(1); }
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
      if (o.state) v[12] = o.state; if (o.result !== undefined) v[13] = cellText(o.result);
      if (o.product) v[11] = o.product;
      sh.getRange(r, 1, 1, hdr.length).setValues([v]); updated++;
    } else {
      newRows.push([o.code, clinic, at, by, cellText(o.deposit || o.dep), cellText(o.appointment || o.appt), cellText(o.status), cellText(o.name), cellText(o.phone),
        cellText(o.patient || o.patient_code), cellText(o.lens), cellText(o.product), o.state || "parked", cellText(o.result), at, cellText(o.collected)]);
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

/* Run from the editor to check reading works before deploying. */
function test() {
  var b = bootstrap(Object.keys(CLINICS)[0], {});
  Logger.log(b.customers.length + " customers, " + b.cadence.length + " cadence rows, settings " + JSON.stringify(b.settings));
}
