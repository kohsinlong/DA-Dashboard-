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
 *
 * Reviewers (1.4.0): a username listed in REVIEWERS signs in on the same page and gets the QA
 * audit view instead of the DA's task list. The reviewer path only READS the clinics' CRM
 * workbooks (never ensureTabs, never a write there); everything a reviewer records goes to the
 * reviewer's own tracker workbook (tabs created by ensureTracker) and screenshots to Drive.
 * See zalo/README.md §2.15. After adding this section, run setupReviewer() once from the
 * editor (it asks for the Drive permission the screenshots need), then publish a new version.
 */

var CLINICS = {
  /* clinic code → the CRM workbook and its Membership tab */
  "NGT": { id: "1IdKCJ58wJHrjFkaQmnTKwPo3rWtAvAA3CUYRkH_4IJI", sheet: "Membership_NGT" }
};
var USERS = { "NGT_DA1": "NGT" };    /* username → clinic; only names listed here can sign in */
/* QA reviewers: username → own password hash and, per clinic they audit, their tracker workbook. */
var REVIEWERS = {
  "CZ": { name: "ChenZhong", hash: "c7425b8bfb79932f5d6f5b46f3ddc20bb7c5050dd516aef9e87425afc4cf51c3",
          clinics: { "NGT": "1ki5FZBdnNDM83S5kYSKYk2uLVuSEoMa3559y4Av7OG8" } }
};
var PW_HASH = "d006b3f546ac914c34dfc209ad535ea530f32a1e8e0ae822ea049b3a783e4d20";   /* sha256 of the shared password */
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
    var rv = reviewerOf(p.u, p.h);
    if (rv) return out(reviewerGet(rv, p));
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
    var rv = reviewerOf(body.u, body.h);
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
    var sh = ss.getSheetByName(name), hdr = HEADERS[name];
    if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, hdr.length).setValues([hdr]); sh.setFrozenRows(1); }
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
var RV_TABS = { audit: "审核 Audit", weekly: "周总评 Weekly", shots: "截图 Screenshots", settings: "设置 Settings" };
var RV_HEADERS = {
  audit: ["键 Key", "周 Week", "诊所 Clinic", "客户键 Customer key", "Zalo 标签 Zalo tag", "客户 Customer", "产品 Product", "助理 DA",
          "本周到期 Due this week", "状态 Status", "结论 Verdict", "得分 Score", "已发送 Found", "缺失 Missing", "助理已勾未见 DA ticked, not found",
          "备注 Remark", "数据问题 Data issue", "截图 Screenshots", "检查时间 Checked at", "审核人 By", "更新时间 Updated", "评分明细 Marks", "来源 Source", "抽样时间 Added"],
  weekly: ["键 Key", "周 Week", "诊所 Clinic", "到期客户 Customers due", "到期节点 Cadences due", "抽样 Sampled", "已检查 Checked", "合规 Pass", "部分 Partial",
           "未合规 Fail", "数据问题 Data issues", "得分 Score %", "本周节点得分 This week's cadences %", "助理已勾未见 DA ticked, not found", "助理自报已发 DA reported sent %",
           "本周总评 Overall remark", "审核人 By", "更新时间 Updated", "状态 Status", "提交时间 Submitted at", "审批人 Approved by", "发布时间 Published at"],
  shots: ["编号 ID", "周 Week", "诊所 Clinic", "客户键 Customer key", "Zalo 标签 Zalo tag", "文件 File", "链接 Link", "Drive ID", "上传时间 Uploaded", "审核人 By", "已删除 Removed"],
  settings: ["键 Key", "值 Value", "说明 Note"]
};
var RV_SETTINGS_DEFAULT = [
  ["sample_size", "15", "每周每个诊所抽样数 / Chats to sample per clinic per week"],
  ["start_week", "2026-10-12", "审核起始周（周一）/ First audited week (its Monday)"],
  ["screenshot_folder", "", "截图文件夹 ID（首次上传时自动创建）/ Drive folder for screenshots, created on the first upload"],
  ["switched_over", "", "旧周表导入时间（W 表已隐藏）/ When the old week sheets were imported and hidden"],
  ["email_ho", "sinlong.koh@kkr.com, anh.lhn@matsaigon.com", "完成本周时通知的 HO 邮箱（逗号分隔）/ HO addresses emailed when a week is completed"],
  ["app_url", "https://kohsinlong.github.io/DA-Dashboard-/zalo/", "邮件中的链接 / Link used in the emails"]
];
var RV_LOCKED = { submitted: 1, review: 1, published: 1, acknowledged: 1 };
var RV_AUDIT_COLS = RV_HEADERS.audit.length;

function reviewerOf(u, h) {
  var id = String(u || "").trim().toUpperCase(), r = REVIEWERS[id];
  if (!r) return null;
  if (!r.hash || String(h || "").toLowerCase() !== r.hash) throw new Error("forbidden");
  return { id: id, name: r.name || id, clinics: r.clinics || {}, cache: {} };
}
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
  ["settings", "audit", "weekly", "shots"].forEach(function (k) {
    var name = RV_TABS[k], hdr = RV_HEADERS[k], sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, hdr.length).setValues([hdr]); sh.setFrozenRows(1); }
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
    return { key: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), custKey: cellText(v[3]), tag: cellText(v[4]), name: cellText(v[5]),
             product: cellText(v[6]), da: cellText(v[7]), due: cellText(v[8]), status: cellText(v[9]), verdict: cellText(v[10]), score: v[11] === "" ? "" : Number(v[11]),
             found: cellText(v[12]), missing: cellText(v[13]), notFound: cellText(v[14]), remark: cellText(v[15]), data: cellText(v[16]) ? 1 : 0,
             shots: Number(v[17]) || 0, checkedAt: rvStamp(v[18]), by: cellText(v[19]), updated: rvStamp(v[20]), marks: marks, source: cellText(v[22]), added: rvStamp(v[23]) };
  });
}
function readWeekly(ss) {
  return rvRows(ss, "weekly").map(function (r) {
    var v = r.v;
    return { key: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), remark: cellText(v[15]), by: cellText(v[16]), updated: rvStamp(v[17]),
             status: cellText(v[18]) || "marking", submittedAt: rvStamp(v[19]), approvedBy: cellText(v[20]), publishedAt: rvStamp(v[21]) };
  });
}
function readShots(ss) {
  return rvRows(ss, "shots").filter(function (r) { return !cellText(r.v[10]); }).map(function (r) {
    var v = r.v;
    return { id: cellText(v[0]), week: rvDay(v[1]), clinic: cellText(v[2]), custKey: cellText(v[3]), tag: cellText(v[4]), file: cellText(v[5]), url: cellText(v[6]), uploaded: rvStamp(v[8]), by: cellText(v[9]) };
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
  if (p.action === "ping") return { ok: 1, role: "reviewer", reviewer: rv.id, at: now() };
  if (p.action === "shot") return getShot(rv, p.id);
  return reviewerBootstrap(rv);
}
function reviewerBootstrap(rv) {
  var res = { ok: 1, role: "reviewer", reviewer: rv.id, name: rv.name, generated: now(), today: rvToday(),
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
    switchOver(ss, rv, code, res.clinics[code].customers);
    var mine = function (x) { return !x.clinic || x.clinic === code; };
    res.audits = res.audits.concat(readAudits(ss).filter(mine));
    res.weekly = res.weekly.concat(readWeekly(ss).filter(mine));
    res.shots = res.shots.concat(readShots(ss).filter(mine));
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
  switch (body.action) {
    case "auditSave":     return auditSave(rv, body.audits || [], body.stats || []);
    case "auditRemove":   return auditRemove(rv, body.keys || [], body.clinic, body.stats || []);
    case "feedbackSave":  return feedbackSave(rv, body);
    case "weekStatus":    return weekStatus(rv, body);
    case "shotUpload":    return shotUpload(rv, body.shot || {});
    case "shotRemove":    return shotSetRemoved(rv, body.clinic, body.id, true);
    case "shotRestore":   return shotSetRemoved(rv, body.clinic, body.id, false);
    default: throw new Error("unknown action: " + body.action);
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
  var saved = 0, at = now();
  audits.forEach(function (a) {
    var ss = rvTracker(rv, a.clinic); assertOpen(ss, a.week, a.clinic);
    var sh = ss.getSheetByName(RV_TABS.audit), line = auditLine(rv, a), r = rvFindRow(sh, line[0]);
    if (r) sh.getRange(r, 1, 1, RV_AUDIT_COLS).setValues([line]); else sh.getRange(sh.getLastRow() + 1, 1, 1, RV_AUDIT_COLS).setValues([line]);
    saved++;
  });
  stats.forEach(function (s) { upsertWeekly(rvTracker(rv, s.clinic), rv, s); });
  return { ok: 1, saved: saved, at: at };
}
function auditRemove(rv, keys, clinic, stats) {
  var ss = rvTracker(rv, clinic), sh = ss.getSheetByName(RV_TABS.audit), removed = 0;
  keys.forEach(function (k) { var r = rvFindRow(sh, String(k)); if (r) { assertOpen(ss, cellText(String(k)).split("|")[0], clinic); sh.deleteRow(r); removed++; } });
  stats.forEach(function (s) { upsertWeekly(rvTracker(rv, s.clinic), rv, s); });
  return { ok: 1, removed: removed };
}
/* s: {week, clinic, remark?, dueCustomers, dueCadences, sampled, checked, pass, partial, fail, data, score, weekScore, notFound, daSent} */
function upsertWeekly(ss, rv, s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.week || ""))) throw new Error("weekly row needs week");
  var sh = ss.getSheetByName(RV_TABS.weekly), key = s.week + "|" + s.clinic, r = rvFindRow(sh, key), n = RV_HEADERS.weekly.length;
  var cur = r ? sh.getRange(r, 1, 1, n).getValues()[0] : [];
  function keep(i, v) { return v === undefined ? (cur[i] === undefined ? "" : cur[i]) : v; }
  var line = [key, "'" + s.week, s.clinic, keep(3, s.dueCustomers), keep(4, s.dueCadences), keep(5, s.sampled), keep(6, s.checked), keep(7, s.pass), keep(8, s.partial),
              keep(9, s.fail), keep(10, s.data), keep(11, s.score), keep(12, s.weekScore), keep(13, s.notFound), keep(14, s.daSent),
              s.remark === undefined ? cellText(cur[15]) : cellText(s.remark).slice(0, 8000), rv.id, now(),
              s.status === undefined ? (cellText(cur[18]) || "marking") : s.status, s.submittedAt === undefined ? cellText(cur[19]) : s.submittedAt,
              s.approvedBy === undefined ? cellText(cur[20]) : s.approvedBy, s.publishedAt === undefined ? cellText(cur[21]) : s.publishedAt];
  line = line.map(function (v) { return v === null ? "" : v; });
  if (r) sh.getRange(r, 1, 1, n).setValues([line]); else sh.getRange(sh.getLastRow() + 1, 1, 1, n).setValues([line]);
  return { ok: 1, key: key };
}
function feedbackSave(rv, b) {
  var ss = rvTracker(rv, b.clinic); assertOpen(ss, b.week, b.clinic);
  var s = Object.assign({}, b.stats || {}, { week: b.week, clinic: b.clinic, remark: cellText(b.text) });
  upsertWeekly(ss, rv, s);
  return { ok: 1, at: now() };
}
/* body: {week, clinic, status: "submitted" | "marking", stats}. Completing a week (marking → submitted)
   locks it and emails HO once; a reviewer may reopen (submitted → marking) until HO has taken it. */
function weekStatus(rv, b) {
  var ss = rvTracker(rv, b.clinic), cur = weekRowStatus(ss, b.week, b.clinic), next = String(b.status || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.week || ""))) throw new Error("week needed");
  if (next === "submitted") { if (cur !== "marking") throw new Error("week is already " + cur); }
  else if (next === "marking") { if (cur !== "submitted") throw new Error("only a submitted week can be reopened; it is " + cur); }
  else throw new Error("unknown status: " + next);
  var at = now(), s = Object.assign({}, b.stats || {}, { week: b.week, clinic: b.clinic, status: next, submittedAt: next === "submitted" ? at : "" });
  upsertWeekly(ss, rv, s);
  var emailed = 0;
  if (next === "submitted") emailed = notifyHo(ss, rv, b.clinic, b.week, b.stats || {});
  return { ok: 1, status: next, at: at, emailed: emailed };
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
  Logger.log(report.join("\n"));
  return report;
}

/* Run from the editor to check reading works before deploying. */
function test() {
  var b = bootstrap(Object.keys(CLINICS)[0], {});
  Logger.log(b.customers.length + " customers, " + b.cadence.length + " cadence rows, settings " + JSON.stringify(b.settings));
}
