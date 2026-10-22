/* DA Zalo Dashboard — the QA reviewer's pages (1.4.0).
   A reviewer (CZ) signs in on the same page and, instead of the DA's task list, gets:
     #/audit    This week: what fell due, a drawn sample of chats, the customer's whole journey as
                tick boxes (what CZ found in the chat, next to what the DA ticked), remark,
                screenshots, data-issue flag, and the week's overall feedback;
     #/tracker  week by week: scores, discrepancies, every audited chat with remarks and
                screenshots, CSV export;
     #/crm      the clinic's CRM, read only.
   app.js owns sign-in, session, language, chrome and the API; this file owns the reviewer state,
   pages and writes. Everything the reviewer records goes to the reviewer's own tracker workbook
   through the script; the clinic's CRM is never written. README §2.15. */
window.ZALO_REVIEW = (function () {
  "use strict";
  var R = {}, A = null;           /* A: hooks handed over by app.js */
  var Z = window.ZALO;
  var st = { data: null, clinic: "", week: "", clinics: [], audits: {}, weekly: {}, shots: {}, blobs: {}, loading: {}, pending: {}, timers: {},
             ui: { dueStage: "", dueProd: "", dueDa: "", dueQ: "", duePage: 0, showAllDue: false, trWeek: "", trVerdict: "", trProd: "", trStage: "", trShots: false, trQ: "", trClinic: "", phones: {}, open: {} } };
  R.st = st;

  /* ------------------------------------------------------------------ strings */
  var L = {
    zh: {
      nav: { audit: "本周审核", tracker: "追踪", crm: "CRM" }, sub: "{c} · 审核人 {r}", title: "Zalo 审核",
      week: "第 {n} 周", thisWeek: "本周", lastWeek: "上周", prevWeek: "上一周", nextWeek: "下一周", clinic: "诊所",
      tDue: "到期客户", tDueX: "{m} 个节点本周到期", tSample: "抽样", tSampleX: "已检查 {c} · 目标 {n}", tScore: "合规率", tScoreX: "已检查节点 {n} 个 · 本周节点 {w}%", tScoreNone: "尚未检查",
      tDa: "助理自报", tDaX: "本周到期节点已勾 {s}/{n}", tGap: "勾了但未见", tGapX: "助理已勾、聊天中未见的内容",
      fbTitle: "本周总评", fbHint: "诊所本周表现：做得好的、需改进的。按周保存到追踪表。", fbPh: "写下本周对 {c} 的总评…", fbSave: "保存总评", fbSaved: "已保存 {t}",
      sample: "本周样本", sampleHint: "{n} 个对话 · 逐个打开聊天，勾选找到的内容", draw: "抽样 {n} 个", drawHint: "按本周到期的节点和产品分散抽取", drawNone: "本周没有更多到期客户可抽", addAny: "添加任意客户…",
      sampleEmpty: "本周尚未抽样。", sampleEmptyHint: "点“抽样”按节点和产品分散抽取，或从下方到期名单逐个添加。",
      journey: "客户旅程", thisWeekChip: "本周到期", beforeLive: "上线前", daTicked: "助理已勾", daNone: "助理未勾", notFound: "助理已勾但未见", allSent: "全部已发", noneSent: "全部未发", notChecked: "未检查",
      remarkPh: "备注：缺了什么、做得好的、需要修正的…", dataIssue: "数据问题（标签错误、日期错误、找不到聊天）", shots: "截图", addShot: "添加截图", shotFail: "截图上传失败：{e}",
      checked: "已检查 ✓", markChecked: "标记为已检查", remove: "移出样本", open: "展开", close: "收起", phone: "电话", showPhone: "显示电话",
      vOpen: "未检查", vPass: "合规", vPartial: "部分", vFail: "未合规", vData: "数据问题", vNoted: "已记录",
      due: "本周到期", dueHint: "每个本周有节点到期的客户 · 按 CRM 的押金/取镜日期计算，与助理看板一致", allStages: "全部节点", allProds: "全部产品", allDa: "助理状态：全部", daSent: "助理已勾", daNot: "助理未勾",
      search: "搜索标签、姓名或电话", inSample: "已在样本", add: "审核", more: "更多 {n} 个", dueEmpty: "本周没有到期的节点。", noMatch: "没有符合的客户。", allCust: "全部客户",
      stSent: "已勾", stPartial: "部分", stNone: "未勾",
      trTitle: "逐周", trHint: "每周样本、合规率与助理自报的差距 · 点一行打开该周", thWeek: "周", thDue: "到期", thSampled: "抽样", thChecked: "已检查", thScore: "合规率", thWeekScore: "本周节点", thDa: "助理自报", thGap: "勾了未见", thPass: "合规", thPartial: "部分", thFail: "未合规", thData: "数据", thRemark: "总评",
      entries: "所有审核记录", entriesHint: "{n} 条 · 备注与截图", allWeeks: "全部周", allVerdicts: "全部结论", withShots: "有截图", csv: "导出 CSV", noEntries: "没有符合的记录。", openWeek: "打开该周",
      crmHint: "只读 · 与助理看板相同的数据", saved: "已保存", saving: "保存中…", failed: "未能保存：{e}", localOnly: "演示：仅保存在本浏览器",
      g: { title: "审核人指南", lines: ["每周一打开“本周审核”：默认显示上一周（已结束的一周）。", "点“抽样”，系统按节点和产品分散抽取 15 个对话；也可从到期名单或搜索框添加。", "逐个打开 Zalo 聊天，在客户旅程中勾选找到的内容；“助理已勾”表示助理在她的看板上标记已发送。", "写备注、添加截图、必要时勾“数据问题”，最后点“标记为已检查”。", "写下本周总评。“追踪”页汇总每周结果和所有记录，可导出 CSV。"] },
      months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    },
    en: {
      nav: { audit: "This week", tracker: "Tracker", crm: "CRM" }, sub: "{c} · reviewer {r}", title: "Zalo audit",
      week: "Week {n}", thisWeek: "this week", lastWeek: "last week", prevWeek: "Previous week", nextWeek: "Next week", clinic: "Clinic",
      tDue: "Customers due", tDueX: "{m} cadences fall due this week", tSample: "Sampled", tSampleX: "{c} checked · target {n}", tScore: "Compliance", tScoreX: "{n} cadences checked · this week's {w}%", tScoreNone: "nothing checked yet",
      tDa: "DA reported", tDaX: "{s}/{n} of this week's cadences ticked", tGap: "Ticked, not found", tGapX: "items the DA ticked that the chat does not show",
      fbTitle: "Overall feedback", fbHint: "How the clinic did this week: what went well, what to improve. Saved per week in the tracker.", fbPh: "Write this week's overall feedback for {c}…", fbSave: "Save feedback", fbSaved: "Saved {t}",
      sample: "This week's sample", sampleHint: "{n} chats · open each chat and tick what you find", draw: "Draw {n}", drawHint: "Spread across the cadences and products due this week", drawNone: "No more customers due this week to draw from", addAny: "Add any customer…",
      sampleEmpty: "No chats sampled for this week yet.", sampleEmptyHint: "Use Draw for a spread across cadences and products, or add customers one by one from the due list below.",
      journey: "Customer journey", thisWeekChip: "due this week", beforeLive: "before go-live", daTicked: "DA ticked", daNone: "DA did not tick", notFound: "DA ticked, not found", allSent: "All sent", noneSent: "Nothing sent", notChecked: "not checked",
      remarkPh: "Remark: what was missing, what was good, anything to fix…", dataIssue: "Data issue (wrong tag, wrong date, chat not found)", shots: "Screenshots", addShot: "Add screenshot", shotFail: "Screenshot upload failed: {e}",
      checked: "Checked ✓", markChecked: "Mark as checked", remove: "Remove from sample", open: "Expand", close: "Collapse", phone: "Phone", showPhone: "Show phone",
      vOpen: "Not checked", vPass: "Pass", vPartial: "Partial", vFail: "Fail", vData: "Data issue", vNoted: "Noted",
      due: "Due this week", dueHint: "Every customer with a cadence falling due · from the CRM's deposit and collection dates, as on the DA's dashboard", allStages: "All cadences", allProds: "All products", allDa: "DA status: all", daSent: "DA ticked", daNot: "DA did not tick",
      search: "Search tag, name or phone", inSample: "In sample", add: "Audit", more: "{n} more", dueEmpty: "No cadence falls due in this week.", noMatch: "No customer matches.", allCust: "All customers",
      stSent: "ticked", stPartial: "partial", stNone: "not ticked",
      trTitle: "Week by week", trHint: "Sample, compliance and the gap to what the DA reported · click a row to open that week", thWeek: "Week", thDue: "Due", thSampled: "Sampled", thChecked: "Checked", thScore: "Score", thWeekScore: "This week's", thDa: "DA reported", thGap: "Ticked, not found", thPass: "Pass", thPartial: "Partial", thFail: "Fail", thData: "Data", thRemark: "Feedback",
      entries: "All audited chats", entriesHint: "{n} entries · remarks and screenshots", allWeeks: "All weeks", allVerdicts: "All verdicts", withShots: "With screenshots", csv: "Export CSV", noEntries: "No entries match.", openWeek: "Open week",
      crmHint: "Read only · the same data the DA sees", saved: "Saved", saving: "Saving…", failed: "Could not save: {e}", localOnly: "Demo: kept in this browser only",
      g: { title: "Reviewer guide", lines: ["Open This week on Monday: it shows last week, the one just closed.", "Press Draw: 15 chats spread across the cadences and products due. Add others from the due list or the search box.", "Open each Zalo chat and tick what you find in the customer journey. “DA ticked” means the DA marked it sent on her dashboard.", "Write a remark, add screenshots, flag a data issue if needed, then Mark as checked.", "Write the week's overall feedback. Tracker sums up every week and lists every chat, with CSV export."] },
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    },
    vi: {
      nav: { audit: "Tuần này", tracker: "Theo dõi", crm: "CRM" }, sub: "{c} · người kiểm {r}", title: "Kiểm tra Zalo",
      week: "Tuần {n}", thisWeek: "tuần này", lastWeek: "tuần trước", prevWeek: "Tuần trước", nextWeek: "Tuần sau", clinic: "Phòng khám",
      tDue: "Khách đến hạn", tDueX: "{m} cadence đến hạn tuần này", tSample: "Mẫu", tSampleX: "{c} đã kiểm · mục tiêu {n}", tScore: "Tuân thủ", tScoreX: "{n} cadence đã kiểm · tuần này {w}%", tScoreNone: "chưa kiểm",
      tDa: "Trợ lý tự báo", tDaX: "{s}/{n} cadence tuần này đã tick", tGap: "Đã tick, không thấy", tGapX: "nội dung trợ lý đã tick nhưng không có trong hội thoại",
      fbTitle: "Nhận xét chung", fbHint: "Phòng khám tuần này: điểm tốt, điểm cần cải thiện. Lưu theo tuần vào tracker.", fbPh: "Viết nhận xét chung tuần này cho {c}…", fbSave: "Lưu nhận xét", fbSaved: "Đã lưu {t}",
      sample: "Mẫu tuần này", sampleHint: "{n} hội thoại · mở từng hội thoại và tick những gì tìm thấy", draw: "Rút {n}", drawHint: "Trải đều theo cadence và sản phẩm đến hạn tuần này", drawNone: "Không còn khách đến hạn tuần này để rút", addAny: "Thêm khách bất kỳ…",
      sampleEmpty: "Tuần này chưa rút mẫu.", sampleEmptyHint: "Dùng Rút để trải đều theo cadence và sản phẩm, hoặc thêm từng khách từ danh sách đến hạn.",
      journey: "Hành trình khách", thisWeekChip: "đến hạn tuần này", beforeLive: "trước go-live", daTicked: "Trợ lý đã tick", daNone: "Trợ lý chưa tick", notFound: "Đã tick, không thấy", allSent: "Gửi đủ", noneSent: "Không gửi", notChecked: "chưa kiểm",
      remarkPh: "Nhận xét: thiếu gì, tốt gì, cần sửa gì…", dataIssue: "Lỗi dữ liệu (sai tag, sai ngày, không tìm thấy hội thoại)", shots: "Ảnh chụp", addShot: "Thêm ảnh chụp", shotFail: "Không tải được ảnh: {e}",
      checked: "Đã kiểm ✓", markChecked: "Đánh dấu đã kiểm", remove: "Bỏ khỏi mẫu", open: "Mở", close: "Thu gọn", phone: "Điện thoại", showPhone: "Hiện số điện thoại",
      vOpen: "Chưa kiểm", vPass: "Đạt", vPartial: "Một phần", vFail: "Không đạt", vData: "Lỗi dữ liệu", vNoted: "Ghi nhận",
      due: "Đến hạn tuần này", dueHint: "Mọi khách có cadence đến hạn · theo ngày cọc / ngày nhận trong CRM, giống bảng của trợ lý", allStages: "Tất cả cadence", allProds: "Tất cả sản phẩm", allDa: "Trạng thái trợ lý: tất cả", daSent: "Trợ lý đã tick", daNot: "Trợ lý chưa tick",
      search: "Tìm tag, tên hoặc SĐT", inSample: "Trong mẫu", add: "Kiểm", more: "{n} khách nữa", dueEmpty: "Không có cadence nào đến hạn tuần này.", noMatch: "Không có khách phù hợp.", allCust: "Tất cả khách",
      stSent: "đã tick", stPartial: "một phần", stNone: "chưa tick",
      trTitle: "Tuần qua tuần", trHint: "Mẫu, tuân thủ và chênh lệch với tự báo của trợ lý · bấm một dòng để mở tuần đó", thWeek: "Tuần", thDue: "Đến hạn", thSampled: "Mẫu", thChecked: "Đã kiểm", thScore: "Điểm", thWeekScore: "Tuần này", thDa: "Trợ lý báo", thGap: "Tick, không thấy", thPass: "Đạt", thPartial: "Một phần", thFail: "Không đạt", thData: "Dữ liệu", thRemark: "Nhận xét",
      entries: "Tất cả hội thoại đã kiểm", entriesHint: "{n} mục · nhận xét và ảnh chụp", allWeeks: "Tất cả tuần", allVerdicts: "Tất cả kết luận", withShots: "Có ảnh chụp", csv: "Xuất CSV", noEntries: "Không có mục phù hợp.", openWeek: "Mở tuần",
      crmHint: "Chỉ đọc · cùng dữ liệu trợ lý nhìn thấy", saved: "Đã lưu", saving: "Đang lưu…", failed: "Không lưu được: {e}", localOnly: "Demo: chỉ lưu trong trình duyệt này",
      g: { title: "Hướng dẫn người kiểm", lines: ["Thứ Hai mở Tuần này: mặc định hiện tuần vừa kết thúc.", "Bấm Rút: 15 hội thoại trải đều theo cadence và sản phẩm đến hạn. Thêm khách khác từ danh sách đến hạn hoặc ô tìm.", "Mở từng hội thoại Zalo và tick những gì tìm thấy trong hành trình khách. “Trợ lý đã tick” nghĩa là trợ lý đã đánh dấu đã gửi trên bảng của cô ấy.", "Viết nhận xét, thêm ảnh chụp, tick Lỗi dữ liệu nếu cần, rồi Đánh dấu đã kiểm.", "Viết nhận xét chung của tuần. Trang Theo dõi tổng hợp từng tuần và mọi hội thoại, xuất được CSV."] },
      months: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"]
    }
  };
  function T(){ return L[A.lang()] || L.zh; }
  R.L = L;

  /* ------------------------------------------------------------------ utils */
  function esc(s){ return A.esc(s); }
  function fill(s, o){ return A.fill(s, o); }
  function $(id){ return document.getElementById(id); }
  function nowIso(){ return new Date().toISOString(); }
  function isoWeek(monday){ var thu = new Date(Date.parse(monday + "T00:00:00Z") + 3 * Z.MS), y0 = Date.UTC(thu.getUTCFullYear(), 0, 1); return Math.floor((thu.getTime() - y0) / Z.MS / 7) + 1; }
  function weekLabel(k){ var t = T(), a = k, b = Z.addDays(k, 6); var am = t.months[+a.slice(5, 7) - 1], bm = t.months[+b.slice(5, 7) - 1]; return am === bm ? +a.slice(8, 10) + "–" + +b.slice(8, 10) + " " + bm : +a.slice(8, 10) + " " + am + " – " + +b.slice(8, 10) + " " + bm; }
  function wTag(k){ return "W" + isoWeek(k); }
  function monday(iso){ return Z.weekBounds(iso).start; }
  function thisWeek(){ return monday(A.today()); }
  function lastWeek(){ return Z.addDays(thisWeek(), -7); }
  function fmtWhen(iso){ if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return iso; return Z.fmtDM(iso.slice(0, 10)) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function clinicData(code){ return (st.data && st.data.clinics && st.data.clinics[code || st.clinic]) || null; }
  function settings(){ return (st.data && st.data.settings && st.data.settings[st.clinic]) || {}; }
  function sampleSize(){ return Math.max(1, +(settings().sample_size || 15) || 15); }
  function startWeek(){ var s = settings().start_week; return /^\d{4}-\d{2}-\d{2}$/.test(s || "") ? monday(s) : lastWeek(); }
  function aKey(week, clinic, custKey){ return week + "|" + clinic + "|" + custKey; }
  function wKey(week, clinic){ return week + "|" + clinic; }
  function prodLabel(p){ return A.prodLabel(p); }
  function itemLabel(k, lang){ return ((Z.CP[lang || A.lang()] || Z.CP.vi)[k]) || k; }

  /* ------------------------------------------------------------------ data */
  /* The bootstrap: {role, reviewer, name, today, clinics:{code:{customers, das, cadence, tasks, settings}}, audits, weekly, shots, settings:{code}, cadenceCN} */
  R.shape = function (data) {
    st.data = data;
    st.clinics = Object.keys(data.clinics || {}).filter(function (c) { return data.clinics[c] && !data.clinics[c].error; }).sort();
    if (!st.clinic || st.clinics.indexOf(st.clinic) === -1) st.clinic = st.clinics[0] || "";
    st.audits = {}; (data.audits || []).forEach(function (a) { st.audits[a.key] = a; });
    st.weekly = {}; (data.weekly || []).forEach(function (w) { st.weekly[wKey(w.week, w.clinic)] = w; });
    st.shots = {}; (data.shots || []).forEach(function (s) { st.shots[s.id] = s; });
    R.selectClinic(st.clinic);
    if (!st.week) st.week = lastWeek() < startWeek() ? startWeek() : lastWeek();
  };
  /* make app.js's st.cust / st.tasks / st.cadence / st.settings describe the selected clinic so the CRM page and customer sheets work unchanged */
  R.selectClinic = function (code) {
    st.clinic = code;
    var cd = clinicData(code) || { customers: [], das: {}, cadence: [], tasks: [], settings: {} };
    A.shapeClinic({ clinic: code, customers: cd.customers, das: cd.das, cadence: cd.cadence, tasks: cd.tasks, settings: cd.settings, details: [], imports: [], today: st.data.today });
    st.byKey = {}; A.customers().forEach(function (c) { st.byKey[c.key] = c; });
    st.taskIdx = Z.doneIndex(cd.tasks || []);
  };
  function cust(key){ return st.byKey[key]; }
  function customers(){ return A.customers(); }

  /* ------------------------------------------------------------------ cadence: the whole journey */
  /* Every milestone the customer has, from the deposit, dated; D1 / D6-7 are kept after collection
     (the reviewer checks them too). before: due < go-live (the DA was not on the dashboard yet). */
  function journey(c){
    var out = [], prod = c.product, goLive = (A.settings().go_live || "");
    if (!Z.CAD[prod]) return out;
    for (var si = 0; si < Z.STAGES.length; si++) {
      var stage = Z.STAGES[si], info = Z.cadenceInfo(prod, stage, A.cadenceTab());
      if (!info) continue;
      var anchor = Z.OFFSETS[si][0] === 0 ? c.dep : c.coll;
      if (!anchor) continue;
      var due = Z.addDays(anchor, Z.OFFSETS[si][1]), open = Z.WINDOW_START[stage] ? Z.addDays(anchor, Z.WINDOW_START[stage]) : due;
      out.push({ stage: stage, si: si, due: due, open: open, items: info.items, touch: info.touch, text: info.text, before: !!(goLive && due < goLive) });
    }
    return out;
  }
  function dueInWeek(c, wk){ var end = Z.addDays(wk, 6); return journey(c).filter(function (m) { return m.due >= wk && m.due <= end; }); }
  function daBits(c, stage){ var d = st.taskIdx[c.key + "|" + stage]; return d && !d.undone_at ? String(d.bits || "") : ""; }
  function daState(c, m){ var b = daBits(c, m.stage); if (!b) return "none"; var on = b.split("").filter(function (x) { return x === "1"; }).length; return on >= m.items.length ? "sent" : on ? "partial" : "none"; }
  function cnText(prod, stage){ var list = (st.data && st.data.cadenceCN) || []; for (var i = 0; i < list.length; i++) if (list[i].product === prod && list[i].stage === stage) return list[i].text; return ""; }

  /* ------------------------------------------------------------------ records */
  function recsOf(week, clinic){ return Object.keys(st.audits).map(function (k) { return st.audits[k]; }).filter(function (a) { return a.week === week && a.clinic === (clinic || st.clinic); }); }
  function bitsPts(bits, n){ var on = 0; for (var i = 0; i < n; i++) if (bits.charAt(i) === "1") on++; return !n || !on ? 0 : on >= n ? 1 : 0.5; }
  /* verdict and points from the marks: {stage: bits}; only milestones with a mark count */
  function evalRec(a){
    var c = cust(a.custKey), j = c ? journey(c) : [], marks = a.marks || {}, pts = [], wk = [], notFound = 0, full = 0, none = 0, n = 0, found = [], missing = [], end = Z.addDays(a.week, 6);
    j.forEach(function (m) {
      var bits = marks[m.stage]; if (bits === undefined || bits === "") return;
      var p = bitsPts(bits, m.items.length); n++; pts.push(p); if (p === 1) full++; if (p === 0) none++;
      if (m.due >= a.week && m.due <= end) wk.push(p);
      var db = daBits(c, m.stage), miss = [];
      m.items.forEach(function (it, i) { if (bits.charAt(i) !== "1") { miss.push(itemLabel(it[0], "zh")); if (db.charAt(i) === "1") notFound++; } });
      if (p === 1) found.push(m.stage); else if (p === .5) found.push(m.stage + " ½");
      if (miss.length) missing.push(m.stage + ": " + miss.join("、"));
    });
    var avg = function (l) { return l.length ? Math.round(l.reduce(function (s, x) { return s + x; }, 0) / l.length * 100) : null; };
    var verdict = a.data ? "data" : !n ? (a.status === "checked" ? (a.source && a.source !== "app" ? "noted" : "fail") : "open") : full === n ? "pass" : none === n ? "fail" : "partial";
    return { n: n, score: avg(pts), weekScore: avg(wk), notFound: notFound, verdict: verdict, found: found.join(" · "), missing: missing.join("\n") };
  }
  function verdictPill(v){ var t = T(), m = { pass: ["p-ok", t.vPass], partial: ["p-warn", t.vPartial], fail: ["p-bad", t.vFail], data: ["p-inert", t.vData], noted: ["p-inert", t.vNoted], open: ["p-accent", t.vOpen] }[v] || ["p-inert", v]; return '<span class="pill ' + m[0] + '">' + esc(m[1]) + "</span>"; }
  function scoreColour(s){ return s === null || s === undefined ? "var(--muted)" : s >= 80 ? "var(--ok)" : s >= 50 ? "var(--warn)" : "var(--bad)"; }

  /* the week's figures, for the tiles, the tracker and the Weekly tab */
  function weekStats(week, clinic){
    clinic = clinic || st.clinic;
    var recs = recsOf(week, clinic), s = { week: week, clinic: clinic, dueCustomers: 0, dueCadences: 0, sampled: recs.length, checked: 0, pass: 0, partial: 0, fail: 0, data: 0, noted: 0, open: 0,
      score: null, weekScore: null, notFound: 0, daSent: null, daTicked: 0 };
    var ptsAll = [], ptsWk = [], daN = 0, daOn = 0;
    if (clinic === st.clinic) customers().forEach(function (c) {
      var d = dueInWeek(c, week); if (!d.length) return;
      s.dueCustomers++; s.dueCadences += d.length;
      d.forEach(function (m) { daN++; var ds = daState(c, m); if (ds === "sent") daOn++; else if (ds === "partial") daOn += .5; });
    });
    recs.forEach(function (a) {
      var e = evalRec(a); s[e.verdict] = (s[e.verdict] || 0) + 1;
      if (a.status === "checked") s.checked++;
      if (e.score !== null) ptsAll.push(e.score); if (e.weekScore !== null) ptsWk.push(e.weekScore);
      s.notFound += e.notFound;
    });
    var avg = function (l) { return l.length ? Math.round(l.reduce(function (x, y) { return x + y; }, 0) / l.length) : null; };
    s.score = avg(ptsAll); s.weekScore = avg(ptsWk); s.daSent = daN ? Math.round(daOn / daN * 100) : null; s.daTicked = daOn; s.daN = daN;
    return s;
  }
  function statsLine(s){ return { week: s.week, clinic: s.clinic, dueCustomers: s.dueCustomers, dueCadences: s.dueCadences, sampled: s.sampled, checked: s.checked, pass: s.pass, partial: s.partial, fail: s.fail, data: s.data, score: s.score === null ? "" : s.score, weekScore: s.weekScore === null ? "" : s.weekScore, notFound: s.notFound, daSent: s.daSent === null ? "" : s.daSent }; }

  /* ------------------------------------------------------------------ writes */
  function toSheet(a){
    var e = evalRec(a);
    return { key: a.key, week: a.week, clinic: a.clinic, custKey: a.custKey, tag: a.tag, name: a.name, product: a.product, da: a.da, due: a.due, status: a.status, verdict: e.verdict,
             score: e.score === null ? "" : e.score, found: e.found, missing: e.missing, notFound: e.notFound, remark: a.remark || "", data: a.data ? 1 : 0,
             shots: shotsOf(a).length, checkedAt: a.checkedAt || "", marks: a.marks || {}, source: a.source || "app", added: a.added || "" };
  }
  function setStatus(key, s){ st.pending[key] = s; var el = document.querySelector('[data-rvstat="' + CSS.escape(key) + '"]'); if (el) el.innerHTML = statusHtml(key); }
  function statusHtml(key){ var t = T(), s = st.pending[key]; if (!s) return ""; return '<span class="rvstat ' + (s === "saving" ? "warn" : s.indexOf("failed") === 0 ? "bad" : "ok") + '">' + esc(s === "saving" ? t.saving : s === "saved" ? t.saved : s === "local" ? t.localOnly : fill(t.failed, { e: s.slice(7) })) + "</span>"; }
  function save(a){
    clearTimeout(st.timers[a.key]); setStatus(a.key, "saving");
    st.timers[a.key] = setTimeout(function () {
      A.post({ action: "auditSave", audits: [toSheet(a)], stats: [statsLine(weekStats(a.week, a.clinic))] })
        .then(function (r) { setStatus(a.key, r && r.local ? "local" : "saved"); })
        .catch(function (e) { setStatus(a.key, "failed " + e.message); });
    }, 700);
  }
  function addToSample(c, week, source){
    var key = aKey(week, st.clinic, c.key), a = st.audits[key];
    if (a) return a;
    a = { key: key, week: week, clinic: st.clinic, custKey: c.key, tag: c.tag, name: A.custLabel(c), product: c.product, da: c.da,
          due: dueInWeek(c, week).map(function (m) { return m.stage; }).join(" "), status: "sampled", marks: {}, remark: "", data: 0, checkedAt: "", source: source || "app", added: nowIso() };
    st.audits[key] = a; save(a); return a;
  }
  function removeFromSample(a){
    delete st.audits[a.key]; clearTimeout(st.timers[a.key]);
    A.post({ action: "auditRemove", keys: [a.key], clinic: a.clinic, stats: [statsLine(weekStats(a.week, a.clinic))] }).catch(function (e) { A.toast(fill(T().failed, { e: e.message }), true); });
  }
  /* Draw n customers across the cadences and products due this week: round-robin over the
     cadence groups, alternating product inside each, from a shuffled pool not yet sampled. */
  function draw(week, n){
    var have = {}; recsOf(week).forEach(function (a) { have[a.custKey] = 1; });
    var groups = {};
    customers().forEach(function (c) {
      if (have[c.key] || c.exam) return;
      var d = dueInWeek(c, week); if (!d.length) return;
      var g = d[0].stage; (groups[g] = groups[g] || []).push(c);
    });
    var order = Object.keys(groups).sort(function (a, b) { return Z.STAGES.indexOf(a) - Z.STAGES.indexOf(b); });
    order.forEach(function (g) {
      var list = groups[g];
      for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; }
      var byP = {}; list.forEach(function (c) { (byP[c.product] = byP[c.product] || []).push(c); });
      var mixed = [], more = true, ps = Object.keys(byP);
      while (more) { more = false; ps.forEach(function (p) { if (byP[p].length) { mixed.push(byP[p].shift()); more = true; } }); }
      groups[g] = mixed;
    });
    var picked = [], taken = {}, progress = true;
    while (picked.length < n && progress) {
      progress = false;
      for (var gi = 0; gi < order.length && picked.length < n; gi++) {
        var pool = groups[order[gi]];
        while (pool.length) { var c = pool.shift(); if (taken[c.key]) continue; taken[c.key] = 1; picked.push(c); progress = true; break; }
      }
    }
    picked.forEach(function (c) { addToSample(c, week, "draw"); });
    return picked.length;
  }
  function saveFeedback(week, text){
    var k = wKey(week, st.clinic), w = st.weekly[k] || { week: week, clinic: st.clinic };
    w.remark = text; w.updated = nowIso(); w.by = st.data.reviewer; st.weekly[k] = w;
    setStatus(k, "saving");
    A.post({ action: "feedbackSave", week: week, clinic: st.clinic, text: text, stats: statsLine(weekStats(week)) })
      .then(function (r) { setStatus(k, r && r.local ? "local" : "saved"); R.render(); })
      .catch(function (e) { setStatus(k, "failed " + e.message); });
  }

  /* ------------------------------------------------------------------ screenshots */
  function shotsOf(a){ return Object.keys(st.shots).map(function (id) { return st.shots[id]; }).filter(function (s) { return s.week === a.week && s.clinic === a.clinic && s.custKey === a.custKey; }); }
  function readFile(file){ return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(fr.error); }; fr.readAsDataURL(file); }); }
  /* downscale big phone screenshots so a week of them stays small */
  function shrink(dataUrl, max){
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height; if (Math.max(w, h) <= max) return res(dataUrl);
        var k = max / Math.max(w, h), cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL("image/jpeg", .85));
      };
      img.onerror = function () { res(dataUrl); };
      img.src = dataUrl;
    });
  }
  function addShots(a, files){
    var list = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); }), t = T();
    if (!list.length) return;
    setStatus(a.key, "saving");
    var chain = Promise.resolve();
    list.forEach(function (f) {
      chain = chain.then(function () { return readFile(f); }).then(function (d) { return shrink(d, 1600); }).then(function (d) {
        var id = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        return A.post({ action: "shotUpload", shot: { id: id, week: a.week, clinic: a.clinic, custKey: a.custKey, tag: a.tag, name: f.name, mime: d.slice(5, d.indexOf(";")), data: d } })
          .then(function (r) { st.shots[r.id || id] = { id: r.id || id, week: a.week, clinic: a.clinic, custKey: a.custKey, tag: a.tag, file: r.file || f.name, url: r.url || "", uploaded: r.uploaded || nowIso(), by: st.data.reviewer }; st.blobs[r.id || id] = d; });
      });
    });
    chain.then(function () { save(a); R.render(); }).catch(function (e) { A.toast(fill(t.shotFail, { e: e.message }), true); setStatus(a.key, "failed " + e.message); });
  }
  function removeShot(a, id){
    var s = st.shots[id]; if (!s) return; delete st.shots[id];
    A.post({ action: "shotRemove", clinic: a.clinic, id: id }).catch(function (e) { A.toast(fill(T().failed, { e: e.message }), true); });
    save(a); R.render();
  }
  function shotSrc(id){
    if (st.blobs[id]) return st.blobs[id];
    if (!st.loading[id]) {
      st.loading[id] = true;
      A.get({ action: "shot", id: id }).then(function (r) { if (r && r.data) { st.blobs[id] = "data:" + (r.mime || "image/jpeg") + ";base64," + r.data; document.querySelectorAll('img[data-shot="' + CSS.escape(id) + '"]').forEach(function (img) { img.src = st.blobs[id]; img.classList.remove("ph"); }); } }).catch(function () {});
    }
    return "";
  }
  function shotsHtml(a, editable){
    var t = T(), list = shotsOf(a);
    return '<div class="rvshots">' + list.map(function (s) {
      var src = shotSrc(s.id);
      return '<figure class="rvshot"><a href="' + esc(src || s.url || "#") + '" target="_blank" rel="noopener" data-act="rv-shot-open" data-id="' + esc(s.id) + '"><img data-shot="' + esc(s.id) + '" src="' + esc(src || "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==") + '" class="' + (src ? "" : "ph") + '" alt="' + esc(s.file || "") + '"></a>'
        + (editable ? '<button type="button" class="del" data-act="rv-shot-del" data-key="' + esc(a.key) + '" data-id="' + esc(s.id) + '" aria-label="' + esc(t.remove) + '">×</button>' : "") + "</figure>";
    }).join("") + (editable ? '<label class="btn sm rvupl">' + esc(t.addShot) + '<input type="file" accept="image/*" multiple data-rvupl="' + esc(a.key) + '"></label>' : "") + "</div>";
  }

  /* ------------------------------------------------------------------ pages */
  R.routes = function () { return ["audit", "tracker", "crm"]; };
  R.navLabel = function (r) { return T().nav[r]; };
  R.subText = function () { return fill(T().sub, { c: st.clinic, r: st.data ? (st.data.name || st.data.reviewer) : "" }); };
  R.navCounts = function () { var open = recsOf(st.week).filter(function (a) { return a.status !== "checked"; }).length; return { audit: open }; };
  R.page = function (route) { return route === "tracker" ? pageTracker() : route === "crm" ? pageCrm() : pageAudit(); };
  R.guideHtml = function () { var t = T(); return '<div class="guide"><h2>' + esc(t.g.title) + "</h2><ol>" + t.g.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + '</ol><div class="gbtns"><button type="button" class="btn primary" data-act="guide-close">OK</button></div></div>'; };

  function weekBar(){
    var t = T(), cur = st.week, h = '<div class="rvweek">';
    h += '<button type="button" class="btn sm" data-act="rv-week" data-w="' + esc(Z.addDays(cur, -7)) + '" aria-label="' + esc(t.prevWeek) + '">‹</button>';
    h += '<div class="rvwk"><b>' + esc(wTag(cur)) + '</b> <span>' + esc(weekLabel(cur)) + " " + cur.slice(0, 4) + "</span>" + (cur === thisWeek() ? ' <span class="pill p-accent">' + esc(t.thisWeek) + "</span>" : cur === lastWeek() ? ' <span class="pill p-accent">' + esc(t.lastWeek) + "</span>" : "") + "</div>";
    h += '<button type="button" class="btn sm" data-act="rv-week" data-w="' + esc(Z.addDays(cur, 7)) + '" aria-label="' + esc(t.nextWeek) + '"' + (Z.addDays(cur, 7) > thisWeek() ? " disabled" : "") + ">›</button>";
    if (st.clinics.length > 1) h += '<span class="rvclin">' + st.clinics.map(function (c) { return '<button type="button" data-act="rv-clinic" data-c="' + esc(c) + '" aria-pressed="' + (c === st.clinic) + '">' + esc(c) + "</button>"; }).join("") + "</span>";
    return h + "</div>";
  }
  function pageAudit(){
    var t = T(), week = st.week, s = weekStats(week), recs = recsOf(week), h = weekBar();
    h += '<div class="tiles rv4">'
      + tile("acc", s.dueCustomers, t.tDue, fill(t.tDueX, { m: s.dueCadences }))
      + tile(s.checked >= sampleSize() ? "ok" : "", s.sampled + '<small>/' + sampleSize() + "</small>", t.tSample, fill(t.tSampleX, { c: s.checked, n: sampleSize() }))
      + tile(s.score === null ? "" : s.score >= 80 ? "ok" : s.score >= 50 ? "warn" : "bad", s.score === null ? "—" : s.score + "<small>%</small>", t.tScore, s.score === null ? t.tScoreNone : fill(t.tScoreX, { n: recs.reduce(function (n, a) { return n + evalRec(a).n; }, 0), w: s.weekScore === null ? "—" : s.weekScore }))
      + tile(s.notFound ? "bad" : "", s.notFound, t.tGap, s.daSent === null ? t.tGapX : fill(t.tDaX, { s: s.daTicked, n: s.daN }) + " · " + s.daSent + "%")
      + "</div>";
    /* overall feedback */
    var wk = st.weekly[wKey(week, st.clinic)] || {}, fk = wKey(week, st.clinic);
    h += '<div class="panel rvfb"><h3>' + esc(t.fbTitle) + ' <span class="hint">' + esc(t.fbHint) + '</span></h3><div class="pad">'
      + '<textarea id="rvFb" placeholder="' + esc(fill(t.fbPh, { c: st.clinic })) + '">' + esc(wk.remark || "") + '</textarea>'
      + '<div class="rvrow"><button type="button" class="btn primary" data-act="rv-fb-save">' + esc(t.fbSave) + '</button><span data-rvstat="' + esc(fk) + '">' + statusHtml(fk) + "</span>"
      + (wk.updated && !st.pending[fk] ? '<span class="rvstat">' + esc(fill(t.fbSaved, { t: fmtWhen(wk.updated) })) + "</span>" : "") + "</div></div></div>";
    /* the sample */
    var have = {}; recs.forEach(function (a) { have[a.custKey] = 1; });
    var pool = customers().filter(function (c) { return !have[c.key] && !c.exam && dueInWeek(c, week).length; }).length;
    var want = Math.max(sampleSize() - recs.length, 0), nDraw = Math.min(want || 3, pool);
    h += '<div class="panel" id="rvSample"><h3>' + esc(t.sample) + ' <span class="hint">' + esc(fill(t.sampleHint, { n: recs.length })) + "</span></h3>";
    h += '<div class="fbar"><button type="button" class="btn primary sm" data-act="rv-draw" data-n="' + nDraw + '" title="' + esc(t.drawHint) + '"' + (pool ? "" : " disabled") + ">" + esc(fill(t.draw, { n: nDraw })) + "</button>"
      + (pool ? "" : '<span class="hint">' + esc(t.drawNone) + "</span>")
      + '<input type="search" id="rvAddQ" placeholder="' + esc(t.addAny) + '" autocomplete="off"><span class="cnt">' + recs.length + " / " + sampleSize() + '</span></div><div id="rvAddList"></div>';
    if (!recs.length) h += '<div class="empty">' + esc(t.sampleEmpty) + "<br><small>" + esc(t.sampleEmptyHint) + "</small></div>";
    recs.sort(function (a, b) { return (a.added || "") < (b.added || "") ? -1 : 1; });
    recs.forEach(function (a, i) { h += auditCard(a, i + 1); });
    h += "</div>";
    h += dueList(week, have);
    return h;
  }
  function tile(cls, big, label, sub){ return '<div class="stat ' + cls + '"><div class="sn">' + big + '</div><div class="sl">' + esc(label) + '</div><div class="sx">' + esc(sub) + "</div></div>"; }

  function auditCard(a, n){
    var t = T(), c = cust(a.custKey), e = evalRec(a), open = st.ui.open[a.key] !== false && a.status !== "checked" || st.ui.open[a.key] === true;
    var j = c ? journey(c).filter(function (m) { return m.due <= Z.addDays(a.week, 6); }) : [];
    var h = '<div class="rvcard' + (a.status === "checked" ? " checked" : "") + '" data-key="' + esc(a.key) + '">';
    h += '<div class="rvhead"><span class="rvn">' + n + '</span><div class="rvwho"><div class="tag">' + esc(a.tag || a.name) + '</div><div class="meta">' + esc(a.name) + ' · <span class="prodchip">' + esc(prodLabel(a.product)) + "</span>"
      + (c && c.dep ? " · " + esc(A.t().dep) + " " + esc(Z.fmtDM(c.dep)) : "") + (c && c.coll ? " · " + esc(A.t().coll) + " " + esc(Z.fmtDM(c.coll)) : "")
      + (c && c.phone ? (st.ui.phones[a.key] ? ' · <span class="mono">' + esc(c.phone) + "</span>" : ' · <button type="button" class="linkbtn" data-act="rv-phone" data-key="' + esc(a.key) + '">' + esc(t.showPhone) + "</button>") : "")
      + (a.due ? ' · <span class="pill p-accent">' + esc(a.due) + "</span>" : "") + "</div></div>"
      + '<div class="rvverdict">' + verdictPill(e.verdict) + (e.score !== null ? ' <b style="color:' + scoreColour(e.score) + '">' + e.score + "%</b>" : "") + (e.notFound ? ' <span class="pill p-bad">' + e.notFound + " " + esc(t.notFound) + "</span>" : "")
      + ' <button type="button" class="btn sm" data-act="rv-toggle" data-key="' + esc(a.key) + '">' + esc(open ? t.close : t.open) + "</button></div></div>";
    if (!open) return h + "</div>";
    h += '<div class="rvbody"><div class="rvjourney"><div class="rvjt">' + esc(t.journey) + "</div>";
    if (a.source && a.source !== "app" && (a.missing || a.remark) && !Object.keys(a.marks || {}).length) h += '<div class="rvlegacy">' + (a.missing ? "<div>" + esc(a.missing) + "</div>" : "") + "</div>";
    j.forEach(function (m) {
      var bits = (a.marks || {})[m.stage], marked = bits !== undefined && bits !== "", db = daBits(c, m.stage), inWeek = m.due >= a.week && m.due <= Z.addDays(a.week, 6);
      var p = marked ? bitsPts(bits, m.items.length) : null;
      h += '<div class="rvms' + (inWeek ? " wk" : "") + (marked ? (p === 1 ? " full" : p === 0 ? " none" : " part") : "") + '"><div class="rvmh"><b>' + esc(m.stage) + '</b><span class="d">' + esc(Z.fmtDM(m.due)) + "</span>"
        + (inWeek ? '<span class="pill p-accent">' + esc(t.thisWeekChip) + "</span>" : "") + (m.before ? '<span class="pill p-inert">' + esc(t.beforeLive) + "</span>" : "")
        + '<span class="pill ' + (db ? (daState(c, m) === "sent" ? "p-ok" : "p-warn") : "p-inert") + '">' + esc(db ? t.daTicked + (daState(c, m) === "partial" ? " ½" : "") : t.daNone) + "</span>"
        + '<span class="rvmq"><button type="button" class="btn sm" data-act="rv-all" data-key="' + esc(a.key) + '" data-stage="' + esc(m.stage) + '" data-v="1">' + esc(t.allSent) + '</button><button type="button" class="btn sm" data-act="rv-all" data-key="' + esc(a.key) + '" data-stage="' + esc(m.stage) + '" data-v="0">' + esc(t.noneSent) + "</button></span></div>";
      var cn = A.lang() === "zh" ? cnText(a.product, m.stage) : "";
      if (cn) h += '<div class="rvcn">' + esc(cn) + "</div>";
      h += '<div class="rvitems">' + m.items.map(function (it, i) {
        var on = marked && bits.charAt(i) === "1", daOn = db.charAt(i) === "1";
        return '<label class="rvit' + (on ? " on" : marked ? " off" : "") + (daOn && marked && !on ? " gap" : "") + '"><input type="checkbox" data-rvtick="' + esc(a.key) + '" data-stage="' + esc(m.stage) + '" data-i="' + i + '"' + (on ? " checked" : "") + "> " + esc(itemLabel(it[0])) + (daOn ? ' <span class="da">DA ✓</span>' : "") + "</label>";
      }).join("") + "</div></div>";
    });
    if (!j.length) h += '<div class="empty">' + esc(t.notChecked) + "</div>";
    h += "</div>";
    h += '<div class="rvside"><textarea data-rvrem="' + esc(a.key) + '" placeholder="' + esc(t.remarkPh) + '">' + esc(a.remark || "") + "</textarea>"
      + '<label class="rvflag"><input type="checkbox" data-rvdata="' + esc(a.key) + '"' + (a.data ? " checked" : "") + "> " + esc(t.dataIssue) + "</label>"
      + '<div class="rvjt">' + esc(t.shots) + "</div>" + shotsHtml(a, true)
      + '<div class="rvrow"><button type="button" class="btn ' + (a.status === "checked" ? "good" : "primary") + '" data-act="rv-check" data-key="' + esc(a.key) + '">' + esc(a.status === "checked" ? t.checked : t.markChecked) + "</button>"
      + '<span data-rvstat="' + esc(a.key) + '">' + statusHtml(a.key) + "</span>" + (a.checkedAt && !st.pending[a.key] ? '<span class="rvstat">' + esc(fmtWhen(a.checkedAt)) + "</span>" : "")
      + '<button type="button" class="btn sm danger" data-act="rv-remove" data-key="' + esc(a.key) + '" style="margin-left:auto">' + esc(t.remove) + "</button></div></div></div></div>";
    return h;
  }

  function dueList(week, have){
    var t = T(), u = st.ui, rows = [], stages = {}, PAGE = 20;
    customers().forEach(function (c) {
      if (c.exam) return;
      var d = dueInWeek(c, week);
      if (!d.length && !u.showAllDue) return;
      d.forEach(function (m) { stages[m.stage] = 1; });
      rows.push({ c: c, d: d });
    });
    var q = u.dueQ.trim().toLowerCase();
    rows = rows.filter(function (r) {
      if (u.dueStage && !r.d.some(function (m) { return m.stage === u.dueStage; })) return false;
      if (u.dueProd && r.c.product !== u.dueProd) return false;
      if (u.dueDa) { var any = r.d.some(function (m) { var s = daState(r.c, m); return u.dueDa === "sent" ? s !== "none" : s === "none"; }); if (!any) return false; }
      if (q && ((r.c.tag || "") + " " + r.c.name + " " + (r.c.phone || "")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    rows.sort(function (x, y) { return (x.d[0] ? x.d[0].si : 99) - (y.d[0] ? y.d[0].si : 99) || (x.c.coll || x.c.dep || "").localeCompare(y.c.coll || y.c.dep || ""); });
    var n = rows.length, pages = Math.max(Math.ceil(n / PAGE), 1); if (u.duePage >= pages) u.duePage = pages - 1;
    var h = '<div class="panel" id="rvDue"><h3>' + esc(t.due) + ' <span class="hint">' + esc(t.dueHint) + "</span></h3>";
    h += '<div class="fbar"><input type="search" id="rvDueQ" placeholder="' + esc(t.search) + '" value="' + esc(u.dueQ) + '">'
      + '<select data-rvsel="dueStage"><option value="">' + esc(t.allStages) + "</option>" + Object.keys(stages).sort(function (a, b) { return Z.STAGES.indexOf(a) - Z.STAGES.indexOf(b); }).map(function (s) { return '<option value="' + esc(s) + '"' + (u.dueStage === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="dueProd"><option value="">' + esc(t.allProds) + "</option>" + ["MC", "Kính", "OK", "Atropine"].map(function (p) { return '<option value="' + p + '"' + (u.dueProd === p ? " selected" : "") + ">" + esc(prodLabel(p)) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="dueDa"><option value="">' + esc(t.allDa) + '</option><option value="sent"' + (u.dueDa === "sent" ? " selected" : "") + ">" + esc(t.daSent) + '</option><option value="none"' + (u.dueDa === "none" ? " selected" : "") + ">" + esc(t.daNot) + "</option></select>"
      + '<label class="hint" style="display:flex;gap:5px;align-items:center"><input type="checkbox" data-rvchk="showAllDue"' + (u.showAllDue ? " checked" : "") + "> " + esc(t.allCust) + "</label>"
      + '<span class="cnt">' + n + "</span></div>";
    if (!n) return h + '<div class="empty">' + esc(u.showAllDue || q ? t.noMatch : t.dueEmpty) + "</div></div>";
    rows.slice(u.duePage * PAGE, u.duePage * PAGE + PAGE).forEach(function (r) {
      var c = r.c;
      h += '<div class="rvdue"><div><div class="tag">' + esc(c.tag || A.custLabel(c)) + '</div><div class="meta">' + esc(A.custLabel(c)) + ' · <span class="prodchip">' + esc(prodLabel(c.product)) + "</span>"
        + (c.coll ? " · " + esc(A.t().coll) + " " + esc(Z.fmtDM(c.coll)) : c.dep ? " · " + esc(A.t().dep) + " " + esc(Z.fmtDM(c.dep)) : "") + "</div>"
        + '<div class="rvdl">' + r.d.map(function (m) { var s = daState(c, m); return '<span class="pill ' + (s === "sent" ? "p-ok" : s === "partial" ? "p-warn" : "p-bad") + '">' + esc(m.stage) + " · " + esc(s === "sent" ? t.stSent : s === "partial" ? t.stPartial : t.stNone) + "</span>"; }).join(" ") + "</div></div>"
        + "<div>" + (have[c.key] ? '<span class="pill p-ok">' + esc(t.inSample) + "</span>" : '<button type="button" class="btn sm" data-act="rv-add" data-key="' + esc(c.key) + '">' + esc(t.add) + "</button>") + "</div></div>";
    });
    if (pages > 1) h += '<div class="rvpager"><button type="button" class="btn sm" data-act="rv-duepage" data-d="-1"' + (u.duePage ? "" : " disabled") + '>‹</button><span class="hint">' + (u.duePage + 1) + " / " + pages + '</span><button type="button" class="btn sm" data-act="rv-duepage" data-d="1"' + (u.duePage + 1 < pages ? "" : " disabled") + ">›</button></div>";
    return h + "</div>";
  }
  function addListHtml(q){
    var t = T(), have = {}; recsOf(st.week).forEach(function (a) { have[a.custKey] = 1; });
    q = q.trim().toLowerCase(); if (!q) return "";
    var list = customers().filter(function (c) { return !have[c.key] && ((c.tag || "") + " " + c.name + " " + (c.phone || "")).toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
    if (!list.length) return '<div class="empty">' + esc(t.noMatch) + "</div>";
    return list.map(function (c) { return '<div class="rvdue"><div><div class="tag">' + esc(c.tag || A.custLabel(c)) + '</div><div class="meta">' + esc(A.custLabel(c)) + ' · <span class="prodchip">' + esc(prodLabel(c.product)) + "</span></div></div><div><button type=\"button\" class=\"btn sm\" data-act=\"rv-add\" data-key=\"" + esc(c.key) + '">' + esc(t.add) + "</button></div></div>"; }).join("");
  }

  function weeksList(){
    var out = [], k = startWeek(), guard = 0;
    Object.keys(st.audits).forEach(function (key) { if (st.audits[key].week < k) k = monday(st.audits[key].week); });
    while (k <= thisWeek() && guard++ < 120) { out.push(k); k = Z.addDays(k, 7); }
    return out;
  }
  function pageTracker(){
    var t = T(), u = st.ui, h = weekBar();
    var weeks = weeksList().reverse();
    h += '<div class="panel"><h3>' + esc(t.trTitle) + ' <span class="hint">' + esc(t.trHint) + '</span></h3><div class="tblwrap"><table class="rvtbl"><thead><tr><th>' + esc(t.thWeek) + '</th><th class="n">' + esc(t.thDue) + '</th><th class="n">' + esc(t.thSampled) + '</th><th class="n">' + esc(t.thChecked) + '</th><th class="n">' + esc(t.thScore) + '</th><th class="n">' + esc(t.thWeekScore) + '</th><th class="n">' + esc(t.thDa) + '</th><th class="n">' + esc(t.thGap) + '</th><th class="n">' + esc(t.thPass) + '</th><th class="n">' + esc(t.thPartial) + '</th><th class="n">' + esc(t.thFail) + '</th><th class="n">' + esc(t.thData) + "</th><th>" + esc(t.thRemark) + "</th></tr></thead><tbody>";
    weeks.forEach(function (w) {
      var s = weekStats(w), wk = st.weekly[wKey(w, st.clinic)] || {}, rem = (wk.remark || "").replace(/\s+/g, " ");
      h += '<tr class="click' + (w === st.week ? " sel" : "") + '" data-act="rv-week" data-w="' + esc(w) + '"><td class="mono">' + esc(wTag(w)) + ' <span class="hint">' + esc(weekLabel(w)) + '</span></td><td class="n">' + s.dueCadences + '</td><td class="n">' + s.sampled + '</td><td class="n">' + s.checked + "</td>"
        + '<td class="n" style="color:' + scoreColour(s.score) + ';font-weight:600">' + (s.score === null ? "—" : s.score + "%") + '</td><td class="n">' + (s.weekScore === null ? "—" : s.weekScore + "%") + '</td><td class="n">' + (s.daSent === null ? "—" : s.daSent + "%") + '</td><td class="n"' + (s.notFound ? ' style="color:var(--bad);font-weight:600"' : "") + ">" + s.notFound + "</td>"
        + '<td class="n">' + s.pass + '</td><td class="n">' + s.partial + '</td><td class="n">' + s.fail + '</td><td class="n">' + s.data + '</td><td class="rem" title="' + esc(wk.remark || "") + '">' + esc(rem.length > 90 ? rem.slice(0, 90) + "…" : rem) + "</td></tr>";
    });
    h += "</tbody></table></div></div>";
    /* every audited chat */
    var all = Object.keys(st.audits).map(function (k) { return st.audits[k]; }).filter(function (a) { return a.clinic === st.clinic; });
    var q = u.trQ.trim().toLowerCase(), stages = {};
    all.forEach(function (a) { (a.due || "").split(/\s+/).forEach(function (s) { if (s) stages[s] = 1; }); });
    var list = all.filter(function (a) {
      var e = evalRec(a);
      if (u.trWeek && a.week !== u.trWeek) return false;
      if (u.trVerdict && e.verdict !== u.trVerdict) return false;
      if (u.trProd && a.product !== u.trProd) return false;
      if (u.trStage && (a.due || "").split(/\s+/).indexOf(u.trStage) === -1) return false;
      if (u.trShots && !shotsOf(a).length) return false;
      if (q && ((a.tag || "") + " " + a.name + " " + (a.remark || "") + " " + (a.missing || "")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    list.sort(function (x, y) { return x.week !== y.week ? (x.week < y.week ? 1 : -1) : (x.added || "") < (y.added || "") ? -1 : 1; });
    h += '<div class="panel"><h3>' + esc(t.entries) + ' <span class="hint">' + esc(fill(t.entriesHint, { n: list.length })) + '</span></h3>';
    h += '<div class="fbar"><input type="search" id="rvTrQ" placeholder="' + esc(t.search) + '" value="' + esc(u.trQ) + '">'
      + '<select data-rvsel="trWeek"><option value="">' + esc(t.allWeeks) + "</option>" + weeks.map(function (w) { return '<option value="' + esc(w) + '"' + (u.trWeek === w ? " selected" : "") + ">" + esc(wTag(w) + " · " + weekLabel(w)) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="trVerdict"><option value="">' + esc(t.allVerdicts) + "</option>" + ["pass", "partial", "fail", "data", "open", "noted"].map(function (v) { return '<option value="' + v + '"' + (u.trVerdict === v ? " selected" : "") + ">" + esc(T()["v" + v.charAt(0).toUpperCase() + v.slice(1)]) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="trProd"><option value="">' + esc(t.allProds) + "</option>" + ["MC", "Kính", "OK", "Atropine"].map(function (p) { return '<option value="' + p + '"' + (u.trProd === p ? " selected" : "") + ">" + esc(prodLabel(p)) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="trStage"><option value="">' + esc(t.allStages) + "</option>" + Object.keys(stages).sort(function (a, b) { return Z.STAGES.indexOf(a) - Z.STAGES.indexOf(b); }).map(function (s) { return '<option value="' + esc(s) + '"' + (u.trStage === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select>"
      + '<label class="hint" style="display:flex;gap:5px;align-items:center"><input type="checkbox" data-rvchk="trShots"' + (u.trShots ? " checked" : "") + "> " + esc(t.withShots) + "</label>"
      + '<button type="button" class="btn sm" data-act="rv-csv">' + esc(t.csv) + '</button><span class="cnt">' + list.length + "</span></div>";
    if (!list.length) h += '<div class="empty">' + esc(t.noEntries) + "</div>";
    list.slice(0, 200).forEach(function (a) {
      var e = evalRec(a);
      h += '<div class="rventry"><div class="rvhead"><div class="rvwho"><div class="tag">' + esc(a.tag || a.name) + '</div><div class="meta">' + esc(a.name) + ' · <span class="prodchip">' + esc(prodLabel(a.product)) + "</span> · " + esc(wTag(a.week)) + " " + esc(weekLabel(a.week)) + (a.due ? ' · <span class="pill p-accent">' + esc(a.due) + "</span>" : "") + "</div></div>"
        + '<div class="rvverdict">' + verdictPill(e.verdict) + (e.score !== null ? ' <b style="color:' + scoreColour(e.score) + '">' + e.score + "%</b>" : "") + (e.notFound ? ' <span class="pill p-bad">' + e.notFound + " " + esc(t.notFound) + "</span>" : "") + ' <button type="button" class="btn sm" data-act="rv-week" data-w="' + esc(a.week) + '" data-route="audit">' + esc(t.openWeek) + "</button></div></div>";
      if (e.found || e.missing || a.missing) h += '<div class="rvsum">' + (e.found ? "<div>✓ " + esc(e.found) + "</div>" : "") + (e.missing || a.missing ? '<div class="miss">✗ ' + esc((e.missing || a.missing).replace(/\n/g, " · ")) + "</div>" : "") + "</div>";
      if (a.remark) h += '<div class="rvrem">' + esc(a.remark) + "</div>";
      if (shotsOf(a).length) h += shotsHtml(a, false);
      h += "</div>";
    });
    return h + "</div>";
  }
  function csv(){
    var t = T(), rows = [["week", "clinic", "tag", "customer", "product", "da", "due", "status", "verdict", "score", "found", "missing", "da_ticked_not_found", "remark", "data_issue", "screenshots", "checked_at"]];
    Object.keys(st.audits).map(function (k) { return st.audits[k]; }).filter(function (a) { return a.clinic === st.clinic; }).sort(function (x, y) { return x.week < y.week ? -1 : x.week > y.week ? 1 : 0; }).forEach(function (a) {
      var e = evalRec(a);
      rows.push([a.week, a.clinic, a.tag, a.name, a.product, a.da, a.due, a.status, e.verdict, e.score === null ? "" : e.score, e.found, e.missing || a.missing || "", e.notFound, a.remark || "", a.data ? "Y" : "", shotsOf(a).map(function (s) { return s.url || s.file; }).join(" "), a.checkedAt || ""]);
    });
    var text = "﻿" + rows.map(function (r) { return r.map(function (v) { v = String(v === undefined || v === null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n");
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "zalo-audit-" + st.clinic + "-" + A.today() + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function pageCrm(){ return '<div class="note"><p>' + esc(T().crmHint) + "</p></div>" + A.pageMembers(); }

  /* ------------------------------------------------------------------ events */
  R.after = function () {
    var q = $("rvAddQ"); if (q) q.oninput = function () { var l = $("rvAddList"); if (l) l.innerHTML = addListHtml(q.value); };
    var dq = $("rvDueQ"); if (dq) dq.oninput = function () { st.ui.dueQ = dq.value; st.ui.duePage = 0; var p = $("rvDue"); if (p) { p.outerHTML = dueList(st.week, sampleHave()); R.after(); var n = $("rvDueQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } };
    var tq = $("rvTrQ"); if (tq) tq.oninput = function () { st.ui.trQ = tq.value; R.render(); var n = $("rvTrQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
    document.querySelectorAll("textarea[data-rvrem]").forEach(function (ta) {
      ta.oninput = function () { var a = st.audits[ta.dataset.rvrem]; if (!a) return; a.remark = ta.value; save(a); };
    });
    document.querySelectorAll("input[data-rvupl]").forEach(function (inp) { inp.onchange = function () { var a = st.audits[inp.dataset.rvupl]; if (a) addShots(a, inp.files); }; });
    document.querySelectorAll("img.ph[data-shot]").forEach(function (img) { shotSrc(img.dataset.shot); });
  };
  function sampleHave(){ var have = {}; recsOf(st.week).forEach(function (a) { have[a.custKey] = 1; }); return have; }
  R.render = function () { A.render(); };
  function goWeek(w, route){ if (w > thisWeek()) return; st.week = monday(w); st.ui.duePage = 0; if (route) location.hash = "#/" + route; else R.render(); window.scrollTo(0, 0); }

  R.click = function (act, el) {
    var a;
    switch (act) {
      case "rv-week": goWeek(el.dataset.w, el.dataset.route); return true;
      case "rv-clinic": R.selectClinic(el.dataset.c); R.render(); return true;
      case "rv-draw": draw(st.week, +el.dataset.n || 1); R.render(); return true;
      case "rv-add": { var c = cust(el.dataset.key); if (c) { addToSample(c, st.week, "manual"); R.render(); var p = $("rvSample"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); } return true; }
      case "rv-remove": a = st.audits[el.dataset.key]; if (a) { removeFromSample(a); R.render(); } return true;
      case "rv-toggle": st.ui.open[el.dataset.key] = !(st.ui.open[el.dataset.key] !== false && (st.audits[el.dataset.key] || {}).status !== "checked" || st.ui.open[el.dataset.key] === true); R.render(); return true;
      case "rv-phone": st.ui.phones[el.dataset.key] = true; R.render(); return true;
      case "rv-all": a = st.audits[el.dataset.key]; if (a) { var c2 = cust(a.custKey), m = c2 ? journey(c2).filter(function (x) { return x.stage === el.dataset.stage; })[0] : null; if (m) { a.marks = a.marks || {}; a.marks[m.stage] = m.items.map(function () { return el.dataset.v; }).join(""); save(a); R.render(); } } return true;
      case "rv-check": a = st.audits[el.dataset.key]; if (a) { a.status = a.status === "checked" ? "sampled" : "checked"; a.checkedAt = a.status === "checked" ? nowIso() : ""; st.ui.open[a.key] = a.status !== "checked"; save(a); R.render(); } return true;
      case "rv-fb-save": { var ta = $("rvFb"); if (ta) saveFeedback(st.week, ta.value); return true; }
      case "rv-duepage": st.ui.duePage = Math.max(0, st.ui.duePage + (+el.dataset.d)); R.render(); return true;
      case "rv-csv": csv(); return true;
      case "rv-shot-del": a = st.audits[el.dataset.key]; if (a) removeShot(a, el.dataset.id); return true;
      case "rv-shot-open": { var src = st.blobs[el.dataset.id]; if (!src) return true; var w = window.open(); if (w) { w.document.write('<img src="' + src + '" style="max-width:100%">'); } return true; }
    }
    return false;
  };
  R.change = function (el) {
    if (el.dataset.rvtick) { var a = st.audits[el.dataset.rvtick], c = a && cust(a.custKey), m = c ? journey(c).filter(function (x) { return x.stage === el.dataset.stage; })[0] : null; if (!m) return true;
      a.marks = a.marks || {}; var bits = (a.marks[m.stage] || "").split(""); while (bits.length < m.items.length) bits.push("0"); bits[+el.dataset.i] = el.checked ? "1" : "0"; a.marks[m.stage] = bits.join(""); save(a); R.render(); return true; }
    if (el.dataset.rvdata) { var b = st.audits[el.dataset.rvdata]; if (b) { b.data = el.checked ? 1 : 0; save(b); R.render(); } return true; }
    if (el.dataset.rvsel) { st.ui[el.dataset.rvsel] = el.value; st.ui.duePage = 0; R.render(); return true; }
    if (el.dataset.rvchk) { st.ui[el.dataset.rvchk] = el.checked; st.ui.duePage = 0; R.render(); return true; }
    return false;
  };

  /* ------------------------------------------------------------------ demo (in memory, mirrors the script) */
  R.demo = {
    load: function (daDemo) {
      var saved = A.store("zalo_demo_rv"), d = null;
      if (saved) { try { d = JSON.parse(saved); if (d.today !== daDemo.today) d = null; } catch (e) { d = null; } }
      if (!d) d = { role: "reviewer", reviewer: "CZ", name: "ChenZhong", today: daDemo.today, clinics: { NGT: { customers: daDemo.customers, das: daDemo.das, cadence: [], tasks: daDemo.tasks, settings: daDemo.settings } },
                    audits: [], weekly: [], shots: [], settings: { NGT: { sample_size: "15", start_week: Z.addDays(Z.weekBounds(daDemo.today).start, -14) } }, cadenceCN: [] };
      A.store("zalo_demo_rv", JSON.stringify(d)); return d;
    },
    save: function () { var d = st.data; if (!d) return; d.audits = Object.keys(st.audits).map(function (k) { return st.audits[k]; }); d.weekly = Object.keys(st.weekly).map(function (k) { return st.weekly[k]; }); d.shots = Object.keys(st.shots).map(function (k) { return st.shots[k]; }); try { A.store("zalo_demo_rv", JSON.stringify(d)); } catch (e) {} },
    get: function (p) { if (p && p.action === "shot") return { ok: 1, id: p.id, mime: "image/png", data: (st.blobs[p.id] || "").split(",")[1] || "" }; R.demo.save(); return st.data; },
    post: function (b) {
      switch (b.action) {
        case "auditSave": case "auditRemove": case "feedbackSave": case "shotRemove": R.demo.save(); return { ok: 1, local: true };
        case "shotUpload": R.demo.save(); return { ok: 1, local: true, id: b.shot.id, url: "", file: b.shot.name, uploaded: nowIso() };
      }
      throw new Error("unknown action");
    }
  };

  R.init = function (hooks) { A = hooks; };
  return R;
})();
