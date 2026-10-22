/* Exercises zalo-sop.gs against a fake SpreadsheetApp. Run: node zalo/tools/test-gs.js */
var fs = require("fs"), vm = require("vm");
var n = 0, bad = 0;
function eq(a, b, msg){ n++; var ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) { bad++; console.log("FAIL " + msg + "\n   got " + ja + "\n   want " + jb); } }
function ok(c, msg){ n++; if (!c) { bad++; console.log("FAIL " + msg); } }

/* ---------- fake Sheets ---------- */
function FakeSheet(name, rows, cols){ this.name = name; this.rows = []; for (var r = 0; r < rows; r++) { var a = []; for (var c = 0; c < cols; c++) a.push(""); this.rows.push(a); } this.formats = {}; this.frozen = 0; }
FakeSheet.prototype.getName = function(){ return this.name; };
FakeSheet.prototype.getMaxRows = function(){ return this.rows.length; };
FakeSheet.prototype.getMaxColumns = function(){ return this.rows[0].length; };
FakeSheet.prototype.getLastRow = function(){ var last = 0; this.rows.forEach(function (r, i) { if (r.some(function (v) { return v !== "" && v !== null && v !== undefined; })) last = i + 1; }); return last; };
FakeSheet.prototype.getLastColumn = function(){ var last = 0; this.rows.forEach(function (r) { r.forEach(function (v, j) { if (v !== "") last = Math.max(last, j + 1); }); }); return last; };
FakeSheet.prototype.setFrozenRows = function(k){ this.frozen = k; };
FakeSheet.prototype.hideSheet = function(){ this.hidden = true; };
FakeSheet.prototype.isSheetHidden = function(){ return !!this.hidden; };
FakeSheet.prototype.deleteRow = function(r){ this.rows.splice(r - 1, 1); };
FakeSheet.prototype.insertRowsAfter = function(after, k){ for (var i = 0; i < k; i++) { var a = []; for (var c = 0; c < this.rows[0].length; c++) a.push(""); this.rows.splice(after, 0, a); } };
FakeSheet.prototype.getRange = function(r, c, nr, nc){ var sh = this; nr = nr || 1; nc = nc || 1; while (sh.rows.length < r + nr - 1) sh.insertRowsAfter(sh.rows.length, 1);
  return {
    getValues: function(){ var o = []; for (var i = 0; i < nr; i++) { var row = []; for (var j = 0; j < nc; j++) row.push(sh.rows[r - 1 + i][c - 1 + j]); o.push(row); } return o; },
    setValues: function(v){ if (c + nc - 1 > sh.getMaxColumns()) throw new Error("Those columns are out of bounds (" + sh.name + ": " + (c + nc - 1) + " > " + sh.getMaxColumns() + ")"); for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) sh.rows[r - 1 + i][c - 1 + j] = v[i][j]; },
    getValue: function(){ return sh.rows[r - 1][c - 1]; },
    setValue: function(v){ sh.rows[r - 1][c - 1] = v; },
    setNumberFormat: function(f){ sh.formats[r + ":" + c] = f; return this; },
    clearContent: function(){ for (var i = 0; i < nr; i++) for (var j = 0; j < nc; j++) sh.rows[r - 1 + i][c - 1 + j] = ""; },
    copyTo: function(dst, type){ var src = this.getValues(); dst.setValues(src.map(function (row) { return row.map(function (v) { return typeof v === "string" && v.charAt(0) === "=" ? v : ""; }); })); }
  }; };
function FakeSS(id){ this.sheets = {}; this.order = []; this.id = id || "crm"; }
FakeSS.prototype.getId = function(){ return this.id; };
FakeSS.prototype.getSheetByName = function(n){ return this.sheets[n] || null; };
FakeSS.prototype.insertSheet = function(n){ var s = new FakeSheet(n, 50, 26); this.sheets[n] = s; this.order.push(n); return s; };   /* a new tab has 26 columns, as in Sheets */
FakeSS.prototype.getSheets = function(){ var self = this; return this.order.map(function (n) { return self.sheets[n]; }); };
var ss = new FakeSS();
var mem = ss.insertSheet("Membership_NGT"); mem.rows = []; for (var i = 0; i < 12; i++) { var a = []; for (var c = 0; c < 34; c++) a.push(""); mem.rows.push(a); }
var hdr = ["0","Ngày kết bạn","Tên Khách Hàng","Tuổi","Ngày sinh","SĐT","Sản phẩm","Trợ lý BS","Zalo","Trạng thái","Ngày đặt cọc","Ngày nhận kính","Bảo hành","Ghi chú","dep","P","Q","R","S","T","U","Tên bé thứ 2"];
hdr.forEach(function (h, j) { mem.rows[0][j] = h; });
function row(r, vals){ Object.keys(vals).forEach(function (k) { mem.rows[r - 1][k - 1] = vals[k]; }); }
row(2, {1:"=IF($C2=\"\";\"\";COUNTA($C$2:$C2))", 2:"20/07", 3:"Nguyễn Tuấn Kiệt", 4:"=age", 6:"0907683580", 7:"MC", 8:"Tiên", 9:"MCY 260720 Ô.Ngoại bé Tuấn Kiệt", 10:"Đã là hội viên", 11:new Date("2026-07-20T12:00:00+07:00"), 12:new Date("2026-07-27T12:00:00+07:00"), 16:"=P"});
row(3, {1:"=IF($C3=\"\";\"\";COUNTA($C$2:$C3))", 2:"03/10", 3:"Hoàng Lưu Bảo Anh, Tâm Anh", 4:"=age", 6:"0938123456", 7:"Kính", 8:"Tiên", 9:"KTN 261003 Mẹ bé Bảo Anh & Tâm Anh 0938123456", 11:"03/10/2026", 16:"=P"});
row(4, {1:"=IF($C4=\"\";\"\";COUNTA($C$2:$C4))", 2:"10/10", 3:"Lê An Nhiên", 4:"=age", 6:"", 7:"mc", 8:"Tiên", 9:"MCN 261010 Mẹ bé An Nhiên", 11:46305, 16:"=P"});
for (var r = 5; r <= 12; r++) row(r, {1:"=IF($C" + r + "=\"\";\"\";COUNTA($C$2:$C" + r + "))", 4:"=age", 16:"=P"});
var cad = ss.insertSheet("Cadence (VN)");
[["Sản phẩm","Mốc","Nội dung","Key"],["MC","D1","Đặt cọc: Tin nhắn giới thiệu","MC|D1"],["MC","CD+14","Nhắc đeo 12 giờ","MC|CD+14"],["Kính","CD+7","Chỉnh gọng","Kính|CD+7"],["Atropine","CD+90","Tái khám 1","Atropine|CD+90"],["","",""],["Kính","12"]].forEach(function (r, i) { r.forEach(function (v, j) { cad.rows[i][j] = v; }); });

/* ---------- fake services ---------- */
/* an older DA_Imports tab without the note column, to check the header sync */
var oldImp = ss.insertSheet("DA_Imports"); oldImp.rows = []; for (var oi = 0; oi < 50; oi++) { var oa = []; for (var oc = 0; oc < 16; oc++) oa.push(""); oldImp.rows.push(oa); }
["code","clinic","uploaded_at","uploaded_by","deposit","appointment","status","name","phone","patient_code","lens","product","state","result","last_seen","collected"].forEach(function (h, j) { oldImp.rows[0][j] = h; });
FakeSheet.prototype.insertColumnsAfter = function(after, k){ this.rows.forEach(function (r) { for (var i = 0; i < k; i++) r.splice(after, 0, ""); }); };
/* the reviewer's tracker workbook: a cover, two old week sheets (one before start_week) and the CN cadence tab */
var tracker = new FakeSS("TRACKER1");
var cover = tracker.insertSheet("封面 Cover"); cover.rows[1][1] = "NGT 跟进合规追踪表";
var cadCN = tracker.insertSheet("Cadence (CN)"); [["产品","节点","应做事项","Key"],["MC","D1","定金：发送介绍信息；更新预计配镜时间","MC|D1"],["Kính","CD","发送使用说明；会员权益；邀请转介绍","Kính|CD"]].forEach(function (r, i) { r.forEach(function (v, j) { cadCN.rows[i][j] = v; }); });
function weekSheet(name, from, to, marks){
  var sh = tracker.insertSheet(name);
  sh.rows[0][0] = "第 42 周 / Week 42   ·   " + from + " – " + to + "   ·   实时 Live"; sh.rows[6][0] = "本周综合评述 (CZ)\nOverall remark (CZ)"; sh.rows[6][1] = marks.remark || "";
  sh.rows[9] = ["序号\nNo.","Zalo 标签\nZalo Tag","客户\nCustomer","助理\nDA","产品\nProduct","锚定日 (CD)\nAnchor","本周到期\nDue This Week","应做事项","缺失的节点项\nMissing cadence items","质性反馈\nQualitative feedback","","","",""].concat(["","","","","",""]);
  (marks.rows || []).forEach(function (r, i) { sh.rows[10 + i] = [String(i + 1), r[0], r[1], "Tiên", r[2], "2026-10-01", r[3] || "", "", r[4] || "", r[5] || ""].concat(["","","","","","","","","",""]); });
  return sh;
}
weekSheet("W41", "2026-10-05", "2026-10-11", { remark: "old week", rows: [["MCY 260720 Ô.Ngoại bé Tuấn Kiệt", "Nguyễn Tuấn Kiệt", "MC", "CD+90", "D90：N", ""]] });
weekSheet("W42", "2026-10-12", "2026-10-18", { remark: "NGT 本周回访偏少", rows: [["MCY 260720 Ô.Ngoại bé Tuấn Kiệt", "Nguyễn Tuấn Kiệt", "MC", "CD+90", "", "Y：权益、定制"], ["KTN 261003 Mẹ bé Bảo Anh & Tâm Anh 0938123456", "Hoàng Lưu Bảo Anh, Tâm Anh", "Kính", "D6-7", "D6-7: Not sent", ""], ["XXY 261001 Unknown", "Nobody", "MC", "", "", "no such customer"], ["MCY 260720 Ô.Ngoại bé Tuấn Kiệt", "Nguyễn Tuấn Kiệt", "MC", "", "", ""]] });

/* fake Drive: folders and files in memory */
var drive = (function(){
  var files = {}, folders = {}, seq = 0;
  function Folder(name, parent){ this.id = "fo" + (++seq); this.name = name; this.parent = parent || null; this.kids = []; folders[this.id] = this; }
  Folder.prototype.getId = function(){ return this.id; }; Folder.prototype.getName = function(){ return this.name; };
  Folder.prototype.getFoldersByName = function(n){ var list = this.kids.filter(function (k) { return k instanceof Folder && k.name === n; }), i = 0; return { hasNext: function(){ return i < list.length; }, next: function(){ return list[i++]; } }; };
  Folder.prototype.createFolder = function(n){ var f = new Folder(n, this); this.kids.push(f); return f; };
  Folder.prototype.createFile = function(blob){ var f = new File(blob, this); this.kids.push(f); return f; };
  function File(blob, parent){ this.id = "fi" + (++seq); this.blob = blob; this.parent = parent; this.trashed = false; files[this.id] = this; }
  File.prototype.getId = function(){ return this.id; }; File.prototype.getUrl = function(){ return "https://drive.google.com/file/d/" + this.id; }; File.prototype.getBlob = function(){ return this.blob; };
  File.prototype.setTrashed = function(v){ this.trashed = v; }; File.prototype.getParents = function(){ var p = this.parent, used = false; return { hasNext: function(){ return !!p && !used; }, next: function(){ used = true; return p; } }; };
  var root = new Folder("root"); var trackerFile = new File({ name: "tracker" }, root); trackerFile.id = "TRACKER1"; files.TRACKER1 = trackerFile;
  return { files: files, folders: folders, root: root,
    getFileById: function(id){ if (!files[id]) throw new Error("no file " + id); return files[id]; },
    getFolderById: function(id){ if (!folders[id]) throw new Error("no folder " + id); return folders[id]; },
    createFolder: function(n){ return root.createFolder(n); } };
})();

var sandbox = {
  SpreadsheetApp: { openById: function(id){ return id === "TRACKER1" ? tracker : ss; }, CopyPasteType: { PASTE_FORMULA: "formula" } },
  DriveApp: drive,
  MailApp: { sent: [], sendEmail: function(m){ this.sent.push(m); } },
  Utilities: { formatDate: function(d, tz, fmt){ var t = new Date(d.getTime() + (tz === "UTC" ? 0 : 7 * 3600000)); var s = t.toISOString(); return fmt === "yyyy-MM-dd" ? s.slice(0, 10) : s; },
               base64Decode: function(s){ return Array.prototype.slice.call(Buffer.from(s, "base64")); }, base64Encode: function(bytes){ return Buffer.from(bytes).toString("base64"); },
               newBlob: function(bytes, mime, name){ return { bytes: bytes, mime: mime, name: name, getBytes: function(){ return bytes; }, getContentType: function(){ return mime; } }; } },
  LockService: { getScriptLock: function(){ return { waitLock: function(){}, releaseLock: function(){} }; } },
  ContentService: { createTextOutput: function(s){ return { setMimeType: function(){ return { text: s }; } }; }, MimeType: { JSON: "json" } },
  Logger: { log: function(){} }, console: console, Date: Date, JSON: JSON, Object: Object, String: String, Math: Math, Error: Error, Array: Array, RegExp: RegExp, Number: Number
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + "/zalo-sop.gs", "utf8"), sandbox);
/* the shipped sign-ins exist before the fixtures below replace them: a listed name with a wrong hash is "forbidden", an unlisted one "unknown user" */
eq(get({ u: "chengyf", h: "x", action: "ping" }), { error: "forbidden" }, "the reviewer username ChengYF is listed");
eq(get({ u: "OptoHO", h: "x", action: "ping" }), { error: "forbidden" }, "the head-office username OptoHO is listed");
eq(get({ u: "CZ", h: "x", action: "ping" }), { error: "unknown user" }, "the old reviewer username is gone");
eq(get({ u: "SL", h: "x", action: "ping" }), { error: "unknown user" }, "the old head-office usernames are gone");
eq(sandbox.approverNames(), ["SL", "Anh"], "the approver list is SL and Anh whatever the login");
var RVH = "c7425b8bfb79932f5d6f5b46f3ddc20bb7c5050dd516aef9e87425afc4cf51c3";       /* sha256 of the reviewer demo password */
sandbox.REVIEWERS = { CZ: { name: "ChenZhong", hash: RVH, clinics: { NGT: "TRACKER1" } } };
var H = "48a495c2722686b5907a142bf3009e12856f690280cd0e37e91497fdeb597075";   /* sha256 of the DA password */
function get(p){ return JSON.parse(sandbox.doGet({ parameter: p }).text); }
function post(b){ return JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(b) } }).text); }
function body(b){ return Object.assign({ u: "NGT_DA", h: H, da: "Tiên" }, b); }

/* ---------- auth ---------- */
eq(get({ u: "NGT_DA", h: "wrong", action: "ping" }), { error: "forbidden" }, "wrong hash is refused");
eq(get({ u: "XYZ_DA", h: H, action: "ping" }), { error: "unknown user" }, "unknown user is refused");
eq(get({ u: "ngt_da", h: H, action: "ping" }).clinic, "NGT", "listed username, case-insensitive");
eq(get({ u: "NGT_DA1", h: H, action: "ping" }).clinic, "NGT", "the previous username still signs in as an alias");
eq(get({ u: "NGT_DA", h: "d006b3f546ac914c34dfc209ad535ea530f32a1e8e0ae822ea049b3a783e4d20", action: "ping" }).clinic, "NGT", "the previous password is still accepted during the changeover");
eq(get({ u: "NGT_DA", h: "", action: "ping" }), { error: "forbidden" }, "an empty hash is refused");
eq(post({ action: "markSent" }), { error: "unknown user" }, "post without credentials is refused");

/* ---------- setup ---------- */
var rep = sandbox.setup();
ok(ss.getSheetByName("DA_Tasks") && ss.getSheetByName("DA_Imports") && ss.getSheetByName("DA_Details") && ss.getSheetByName("DA_Settings") && ss.getSheetByName("DA_Log"), "setup creates the five tabs");
eq(ss.getSheetByName("DA_Settings").rows[1].slice(0, 2), ["go_live", "2026-10-16"], "settings seeded");
eq(ss.getSheetByName("DA_Imports").rows[0][16], "note", "an older DA_Imports tab gets the note header added");
eq([cad.rows[0][4], cad.rows[1][4], cad.rows[2][4], cad.rows[3][4], cad.rows[4][4], cad.rows[6][4]], ["Touch", "High", "Low", "High", "Low", ""], "touch column seeded, warranty table untouched");
sandbox.setup(); eq(cad.rows[1][4], "High", "setup is idempotent");

/* ---------- bootstrap ---------- */
var b = get({ u: "NGT_DA", h: H });
eq(b.ok, 1, "bootstrap ok");
eq(b.customers.length, 3, "three customers read, formula-only rows skipped");
eq([b.customers[0].dep, b.customers[0].coll, b.customers[1].dep, b.customers[2].dep], ["2026-07-20", "2026-07-27", "2026-10-03", "2026-10-10"], "dates read from Date, text and serial cells");
eq(b.customers[1].name, "Hoàng Lưu Bảo Anh, Tâm Anh", "two-kid cell kept as written");
eq(b.das, { "Tiên": 3 }, "DA list");
eq(b.cadence.length, 4, "cadence rows with a milestone only");
eq(b.cadence[1], { product: "MC", stage: "CD+14", text: "Nhắc đeo 12 giờ", touch: "Low" }, "cadence row carries text and touch");
eq(b.settings.go_live, "2026-10-16", "settings served");

/* ---------- addCustomer ---------- */
var add = post(body({ action: "addCustomer", fields: { name: "Trần Bảo Ngọc", phone: "0912345678", product: "MC", tag: "MCN 261016 Mẹ bé Bảo Ngọc 0912345678", dep: "2026-10-16", dob: "12/03/2018" }, details: { parent_name: "Chị Lan", relation: "Mẹ", gender: "Nữ" } }));
eq([add.ok, add.row, add.key], [1, 5, "0912345678|tran bao ngoc"], "added into the first empty row");
eq(mem.rows[4][0], "=IF($C5=\"\";\"\";COUNTA($C$2:$C5))", "formula column A untouched");
eq(mem.rows[4][3], "=age", "formula column D untouched");
eq([mem.rows[4][2], mem.rows[4][5], mem.rows[4][6], mem.rows[4][7], mem.rows[4][8], mem.rows[4][9]], ["Trần Bảo Ngọc", "0912345678", "MC", "Tiên", "MCN 261016 Mẹ bé Bảo Ngọc 0912345678", ""], "cells written, status blank before collection");
ok(mem.rows[4][10] instanceof Date && sandbox.Utilities.formatDate(mem.rows[4][10], "x", "yyyy-MM-dd") === "2026-10-16", "deposit written as a real date");
ok(mem.rows[4][4] instanceof Date, "dob written as a date");
eq(mem.formats["5:6"], "@", "phone cell formatted as text so the leading zero survives");
eq(/^\d{2}\/\d{2}\/\d{4}$/.test(mem.rows[4][1]), true, "friend-add date dd/mm/yyyy");
eq(ss.getSheetByName("DA_Details").rows[1].slice(0, 6), ["0912345678|tran bao ngoc", "NGT", "Chị Lan", "Mẹ", "Nữ", ""], "details stored");
ok(ss.getSheetByName("DA_Log").getLastRow() > 5, "log written per cell");
eq(post(body({ action: "addCustomer", fields: { name: "Trần Bảo Ngọc", phone: "0912 345 678", product: "MC", tag: "x" } })).error, "already in the form at row 5", "duplicate refused");
eq(post(body({ action: "addCustomer", fields: { name: "X", product: "Lens" } })).error.slice(0, 15), "product must be", "bad product refused");
eq(post(body({ action: "addCustomer", fields: { name: "X", product: "MC", dep: "2026-10-16", coll: "2026-10-10" } })).error, "collection date is before the deposit date", "collection before deposit refused");
var add2 = post(body({ action: "addCustomer", fields: { name: "Trần Bảo Ngọc", phone: "0912345678", product: "Kính", tag: "KTN 261101 Mẹ bé Bảo Ngọc 0912345678", dep: "2026-11-01", allowDuplicate: true, key: "0912345678|tran bao ngoc#261101" } }));
eq([add2.ok, add2.row, add2.key], [1, 6, "0912345678|tran bao ngoc#261101"], "repeat order row with its own key");

/* ---------- updateCustomer / setCollected / confirmTag ---------- */
var up = post(body({ action: "setCollected", ref: { row: 3, name: "Hoàng Lưu Bảo Anh, Tâm Anh", phone: "0938123456" }, date: "2026-10-15" }));
eq([up.ok, up.row], [1, 3], "collection recorded");
ok(mem.rows[2][11] instanceof Date && sandbox.Utilities.formatDate(mem.rows[2][11], "x", "yyyy-MM-dd") === "2026-10-15", "L is a real date");
eq(mem.rows[2][9], "Đã là hội viên", "status set on collection");
eq(post(body({ action: "setCollected", ref: { row: 3, name: "Hoàng Lưu Bảo Anh, Tâm Anh", phone: "0938123456" }, date: "2026-10-01" })).error, "collection date is before the deposit date", "collection before deposit refused on update");
eq(sandbox.Utilities.formatDate(mem.rows[2][11], "x", "yyyy-MM-dd"), "2026-10-15", "refused update rolled back the cell");
eq(post(body({ action: "updateCustomer", ref: { row: 3, name: "Hoàng Lưu Bảo Anh, Tâm Anh", phone: "0938123456" }, changes: { stt: 9 } })).error, "field stt is not writable", "formula columns refused");
/* the row moved: insert a row above and locate by name+phone */
mem.insertRowsAfter(1, 1);
var ct = post(body({ action: "confirmTag", ref: { row: 3, name: "Hoàng Lưu Bảo Anh, Tâm Anh", phone: "0938123456" }, tag: "KTY 261015 Mẹ bé Bảo Anh & Tâm Anh 0938123456" }));
eq([ct.ok, ct.row], [1, 4], "row re-found after a shift");
eq(mem.rows[3][8], "KTY 261015 Mẹ bé Bảo Anh & Tâm Anh 0938123456", "tag written on the right row");
eq(post(body({ action: "confirmTag", ref: { row: 3, name: "Nobody", phone: "0000000000" }, tag: "x" })).error, "row not found: the name or phone changed in the sheet", "unknown row refused");
mem.rows.splice(1, 1);  /* undo the shift */

/* ---------- markSent ---------- */
var ms = post(body({ action: "markSent", items: [{ key: "k1", stage: "CD+14", due: "2026-10-16", bits: "1111", score: 1 }, { key: "k2", stage: "D1", due: "2026-10-16", bits: "10", score: 0.5 }] }));
eq([ms.ok, ms.sent, ms.undone], [1, 2, 0], "two ticks stored");
var tasks = ss.getSheetByName("DA_Tasks"); eq([tasks.rows[1][0], tasks.rows[1][1], tasks.rows[1][2], tasks.rows[1][3], tasks.rows[1][6], tasks.rows[2][6]], ["k1", "NGT", "Tiên", "CD+14", 1, 0.5], "tick rows");
var un = post(body({ action: "markSent", undo: [{ key: "k1", stage: "CD+14" }, { key: "zz", stage: "D1" }] }));
eq(un.undone, 1, "undo marks the latest matching row only");
ok(tasks.rows[1][8] !== "", "undone_at set");
eq(get({ u: "NGT_DA", h: H }).tasks.length, 2, "bootstrap serves the ticks");

/* ---------- imports ---------- */
var si = post(body({ action: "storeImports", orders: [{ code: "DT1", deposit: "2026-10-10", appointment: "2026-10-20", status: "Chờ Lấy", name: "Võ Gia", phone: "0977111222", lens: "1.61 EL Night", product: "Kính", note: "bạn của chị Lan" }, { code: "DT2", deposit: "2026-10-11", appointment: "2026-10-13", status: "DONE", name: "Lê An Nhiên", phone: "0966000111", product: "MC", collected: "2026-10-13" }] }));
eq([si.added, si.updated], [2, 0], "orders stored as parked");
var imp = ss.getSheetByName("DA_Imports"); eq(imp.rows[1][12], "parked", "default state parked"); eq(imp.rows[1][16], "bạn của chị Lan", "note stored with the parked order");
var ci = post(body({ action: "confirmImports", orders: [{ code: "DT1" }, { code: "DT2" }, { code: "DT3", deposit: "2026-10-12", status: "DONE", name: "Phạm Huy", phone: "0955000111", product: "MC" }],
  adds: [{ code: "DT1", fields: { name: "Võ Gia", phone: "0977111222", product: "Kính", tag: "KTN 261010 Mẹ bé Gia 0977111222", dep: "2026-10-10" } }],
  collections: [{ code: "DT2", ref: { row: 4, name: "Lê An Nhiên", phone: "" }, date: "2026-10-13" }], park: ["DT3"] }));
eq(ci.results.DT1.ok, 1, "import add ok"); eq(ci.results.DT2.ok, 1, "import collection ok"); eq(ci.results.DT3.parked, 1, "import park ok");
eq([imp.rows[1][12], imp.rows[1][13].slice(0, 6), imp.rows[2][12], imp.rows[2][13].slice(0, 11), imp.rows[3][12]], ["confirmed", "added:", "confirmed", "collected:|", "parked"], "import states and results");
eq(sandbox.Utilities.formatDate(mem.rows[3][11], "x", "yyyy-MM-dd"), "2026-10-13", "collection from import written");
eq(mem.rows[6][2], "Võ Gia", "import add wrote the next empty row");
var ci2 = post(body({ action: "confirmImports", adds: [{ code: "DT1", fields: { name: "Võ Gia", phone: "0977111222", product: "Kính", tag: "x" } }] }));
eq(ci2.results.DT1.error, "already in the form at row 7", "a second confirm of the same order is refused, others unaffected");

/* ---------- details merge ---------- */
post(body({ action: "saveDetails", key: "0912345678|tran bao ngoc", details: { pending_tag: "MCY 261020 Mẹ bé Bảo Ngọc 0912345678" } }));
eq(ss.getSheetByName("DA_Details").rows[1].slice(0, 6), ["0912345678|tran bao ngoc", "NGT", "Chị Lan", "Mẹ", "Nữ", "MCY 261020 Mẹ bé Bảo Ngọc 0912345678"], "partial details update keeps the other fields");
post(body({ action: "saveDetails", key: "0912345678|tran bao ngoc", details: { pending_tag: "" } }));
eq(ss.getSheetByName("DA_Details").rows[1][5], "", "pending tag cleared");
eq(post(body({ action: "nope" })).error, "unknown action: nope", "unknown action");

/* ---------- undo: removeCustomer / removeImport ---------- */
eq(post(body({ action: "removeCustomer", ref: { row: 2, name: "Nguyễn Tuấn Kiệt", phone: "0907683580" } })).error, "only rows added by the dashboard can be removed", "a row the DA typed into the sheet cannot be cleared");
var rm = post(body({ action: "removeCustomer", ref: { row: 5, name: "Trần Bảo Ngọc", phone: "0912345678" } }));
eq([rm.ok, rm.row], [1, 5], "a row the dashboard added can be cleared");
eq([mem.rows[4][2], mem.rows[4][5], mem.rows[4][8], mem.rows[4][10], mem.rows[4][0]], ["", "", "", "", "=IF($C5=\"\";\"\";COUNTA($C$2:$C5))"], "data cells cleared, formula kept");
post(body({ action: "storeImports", orders: [{ code: "MAN-1", name: "Tay", phone: "0900000001", state: "parked", result: "manual" }] }));
var before = imp.getLastRow(); eq(post(body({ action: "removeImport", code: "MAN-1" })).removed, 1, "a typed-in parked entry can be removed");
eq(imp.getLastRow(), before - 1, "the DA_Imports row is gone");
eq(post(body({ action: "removeImport", code: "NOPE" })).removed, 0, "removing an unknown code is a no-op");

/* ---------- empty-row growth ---------- */
for (var k = 0; k < 8; k++) post(body({ action: "addCustomer", fields: { name: "Fill " + k, phone: "09000000" + (10 + k), product: "MC", tag: "t" } }));
var lastAdd = post(body({ action: "addCustomer", fields: { name: "Overflow", phone: "0900000099", product: "MC", tag: "t" } }));
eq(lastAdd.ok, 1, "adding beyond the pre-formatted rows still works");
eq(mem.rows[lastAdd.row - 1][0].slice(0, 4), "=IF(", "formula column carried down into the new row");

/* ---------- reviewer (QA audit) ---------- */
function rget(p){ return get(Object.assign({ u: "cz", h: RVH }, p)); }
function rpost(b){ return post(Object.assign({ u: "CZ", h: RVH }, b)); }
eq(get({ u: "CZ", h: "wrong", action: "ping" }), { error: "forbidden" }, "reviewer with a wrong hash is refused");
eq(get({ u: "CZ", h: H, action: "ping" }), { error: "forbidden" }, "the DA password does not open the reviewer login");
eq(rget({ action: "ping" }).role, "reviewer", "reviewer ping, case-insensitive username");
var crmTabsBefore = ss.order.slice(), memBefore = JSON.stringify(mem.rows);
var rb = rget({});
eq([rb.ok, rb.role, rb.reviewer, rb.name], [1, "reviewer", "CZ", "ChenZhong"], "reviewer bootstrap");
ok(rb.clinics.NGT && rb.clinics.NGT.customers.length === get({ u: "NGT_DA", h: H }).customers.length, "the reviewer sees the clinic's customers");
ok(rb.clinics.NGT.tasks.length >= 1 && rb.clinics.NGT.settings.go_live === "2026-10-16", "the DA's ticks and settings come along");
eq(JSON.stringify(mem.rows), memBefore, "the CRM form is untouched by the reviewer path");
eq(ss.order, crmTabsBefore, "no tab is added to the CRM workbook by the reviewer path");
eq(tracker.order.slice(-4), ["设置 Settings", "审核 Audit", "周总评 Weekly", "截图 Screenshots"], "tracker tabs created");
eq(tracker.getSheetByName("审核 Audit").rows[0][0], "键 Key", "audit header");
eq(rb.settings.NGT.sample_size, "15", "tracker settings seeded and served");
eq(rb.settings.NGT.start_week, "2026-10-12", "start week seeded");
eq(rb.cadenceCN.length, 2, "Cadence (CN) served");
eq(rb.cadenceCN[1], { product: "Kính", stage: "CD", text: "发送使用说明；会员权益；邀请转介绍" }, "Cadence (CN) row");
/* switch-over: W42 marks imported (W41 is before start_week), W sheets hidden */
eq(rb.audits.length, 3, "three marked W42 rows imported (W41 skipped, the unmarked row skipped)");
eq([rb.audits[0].custKey, rb.audits[0].missing, rb.audits[0].remark, rb.audits[0].source, rb.audits[0].status, rb.audits[0].verdict], ["0907683580|nguyen tuan kiet", "", "Y：权益、定制", "sheet W42", "checked", "noted"], "a W42 mark becomes a noted audit keyed to the customer");
eq(rb.audits[1].custKey, "0938123456|hoang luu bao anh", "two-kid tag matched to its row");
eq(rb.audits[2].custKey, "tag:xxy261001unknown", "an unmatched tag keeps a tag key");
eq(rb.weekly.length, 1, "the W42 overall remark became a weekly row");
eq([rb.weekly[0].week, rb.weekly[0].remark], ["2026-10-12", "NGT 本周回访偏少"], "weekly remark");
ok(tracker.getSheetByName("W41").isSheetHidden() && tracker.getSheetByName("W42").isSheetHidden(), "old week sheets hidden");
ok(!tracker.getSheetByName("Cadence (CN)").isSheetHidden(), "other tabs stay visible");
var so = sandbox.rvSettings(tracker).switched_over; ok(/W42:3/.test(so), "switch-over recorded: " + so);
var rb2 = rget({});
eq(rb2.audits.length, 3, "a second bootstrap imports nothing twice");
/* audit save: insert, then update the same key */
var a1 = { key: "2026-10-19|NGT|0907683580|nguyen tuan kiet", week: "2026-10-19", clinic: "NGT", custKey: "0907683580|nguyen tuan kiet", tag: "MCY 260720 Ô.Ngoại bé Tuấn Kiệt", name: "Nguyễn Tuấn Kiệt", product: "MC", da: "Tiên", due: "CD+90",
           status: "sampled", verdict: "open", score: "", found: "", missing: "", notFound: 0, remark: "", data: 0, shots: 0, checkedAt: "", marks: {}, source: "draw", added: "2026-10-22T01:00:00.000Z" };
var stats = { week: "2026-10-19", clinic: "NGT", dueCustomers: 19, dueCadences: 25, sampled: 1, checked: 0, pass: 0, partial: 0, fail: 0, data: 0, score: "", weekScore: "", notFound: 0, daSent: 40 };
eq(rpost({ action: "auditSave", audits: [a1], stats: [stats] }).saved, 1, "audit row saved");
var au = tracker.getSheetByName("审核 Audit"); var r1 = au.getLastRow();
eq([au.rows[r1 - 1][0], au.rows[r1 - 1][9], au.rows[r1 - 1][22]], [a1.key, "sampled", "draw"], "audit row content");
a1.status = "checked"; a1.verdict = "partial"; a1.score = 50; a1.marks = { "CD+90": "1100" }; a1.found = "CD+90 ½"; a1.missing = "CD+90: 会员权益、转介绍邀请"; a1.notFound = 1; a1.remark = "没有会员权益"; a1.checkedAt = "2026-10-22T01:05:00.000Z";
stats.checked = 1; stats.partial = 1; stats.score = 50; stats.weekScore = 50; stats.notFound = 1;
eq(rpost({ action: "auditSave", audits: [a1], stats: [stats] }).saved, 1, "audit row updated");
eq(au.getLastRow(), r1, "an update does not add a row");
eq([au.rows[r1 - 1][9], au.rows[r1 - 1][10], au.rows[r1 - 1][11], au.rows[r1 - 1][14], au.rows[r1 - 1][15], au.rows[r1 - 1][21]], ["checked", "partial", 50, 1, "没有会员权益", '{"CD+90":"1100"}'], "updated cells");
var wk = tracker.getSheetByName("周总评 Weekly"); var wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[5], wr[6], wr[8], wr[11], wr[13], wr[14], wr[15]], [1, 1, 1, 50, 1, 40, ""], "weekly stats row, remark still empty");
eq(rpost({ action: "feedbackSave", week: "2026-10-19", clinic: "NGT", text: "本周回访有进步", stats: stats }).ok, 1, "feedback saved");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[15], wr[16], wr[11]], ["本周回访有进步", "CZ", 50], "feedback written next to the stats");
eq(rpost({ action: "feedbackSave", week: "2026-10-19", clinic: "NGT", text: "改了", stats: {} }).ok, 1, "feedback saved again without stats");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[15], wr[11]], ["改了", 50], "stats kept when the feedback alone changes");
/* screenshots */
var PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
var up = rpost({ action: "shotUpload", shot: { id: "s1", week: "2026-10-19", clinic: "NGT", custKey: a1.custKey, tag: a1.tag, name: "chat.png", data: "data:image/png;base64," + PNG } });
eq([up.ok, up.id, /drive.google.com/.test(up.url)], [1, "s1", true], "screenshot uploaded to Drive");
ok(/^2026-10-19 NGT MCY 260720/.test(up.file) && /\.png$/.test(up.file), "file named by week, clinic and tag: " + up.file);
var fid = sandbox.rvSettings(tracker).screenshot_folder; ok(!!drive.folders[fid], "screenshot folder created and remembered");
eq(drive.folders[fid].kids[0].name, "2026-10-19 NGT", "one subfolder per week and clinic");
var sh = rget({ action: "shot", id: "s1" }); eq([sh.ok, sh.mime, sh.data], [1, "image/png", PNG], "screenshot served back as base64");
eq(rget({}).shots.length, 1, "shot listed on bootstrap");
eq(rpost({ action: "shotRemove", clinic: "NGT", id: "s1" }).removed, 1, "screenshot removed");
eq(rget({}).shots.length, 0, "removed shot no longer listed");
eq(rpost({ action: "shotRestore", clinic: "NGT", id: "s1" }).removed, 0, "and restored");
eq(rpost({ action: "shotUpload", shot: { id: "s2", week: "2026-10-19", clinic: "NGT", data: "data:text/plain;base64,aGk=" } }).error, "screenshots must be images", "non-image refused");
/* remove from sample, refusals */
eq(rpost({ action: "auditRemove", keys: [a1.key], clinic: "NGT", stats: [Object.assign({}, stats, { sampled: 0 })] }).removed, 1, "audit row removed");
eq(au.getLastRow(), r1 - 1, "row gone");
eq(rpost({ action: "markSent", items: [{ key: "k", stage: "D1" }] }).error, "unknown action: markSent", "a reviewer cannot run DA writes");
eq(rpost({ action: "auditSave", audits: [{ key: "x", week: "bad", clinic: "NGT" }] }).error, "audit needs key and week", "bad week refused");
eq(rpost({ action: "auditSave", audits: [{ key: "x", week: "2026-10-19", clinic: "XX" }] }).error, "clinic XX is not in your list", "unknown clinic refused");
eq(get({ u: "NGT_DA", h: H }).audits, undefined, "the DA's bootstrap carries no audit data");

/* ---------- week status: complete → email → locked → reopen ---------- */
eq(wk.rows[0].slice(18, 22), ["状态 Status", "提交时间 Submitted at", "审批人 Approved by", "发布时间 Published at"], "weekly tab gained the status and approval columns");
eq(sandbox.rvSettings(tracker).email_ho, "sinlong.koh@kkr.com, anh.lhn@matsaigon.com", "HO addresses seeded in settings");
var a2 = Object.assign({}, a1, { key: "2026-10-19|NGT|k2", custKey: "k2", status: "checked" });
eq(rpost({ action: "auditSave", audits: [a2], stats: [stats] }).saved, 1, "a row can be saved while the week is marking");
eq(rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking" }).error, "only a submitted week can be reopened; it is marking", "cannot reopen a week that is not submitted");
var done = rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "submitted", stats: Object.assign({}, stats, { sampled: 15, checked: 15, score: 56, daSent: 72, notFound: 6 }) });
eq([done.ok, done.status, done.emailed], [1, "submitted", 2], "completing the week emails both HO addresses");
var mail = sandbox.MailApp.sent[0];
eq(mail.to, "sinlong.koh@kkr.com,anh.lhn@matsaigon.com", "email recipients");
eq(mail.subject, "[Zalo SOP] ChenZhong completed NGT week of 2026-10-19", "email subject");
ok(/Sampled: 15 chats · checked: 15/.test(mail.body) && /Items sent: 56%/.test(mail.body) && /#\/clinic-ngt/.test(mail.body), "email body carries the figures and the link: " + mail.body.replace(/\n/g, " | "));
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[18], wr[5], wr[11], !!wr[19]], ["submitted", 15, 56, true], "status, stats and submitted time written");
eq(rget({}).weekly.filter(function (w) { return w.week === "2026-10-19"; })[0].status, "submitted", "status served on bootstrap");
eq(rpost({ action: "auditSave", audits: [a2], stats: [stats] }).error, "week 2026-10-19 is submitted; reopen it first", "audit writes refused on a submitted week");
eq(rpost({ action: "auditRemove", keys: [a2.key], clinic: "NGT" }).error, "week 2026-10-19 is submitted; reopen it first", "removal refused on a submitted week");
eq(rpost({ action: "feedbackSave", week: "2026-10-19", clinic: "NGT", text: "x" }).error, "week 2026-10-19 is submitted; reopen it first", "feedback refused on a submitted week");
eq(rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "submitted" }).error, "week is already submitted", "cannot submit twice");
eq(rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "published" }).error, "unknown status: published", "a reviewer cannot publish");
var re = rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking" });
eq([re.ok, re.status, re.emailed, sandbox.MailApp.sent.length], [1, "marking", 0, 1], "reopening sends no email");
eq(rpost({ action: "auditSave", audits: [a2], stats: [stats] }).saved, 1, "writes allowed again after reopening");
eq(rpost({ action: "auditRemove", keys: [a2.key], clinic: "NGT" }).removed, 1, "cleanup");

/* ---------- head office (1.6.0) ---------- */
var SLH = "fa76a43aaab8f7eab98ffea561815c3edb78c31d8e3cfbc152e20410b990f7c5", ANHH = "87886b83b8d2801c4d3050ac23331fcdb6af92fe8c481cedc692b77343014836";
sandbox.HO_USERS = { SL: { name: "Sin Long", hash: SLH, approver: "SL" }, ANH: { name: "Anh", hash: ANHH, approver: "Anh" }, OPTOHO: { name: "OptoHO", hash: ANHH, approver: "" } };
function hget(p){ return get(Object.assign({ u: "sl", h: SLH }, p)); }
function hpost(b){ return post(Object.assign({ u: "SL", h: SLH }, b)); }
/* fakes for the translation: script properties, Claude over UrlFetch, Google Translate */
var fetches = [], claudeFail = 0;
sandbox.PropertiesService = { props: {}, getScriptProperties: function(){ var self = this; return { getProperty: function(k){ return self.props[k] || null; }, setProperty: function(k, v){ self.props[k] = v; } }; } };
sandbox.LanguageApp = { translate: function(text, from, to){ return "[" + to + "] " + text; } };
sandbox.UrlFetchApp = { fetch: function(url, opt){
  fetches.push({ url: url, opt: opt });
  if (claudeFail) { claudeFail--; return { getResponseCode: function(){ return 500; }, getContentText: function(){ return '{"error":"boom"}'; } }; }
  var items = JSON.parse(JSON.parse(opt.payload).messages[0].content);
  var arr = items.map(function (it) { return { id: it.id, en: "EN: " + it.text, vi: "VI: " + it.text, zh: "ZH: " + it.text }; });
  return { getResponseCode: function(){ return 200; }, getContentText: function(){ return JSON.stringify({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "…" }, { type: "text", text: "```json\n" + JSON.stringify(arr) + "\n```" }] }); } };
} };
eq(get({ u: "SL", h: "wrong", action: "ping" }), { error: "forbidden" }, "HO with a wrong hash is refused");
eq(get({ u: "SL", h: RVH, action: "ping" }), { error: "forbidden" }, "the reviewer's password does not open the HO login");
eq(hget({ action: "ping" }).role, "ho", "HO ping, case-insensitive username");
memBefore = JSON.stringify(mem.rows);
var hb = hget({});
eq([hb.ok, hb.role, hb.reviewer, hb.name, hb.approver, hb.approvers, hb.reviewers], [1, "ho", "SL", "Sin Long", "SL", ["SL", "Anh"], { NGT: "ChenZhong" }], "HO bootstrap: role, approvers, the clinic's reviewer");
ok(hb.clinics.NGT && hb.clinics.NGT.customers.length >= 3 && hb.audits.length >= 3, "HO sees the clinic and the reviewer's audits");
eq(hb.hoNames, { SL: "Sin Long", ANH: "Anh", OPTOHO: "OptoHO" }, "HO display names served");
var shared = get({ u: "optoho", h: ANHH });
eq([shared.role, shared.name, shared.approver, shared.approvers], ["ho", "OptoHO", "", ["SL", "Anh"]], "a shared head-office login has no preselected approver but the same approver list");
eq(JSON.stringify(mem.rows), memBefore, "the CRM form is untouched by the HO path");
eq([au.rows[0][24], au.rows[0][32], au.rows[0].length >= 33], ["HO 备注 HO note", "翻译来源 Translated by", true], "audit tab gained the HO columns");
eq([wk.rows[0][22], wk.rows[0][31]], ["总评 EN Remark EN", "HO 审核人 HO reviewer"], "weekly tab gained the HO columns");
eq(sandbox.rvSettings(tracker).translate, "claude", "translate setting seeded");
eq(hb.audits[0].visible, 1, "a row without the visible flag is visible");
/* the reviewer marks and completes a week; remarks are translated at Complete (no key → Google) */
var h1 = Object.assign({}, a1, { key: "2026-10-19|NGT|h1", custKey: "h1", status: "checked", verdict: "partial", score: 50, marks: { "CD+90": "1100" }, remark: "会员权益已发，但 CD3-5 没有回访。", notFound: 1 });
var h2 = Object.assign({}, a1, { key: "2026-10-19|NGT|h2", custKey: "h2", status: "checked", verdict: "pass", score: 100, marks: { "CD+90": "1111" }, remark: "" });
var sv1 = rpost({ action: "auditSave", audits: [h1, h2], stats: [stats] });
eq([sv1.saved, sv1.translated.by, Object.keys(sv1.translated.rows)], [2, "google", [h1.key]], "a checked chat is translated the moment it is saved (Google Translate without a key)");
ok(sv1.translated.errors.length === 1 && /no ANTHROPIC_API_KEY/.test(sv1.translated.errors[0]), "the missing key is reported: " + JSON.stringify(sv1.translated.errors));
eq(sv1.translated.rows[h1.key].vi, "[vi] 会员权益已发，但 CD3-5 没有回访。", "the save returns the translation to the page");
var fs1 = rpost({ action: "feedbackSave", week: "2026-10-19", clinic: "NGT", text: "NGT 本周回访偏少。", stats: stats });
eq([fs1.ok, fs1.translated.by, fs1.translated.weekly.vi], [1, "google", "[vi] NGT 本周回访偏少。"], "the overall remark is translated when saved");
var h3 = Object.assign({}, a1, { key: "2026-10-19|NGT|h3", custKey: "h3", status: "sampled", remark: "还没看" });
var sv3 = rpost({ action: "auditSave", audits: [h3], stats: [stats] });
eq([sv3.saved, Object.keys(sv3.translated.rows).length], [1, 0], "a chat not yet checked is not translated");
eq(hpost({ action: "hoEdit", clinic: "NGT", week: "2026-10-19", key: h3.key, ho: { visible: 0 } }).error, "the reviewer has not checked this chat yet", "HO cannot touch a chat the reviewer has not checked");
var early = hpost({ action: "hoEdit", clinic: "NGT", week: "2026-10-19", key: h1.key, ho: { hoNote: "seen early" } });
eq([early.ok, early.status, wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0][18]], [1, "marking", "marking"], "HO can work on a checked chat while the week is still marking; the week stays marking");
/* per-chat approval while the week is still marking */
eq(hpost({ action: "hoApprove", clinic: "NGT", week: "2026-10-19", keys: [h3.key], approvedBy: "SL" }).error, "the reviewer has not checked this chat yet: " + h3.key, "an unchecked chat cannot be approved");
eq(hpost({ action: "hoApprove", clinic: "NGT", week: "2026-10-19", keys: [h1.key] }).error, "approvedBy is required: who approved", "an approval needs a name");
var apr = hpost({ action: "hoApprove", clinic: "NGT", week: "2026-10-19", keys: [h1.key], approvedBy: "SL" });
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([apr.ok, apr.keys, hr[33], !!hr[34], JSON.parse(hr[29]).pop().what], [1, [h1.key], "SL", true, "approved for the DA"], "a checked chat is approved for the DA while the week is still marking");
eq(hpost({ action: "hoEdit", clinic: "NGT", week: "2026-10-19", key: h1.key, ho: { hoNote: "x" } }).error, "this chat is approved for the DA; withdraw the approval first", "an approved chat is locked for HO edits");
eq(hget({}).audits.filter(function (a) { return a.key === h1.key; })[0].approvedBy, "SL", "approval served on bootstrap");
eq(hpost({ action: "hoApprove", clinic: "NGT", week: "2026-10-19", keys: [h1.key], undo: 1 }).ok, 1, "HO withdraws the approval");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[33], hr[34], JSON.parse(hr[29]).pop().what], ["", "", "approval withdrawn"], "approval cleared and logged");
eq(hpost({ action: "hoApprove", clinic: "NGT", week: "2026-10-19", keys: [h1.key], approvedBy: "Anh" }).approvedBy, "Anh", "approved again");
eq(rpost({ action: "auditSave", audits: [h1], stats: [stats] }).withdrawn, [], "the reviewer re-saving an unchanged chat keeps the approval");
var chg = rpost({ action: "auditSave", audits: [Object.assign({}, h1, { remark: h1.remark + " 补充" })], stats: [stats] });
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([chg.withdrawn, hr[33], hr[34], JSON.parse(hr[29]).pop().what], [[h1.key], "", "", "approval withdrawn: the reviewer changed the chat"], "a changed remark withdraws the approval and logs it");
eq(rpost({ action: "auditSave", audits: [h1], stats: [stats] }).saved, 1, "remark put back");
eq(rpost({ action: "auditRemove", keys: [h3.key], clinic: "NGT" }).removed, 1, "cleanup of the unchecked chat");
eq(hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "published", approvedBy: "SL" }).error, "only a submitted week or one under review can be published; it is marking", "HO cannot publish a week that was not completed");
eq(hpost({ action: "auditSave", audits: [h1] }).error, "unknown action: auditSave", "HO cannot run the reviewer's writes");
var done2 = rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "submitted", stats: stats });
eq([done2.ok, done2.status, done2.emailed, done2.translated && done2.translated.by], [1, "submitted", 2, "none"], "Complete finds nothing left to translate and emails HO (addresses still set in this fixture)");
var hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[25], hr[26], hr[27], /^google zh:/.test(hr[32]), !!hr[31]], ["[en] 会员权益已发，但 CD3-5 没有回访。", "[vi] 会员权益已发，但 CD3-5 没有回访。", "会员权益已发，但 CD3-5 没有回访。", true, true], "remark translated to en and vi, the Chinese slot keeps the original, provenance recorded");
var hr2 = au.rows.filter(function (r) { return r[0] === h2.key; })[0];
eq([hr2[25], hr2[26], hr2[31]], ["", "", ""], "a row without a remark is not translated");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[22], wr[23], wr[24], wr[18]], ["[en] NGT 本周回访偏少。", "[vi] NGT 本周回访偏少。", "NGT 本周回访偏少。", "submitted"], "the overall remark is translated too");
/* HO review: the first edit takes the week; HO columns written, the reviewer's untouched */
var edits1 = [{ at: "2026-10-23T02:00:00.000Z", by: "SL", f: "tick", stage: "CD+90", i: 2, old: "0", "new": "1" }, { at: "2026-10-23T02:01:00.000Z", by: "SL", f: "remarkVi", old: "[vi] 会员权益已发，但 CD3-5 没有回访。", "new": "Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", base: h1.remark }];
var he = hpost({ action: "hoEdit", clinic: "NGT", week: "2026-10-19", key: h1.key, ho: { hoMarks: { "CD+90": "1110" }, remarkVi: "Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", hoNote: "screenshot 2 shows the check-in", visible: 1 }, log: edits1,
                derived: { verdict: "partial", score: 75, found: "CD+90 ½", missing: "CD+90: 转介绍邀请", notFound: 0 }, stats: Object.assign({}, stats, { score: 75 }) });
eq([he.ok, he.status], [1, "review"], "HO's first edit takes the week into review");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[30], hr[26], hr[24], hr[28], JSON.parse(hr[29]).length], ['{"CD+90":"1110"}', "Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", "screenshot 2 shows the check-in", "Y", 6], "HO marks, Vietnamese, note, visibility and the edit log written (4 approval entries already there)");
eq([hr[21], hr[15], hr[19]], ['{"CD+90":"1100"}', "会员权益已发，但 CD3-5 没有回访。", "CZ"], "the reviewer's marks, remark and name are untouched");
eq([hr[10], hr[11], hr[14]], ["partial", 75, 0], "the derived verdict columns follow the corrected marks");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[18], wr[31], !!wr[30], wr[16], wr[11]], ["review", "SL", true, "CZ", 75], "weekly: under review by SL, taken at set, the reviewer's By kept, stats updated");
eq(hget({}).weekly.filter(function (w) { return w.week === "2026-10-19"; })[0].hoBy, "SL", "HO reviewer served on bootstrap");
eq(hget({}).audits.filter(function (a) { return a.key === h1.key; })[0].hoMarks, { "CD+90": "1110" }, "HO marks served on bootstrap");
eq(hpost({ action: "hoEdit", clinic: "NGT", week: "2026-10-19", key: h1.key, ho: { visible: 0 } }).ok, 1, "a partial HO edit");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[28], hr[30], hr[24]], ["N", '{"CD+90":"1110"}', "screenshot 2 shows the check-in"], "fields not sent keep their cell");
eq(hget({}).audits.filter(function (a) { return a.key === h1.key; })[0].visible, 0, "hidden from the DA");
eq(rpost({ action: "auditSave", audits: [h1], stats: [stats] }).error, "week 2026-10-19 is review; reopen it first", "the reviewer cannot write during HO review");
eq(rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking" }).error, "only a submitted week can be reopened; it is review", "the reviewer cannot reopen a week HO has taken");
eq(hpost({ action: "hoFeedback", clinic: "NGT", week: "2026-10-19", remarkVi: "NGT: tuần này hỏi thăm còn ít.", hoNote: "soften", log: [{ at: "2026-10-23T02:05:00.000Z", by: "SL", f: "remarkVi", old: "[vi] NGT 本周回访偏少。", "new": "NGT: tuần này hỏi thăm còn ít.", base: "NGT 本周回访偏少。" }] }).ok, 1, "HO wording of the overall remark saved");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[23], wr[25], wr[15], JSON.parse(wr[27]).length], ["NGT: tuần này hỏi thăm còn ít.", "soften", "NGT 本周回访偏少。", 2], "weekly Vietnamese and note written, the reviewer's remark kept, log appended to the take entry");
/* translation on demand through Claude: HO's Vietnamese is now the source */
sandbox.PropertiesService.props.ANTHROPIC_API_KEY = "sk-test-key";
var tr = hpost({ action: "hoTranslate", clinic: "NGT", week: "2026-10-19", keys: [h1.key], weekly: 1 });
eq([tr.ok, tr.by, Object.keys(tr.rows)], [1, "claude:claude-opus-5-5", [h1.key]], "Claude used once a key is set");
var call = fetches[fetches.length - 1], pay = JSON.parse(call.opt.payload);
eq([call.url, call.opt.headers["x-api-key"], call.opt.headers["anthropic-version"], call.opt.contentType, pay.model, pay.output_config.effort, pay.max_tokens], ["https://api.anthropic.com/v1/messages", "sk-test-key", "2026-10-21", "application/json", "claude-opus-5-5", "low", 16000], "Messages API call shape");
ok(/会员权益 = quyền lợi hội viên = member benefits/.test(pay.system) && /JSON array/.test(pay.system), "system prompt carries the glossary and the output rule");
var sent = JSON.parse(pay.messages[0].content);
eq(sent, [{ id: h1.key, from: "vi", text: "Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu." }, { id: "weekly", from: "vi", text: "NGT: tuần này hỏi thăm còn ít." }], "HO's Vietnamese edits are the source text");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[25], hr[26], hr[27], /^claude:claude-opus-5-5 vi:/.test(hr[32])], ["EN: Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", "Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", "ZH: Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", true], "en and zh now follow the Vietnamese the DA will read");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[22], wr[24], wr[23]], ["EN: NGT: tuần này hỏi thăm còn ít.", "ZH: NGT: tuần này hỏi thăm còn ít.", "NGT: tuần này hỏi thăm còn ít."], "weekly remark re-translated from HO's Vietnamese");
var tr2 = hpost({ action: "hoTranslate", clinic: "NGT", week: "2026-10-19", keys: [h1.key], weekly: 1 });
eq([tr2.by, Object.keys(tr2.rows).length, tr2.weekly, tr2.skipped], ["none", 0, null, 1], "nothing is translated twice");
claudeFail = 1;
var tr3 = hpost({ action: "hoTranslate", clinic: "NGT", week: "2026-10-19", keys: [h1.key], weekly: 0, force: 1 });
eq([tr3.by, tr3.rows[h1.key].en, /^claude: HTTP 500/.test(tr3.errors[0])], ["google", "[en] Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu.", true], "a failing Claude call falls back to Google Translate and says so");
/* publish: approver required, email to the reviewer when email_cz is set */
eq(hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "published" }).error, "approvedBy is required: who approved this week", "publishing without an approver is refused");
eq(hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking" }).error, "a note for the reviewer is required to send a week back", "sending back without a note is refused");
var mails = sandbox.MailApp.sent.length;
var pub = hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "published", approvedBy: "Other: Minh", stats: Object.assign({}, stats, { score: 75 }) });
eq([pub.ok, pub.status, pub.emailed, sandbox.MailApp.sent.length], [1, "published", 0, mails], "published; no reviewer address yet, so no email");
eq(pub.approvedChats, [h2.key], "publishing the week approves the checked, visible chats that had no approval (h1 is hidden)");
hr2 = au.rows.filter(function (r) { return r[0] === h2.key; })[0];
eq([hr2[33], !!hr2[34]], ["Other: Minh", true], "stamped with the week's approver");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
var wlog = JSON.parse(wr[27]);
eq([wr[18], wr[20], !!wr[21], wlog[wlog.length - 1].what, wlog[wlog.length - 1].approvedBy], ["published", "Other: Minh", true, "published", "Other: Minh"], "approver and time written, logged");
eq(hpost({ action: "hoEdit", clinic: "NGT", week: "2026-10-19", key: h1.key, ho: { visible: 1 } }).error, "week 2026-10-19 is published; reopen the review first", "no edits on a published week");
eq(rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking" }).error, "only a submitted week can be reopened; it is published", "the reviewer cannot reopen a published week");
var ro = hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "review" });
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([ro.ok, ro.status, wr[18], wr[21], wr[20]], [1, "review", "review", "", "Other: Minh"], "reopened review: published-at cleared, the approver kept in the row and the log");
sandbox.setRvSetting(tracker, "email_cz", "cz@example.com");
var sb = hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking", note: "Please check chat 3 again: the screenshot shows a check-in.", stats: stats });
eq([sb.ok, sb.status, sb.emailed], [1, "marking", 1], "sent back to the reviewer with an email");
var m2 = sandbox.MailApp.sent[sandbox.MailApp.sent.length - 1];
eq([m2.to, m2.subject], ["cz@example.com", "[Zalo SOP] Sin Long sent back NGT week of 2026-10-19"], "send-back email");
ok(/Note: Please check chat 3 again/.test(m2.body) && /#\/clinic-ngt/.test(m2.body), "send-back email carries the note and the link");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[18], wr[26]], ["marking", "Please check chat 3 again: the screenshot shows a check-in."], "status back to marking with the note stored");
eq(hget({}).weekly.filter(function (w) { return w.week === "2026-10-19"; })[0].sendBack, "Please check chat 3 again: the screenshot shows a check-in.", "the note is served");
/* the reviewer takes it back: a re-save clears HO's tick corrections, the log stays; re-completing keeps HO's Vietnamese when the remark did not change */
eq(rpost({ action: "auditSave", audits: [h1], stats: [stats] }).saved, 1, "the reviewer can write again");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[30], JSON.parse(hr[29]).length, hr[26]], ['{"CD+90":"1110"}', 6, "Đã gửi quyền lợi hội viên; có hỏi thăm 14/10 nhưng chưa mời giới thiệu."], "HO marks survive a re-save that leaves the reviewer's marks unchanged");
eq(rpost({ action: "auditSave", audits: [Object.assign({}, h1, { marks: { "CD+90": "1000" } })], stats: [stats] }).saved, 1, "the reviewer changes a tick");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([hr[30], hr[21], JSON.parse(hr[29]).length], ["", '{"CD+90":"1000"}', 6], "HO marks cleared once the reviewer's own marks change; the log stays");
eq(rpost({ action: "auditSave", audits: [h1], stats: [stats] }).saved, 1, "marks put back");
var done3 = rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "submitted", stats: stats });
eq([done3.status, done3.translated.by, Object.keys(done3.translated.rows).length, !!done3.translated.weekly], ["submitted", "none", 0, false], "re-completing an unchanged week translates nothing");
wr = wk.rows.filter(function (r) { return r[0] === "2026-10-19|NGT"; })[0];
eq([wr[26], !!wr[19]], ["", true], "the send-back note is cleared on the next Complete");
var h1b = Object.assign({}, h1, { remark: "会员权益已发，CD3-5 有回访，但没有引导推荐。" });
eq(rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking" }).ok, 1, "reviewer reopens");
var svb = rpost({ action: "auditSave", audits: [h1b], stats: [stats] });
eq(svb.saved, 1, "reviewer changes the remark");
var done4 = rpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "submitted", stats: stats });
eq(done4.translated.by, "none", "nothing left for Complete to translate");
hr = au.rows.filter(function (r) { return r[0] === h1.key; })[0];
eq([svb.translated.by, hr[26], hr[25]], ["claude:claude-opus-5-5", "VI: 会员权益已发，CD3-5 有回访，但没有引导推荐。", "EN: 会员权益已发，CD3-5 有回访，但没有引导推荐。"], "a changed remark is translated afresh and replaces HO's older Vietnamese");
var pub2 = hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "published", approvedBy: "Anh", stats: stats });
var m3 = sandbox.MailApp.sent[sandbox.MailApp.sent.length - 1];
eq([pub2.status, pub2.emailed, m3.subject], ["published", 1, "[Zalo SOP] Sin Long published NGT week of 2026-10-19 (approved by Anh)"], "publishing straight from submitted, approver in the email");
ok(/Approved by: Anh/.test(m3.body), "publish email body names the approver");
eq(get({ u: "NGT_DA", h: H }).weekly, undefined, "the DA's bootstrap still carries no tracker data");
/* cleanup so nothing above this block changes */
hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "review" });
hpost({ action: "weekStatus", week: "2026-10-19", clinic: "NGT", status: "marking", note: "cleanup" });
eq(rpost({ action: "auditRemove", keys: [h1.key, h2.key], clinic: "NGT" }).removed, 2, "cleanup");
console.log(n + " checks, " + bad + " failed");
process.exit(bad ? 1 : 0);
