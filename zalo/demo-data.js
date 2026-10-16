/* DA Zalo Dashboard — demo data. Synthetic customers only (no real people), so the screens
   can be reviewed with ?demo=1 before the Apps Script is deployed. Dates are relative to
   today so every list has something in it. */
window.ZALO_DEMO = (function () {
  "use strict";
  var FIRST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
  var MID = ["Minh", "Ngọc", "Gia", "Khánh", "Bảo", "Anh", "Thanh", "Phương", "Hoàng", "Thiên", "Tuệ", "Nhã", "Quỳnh", "Đức", "Hải", "Kim"];
  var LAST = ["An", "Bình", "Chi", "Dung", "Hân", "Khang", "Lam", "My", "Nam", "Nhi", "Phúc", "Quân", "Thư", "Trân", "Uyên", "Vy", "Kiệt", "Long", "Ngân", "Phong"];
  var REL = ["Mẹ", "Mẹ", "Mẹ", "Ba", "Bà ngoại", "Ông ngoại"];
  function prng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var r = prng(20261016);
  function pick(a) { return a[Math.floor(r() * a.length)]; }
  function name() { return pick(FIRST) + " " + pick(MID) + " " + pick(LAST); }
  function phone() { return "09" + String(Math.floor(r() * 1e8)).padStart(8, "0"); }
  function build(Z, today) {
    var custs = [], row = 2, details = [], tasks = [], imports = [];
    function add(o) {
      var child = o.name || name(), ph = o.phone || phone(), rel = o.rel || pick(REL), prod = o.product;
      var tag = prod === "Exam" ? Z.suggestTag({ product: "Exam", date: o.dep || today, relation: rel, child: child, phone: ph })
              : o.tag !== undefined ? o.tag : Z.suggestTag({ product: prod, dep: o.dep, coll: o.coll, relation: rel, child: child, phone: ph });
      var c = { row: row++, stt: String(row - 2), friend: Z.fmtDM(o.dep || today), name: child, dob: o.dob || "", phone: ph, product: prod, da: o.da || "Tiên",
                tag: tag, status: o.coll ? "Đã là hội viên" : "", dep: o.dep || "", coll: o.coll || "", note: o.note || "", kid2: o.kid2 || "" };
      custs.push(c);
      details.push({ key: Z.customerKey(ph, child), clinic: "NGT", parent_name: o.parent || (rel === "Ba" ? "Anh " : "Chị ") + pick(LAST), relation: rel, gender: r() < .5 ? "Nữ" : "Nam", pending_tag: o.pending || "" });
      return c;
    }
    var d = function (n) { return Z.addDays(today, n); };
    /* deposits this week, not collected: D1 / D6-7 */
    add({ product: "MC", dep: d(0) }); add({ product: "Kính", dep: d(-1) }); add({ product: "MC", dep: d(-6) }); add({ product: "OK", dep: d(-7) }); add({ product: "Kính", dep: d(-12) });
    /* collected recently: CD, CDN, CD+1, CD+3-5, CD+7 */
    add({ product: "MC", dep: d(-7), coll: d(0) }); add({ product: "OK", dep: d(-9), coll: d(0) }); add({ product: "Kính", dep: d(-8), coll: d(-1) });
    add({ product: "MC", dep: d(-10), coll: d(-3) }); add({ product: "MC", dep: d(-11), coll: d(-4) }); add({ product: "Kính", dep: d(-14), coll: d(-7) }); add({ product: "Atropine", dep: d(-10), coll: d(-7) });
    /* a sibling pair on one phone */
    var sp = phone(); add({ product: "MC", dep: d(-12), coll: d(-5), phone: sp, name: "Lê Gia Hân", rel: "Mẹ" }); add({ product: "Kính", dep: d(-12), coll: d(-7), phone: sp, name: "Lê Gia Bảo", rel: "Mẹ" });
    /* mass-send cohorts: CD+14 (MC), CD+30 (MC and Kính), CD+90 (MC and Kính), CD+180, Atropine CD+90 */
    for (var i = 0; i < 4; i++) add({ product: "MC", dep: d(-21 - i), coll: d(-14 - (i % 3)) });
    for (i = 0; i < 5; i++) add({ product: "MC", dep: d(-37), coll: d(-30 - (i % 4) + 1) });
    for (i = 0; i < 3; i++) add({ product: "Kính", dep: d(-37), coll: d(-30 - (i % 4) + 1) });
    for (i = 0; i < 3; i++) add({ product: "MC", dep: d(-97), coll: d(-90 - (i % 3)) });
    for (i = 0; i < 2; i++) add({ product: "Kính", dep: d(-97), coll: d(-90 - i) });
    add({ product: "OK", dep: d(-37), coll: d(-30) }); add({ product: "MC", dep: d(-187), coll: d(-180) }); add({ product: "Atropine", dep: d(-97), coll: d(-90) });
    /* late mass send (last week) and a missed one (two weeks ago) */
    add({ product: "MC", dep: d(-40), coll: d(-33) }); add({ product: "Kính", dep: d(-50), coll: d(-44) });
    /* overdue personal: D6-7 missed, CD+3-5 missed */
    add({ product: "Kính", dep: d(-10) }); add({ product: "MC", dep: d(-15), coll: d(-8) });
    /* N tag but collected (tag update pending), an exam customer, a row with no dates, one without a tag */
    add({ product: "MC", dep: d(-5), coll: d(-1), tag: "MCN " + Z.yymmdd(d(-5)) + " Mẹ bé Trần Thiên Kim " + "0909555111", name: "Trần Thiên Kim", phone: "0909555111" });
    add({ product: "Exam", dep: d(-3) }); add({ product: "Kính", dep: "", coll: "", name: "Phạm Khánh Vy" }); add({ product: "MC", dep: d(-2), tag: "", name: "Hồ Minh Khang" });
    /* a few far-future ones so Customers has variety */
    for (i = 0; i < 6; i++) add({ product: pick(["MC", "Kính"]), dep: d(-60 - i * 9), coll: d(-53 - i * 9) });
    /* some ticks already made today */
    var pl = Z.plan(custs.map(function (c) { return Object.assign({ key: Z.customerKey(c.phone, c.name), names: Z.splitNames(c.name) }, c); }), [], { today: today, goLive: d(-10) });
    pl.dueToday.slice(0, 2).forEach(function (t) { tasks.push({ key: t.key, clinic: "NGT", da: "Tiên", stage: t.stage, due: t.due, bits: t.items.map(function () { return "1"; }).join(""), score: 1, sent_at: today + "T08:30:00.000Z", undone_at: "" }); });
    if (pl.mass[0]) pl.mass[0].tasks.slice(0, 2).forEach(function (t) { tasks.push({ key: t.key, clinic: "NGT", da: "Tiên", stage: t.stage, due: t.due, bits: "1111", score: 1, sent_at: d(-1) + "T10:00:00.000Z", undone_at: "" }); });
    /* the past was mostly worked: leave three personal misses and two late mass sends */
    var keptHigh = 0, keptLow = 0;
    pl.overdue.forEach(function (t) {
      if (t.touch === "High" && keptHigh < 3) { keptHigh++; return; }
      if (t.touch !== "High" && keptLow < 2) { keptLow++; return; }
      tasks.push({ key: t.key, clinic: "NGT", da: "Tiên", stage: t.stage, due: t.due, bits: t.items.map(function () { return "1"; }).join(""), score: 1, sent_at: t.due + "T15:00:00.000Z", undone_at: "" });
    });
    /* parked orders from an earlier upload (not in CRM) */
    for (i = 0; i < 7; i++) { var dep = d(-20 - i * 6); imports.push({ code: "DT309-" + (11200 + i), clinic: "NGT", uploaded_at: d(-2) + "T09:00:00.000Z", uploaded_by: "Tiên", deposit: dep, appointment: Z.addDays(dep, 3), status: "DONE", name: name(), phone: phone(), patient_code: "BN309-" + (5400 + i), lens: pick(["1.59 Stellest Rock", "1.61 EL Night", "Myocare", "1.56 Eyezen"]), product: "", state: "parked", result: "", last_seen: d(-2), collected: Z.addDays(dep, 3) }); imports[i].product = Z.lensProduct(imports[i].lens); }
    imports.push({ code: "DT309-11300", clinic: "NGT", uploaded_at: d(-2) + "T09:00:00.000Z", uploaded_by: "Tiên", deposit: d(-3), appointment: d(-1), status: "DONE", name: custs[20].name, phone: custs[20].phone, patient_code: "BN309-9", lens: "gọng kính", product: "", state: "parked", result: "repeat:" + Z.customerKey(custs[20].phone, custs[20].name), last_seen: d(-2), collected: d(-1) });
    return { ok: 1, clinic: "NGT", generated: new Date().toISOString(), today: today, settings: { go_live: d(-10), import_cutoff: "2026-07-20", late_grace_weeks: "1", overdue_fold_days: "14", week_start: "Mon" },
             cadence: [], das: { "Tiên": custs.length }, customers: custs, tasks: tasks, imports: imports, details: details };
  }
  return { build: build };
})();
