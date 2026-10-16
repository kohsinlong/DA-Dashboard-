/* DA Zalo Dashboard — core rules.
   Pure functions, no DOM, no network: the same file runs in the browser (window.ZALO)
   and in Node (module.exports) so the rules can be unit-tested. Everything the page
   decides about dates, cadences, tags, imports and matching lives here; app.js only
   draws and talks to the Apps Script. See zalo/README.md §2.3–2.7. */
(function (root) {
  "use strict";
  var Z = {};
  var MS = 86400000;
  Z.MS = MS;

  /* ======================================================================
     Dates. ISO strings (yyyy-mm-dd) everywhere inside the app.
     ====================================================================== */
  function pad2(n){ return (n < 10 ? "0" : "") + n; }
  function ymd(y, m, d){
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
    return dt.toISOString().slice(0, 10);
  }
  /* Accepts a Date, a sheet serial number, 'yyyy-mm-dd[T…]', 'dd/mm/yyyy', 'd/m/yy',
     'dd-mm-yyyy', 'dd.mm.yyyy' and 'dd/mm' (the year is chosen so the date lands within
     the eleven months before `today` or the month after it). Returns '' when unreadable. */
  function toISO(v, today){
    if (v === null || v === undefined || v === "") return "";
    if (v instanceof Date) { if (isNaN(v)) return ""; return ymd(v.getFullYear(), v.getMonth() + 1, v.getDate()); }
    if (typeof v === "number") {
      if (v > 30000 && v < 80000) { var dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * MS); return dt.toISOString().slice(0, 10); }
      return "";
    }
    var s = String(v).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return ymd(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*$/.exec(s);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return ymd(y, +m[2], +m[1]); }
    m = /^(\d{1,2})[\/\-.](\d{1,2})\s*$/.exec(s);
    if (m) {
      var base = today || todayISO(), by = +base.slice(0, 4), cand = [by - 1, by, by + 1], best = "";
      for (var i = 0; i < cand.length; i++) {
        var iso = ymd(cand[i], +m[2], +m[1]); if (!iso) continue;
        var d = diffDays(base, iso);            /* positive = in the future */
        if (d >= -335 && d <= 35) best = iso;
      }
      return best;
    }
    m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
    if (m) return ymd(+m[1], +m[2], +m[3]);
    return "";
  }
  function addDays(iso, n){ return new Date(Date.parse(iso + "T00:00:00Z") + n * MS).toISOString().slice(0, 10); }
  function diffDays(a, b){ return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / MS); }
  function todayISO(){ var d = new Date(); return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  function dow(iso){ var d = new Date(iso + "T00:00:00Z").getUTCDay(); return (d + 6) % 7; }   /* 0 = Monday */
  function weekBounds(iso){ var s = addDays(iso, -dow(iso)); return { start: s, end: addDays(s, 6) }; }
  function yymmdd(iso){ return iso ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : ""; }
  function fmtDMY(iso){ return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : ""; }
  function fmtDM(iso){ return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : ""; }
  Z.toISO = toISO; Z.addDays = addDays; Z.diffDays = diffDays; Z.todayISO = todayISO; Z.dow = dow;
  Z.weekBounds = weekBounds; Z.yymmdd = yymmdd; Z.fmtDMY = fmtDMY; Z.fmtDM = fmtDM; Z.ymd = ymd; Z.pad2 = pad2;

  /* ======================================================================
     Names and phones.
     ====================================================================== */
  function stripAccents(s){
    s = String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.replace(/đ/g, "d").replace(/Đ/g, "D");
  }
  function cleanCell(s){ return String(s || "").replace(/[\t\r\n]+/g, " ").replace(/ /g, " ").replace(/\s+/g, " ").trim(); }
  /* lower case, accents stripped, punctuation out, 'ng' expanded to 'nguyen', spaces collapsed */
  function normName(s){
    s = stripAccents(cleanCell(s)).toLowerCase().replace(/[.,;:'"()]/g, " ").replace(/\s+/g, " ").trim();
    s = s.replace(/^ng /, "nguyen ");
    return s;
  }
  /* "A, B" · "A & B" · "A và B" · "A; B" · "A  B" (two kids typed with two spaces) → ["A","B"] */
  function splitNames(cell){
    var raw = String(cell || "").replace(/ /g, " ").replace(/[\t\r]+/g, " ");
    var parts = raw.split(/\s*(?:,|&|;|\/|\n| và )\s*/i);
    if (parts.length === 1) {
      var one = raw.trim();
      if (/\S\s{2,}\S/.test(one) && one.split(/\s+/).length >= 6) parts = one.split(/\s{2,}/);
    }
    var out = [];
    parts.forEach(function (p) { p = cleanCell(p); if (p) out.push(p); });
    return out;
  }
  function givenName(norm){ var w = norm.split(" "); return w.slice(-2).join(" "); }
  function normPhone(s){
    var d = String(s || "").replace(/\D/g, "");
    if (d.length === 11 && d.slice(0, 2) === "84") d = "0" + d.slice(2);
    if (d.length === 9 && d.charAt(0) !== "0") d = "0" + d;        /* Excel dropped the leading zero */
    if (d.length === 10 && d.charAt(0) === "0") return d;
    return "";
  }
  function customerKey(phone, name){ return normPhone(phone) + "|" + normName(splitNames(name)[0] || name); }
  Z.stripAccents = stripAccents; Z.cleanCell = cleanCell; Z.normName = normName; Z.splitNames = splitNames;
  Z.givenName = givenName; Z.normPhone = normPhone; Z.customerKey = customerKey;

  /* ======================================================================
     Products.
     ====================================================================== */
  Z.PRODUCTS = ["MC", "Kính", "OK", "Atropine", "Exam"];
  Z.PREFIX = { "MC": "MC", "Kính": "KT", "OK": "OK", "Atropine": "Atr", "Exam": "Exam" };
  /* the product column of the form, as typed: 'mc', 'KÍNH', 'kính, MC', 'ok' … */
  function normProduct(text){
    var s = stripAccents(String(text || "")).toLowerCase();
    var first = null, pos = Infinity;
    [["MC", /\bmc\b/], ["Kính", /\b(kinh|kt|glasses)\b/], ["OK", /\b(ok|ortho)/], ["Atropine", /\batr/], ["Exam", /\b(exam|kham)\b/]]
      .forEach(function (p) { var m = p[1].exec(s); if (m && m.index < pos) { pos = m.index; first = p[0]; } });
    return first || "";
  }
  /* the lens name in the QK report → MC / Kính / '' (the DA picks) */
  function lensProduct(lens){
    var s = stripAccents(String(lens || "")).toLowerCase().trim();
    if (!s) return "";
    if (/myocare|stellest|miyosmart|myopilux|myopsee|myosee|myo\s?care/.test(s)) return "MC";
    if (/gong|contact|ortho|atropin|thuoc/.test(s)) return "";
    return "Kính";
  }
  Z.normProduct = normProduct; Z.lensProduct = lensProduct;

  /* ======================================================================
     Cadence definitions — identical to the head-office page (optom-core.js).
     ====================================================================== */
  Z.STAGES = ["D1", "D6-7", "CD", "CDN", "CD+1", "CD+3-5", "CD+7", "CD+14", "CD+30", "CD+90", "CD+180", "CD+270", "CD+365"];
  Z.OFFSETS = [[0, 0], [0, 7], [1, 0], [1, 0], [1, 1], [1, 5], [1, 7], [1, 14], [1, 30], [1, 90], [1, 180], [1, 270], [1, 365]];
  Z.WINDOW_START = { "D6-7": 6, "CD+3-5": 3 };
  Z.CAD = {
    "MC": { "D1": [["intro", ""], ["eta", ""]], "D6-7": [["arrived", ""], ["pickup", ""]], "CD": [["guide", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+3-5": [["checkin", ""], ["referral", "ref"]], "CD+14": [["checkin", ""], ["wear12", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+30": [["checkin", ""], ["edu", "edu"], ["vipben", "vip"], ["referral", "ref"]], "CD+90": [["checkin", ""], ["edu", "edu"], ["vipben", "vip"], ["referral", "ref"]],
      "CD+180": [["recall", ""], ["vipben", "vip"], ["referral", "ref"]], "CD+270": [["checkin", ""], ["edu", "edu"], ["vipben", "vip"], ["referral", "ref"]],
      "CD+365": [["recall", ""], ["vipben", "vip"], ["referral", "ref"]] },
    "Kính": { "D1": [["intro", ""], ["eta", ""]], "D6-7": [["arrived", ""], ["pickup", ""]], "CD": [["guide", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+3-5": [["checkin", ""], ["referral", "ref"]], "CD+7": [["checkin", ""], ["frameadj", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+30": [["checkin", ""], ["vipben", "vip"], ["referral", "ref"]], "CD+90": [["checkin", ""], ["edu", "edu"], ["vipben", "vip"], ["referral", "ref"]],
      "CD+180": [["recallbook", ""], ["vipben", "vip"], ["referral", "ref"]], "CD+270": [["checkin", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+365": [["recall", ""], ["vipbuy", "vip"], ["framelife", ""]] },
    "OK": { "D1": [["intro", ""], ["eta", ""]], "D6-7": [["arrived", ""], ["pickup", ""]], "CD": [["guide", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CDN": [["firstwear", ""], ["support", ""]], "CD+1": [["checkin", ""], ["referral", "ref"]], "CD+3-5": [["checkin", ""], ["referral", "ref"]],
      "CD+7": [["recallbook", ""], ["vipben", "vip"], ["referral", "ref"]], "CD+30": [["recallbook", ""], ["wear6", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+90": [["recallbook", ""], ["wear6", ""], ["vipben", "vip"], ["referral", "ref"]], "CD+180": [["recallbook", ""], ["wear6", ""], ["vipben", "vip"], ["referral", "ref"]],
      "CD+270": [["recallbook", ""], ["wear6", ""], ["vipben", "vip"], ["referral", "ref"]], "CD+365": [["recall", ""], ["vipben", "vip"], ["referral", "ref"]] },
    "Atropine": { "D1": [["intro", ""], ["eta", ""]], "D6-7": [["medsarrived", ""], ["pickup", ""]], "CD": [["dropguide", ""], ["activate", ""], ["vipben", "vip"]],
      "CD+7": [["compliancecall", ""], ["glare", ""]], "CD+90": [["recall1", ""], ["prescribe", ""]], "CD+180": [["recall2", ""], ["upgrade", ""]],
      "CD+270": [["recall3", ""], ["referral", "ref"]], "CD+365": [["recall4", ""], ["summary", ""], ["combo", ""]] }
  };
  /* High / low touch as agreed on 16 Oct 2026 (README §2.3). The Cadence (VN) tab's
     Touch column overrides this when the script serves it. */
  Z.TOUCH = {
    "MC": { "D1": "High", "D6-7": "High", "CD": "High", "CD+3-5": "High" },
    "Kính": { "D1": "High", "D6-7": "High", "CD": "High", "CD+3-5": "High", "CD+7": "High" },
    "OK": { "D1": "High", "D6-7": "High", "CD": "High", "CDN": "High", "CD+1": "High", "CD+3-5": "High", "CD+7": "High" },
    "Atropine": { "D1": "High", "D6-7": "High", "CD": "High", "CD+7": "High" }
  };
  /* What-to-do text per product and milestone, as written in the Cadence (VN) tab
     (fallback when the tab is unreachable). */
  Z.TEXT = {
    "MC": { "D1": "Đặt cọc: Tin nhắn giới thiệu; cập nhật thời gian dự kiến làm kính", "D6-7": "Cập nhật NGAY khi kính về (<4 giờ); báo ngày hẹn lấy kính",
      "CD": "Gửi hướng dẫn sử dụng; quyền lợi hội viên (khi khách trả lời); mời giới thiệu", "CD+3-5": "Kiểm tra tình trạng sau 3-5 ngày; mời giới thiệu (khi khách trả lời)",
      "CD+14": "Kiểm tra tình trạng; nhắc đeo 12 giờ/ngày; quyền lợi hội viên; mời giới thiệu", "CD+30": "Kiểm tra tình trạng; gửi nội dung giáo dục; quyền lợi hội viên; mời giới thiệu",
      "CD+90": "Kiểm tra tình trạng; gửi nội dung giáo dục; quyền lợi hội viên; mời giới thiệu", "CD+180": "Mời tái khám; quyền lợi hội viên; mời giới thiệu",
      "CD+270": "Kiểm tra tình trạng; gửi nội dung giáo dục; quyền lợi hội viên; mời giới thiệu", "CD+365": "Mời tái khám; quyền lợi hội viên; mời giới thiệu" },
    "Kính": { "D1": "Đặt cọc: Tin nhắn giới thiệu; cập nhật thời gian dự kiến làm kính", "D6-7": "Cập nhật NGAY khi kính về (<4 giờ); báo ngày hẹn lấy kính",
      "CD": "Gửi hướng dẫn sử dụng; quyền lợi hội viên (khi khách trả lời); mời giới thiệu", "CD+3-5": "Kiểm tra tình trạng sau 3-5 ngày; mời giới thiệu (khi khách trả lời)",
      "CD+7": "Kiểm tra tình trạng; chỉnh gọng miễn phí; quyền lợi hội viên; mời giới thiệu", "CD+30": "Kiểm tra tình trạng; quyền lợi hội viên; mời giới thiệu",
      "CD+90": "Kiểm tra tình trạng; gửi nội dung giáo dục; quyền lợi hội viên; mời giới thiệu", "CD+180": "Mời đặt lịch tái khám; quyền lợi hội viên; mời giới thiệu",
      "CD+270": "Kiểm tra tình trạng; quyền lợi hội viên; mời giới thiệu", "CD+365": "Mời tái khám; quyền lợi hội viên mua lại; chỉnh gọng miễn phí trọn đời" },
    "OK": { "D1": "Đặt cọc: Tin nhắn giới thiệu; cập nhật thời gian", "D6-7": "Cập nhật NGAY khi kính về (<4 giờ); báo ngày hẹn lấy",
      "CD": "Gửi hướng dẫn sử dụng; quyền lợi hội viên (khi khách trả lời); mời giới thiệu", "CDN": "Nhắn tối ngày nhận kính: kiểm tra lần đeo Ortho-K đầu tiên; hỗ trợ nếu khó chịu",
      "CD+1": "Kiểm tra tình trạng; mời giới thiệu", "CD+3-5": "Kiểm tra tình trạng sau 3-5 ngày; mời giới thiệu (khi khách trả lời)",
      "CD+7": "Mời đặt lịch tái khám; quyền lợi hội viên; mời giới thiệu", "CD+30": "Mời đặt lịch tái khám; nhắc đeo >6 lần/tuần; quyền lợi hội viên; mời giới thiệu",
      "CD+90": "Mời đặt lịch tái khám; nhắc đeo >6 lần/tuần; quyền lợi hội viên; mời giới thiệu", "CD+180": "Mời đặt lịch tái khám; nhắc đeo >6 lần/tuần; quyền lợi hội viên; mời giới thiệu",
      "CD+270": "Mời đặt lịch tái khám; nhắc đeo >6 lần/tuần; quyền lợi hội viên; mời giới thiệu", "CD+365": "Mời tái khám; quyền lợi hội viên; mời giới thiệu" },
    "Atropine": { "D1": "Đặt cọc: Tin nhắn giới thiệu; cập nhật thời gian", "D6-7": "Cập nhật khi có thuốc; báo ngày hẹn lấy",
      "CD": "Nhận thuốc: Hướng dẫn nhỏ thuốc; kích hoạt hội viên; gửi quyền lợi (khi trả lời)", "CD+7": "Gọi kiểm tra tuân thủ (≥6 ngày/tuần); nhắc đeo kính chống lóa",
      "CD+90": "Tái khám 1 (3 tháng); kê đơn tiếp theo", "CD+180": "Tái khám 2 (6 tháng); tư vấn nâng cấp Ortho-K / MC",
      "CD+270": "Tái khám 3 (9 tháng); mời giới thiệu", "CD+365": "Tái khám 4 (12 tháng); tổng kết; tư vấn phối hợp điều trị" }
  };
  /* The content items, in three languages. */
  Z.CP = {
    en: { intro: "Intro message", eta: "Production ETA", arrived: "Glasses arrived (<4h)", pickup: "Pickup appointment", medsarrived: "Medication arrived",
      guide: "Usage guide", vipben: "Member benefits", referral: "Referral request", checkin: "Check-in", wear12: "Remind 12h/day", edu: "Educational content",
      recall: "Recall invite", frameadj: "Free frame adjustment", recallbook: "Book recall", vipbuy: "Repurchase benefits", framelife: "Lifetime frame adjustment",
      firstwear: "First-night wear check", support: "Discomfort support", wear6: "Remind >6 nights/week", dropguide: "Drop instructions", activate: "Activate membership",
      compliancecall: "Compliance call (≥6 days/wk)", glare: "Anti-glare glasses reminder", recall1: "Recall 1 (3 mo)", prescribe: "Next prescription",
      recall2: "Recall 2 (6 mo)", upgrade: "Ortho-K / MC upsell", recall3: "Recall 3 (9 mo)", recall4: "Recall 4 (12 mo)", summary: "Year summary", combo: "Combined treatment advice" },
    vi: { intro: "Tin nhắn giới thiệu", eta: "Thời gian dự kiến làm kính", arrived: "Báo kính về (<4 giờ)", pickup: "Hẹn ngày lấy kính", medsarrived: "Báo có thuốc",
      guide: "Hướng dẫn sử dụng", vipben: "Quyền lợi hội viên", referral: "Mời giới thiệu", checkin: "Kiểm tra tình trạng", wear12: "Nhắc đeo 12 giờ/ngày", edu: "Nội dung giáo dục",
      recall: "Mời tái khám", frameadj: "Chỉnh gọng miễn phí", recallbook: "Mời đặt lịch tái khám", vipbuy: "Quyền lợi mua lại", framelife: "Chỉnh gọng trọn đời",
      firstwear: "Kiểm tra lần đeo đầu", support: "Hỗ trợ nếu khó chịu", wear6: "Nhắc đeo >6 lần/tuần", dropguide: "Hướng dẫn nhỏ thuốc", activate: "Kích hoạt hội viên",
      compliancecall: "Gọi kiểm tra tuân thủ (≥6 ngày/tuần)", glare: "Nhắc kính chống lóa", recall1: "Tái khám 1 (3 tháng)", prescribe: "Kê đơn tiếp theo",
      recall2: "Tái khám 2 (6 tháng)", upgrade: "Tư vấn nâng cấp Ortho-K / MC", recall3: "Tái khám 3 (9 tháng)", recall4: "Tái khám 4 (12 tháng)", summary: "Tổng kết", combo: "Tư vấn phối hợp điều trị" },
    zh: { intro: "介绍消息", eta: "预计制镜时间", arrived: "镜片到货通知 (<4小时)", pickup: "取镜预约", medsarrived: "药品到货通知",
      guide: "使用指南", vipben: "会员权益", referral: "转介绍邀请", checkin: "状况询问", wear12: "提醒每天佩戴12小时", edu: "教育内容",
      recall: "复诊邀请", frameadj: "免费调整镜架", recallbook: "预约复诊", vipbuy: "复购权益", framelife: "终身镜架调整",
      firstwear: "首夜佩戴检查", support: "不适支持", wear6: "提醒每周佩戴>6次", dropguide: "滴药指导", activate: "激活会员",
      compliancecall: "依从性电话（≥6天/周）", glare: "防眩光眼镜提醒", recall1: "复诊1（3个月）", prescribe: "下次处方",
      recall2: "复诊2（6个月）", upgrade: "升级 Ortho-K / MC 建议", recall3: "复诊3（9个月）", recall4: "复诊4（12个月）", summary: "年度总结", combo: "联合治疗建议" }
  };

  /* cadenceTab: rows served by the script from Cadence (VN): [{product, stage, text, touch}] */
  function cadenceInfo(product, stage, cadenceTab){
    var items = (Z.CAD[product] || {})[stage]; if (!items) return null;
    var touch = (Z.TOUCH[product] || {})[stage] === "High" ? "High" : "Low";
    var text = (Z.TEXT[product] || {})[stage] || "";
    if (cadenceTab) for (var i = 0; i < cadenceTab.length; i++) {
      var r = cadenceTab[i];
      if (normProduct(r.product) === product && String(r.stage).trim() === stage) {
        if (r.touch && /^(high|low)$/i.test(String(r.touch).trim())) touch = /^high$/i.test(String(r.touch).trim()) ? "High" : "Low";
        if (r.text && String(r.text).trim()) text = String(r.text).trim();
        break;
      }
    }
    return { items: items, touch: touch, text: text };
  }
  Z.cadenceInfo = cadenceInfo;

  /* Every milestone a customer has, dated. cust: {product, dep, coll}. opts: {goLive, cadenceTab}. */
  function milestones(cust, opts){
    opts = opts || {};
    var out = [], prod = cust.product;
    if (!Z.CAD[prod]) return out;
    for (var si = 0; si < Z.STAGES.length; si++) {
      var stage = Z.STAGES[si], info = cadenceInfo(prod, stage, opts.cadenceTab);
      if (!info) continue;
      var anchor = Z.OFFSETS[si][0] === 0 ? cust.dep : cust.coll;
      if (!anchor) continue;
      var due = addDays(anchor, Z.OFFSETS[si][1]);
      var open = Z.WINDOW_START[stage] ? addDays(anchor, Z.WINDOW_START[stage]) : due;
      if (opts.goLive && due < opts.goLive) continue;
      out.push({ stage: stage, si: si, due: due, open: open, items: info.items, touch: info.touch, text: info.text, product: prod });
    }
    return out;
  }
  Z.milestones = milestones;

  function groupKey(stage, items){ return stage + "|" + items.map(function (i) { return i[0]; }).join("+"); }
  Z.groupKey = groupKey;

  /* ======================================================================
     The task plan. customers: [{key, product, dep, coll, phone, tag, names, da, …}]
     done: rows of DA_Tasks [{key, stage, bits, score, sent_at, undone_at}]
     opts: {today, goLive, lateGraceWeeks, foldDays, cadenceTab, da}
     ====================================================================== */
  function doneIndex(done){
    var idx = {};
    (done || []).forEach(function (d) {
      if (!d || !d.key || !d.stage) return;
      var k = d.key + "|" + d.stage, cur = idx[k];
      if (!cur || String(d.sent_at || "") >= String(cur.sent_at || "")) idx[k] = d;
    });
    return idx;
  }
  Z.doneIndex = doneIndex;
  function isDone(d){ return !!(d && !d.undone_at); }

  function plan(customers, done, opts){
    opts = opts || {};
    var today = opts.today || todayISO(), wk = weekBounds(today), grace = (opts.lateGraceWeeks === undefined ? 1 : +opts.lateGraceWeeks);
    var lateFrom = addDays(wk.start, -7 * grace);
    var idx = doneIndex(done);
    var overdue = [], dueToday = [], upcoming = {}, groups = {};
    (customers || []).forEach(function (c) {
      if (opts.da && c.da && c.da !== opts.da) return;
      if (opts.da && !c.da) return;
      milestones(c, opts).forEach(function (m) {
        var d = idx[c.key + "|" + m.stage], dn = isDone(d), full = dn && +d.score !== 0.5;
        var t = { cust: c, key: c.key, stage: m.stage, si: m.si, due: m.due, open: m.open, items: m.items, touch: m.touch, text: m.text,
                  product: m.product, done: dn ? d : null, full: full, partial: dn && !full, late: false, daysOver: m.due < today ? diffDays(m.due, today) : 0 };
        if (m.touch === "High") {
          if (m.due < today) { if (!full) overdue.push(t); }
          else if (m.open <= today) dueToday.push(t);
          else if (m.open <= wk.end) (upcoming[m.open] = upcoming[m.open] || []).push(t);
        } else {
          var inWeek = m.due >= wk.start && m.due <= wk.end, isLate = m.due < wk.start && m.due >= lateFrom;
          if (inWeek || (isLate && !full)) {
            t.late = isLate;
            var gk = groupKey(m.stage, m.items), g = groups[gk];
            if (!g) g = groups[gk] = { key: gk, stage: m.stage, si: m.si, items: m.items, products: [], texts: {}, tasks: [] };
            if (g.products.indexOf(m.product) === -1) { g.products.push(m.product); g.texts[m.product] = m.text; }
            g.tasks.push(t);
          } else if (m.due < lateFrom && !full) { t.late = true; overdue.push(t); }
        }
      });
    });
    function byCust(a, b){ return (a.cust.tag || a.cust.name || "").localeCompare(b.cust.tag || b.cust.name || "") || a.si - b.si; }
    overdue.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : byCust(a, b); });
    dueToday.sort(function (a, b) { return (a.full ? 1 : 0) - (b.full ? 1 : 0) || byCust(a, b); });
    var up = Object.keys(upcoming).sort().map(function (day) { upcoming[day].sort(byCust); return { day: day, tasks: upcoming[day] }; });
    var mass = Object.keys(groups).map(function (k) { return groups[k]; });
    mass.sort(function (a, b) { return a.si - b.si || a.key.localeCompare(b.key); });
    mass.forEach(function (g) {
      g.tasks.sort(function (a, b) { return (a.full ? 1 : 0) - (b.full ? 1 : 0) || (a.late ? 1 : 0) - (b.late ? 1 : 0) || byCust(a, b); });
      g.done = g.tasks.filter(function (t) { return t.full; }).length; g.late = g.tasks.filter(function (t) { return t.late && !t.full; }).length;
    });
    var fold = opts.foldDays === undefined ? 14 : +opts.foldDays;
    var tiles = {
      today: { done: dueToday.filter(function (t) { return t.full; }).length, partial: dueToday.filter(function (t) { return t.partial; }).length, due: dueToday.length },
      missed: overdue.filter(function (t) { return t.touch === "High"; }).length,
      missedMass: overdue.filter(function (t) { return t.touch !== "High"; }).length,
      mass: { groups: mass.length, groupsDone: mass.filter(function (g) { return g.tasks.length && g.done === g.tasks.length; }).length,
              people: mass.reduce(function (n, g) { return n + g.tasks.length; }, 0), peopleDone: mass.reduce(function (n, g) { return n + g.done; }, 0) }
    };
    var sentToday = (done || []).filter(function (d) { return d && !d.undone_at && String(d.sent_at || "").slice(0, 10) === today; }).length;
    return { today: today, week: wk, overdue: overdue, overdueRecent: overdue.filter(function (t) { return t.daysOver <= fold; }),
             overdueOld: overdue.filter(function (t) { return t.daysOver > fold; }), dueToday: dueToday, upcoming: up, mass: mass, tiles: tiles, sentToday: sentToday };
  }
  Z.plan = plan;

  /* Rows that share a phone become one card: the parent is messaged once. */
  function mergeByContact(tasks){
    var cards = [], by = {};
    tasks.forEach(function (t) {
      var ph = t.cust.phone || "", k = ph ? "p:" + ph : "k:" + t.key, c = by[k];
      if (!c) { c = by[k] = { phone: ph, tag: t.cust.tag, name: t.cust.name, custs: [], tasks: [] }; cards.push(c); }
      if (c.custs.indexOf(t.cust) === -1) c.custs.push(t.cust);
      c.tasks.push(t);
    });
    cards.forEach(function (c) { c.done = c.tasks.every(function (t) { return t.full; }); c.partial = !c.done && c.tasks.some(function (t) { return t.done; }); });
    return cards;
  }
  Z.mergeByContact = mergeByContact;

  /* Head-office style score over closed milestones: 1 full, 0.5 partial, 0 missed. */
  function score(customers, done, opts){
    opts = opts || {}; var today = opts.today || todayISO(), idx = doneIndex(done), n = 0, pts = 0;
    (customers || []).forEach(function (c) {
      if (opts.da && c.da !== opts.da) return;
      milestones(c, opts).forEach(function (m) {
        if (m.due >= today) return;
        if (opts.from && m.due < opts.from) return;
        n++; var d = idx[c.key + "|" + m.stage]; if (isDone(d)) pts += (+d.score || 1);
      });
    });
    return { due: n, points: pts, pct: n ? Math.round(pts / n * 100) : null };
  }
  Z.score = score;

  /* ======================================================================
     Zalo tags.
     ====================================================================== */
  Z.RELATIONS = ["Mẹ", "Ba", "Ông ngoại", "Bà ngoại", "Ông nội", "Bà nội", "Cô", "Dì", "Chú", "Khác"];
  /* f: {product, dep, coll, relation, relationText, child, phone, second: {product, child} | null, date} */
  function suggestTag(f){
    var prod = f.product, pre = Z.PREFIX[prod]; if (!pre) return "";
    var rel = f.relation === "Khác" ? cleanCell(f.relationText || "") : (f.relation || "");
    var child = cleanCell(f.child || ""), phone = normPhone(f.phone) || String(f.phone || "").replace(/\s+/g, "");
    var head, date;
    if (prod === "Exam") { head = "Exam"; date = f.date || f.dep || ""; }
    else {
      var yn = f.coll ? "Y" : "N"; date = f.coll || f.dep || f.date || "";
      head = pre + yn;
      if (f.second && f.second.product && Z.PREFIX[f.second.product] && f.second.product !== "Exam") head += "&" + Z.PREFIX[f.second.product] + yn;
      else if (f.second && f.second.child) head += "&" + pre + yn;
    }
    var names = child; if (f.second && f.second.child) names = child + " & " + cleanCell(f.second.child);
    var who = [rel, names ? "bé " + names : ""].filter(Boolean).join(" ");
    return [head, yymmdd(date), who, phone].filter(Boolean).join(" ");
  }
  /* "MCY 260720 Mẹ bé Avan Nguyễn 0772786699" → {prefix:'MC', product:'MC', yn:'Y', date:'2026-07-20', who:'Mẹ bé Avan Nguyễn', phone:'0772786699'} */
  function parseTag(tag){
    var line = cleanCell(String(tag || "").split("\n")[0]);
    var m = /^\s*(MC|KT|KH|Kính|Kinh|OK|Atr|Exam)\s*([YNK])?(?:\s*&\s*(MC|KT|KH|OK|Atr)\s*([YNK])?)?/i.exec(line);
    if (!m) return null;
    var key = m[1].toUpperCase(), map = { MC: "MC", KT: "Kính", KH: "Kính", "KÍNH": "Kính", KINH: "Kính", OK: "OK", ATR: "Atropine", EXAM: "Exam" };
    var yn = (m[2] || "").toUpperCase(); if (yn === "K") yn = "";
    var rest = line.slice(m[0].length).trim(), dm = /(\d{6})(?!\d)/.exec(rest), date = "";
    if (dm) { date = ymd(2000 + +dm[1].slice(0, 2), +dm[1].slice(2, 4), +dm[1].slice(4, 6)); if (date) rest = (rest.slice(0, dm.index) + rest.slice(dm.index + 6)).trim(); }
    var pm = /(?:^|\s)(0\d{9}|84\d{9})\s*$/.exec(rest), phone = "";
    if (pm) { phone = normPhone(pm[1]); rest = rest.slice(0, pm.index).trim(); }
    return { prefix: m[1], product: map[key] || "", second: m[3] ? (map[m[3].toUpperCase()] || "") : "", yn: yn, date: date, who: rest, phone: phone };
  }
  Z.suggestTag = suggestTag; Z.parseTag = parseTag;

  /* ======================================================================
     CSV (for .csv uploads and for the Node tests).
     ====================================================================== */
  function parseCSV(text){
    var rows = [], row = [], cell = "", q = false, i = 0, s = String(text || "");
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    for (; i < s.length; i++) {
      var ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  Z.parseCSV = parseCSV;

  /* ======================================================================
     QK NGT Daily report → orders.
     ====================================================================== */
  Z.ORDER_HEADER = ["ngay dat", "ngay hen", "ma don hang", "ma bn", "thong tin kh", "san pham", "tinh trang"];
  function isOrderHeader(row){
    if (!row || row.length < 7) return false;
    for (var i = 0; i < 7; i++) if (stripAccents(String(row[i] || "")).toLowerCase().trim() !== Z.ORDER_HEADER[i]) return false;
    return true;
  }
  /* sheets: [{name, rows}] (rows = arrays of cell values). Picks the SO TTKSCT tab or the first
     tab with the order header. Returns {name, rows, header} or null. */
  function findOrderSheet(sheets){
    var pick = null;
    (sheets || []).forEach(function (s) { if (!pick && /^\s*so\s+ttksct\s*$/i.test(stripAccents(s.name || ""))) pick = s; });
    if (!pick) (sheets || []).forEach(function (s) { if (!pick) for (var r = 0; r < Math.min(10, (s.rows || []).length); r++) if (isOrderHeader(s.rows[r])) { pick = s; break; } });
    if (!pick) return null;
    var header = -1;
    for (var r = 0; r < Math.min(10, pick.rows.length); r++) if (isOrderHeader(pick.rows[r])) { header = r; break; }
    return { name: pick.name, rows: pick.rows, header: header };
  }
  Z.isOrderHeader = isOrderHeader; Z.findOrderSheet = findOrderSheet;

  function normStatus(s){
    var t = stripAccents(String(s || "")).toLowerCase().trim();
    if (!t) return "";
    if (t === "done") return "DONE";
    if (/cho trong/.test(t)) return "Chờ Tròng";
    if (/cho lay/.test(t)) return "Chờ Lấy";
    if (/cpn/.test(t)) return "Đang CPN";
    return cleanCell(s);
  }
  Z.normStatus = normStatus;

  /* rows after the header. opts: {cutoff, today}. */
  function parseOrders(rows, opts){
    opts = opts || {}; var today = opts.today || todayISO(), out = [];
    (rows || []).forEach(function (r, i) {
      if (!r) return;
      var A = r[0], B = r[1], C = cleanCell(r[2]), D = cleanCell(r[3]), E = String(r[4] === undefined || r[4] === null ? "" : r[4]), F = cleanCell(r[5]), G = r[6];
      if (!C && !A && !E.trim()) return;
      var dep = toISO(A, today), appt = toISO(B, today);
      if (!dep) return;                                   /* the sheet's trailing status-only rows */
      if (opts.cutoff && dep < opts.cutoff) return;
      var lines = E.split(/\n/).map(function (l) { return cleanCell(l); }).filter(Boolean);
      var pm = /(?:^|\D)(\d{9,11})(?!\d)/.exec(E.replace(/[\s.\-]/g, "")), phone = pm ? normPhone(pm[1]) : "";
      var hasLetters = /[A-Za-zÀ-ɏḀ-ỿ]/.test(E);
      var name = hasLetters ? lines[0] : (/^[A-Za-z]{1,4}\d/.test(D) ? "" : D);
      if (/^(dia chi|so dien thoai)/i.test(stripAccents(name).toLowerCase())) name = "";
      var patient = /^[A-Za-z]{1,4}\d/.test(D) ? D : "";
      var status = normStatus(G);
      var collected = status === "DONE" ? appt : "";
      out.push({ code: C, row: i, dep: dep, appt: appt, status: status, name: name, nameNorm: normName(name), phone: phone, patient: patient,
                 lens: F, product: lensProduct(F), collected: collected, expected: status !== "DONE" ? appt : "", futureDone: !!(collected && collected > today) });
    });
    return out;
  }
  Z.parseOrders = parseOrders;

  function inRange(orders, from, to){
    return (orders || []).filter(function (o) {
      var ok = function (d) { return d && (!from || d >= from) && (!to || d <= to); };
      return ok(o.dep) || ok(o.appt);
    });
  }
  Z.inRange = inRange;

  /* ======================================================================
     Matching orders to form rows.
     ====================================================================== */
  function indexCustomers(customers){
    var byPhone = {}, byName = {}, byGiven = {};
    (customers || []).forEach(function (c) {
      if (c.phone) (byPhone[c.phone] = byPhone[c.phone] || []).push(c);
      (c.names || splitNames(c.name)).forEach(function (n) {
        var nn = normName(n); if (!nn) return;
        (byName[nn] = byName[nn] || []).push(c);
        var g = givenName(nn); (byGiven[g] = byGiven[g] || []).push(c);
      });
    });
    return { byPhone: byPhone, byName: byName, byGiven: byGiven };
  }
  Z.indexCustomers = indexCustomers;

  /* kinds: same · update · update-checkphone · expected · sibling · repeat · new */
  function matchOrder(o, idx){
    var cands = o.phone ? (idx.byPhone[o.phone] || []) : [];
    var byName = o.nameNorm ? (idx.byName[o.nameNorm] || []) : [];
    var byGiven = o.nameNorm ? (idx.byGiven[givenName(o.nameNorm)] || []) : [];
    var hit = null, checkphone = false;
    for (var i = 0; i < cands.length && !hit; i++) if (byName.indexOf(cands[i]) !== -1 || byGiven.indexOf(cands[i]) !== -1) hit = cands[i];
    if (!hit && byName.length) { hit = byName[0]; checkphone = true; }
    if (!hit) return cands.length ? { kind: "sibling", cust: cands[0] } : { kind: "new", cust: null };
    var kind;
    if (!hit.coll) kind = o.collected ? "update" : "expected";
    else if (o.collected && Math.abs(diffDays(o.collected, hit.coll)) <= 1) kind = "same";
    else if (hit.dep && o.dep && Math.abs(diffDays(o.dep, hit.dep)) <= 1) kind = "same";
    else if (o.dep > hit.coll) kind = "repeat";
    else kind = "same";
    if (checkphone && (kind === "update" || kind === "expected")) kind = "update-checkphone";
    return { kind: kind, cust: hit, checkphone: checkphone };
  }
  Z.matchOrder = matchOrder;

  /* known: rows of DA_Imports keyed by code. Marks each order seen/changed/new. */
  function dedupe(orders, known){
    var map = {}; (known || []).forEach(function (k) { if (k && k.code) map[k.code] = k; });
    return (orders || []).map(function (o) {
      var k = map[o.code]; if (!k) return Object.assign({ seen: "new", prior: null }, o);
      var changed = String(k.status || "") !== o.status || String(k.appt || k.appointment || "") !== o.appt;
      var seen = k.state === "confirmed" ? (changed && o.collected && !(k.collected) ? "changed" : "done") : (changed ? "changed" : "seen");
      return Object.assign({ seen: seen, prior: k }, o);
    });
  }
  Z.dedupe = dedupe;

  if (typeof module !== "undefined" && module.exports) module.exports = Z;
  root.ZALO = Z;
})(typeof window !== "undefined" ? window : globalThis);
