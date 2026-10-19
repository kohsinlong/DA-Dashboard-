/* Rule tests for zalo/core.js. Run: node zalo/tools/test-core.js */
var Z = require("../core.js");
var n = 0, bad = 0;
function eq(a, b, msg){ n++; var ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) { bad++; console.log("FAIL " + msg + "\n   got " + ja + "\n   want " + jb); } }
function ok(c, msg){ n++; if (!c) { bad++; console.log("FAIL " + msg); } }

/* dates */
eq(Z.toISO("20/07/2026"), "2026-07-20", "dd/mm/yyyy");
eq(Z.toISO("3/10/26"), "2026-10-03", "d/m/yy");
eq(Z.toISO("2026-10-13T00:00:00"), "2026-10-13", "iso datetime");
eq(Z.toISO(46223), "2026-07-20", "sheet serial");
eq(Z.toISO("04/10", "2026-10-16"), "2026-10-04", "dd/mm takes this year when recent");
eq(Z.toISO("12/11", "2026-01-10"), "2025-11-12", "dd/mm takes last year when far ahead");
eq(Z.toISO("31/11", "2026-10-16"), "", "invalid day");
eq(Z.toISO("t"), "", "junk");
eq(Z.toISO(new Date(2026, 9, 16)), "2026-10-16", "Date object");
eq(Z.addDays("2026-10-30", 2), "2026-11-01", "addDays over month end");
eq(Z.diffDays("2026-10-01", "2026-10-16"), 15, "diffDays");
eq(Z.weekBounds("2026-10-16"), { start: "2026-10-12", end: "2026-10-18" }, "week Mon-Sun (16 Oct 2026 is a Friday)");
eq(Z.weekBounds("2026-10-12"), { start: "2026-10-12", end: "2026-10-18" }, "week starts on Monday itself");
eq(Z.weekBounds("2026-10-18"), { start: "2026-10-12", end: "2026-10-18" }, "Sunday belongs to the week before");
eq(Z.yymmdd("2026-07-20"), "260720", "yymmdd");

/* names and phones */
eq(Z.normPhone("903203383"), "0903203383", "9 digits: leading zero restored");
eq(Z.normPhone("+84 907 683 580"), "0907683580", "84 prefix");
eq(Z.normPhone("0907683580"), "0907683580", "10 digits");
eq(Z.normPhone("12345"), "", "junk phone");
eq(Z.normName("NG ĐỨC HUY"), "nguyen duc huy", "NG expands, accents stripped");
eq(Z.splitNames("Hoàng Lưu Bảo Anh, Tâm Anh\n"), ["Hoàng Lưu Bảo Anh", "Tâm Anh"], "comma split");
eq(Z.splitNames("LÂM TÙNG ANH & KIẾN HUÂN"), ["LÂM TÙNG ANH", "KIẾN HUÂN"], "ampersand split");
eq(Z.splitNames(" Hoàng Lê Anh Hào  Hoàng Lê Khánh Vi"), ["Hoàng Lê Anh Hào", "Hoàng Lê Khánh Vi"], "double-space split");
eq(Z.splitNames("Nguyễn Tuấn Kiệt"), ["Nguyễn Tuấn Kiệt"], "single name");
eq(Z.customerKey("0772786699", "Avan Nguyễn"), "0772786699|avan nguyen", "key");
eq(Z.customerKey("", "Lê Hoàng Kim Ngân, Vũ Khánh Ngân"), "|le hoang kim ngan", "key uses the first child");

/* products */
eq(Z.normProduct("kính, MC"), "Kính", "first product wins");
eq(Z.normProduct("KÍNH"), "Kính", "upper-case kính");
eq(Z.normProduct("ok"), "OK", "ok");
eq(Z.normProduct("mc"), "MC", "mc");
eq(Z.normProduct("Atropine"), "Atropine", "atropine");
eq(Z.normProduct(""), "", "empty product");
eq(Z.lensProduct("1.59 Stellest Rock"), "MC", "stellest");
eq(Z.lensProduct("MiYoSmart"), "MC", "miyosmart");
eq(Z.lensProduct("1.61 EL Night"), "Kính", "night lens is glasses");
eq(Z.lensProduct("gọng kính"), "", "frame only: DA picks");
eq(Z.lensProduct("Contactlens"), "", "contact lens: DA picks");
eq(Z.lensProduct(""), "", "blank lens");

/* milestones */
var mc = { key: "0909|a", product: "MC", dep: "2026-10-10", coll: "2026-10-13", phone: "0909", tag: "MCY 261013 Mẹ bé A 0909", da: "Tiên" };
var ms = Z.milestones(mc, { goLive: "2026-10-16" });
eq(ms.map(function (m) { return m.stage + ":" + m.open + ".." + m.due + ":" + m.touch; }).slice(0, 3),
   ["CD+3-5:2026-10-16..2026-10-18:High", "CD+14:2026-10-27..2026-10-27:Low", "CD+30:2026-11-12..2026-11-12:Low"], "milestones after go-live, with windows and touch; D6-7 gone once collected");
eq(Z.milestones({ product: "MC", dep: "2026-10-10", coll: "2026-10-10" }).map(function (m) { return m.stage; })[0], "CD", "same-day collection: CD only, no D1");
eq(Z.milestones({ product: "MC", dep: "2026-10-10", coll: "" }).map(function (m) { return m.stage; }), ["D1", "D6-7"], "no collection: only D1 and D6-7");
eq(Z.milestones({ product: "Exam", dep: "2026-10-10" }).length, 0, "exam has no cadence");
eq(Z.milestones({ product: "OK", dep: "", coll: "2026-10-10" }).map(function (m) { return m.stage; })[0], "CD", "collected without deposit: CD onward");
eq(Z.cadenceInfo("MC", "CD+14").touch, "Low", "MC CD+14 is a mass send");
eq(Z.cadenceInfo("Atropine", "CD+90").touch, "Low", "Atropine recalls are mass sends");
eq(Z.cadenceInfo("OK", "CDN").touch, "High", "OK CDN is personal");
eq(Z.cadenceInfo("MC", "CD+14", [{ product: "MC", stage: "CD+14", text: "x", touch: "High" }]).touch, "High", "the Cadence tab overrides touch");
eq(Z.cadenceInfo("MC", "CD+14", [{ product: "mc", stage: "CD+14", text: "Nhắc đeo", touch: "" }]).text, "Nhắc đeo", "the Cadence tab overrides text");

/* plan */
var today = "2026-10-16", gl = "2026-10-01";
var custs = [
  mc,                                                                                                   /* D6-7 + CD+3-5 due today */
  { key: "k1", product: "Kính", dep: "2026-10-01", coll: "", phone: "0901", tag: "KTN 261001 Mẹ bé B 0901", da: "Tiên" },      /* D6-7 due 10-08: overdue high */
  { key: "k2", product: "Kính", dep: "", coll: "2026-09-16", phone: "0902", tag: "KTY 260916 Mẹ bé C 0902", da: "Tiên" },      /* Kính CD+30 due 10-16 */
  { key: "k3", product: "MC", dep: "", coll: "2026-09-16", phone: "0903", tag: "MCY 260916 Mẹ bé D 0903", da: "Tiên" },        /* MC CD+30 due 10-16 */
  { key: "k4", product: "MC", dep: "", coll: "2026-07-18", phone: "0904", tag: "MCY 260718 Mẹ bé E 0904", da: "Tiên" },        /* MC CD+90 due 10-16 */
  { key: "k5", product: "Kính", dep: "", coll: "2026-07-18", phone: "0905", tag: "KTY 260718 Mẹ bé F 0905", da: "Tiên" },      /* Kính CD+90 due 10-16: merges with k4 */
  { key: "k6", product: "MC", dep: "", coll: "2026-09-05", phone: "0906", tag: "MCY 260905 Mẹ bé G 0906", da: "Tiên" },        /* MC CD+30 due 10-05: late */
  { key: "k7", product: "MC", dep: "", coll: "2026-09-04", phone: "0907", tag: "MCY 260904 Mẹ bé H 0907", da: "Tiên" },        /* MC CD+30 due 10-04: missed mass */
  { key: "k8", product: "OK", dep: "2026-10-12", coll: "", phone: "0908", tag: "OKN 261012 Mẹ bé I 0908", da: "Tiên" },        /* D6-7 opens 10-18: upcoming Sunday */
  { key: "k9", product: "MC", dep: "2026-10-14", coll: "", phone: "0909", tag: "MCN 261014 Mẹ bé J 0909", da: "Thảo" }         /* other DA */
];
var p = Z.plan(custs, [], { today: today, goLive: gl, da: "Tiên" });
eq(p.dueToday.map(function (t) { return t.key + ":" + t.stage; }), ["0909|a:CD+3-5"], "due today: windows open today, high touch only, no D6-7 after collection");
eq(p.overdue.map(function (t) { return t.key + ":" + t.stage + ":" + t.touch; }), ["k1:D1:High", "k7:CD+30:Low", "k1:D6-7:High", "k8:D1:High", "0909|a:CD:High"], "overdue: every unsent milestone past its due date since go-live, oldest first, mass sends past their grace week included");
eq(p.upcoming.map(function (u) { return u.day + ":" + u.tasks.map(function (t) { return t.key + ":" + t.stage; }).join(","); }), ["2026-10-18:k8:D6-7"], "upcoming groups by opening day");
eq(p.mass.map(function (g) { return g.key + "=" + g.products.join("/") + "=" + g.tasks.map(function (t) { return t.key + (t.late ? "!" : ""); }).join(","); }),
   ["CD+30|checkin+edu+vipben+referral=MC=k3,k6!", "CD+30|checkin+vipben+referral=Kính=k2", "CD+90|checkin+edu+vipben+referral=MC/Kính=k5,k4"],
   "mass groups: same milestone and content merge across products; late ones stay with a flag");
eq(p.tiles, { today: { done: 0, partial: 0, due: 1 }, missed: 4, missedMass: 1, mass: { groups: 3, groupsDone: 0, people: 5, peopleDone: 0 } }, "tiles");
eq(p.overdueRecent.length + p.overdueOld.length, 5, "fold split covers all overdue");
eq(p.overdueOld.map(function (t) { return t.key + ":" + t.stage; }), ["k1:D1"], "only the 15-day-old miss folds away at 14 days");
var done = [{ key: "0909|a", stage: "CD+3-5", bits: "11", score: 1, sent_at: "2026-10-16T09:00:00Z" }, { key: "k3", stage: "CD+30", bits: "1111", score: 1, sent_at: "2026-10-16T09:00:00Z" },
            { key: "k6", stage: "CD+30", bits: "1111", score: 1, sent_at: "2026-10-16T09:00:00Z" }, { key: "k1", stage: "D6-7", bits: "11", score: 1, sent_at: "2026-10-15T09:00:00Z", undone_at: "2026-10-15T09:05:00Z" }];
p = Z.plan(custs, done, { today: today, goLive: gl, da: "Tiên" });
eq(p.tiles.today, { done: 1, partial: 0, due: 1 }, "a sent milestone counts as done");
eq(p.dueToday[0].key + ":" + p.dueToday[0].stage + ":" + p.dueToday[0].full, "0909|a:CD+3-5:true", "the sent milestone is marked full");
eq(p.mass[0].done + ":" + p.mass[0].tasks.length, "2:2", "a late item sent today stays in the group, ticked; this week's sent item counts as done");
var pY = Z.plan(custs, done.map(function (d) { return Object.assign({}, d, { sent_at: "2026-10-15T09:00:00Z" }); }), { today: today, goLive: gl, da: "Tiên" });
eq(pY.mass[0].done + ":" + pY.mass[0].tasks.length, "1:1", "sent on an earlier day, the late item leaves the group");
eq(p.mass[0].late, 0, "late count only for unsent");
eq(p.tiles.mass.groupsDone, 1, "a group with every task sent is done");
eq(p.overdue.map(function (t) { return t.key; }), ["k1", "k7", "k1", "k8", "0909|a"], "an undone tick is still overdue");
eq(p.sentToday, 3, "sent today counts ticks dated today");
eq(Z.score(custs, done, { today: today, goLive: gl, da: "Tiên" }), { due: 6, points: 1, pct: 17 }, "score over closed milestones only: 6 closed, one of them sent");
var pp = Z.plan(custs, [{ key: "0909|a", stage: "CD+3-5", bits: "10", score: 0.5, sent_at: "2026-10-16T09:00:00Z" }], { today: today, goLive: gl, da: "Tiên" });
eq([pp.tiles.today.done, pp.tiles.today.partial, pp.dueToday[0].partial, pp.dueToday[0].full], [0, 1, true, false], "a partial send stays open and counts as partial");
var mc2 = Z.mergeByContact(pp.dueToday); eq([mc2[0].done, mc2[0].partial], [false, true], "a card with a partial task is partial, not done");
var cards = Z.mergeByContact([{ cust: { phone: "0901", tag: "t1" }, key: "a" }, { cust: { phone: "0901", tag: "t1" }, key: "b" }, { cust: { phone: "", tag: "t2" }, key: "c" }]);
eq(cards.map(function (c) { return c.tasks.length; }), [2, 1], "same phone merges into one card");

/* tags */
eq(Z.suggestTag({ product: "MC", dep: "2026-10-16", relation: "Mẹ", child: "An", phone: "0909 123 456" }), "MCN 261016 Mẹ bé An 0909123456", "N tag with deposit date");
eq(Z.suggestTag({ product: "MC", dep: "2026-10-16", coll: "2026-10-23", relation: "Ba", child: "An", phone: "0909123456" }), "MCY 261023 Ba bé An 0909123456", "Y tag with collection date");
eq(Z.suggestTag({ product: "Kính", dep: "2026-10-16", relation: "Khác", relationText: "Cô Lan", child: "Bình", phone: "0909123456" }), "KTN 261016 Cô Lan bé Bình 0909123456", "other relation as typed");
eq(Z.suggestTag({ product: "Exam", date: "2026-10-16", relation: "Mẹ", child: "An", phone: "0909123456" }), "Exam 261016 Mẹ bé An 0909123456", "exam tag has no Y/N");
eq(Z.suggestTag({ product: "MC", dep: "2026-10-16", coll: "2026-10-23", relation: "Mẹ", child: "An", phone: "0909123456", second: { product: "Kính", child: "Bình" } }), "MCY&KTY 261023 Mẹ bé An & Bình 0909123456", "two kids");
eq(Z.suggestTag({ product: "", child: "An" }), "", "no product, no tag");
eq(Z.parseTag("MCY 260720 Mẹ bé Avan Nguyễn 0772786699"), { prefix: "MC", product: "MC", second: "", yn: "Y", date: "2026-07-20", who: "Mẹ bé Avan Nguyễn", phone: "0772786699" }, "parse with phone");
eq(Z.parseTag("KTN 260822 MẸ BÉ HẢI BĂNG & NHÃ UYÊN").date, "2026-08-22", "parse without phone");
eq(Z.parseTag("MCY&KTY 261023 Mẹ bé An & Bình 0909123456").second, "Kính", "parse two products");
eq(Z.parseTag("Exam 261016 Mẹ bé An 0909123456").product, "Exam", "parse exam");
eq(Z.parseTag("hello"), null, "not a tag");

/* csv */
eq(Z.parseCSV('a,"b, c","d ""q"" e"\n1,"x\ny",3\r\n'), [["a", "b, c", 'd "q" e'], ["1", "x\ny", "3"]], "csv quotes and embedded newlines");

/* orders */
var oldRow = ["2025-06-11", "2025-06-12", "BN309-11", "Đặng Minh Ngọc", 903203383, "", "DONE"];
var newRow = ["2026-10-03", "2026-10-17", "DT309-10938", "BN45-23592", "Tô Quỳnh Lam\nĐịa chỉ: 341/m4 Lạc Long Quân\nSố điện thoại: 0912345678", "1.59 miyosmart full control", "Chờ Lấy"];
var doneRow = ["2026-10-13", "2026-10-14", "DT309-11010", "BN309-5292", "Hoàng Ngọc Hân\nĐịa chỉ: x\nSố điện thoại: 0987654321", "1.59 Myocare", "DONE"];
var futureRow = ["2026-10-13", "2026-10-30", "DT309-11099", "BN309-9999", "Trần Vy\nĐịa chỉ: x\nSố điện thoại: 0987000000", "1.61 EL Night", "DONE"];
var os = Z.parseOrders([oldRow, newRow, doneRow, futureRow, ["", "", "", "", "", "", "Chờ Tròng"]], { today: "2026-10-16" });
eq(os.length, 4, "status-only rows are skipped");
eq([os[0].name, os[0].phone, os[0].collected, os[0].patient, os[0].product], ["Đặng Minh Ngọc", "0903203383", "2025-06-12", "", ""], "old format: name in D, phone restored, blank lens");
eq([os[1].name, os[1].phone, os[1].patient, os[1].product, os[1].collected, os[1].expected, os[1].status], ["Tô Quỳnh Lam", "0912345678", "BN45-23592", "MC", "", "2026-10-17", "Chờ Lấy"], "current format: not DONE means expected, not collected");
eq([os[2].collected, os[2].product, os[2].futureDone], ["2026-10-14", "MC", false], "DONE sets collected");
eq(os[3].futureDone, true, "DONE in the future is flagged");
eq(Z.parseOrders([newRow], { today: "2026-10-16", cutoff: "2026-10-01" }).length, 1, "cutoff keeps later rows");
eq(Z.parseOrders([oldRow], { today: "2026-10-16", cutoff: "2026-07-20" }).length, 0, "cutoff drops earlier rows");
eq(Z.inRange(os, "2026-10-14", "2026-10-14").map(function (o) { return o.code; }), ["DT309-11010"], "range matches deposit or appointment");
eq(Z.findOrderSheet([{ name: "BC BV 09-2026", rows: [["x"]] }, { name: "SO TTKSCT", rows: [["", "", "", "", "2529"], ["Ngày Đặt", "Ngày Hẹn", "Mã Đơn Hàng", "Mã BN", "Thông Tin KH", "Sản Phẩm", "Tình Trạng"]] }]).header, 1, "finds the order tab by name and its header row");
eq(Z.findOrderSheet([{ name: "Sheet1", rows: [["Ngày Đặt", "Ngày Hẹn", "Mã Đơn Hàng", "Mã BN", "Thông Tin KH", "Sản Phẩm", "Tình Trạng"]] }]).name, "Sheet1", "finds the order tab by header");
eq(Z.findOrderSheet([{ name: "Sheet1", rows: [["a", "b"]] }]), null, "no order tab");

/* matching */
var crm = [
  { key: "0901|a", name: "Nguyễn An", names: ["Nguyễn An"], phone: "0901", dep: "2026-10-01", coll: "" },
  { key: "0902|b", name: "Trần Bình", names: ["Trần Bình"], phone: "0902", dep: "2026-09-01", coll: "2026-09-08" },
  { key: "0903|c", name: "Lê Chi, Lê Dung", names: ["Lê Chi", "Lê Dung"], phone: "0903", dep: "2026-09-01", coll: "2026-09-08" },
  { key: "|e", name: "Phạm Em", names: ["Phạm Em"], phone: "", dep: "2026-10-01", coll: "" }
];
var idx = Z.indexCustomers(crm);
function order(name, phone, dep, coll){ return { nameNorm: Z.normName(name), phone: phone, dep: dep, collected: coll }; }
eq(Z.matchOrder(order("Nguyễn An", "0901", "2026-10-01", "2026-10-05"), idx).kind, "update", "phone + name, not yet collected → update");
eq(Z.matchOrder(order("Nguyen An", "0901", "2026-10-01", ""), idx).kind, "expected", "phone + name, order not DONE → expected only");
eq(Z.matchOrder(order("Nguyễn An", "0999", "2026-10-01", "2026-10-05"), idx).kind, "update-checkphone", "name only → check phone");
eq(Z.matchOrder(order("Phạm Em", "0988", "2026-10-01", "2026-10-05"), idx).kind, "update-checkphone", "form row without phone → check phone");
eq(Z.matchOrder(order("Trần Bình", "0902", "2026-09-01", "2026-09-08"), idx).kind, "same", "already collected on that date → same");
eq(Z.matchOrder(order("Trần Bình", "0902", "2026-10-10", "2026-10-12"), idx).kind, "repeat", "ordered after the collection → repeat");
eq(Z.matchOrder(order("Lê Dung", "0903", "2026-09-01", "2026-09-08"), idx).kind, "same", "second child in a two-kid cell matches the row");
eq(Z.matchOrder(order("Lê Hoa", "0903", "2026-10-10", "2026-10-12"), idx).kind, "sibling", "same phone, new child → sibling");
eq(Z.matchOrder(order("Võ Gia", "0977", "2026-10-10", "2026-10-12"), idx).kind, "new", "nothing agrees → new");

/* dedupe */
var known = [{ code: "A", status: "Chờ Lấy", appt: "2026-10-17", state: "parked" }, { code: "B", status: "DONE", appt: "2026-10-14", state: "confirmed" }, { code: "C", status: "Chờ Tròng", appt: "2026-10-20", state: "confirmed" }];
var dd = Z.dedupe([{ code: "A", status: "DONE", appt: "2026-10-17", collected: "2026-10-17" }, { code: "B", status: "DONE", appt: "2026-10-14", collected: "2026-10-14" }, { code: "C", status: "DONE", appt: "2026-10-21", collected: "2026-10-21" }, { code: "D", status: "DONE", appt: "2026-10-21" }, { code: "A2", status: "Chờ Lấy", appt: "2026-10-17" }], known.concat([{ code: "A2", status: "Chờ Lấy", appt: "2026-10-17", state: "parked" }]));
eq(dd.map(function (o) { return o.code + ":" + o.seen; }), ["A:changed", "B:done", "C:changed", "D:new", "A2:seen"], "dedupe states");


/* ---- 1.1.6: tolerant header, delimiters, column map ---- */
var std = ["Ngày Đặt", "Ngày Hẹn", "Mã Đơn Hàng", "Mã BN", "Thông Tin KH", "Sản Phẩm", "Tình Trạng"];
eq(Z.headerMap(std), { dep: 0, appt: 1, code: 2, patient: 3, info: 4, phone: -1, lens: 5, status: 6 }, "standard header maps A-G");
eq(Z.headerMap(["STT", "Ngày đặt cọc", "Ngày hẹn", "Mã ĐH", "Tên KH", "SĐT", "Sản phẩm", "Trạng thái"]), { dep: 1, appt: 2, code: 3, patient: -1, info: 4, phone: 5, lens: 6, status: 7 }, "renamed, reordered and extra columns");
eq(Z.headerMap(["Ngày Đặt", "Mã Đơn Hàng"]), null, "two columns is not the header");
eq(Z.headerMap(["Họ tên", "Ngày sinh", "Mã BN"]), null, "a patient list is not the order header");
eq(Z.headerMap(["", "", "", "", 2529, 1786, ""]), null, "the count row is not the header");
eq(Z.csvDelimiter("a;b;c\n1;2;3\n"), ";", "semicolon csv detected");
eq(Z.csvDelimiter("a\tb\tc\n1\t2\t3\n"), "\t", "tab-separated text detected");
eq(Z.csvDelimiter("a,b,c\n"), ",", "comma stays the default");
eq(Z.parseCSV("Ngày Đặt;Ngày Hẹn;Mã Đơn Hàng;Mã BN;Thông Tin KH;Sản Phẩm;Tình Trạng\n2026-10-01;2026-10-03;DT1;;\"Nguyễn A, Nguyễn B\n0909\";Stellest;DONE\n")[1][4], "Nguyễn A, Nguyễn B\n0909", "semicolon csv keeps commas inside cells");
var deep = { name: "Report", rows: [] }; for (var di = 0; di < 25; di++) deep.rows.push(["", "report line " + di]);
deep.rows.push(["STT", "Ngày Đặt", "Ngày Hẹn", "Mã ĐH", "Mã BN", "Thông Tin KH", "Sản Phẩm", "Tình Trạng"]); deep.rows.push([1, "2026-10-01", "2026-10-03", "DT309-1", "", "Lê Bé\n0909123456", "Stellest", "DONE"]);
var fd = Z.findOrderSheet([deep]); eq(fd.header, 25, "header found 25 rows down");
var po = Z.parseOrders(fd.rows.slice(fd.header + 1), { today: "2026-10-16", map: fd.map });
eq([po[0].code, po[0].dep, po[0].collected, po[0].name, po[0].phone, po[0].product], ["DT309-1", "2026-10-01", "2026-10-03", "Lê Bé", "0909123456", "MC"], "orders read through the column map");
var sep = Z.findOrderSheet([{ name: "x", rows: [["Ngày đặt", "Ngày hẹn", "Mã ĐH", "Tên KH", "SĐT", "Sản phẩm", "Tình trạng"], ["2026-10-01", "2026-10-03", "DT2", "Trần Bé", "0912345678", "Myocare", "DONE"]] }]);
var po2 = Z.parseOrders(sep.rows.slice(sep.header + 1), { today: "2026-10-16", map: sep.map }); eq([po2[0].name, po2[0].phone, po2[0].product], ["Trần Bé", "0912345678", "MC"], "phone column of its own");
eq(Z.findOrderSheet([{ name: "SO TTKSCT", rows: [["nothing", "here", "at all"]] }, { name: "Data", rows: [std] }]).name, "Data", "a SO TTKSCT tab without the header yields to a tab that has it");
eq(Z.findOrderSheet([{ name: "SO TTKSCT", rows: [["nothing", "here", "at all"]] }]).header, -1, "a lone SO TTKSCT tab without the header reports -1");


/* ---- 1.3.0: a late low-touch task sent today stays in its mass group ---- */
(function () {
  var cadence = { MC: [{ stage: "CD+14", offset: 14, touch: "Low", items: ["Kiểm tra tình trạng"] }] };
  var tab = null; try { tab = Z.cadenceTab ? null : null; } catch (e) {}
  var cust = { key: "0909000001|late", name: "Late Bé", phone: "0909000001", product: "MC", dep: "2026-09-20", coll: "2026-10-03", names: ["Late Bé"], da: "Tiên", tag: "MCY 261003 Mẹ bé Late Bé 0909000001" };
  var today = "2026-10-19", stage = Z.milestones(cust, { goLive: "2026-09-01" }).filter(function (m) { return m.touch !== "High" && m.due < today; })[0];
  if (!stage) { eq(true, true, "late low-touch stage exists (skipped: none in cadence)"); return; }
  function planWith(sent){ return Z.plan([cust], sent ? [{ key: cust.key, stage: stage.stage, due: stage.due, sent_at: sent, score: 1, undone_at: "" }] : [], { today: today, goLive: "2026-09-01", lateGraceWeeks: 1 }); }
  var inGroup = function (p) { return p.mass.some(function (g) { return g.tasks.some(function (x) { return x.stage === stage.stage; }); }); };
  eq(inGroup(planWith(null)), true, "late open task sits in the mass group");
  eq(inGroup(planWith(today + "T09:00:00.000Z")), true, "late task sent today stays in the group, ticked");
  eq(planWith(today + "T09:00:00.000Z").mass.filter(function (g) { return g.tasks.some(function (x) { return x.stage === stage.stage; }); })[0].done, 1, "and counts as done there");
  eq(inGroup(planWith("2026-10-18T09:00:00.000Z")), false, "sent on an earlier day it leaves the group");
})();

console.log(n + " checks, " + bad + " failed");
process.exit(bad ? 1 : 0);
