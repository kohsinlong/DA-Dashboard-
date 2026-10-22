/* DA Zalo Dashboard — the QA reviewer's pages (1.5.0): the Zalo SOP Compliance Tracker.
   A reviewer (CZ) signs in on the same page and, instead of the DA's task list, gets
     #/overview        one card per clinic for the week, a cadence × clinic heat map, the most-missed
                       and most-done items, and what needs attention;
     #/clinic-<code>   the clinic: scoreboard (cadences / items / weeks, audited vs DA-reported), the
                       week's overall feedback, To mark (a sample of 15 chats drawn across the cadences
                       due, each with the customer's whole journey as tick boxes next to the DA's own
                       ticks, remark, screenshots, data-issue flag), Other chats due (optional marks that
                       count as extra), history with CSV; Complete week sends the week to HO and locks it;
     #/crm             the clinic's CRM, read only.
   app.js owns sign-in, session, language, chrome and the API; this file owns the reviewer state,
   pages and writes. Everything the reviewer records goes to the Zalo SOP Compliance Tracker
   workbook through the script; the clinics' CRM forms are never written. README §2.14. */
window.ZALO_REVIEW = (function () {
  "use strict";
  var R = {}, A = null;           /* A: hooks handed over by app.js */
  var Z = window.ZALO;
  var ALL = ["NGT", "LA", "CMTT", "SH", "D5", "D7"];   /* the tabs; a clinic is live once the script serves it */
  var QUOTA_MAX = 5;                                    /* chats per cadence, a guide scaled to the target */
  var st = { data: null, clinic: "", week: "", live: [], ctx: {}, audits: {}, weekly: {}, shots: {}, blobs: {}, loading: {}, pending: {}, timers: {},
             ui: { view: "cad", src: "audit", dueStage: "", dueProd: "", dueDa: "", dueQ: "", duePage: 0, showAllDue: false,
                   trWeek: "", trVerdict: "", trProd: "", trStage: "", trShots: false, trQ: "", phones: {}, open: {}, hist: false } };
  R.st = st; R.ALL = ALL;

  /* ------------------------------------------------------------------ strings */
  var L = {
    zh: {
      title: "Zalo SOP 合规追踪", nav: { overview: "总览", crm: "CRM" }, sub: "{c} · 审核人 {r}", notLive: "未上线",
      thisWeek: "本周", lastWeek: "上周", prevWeek: "上一周", nextWeek: "下一周",
      stMarking: "标记中", stSubmitted: "已提交 · 等待 HO", stReview: "HO 审核中", stPublished: "已发布给助理", stAck: "助理已确认",
      stripMarking: "{n} / {t} 已标记 · {x} 额外 · {c} 已检查", stripLocked: "已提交 {t} · 等待 HO 审核 · 内容已锁定", stripHint: "内容随时自动保存。完成后会发送一封邮件给 HO，并锁定本周。",
      complete: "完成本周 → 发送给 HO", completeAsk: "将 {c} 第 {w} 周发送给 HO？已标记 {n} / {t}，额外 {x}。发送后内容锁定。", completeShort: "只标记了 {n} / {t} 个对话。仍然发送？", reopen: "重新打开", reopenAsk: "重新打开本周以继续修改？不会发送邮件。",
      sent: "已发送给 HO", reopened: "已重新打开",
      ovCard: { items: "已发送内容", sop: "SOP 得分 (1 · 0.5 · 0)", da: "助理自报", gap: "勾了但未见", marked: "已标记", noCrm: "尚未接入 CRM 表" },
      across: "各诊所对比", acrossHint: "每个节点的审核合规率 · 本周", mostMissed: "最常缺失", mostDone: "最常完成", acrossLive: "所有已上线诊所 · 审核样本", noneYet: "本周尚无审核记录",
      attention: "需要处理", attNotDone: "{c} · {w} · 已标记 {n} / {t}，尚未完成", attNotDoneX: "在 {c} 页点“完成本周”发送给 HO", attNone: "{c} · {w} · 尚未开始标记", attNoneX: "打开 {c} 页点“抽样”", attWaiting: "{c} · {w} · 已提交，等待 HO", attWaitingX: "提交于 {t}", attNothing: "本周没有待处理事项。", openClinic: "打开 {c}",
      sb: "记分板", sbHint: "勾了多少，总共可以勾多少", vCad: "节点", vItems: "内容项", vWeeks: "逐周", srcAudit: "审核样本", srcDa: "助理自报 · 全部到期",
      tItems: "已发送内容", tItemsX: "本周到期节点 {n} 个，在 {m} 个对话中 · 含更早节点 {a}", tSop: "SOP 得分", tSopX: "1 全部 · 0.5 部分 · 0 未发，与助理页面一致", tDa: "助理自报", tDaX: "全部 {n} 个到期节点 · 她的勾选", tGap: "勾了但未见", tGapX: "助理勾了、聊天中未见的内容", tMarked: "已标记", tMarkedX: "+{x} 额外 · {c} 已检查", none: "尚未检查",
      thCad: "节点", thDue: "到期（全部）", thSample: "样本中", thItems: "已发送内容", thFull: "全部", thPartial: "部分", thMissed: "未发", thScore: "得分", thDa: "助理自报", thNotTicked: "未勾", total: "合计",
      cadNote: "样本对话更早的节点（本周前 {n} 个）也已标记并计入对话得分，但不计入本周各行。", daNote: "助理在自己看板上勾选的内容，覆盖本周全部到期对话。",
      itemsMissed: "最常缺失的内容", itemsDone: "最常完成的内容", itemsNone: "本周还没有标记任何节点。",
      thWeek: "周", thSampled: "抽样", thChecked: "已检查", thWeekScore: "本周节点", thPass: "合规", thFail: "未合规", thData: "数据", thStatus: "状态", thRemark: "总评",
      fbTitle: "本周总评", fbHint: "诊所本周表现：做得好的、需改进的。HO 审核后发布给助理。", fbPh: "写下本周对 {c} 的总评…", fbSave: "保存总评", fbSaved: "已保存 {t}",
      toMark: "待标记", toMarkHint: "{t} 个对话 · 每个节点 3–5 个为参考，按本周到期节点分配", quota: "配额", draw: "抽样 {n} 个", drawHint: "按本周到期的节点和产品分散抽取", drawDone: "样本已满", drawNone: "本周没有更多到期客户可抽", addAny: "添加任意客户…",
      sampleEmpty: "本周尚未抽样。", sampleEmptyHint: "点“抽样”按节点和产品分散抽取，或从下方到期名单逐个添加。",
      journey: "客户旅程", thisWeekChip: "本周到期", beforeLive: "上线前", daTicked: "助理已勾", daNone: "助理未勾", notFound: "助理已勾但未见", allSent: "全部已发", noneSent: "全部未发", notChecked: "未检查",
      remarkPh: "备注：缺了什么、做得好的、需要修正的…", dataIssue: "数据问题（标签错误、日期错误、找不到聊天）", shots: "截图", addShot: "添加截图", shotFail: "截图上传失败：{e}",
      checked: "已检查 ✓", markChecked: "标记为已检查", remove: "移出样本", open: "展开", close: "收起", showPhone: "显示电话", extra: "额外",
      vOpen: "未检查", vPass: "合规", vPartial: "部分", vFail: "未合规", vData: "数据问题", vNoted: "已记录",
      due: "其他到期对话", dueHint: "本周其余到期的对话 · 可选标记 · 标记后计为额外", allStages: "全部节点", allProds: "全部产品", allDa: "助理状态：全部", daSent: "助理已勾", daNot: "助理未勾",
      search: "搜索标签、姓名或电话", mark: "标记", dueEmpty: "本周没有其他到期对话。", noMatch: "没有符合的客户。", allCust: "全部客户",
      stSent: "已勾", stPartial: "部分", stNone: "未勾",
      hist: "历史记录", histHint: "逐周结果与所有审核记录 · 导出 CSV", entries: "所有审核记录", entriesHint: "{n} 条", allWeeks: "全部周", allVerdicts: "全部结论", withShots: "有截图", csv: "导出 CSV", noEntries: "没有符合的记录。", openWeek: "打开该周",
      crmHint: "只读 · 与助理看板相同的数据", saved: "已保存", saving: "保存中…", failed: "未能保存：{e}", localOnly: "演示：仅保存在本浏览器", locked: "本周已提交，内容已锁定。",
      g: { title: "审核人指南", lines: ["每周一打开诊所页：默认显示上一周（已结束的一周）。", "点“抽样”，系统按节点和产品分散抽取 15 个对话；也可从到期名单或搜索框添加。其他到期对话可选标记，计为额外。", "逐个打开 Zalo 聊天，在客户旅程中勾选找到的内容；“助理已勾”表示助理在她的看板上标记已发送。", "写备注、添加截图、必要时勾“数据问题”，最后点“标记为已检查”。", "写下本周总评，点“完成本周”发送给 HO。HO 审核后发布给助理。总览页汇总各诊所。"] },
      months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
    },
    en: {
      title: "Zalo SOP Compliance Tracker", nav: { overview: "Overview", crm: "CRM" }, sub: "{c} · reviewer {r}", notLive: "not live",
      thisWeek: "this week", lastWeek: "last week", prevWeek: "Previous week", nextWeek: "Next week",
      stMarking: "Marking", stSubmitted: "Submitted · waiting for HO", stReview: "Under HO review", stPublished: "Published to DA", stAck: "Acknowledged by DA",
      stripMarking: "{n} of {t} marked · {x} extra · {c} checked", stripLocked: "Submitted {t} · waiting for HO review · entries locked", stripHint: "Everything saves as you go. Completing sends one email to HO and locks the week.",
      complete: "Complete week → send to HO", completeAsk: "Send {c} {w} to HO? {n} of {t} marked, {x} extra. Entries lock after sending.", completeShort: "Only {n} of {t} chats are marked. Send anyway?", reopen: "Reopen week", reopenAsk: "Reopen this week for changes? No email is sent.",
      sent: "Sent to HO", reopened: "Week reopened",
      ovCard: { items: "items sent", sop: "SOP score (1 · 0.5 · 0)", da: "DA-reported", gap: "Ticked, not found", marked: "Marked", noCrm: "no CRM form connected yet" },
      across: "Across clinics", acrossHint: "audited score per cadence · this week", mostMissed: "Most missed items", mostDone: "Most done items", acrossLive: "all live clinics · audited sample", noneYet: "nothing audited this week yet",
      attention: "Needs attention", attNotDone: "{c} · {w} · {n} of {t} marked, not yet completed", attNotDoneX: "Press Complete week on the {c} tab to send it to HO", attNone: "{c} · {w} · marking not started", attNoneX: "Open the {c} tab and press Draw", attWaiting: "{c} · {w} · submitted, waiting for HO", attWaitingX: "submitted {t}", attNothing: "Nothing waiting this week.", openClinic: "Open {c}",
      sb: "Scoreboard", sbHint: "how many ticks against the total possible", vCad: "Cadences", vItems: "Items", vWeeks: "Weeks", srcAudit: "Audited sample", srcDa: "DA-reported · all due",
      tItems: "items sent", tItemsX: "{n} cadences due this week in {m} chats · with earlier milestones {a}", tSop: "SOP score", tSopX: "1 full · 0.5 partial · 0 missed, as on the DA's page", tDa: "DA-reported", tDaX: "all {n} due cadences · her ticks", tGap: "ticked, not found", tGapX: "items she ticked that the chat does not show", tMarked: "marked", tMarkedX: "+{x} extra · {c} checked", none: "nothing checked yet",
      thCad: "Cadence", thDue: "Due (all)", thSample: "In sample", thItems: "Items sent", thFull: "Full", thPartial: "Partial", thMissed: "Missed", thScore: "Score", thDa: "DA-reported", thNotTicked: "Not ticked", total: "Total",
      cadNote: "Earlier milestones of the sampled chats ({n} before this week) are marked too and count in each chat's score, but not in this week's rows.", daNote: "What the DA ticked on her own dashboard, across every chat due this week.",
      itemsMissed: "Most missed items", itemsDone: "Most done items", itemsNone: "No cadence marked yet this week.",
      thWeek: "Week", thSampled: "Sampled", thChecked: "Checked", thWeekScore: "This week's", thPass: "Pass", thFail: "Fail", thData: "Data", thStatus: "Status", thRemark: "Feedback",
      fbTitle: "Overall feedback", fbHint: "How the clinic did this week: what went well, what to improve. Published to the DA after HO review.", fbPh: "Write this week's overall feedback for {c}…", fbSave: "Save feedback", fbSaved: "Saved {t}",
      toMark: "To mark", toMarkHint: "{t} chats · 3–5 per cadence as a guide, scaled to the cadences due this week", quota: "quota", draw: "Draw {n}", drawHint: "Spread across the cadences and products due this week", drawDone: "sample complete", drawNone: "No more customers due this week to draw from", addAny: "Add any customer…",
      sampleEmpty: "No chats sampled for this week yet.", sampleEmptyHint: "Use Draw for a spread across cadences and products, or add customers one by one from the due list below.",
      journey: "Customer journey", thisWeekChip: "due this week", beforeLive: "before go-live", daTicked: "DA ticked", daNone: "DA did not tick", notFound: "DA ticked, not found", allSent: "All sent", noneSent: "Nothing sent", notChecked: "not checked",
      remarkPh: "Remark: what was missing, what was good, anything to fix…", dataIssue: "Data issue (wrong tag, wrong date, chat not found)", shots: "Screenshots", addShot: "Add screenshot", shotFail: "Screenshot upload failed: {e}",
      checked: "Checked ✓", markChecked: "Mark as checked", remove: "Remove from sample", open: "Expand", close: "Collapse", showPhone: "Show phone", extra: "extra",
      vOpen: "Not checked", vPass: "Pass", vPartial: "Partial", vFail: "Fail", vData: "Data issue", vNoted: "Noted",
      due: "Other chats due", dueHint: "everything else that fell due this week · marking is optional · marked ones count as extra", allStages: "All cadences", allProds: "All products", allDa: "DA status: all", daSent: "DA ticked", daNot: "DA did not tick",
      search: "Search tag, name or phone", mark: "Mark", dueEmpty: "No other chat falls due this week.", noMatch: "No customer matches.", allCust: "All customers",
      stSent: "ticked", stPartial: "partial", stNone: "not ticked",
      hist: "History", histHint: "week by week and every audited chat · CSV export", entries: "All audited chats", entriesHint: "{n} entries", allWeeks: "All weeks", allVerdicts: "All verdicts", withShots: "With screenshots", csv: "Export CSV", noEntries: "No entries match.", openWeek: "Open week",
      crmHint: "Read only · the same data the DA sees", saved: "Saved", saving: "Saving…", failed: "Could not save: {e}", localOnly: "Demo: kept in this browser only", locked: "This week is submitted; entries are locked.",
      g: { title: "Reviewer guide", lines: ["Open a clinic tab on Monday: it shows last week, the one just closed.", "Press Draw: 15 chats spread across the cadences and products due. Add others from the due list or the search box. Other due chats can be marked too; they count as extra.", "Open each Zalo chat and tick what you find in the customer journey. “DA ticked” means the DA marked it sent on her dashboard.", "Write a remark, add screenshots, flag a data issue if needed, then Mark as checked.", "Write the week's overall feedback and press Complete week to send it to HO. HO reviews and publishes to the DA. Overview sums up every clinic."] },
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    },
    vi: {
      title: "Theo dõi tuân thủ SOP Zalo", nav: { overview: "Tổng quan", crm: "CRM" }, sub: "{c} · người kiểm {r}", notLive: "chưa triển khai",
      thisWeek: "tuần này", lastWeek: "tuần trước", prevWeek: "Tuần trước", nextWeek: "Tuần sau",
      stMarking: "Đang chấm", stSubmitted: "Đã gửi · chờ HO", stReview: "HO đang duyệt", stPublished: "Đã gửi cho trợ lý", stAck: "Trợ lý đã xác nhận",
      stripMarking: "{n} / {t} đã chấm · {x} thêm · {c} đã kiểm", stripLocked: "Đã gửi {t} · chờ HO duyệt · đã khoá", stripHint: "Mọi thứ tự lưu. Hoàn tất sẽ gửi một email cho HO và khoá tuần.",
      complete: "Hoàn tất tuần → gửi HO", completeAsk: "Gửi {c} {w} cho HO? {n} / {t} đã chấm, {x} thêm. Sau khi gửi sẽ khoá.", completeShort: "Mới chấm {n} / {t} hội thoại. Vẫn gửi?", reopen: "Mở lại tuần", reopenAsk: "Mở lại tuần này để sửa? Không gửi email.",
      sent: "Đã gửi cho HO", reopened: "Đã mở lại",
      ovCard: { items: "nội dung đã gửi", sop: "Điểm SOP (1 · 0.5 · 0)", da: "Trợ lý tự báo", gap: "Đã tick, không thấy", marked: "Đã chấm", noCrm: "chưa kết nối CRM" },
      across: "So sánh phòng khám", acrossHint: "điểm kiểm theo cadence · tuần này", mostMissed: "Thiếu nhiều nhất", mostDone: "Làm nhiều nhất", acrossLive: "các phòng khám đang chạy · mẫu kiểm", noneYet: "tuần này chưa kiểm",
      attention: "Cần xử lý", attNotDone: "{c} · {w} · {n} / {t} đã chấm, chưa hoàn tất", attNotDoneX: "Bấm Hoàn tất tuần ở tab {c} để gửi HO", attNone: "{c} · {w} · chưa bắt đầu chấm", attNoneX: "Mở tab {c} và bấm Rút", attWaiting: "{c} · {w} · đã gửi, chờ HO", attWaitingX: "gửi lúc {t}", attNothing: "Tuần này không có gì chờ.", openClinic: "Mở {c}",
      sb: "Bảng điểm", sbHint: "đã tick bao nhiêu trên tổng có thể", vCad: "Cadence", vItems: "Nội dung", vWeeks: "Tuần", srcAudit: "Mẫu kiểm", srcDa: "Trợ lý tự báo · tất cả đến hạn",
      tItems: "nội dung đã gửi", tItemsX: "{n} cadence đến hạn tuần này trong {m} hội thoại · kể cả mốc trước {a}", tSop: "Điểm SOP", tSopX: "1 đủ · 0.5 một phần · 0 không gửi, như trang trợ lý", tDa: "Trợ lý tự báo", tDaX: "toàn bộ {n} cadence đến hạn · tick của cô ấy", tGap: "đã tick, không thấy", tGapX: "nội dung cô ấy tick nhưng hội thoại không có", tMarked: "đã chấm", tMarkedX: "+{x} thêm · {c} đã kiểm", none: "chưa kiểm",
      thCad: "Cadence", thDue: "Đến hạn (tất cả)", thSample: "Trong mẫu", thItems: "Nội dung đã gửi", thFull: "Đủ", thPartial: "Một phần", thMissed: "Không gửi", thScore: "Điểm", thDa: "Trợ lý báo", thNotTicked: "Chưa tick", total: "Tổng",
      cadNote: "Các mốc trước của hội thoại trong mẫu ({n} trước tuần này) cũng được chấm và tính vào điểm hội thoại, nhưng không vào các dòng tuần này.", daNote: "Những gì trợ lý đã tick trên bảng của cô ấy, trên mọi hội thoại đến hạn tuần này.",
      itemsMissed: "Nội dung thiếu nhiều nhất", itemsDone: "Nội dung làm nhiều nhất", itemsNone: "Tuần này chưa chấm cadence nào.",
      thWeek: "Tuần", thSampled: "Mẫu", thChecked: "Đã kiểm", thWeekScore: "Tuần này", thPass: "Đạt", thFail: "Không đạt", thData: "Dữ liệu", thStatus: "Trạng thái", thRemark: "Nhận xét",
      fbTitle: "Nhận xét chung", fbHint: "Phòng khám tuần này: điểm tốt, điểm cần cải thiện. HO duyệt rồi gửi cho trợ lý.", fbPh: "Viết nhận xét chung tuần này cho {c}…", fbSave: "Lưu nhận xét", fbSaved: "Đã lưu {t}",
      toMark: "Cần chấm", toMarkHint: "{t} hội thoại · 3–5 mỗi cadence là mức tham khảo, chia theo cadence đến hạn tuần này", quota: "chỉ tiêu", draw: "Rút {n}", drawHint: "Trải đều theo cadence và sản phẩm đến hạn tuần này", drawDone: "mẫu đã đủ", drawNone: "Không còn khách đến hạn tuần này để rút", addAny: "Thêm khách bất kỳ…",
      sampleEmpty: "Tuần này chưa rút mẫu.", sampleEmptyHint: "Dùng Rút để trải đều theo cadence và sản phẩm, hoặc thêm từng khách từ danh sách đến hạn.",
      journey: "Hành trình khách", thisWeekChip: "đến hạn tuần này", beforeLive: "trước go-live", daTicked: "Trợ lý đã tick", daNone: "Trợ lý chưa tick", notFound: "Đã tick, không thấy", allSent: "Gửi đủ", noneSent: "Không gửi", notChecked: "chưa kiểm",
      remarkPh: "Nhận xét: thiếu gì, tốt gì, cần sửa gì…", dataIssue: "Lỗi dữ liệu (sai tag, sai ngày, không tìm thấy hội thoại)", shots: "Ảnh chụp", addShot: "Thêm ảnh chụp", shotFail: "Không tải được ảnh: {e}",
      checked: "Đã kiểm ✓", markChecked: "Đánh dấu đã kiểm", remove: "Bỏ khỏi mẫu", open: "Mở", close: "Thu gọn", showPhone: "Hiện số điện thoại", extra: "thêm",
      vOpen: "Chưa kiểm", vPass: "Đạt", vPartial: "Một phần", vFail: "Không đạt", vData: "Lỗi dữ liệu", vNoted: "Ghi nhận",
      due: "Hội thoại đến hạn khác", dueHint: "các hội thoại còn lại đến hạn tuần này · chấm tuỳ chọn · chấm rồi tính là thêm", allStages: "Tất cả cadence", allProds: "Tất cả sản phẩm", allDa: "Trạng thái trợ lý: tất cả", daSent: "Trợ lý đã tick", daNot: "Trợ lý chưa tick",
      search: "Tìm tag, tên hoặc SĐT", mark: "Chấm", dueEmpty: "Không còn hội thoại nào khác đến hạn tuần này.", noMatch: "Không có khách phù hợp.", allCust: "Tất cả khách",
      stSent: "đã tick", stPartial: "một phần", stNone: "chưa tick",
      hist: "Lịch sử", histHint: "theo tuần và mọi hội thoại đã kiểm · xuất CSV", entries: "Tất cả hội thoại đã kiểm", entriesHint: "{n} mục", allWeeks: "Tất cả tuần", allVerdicts: "Tất cả kết luận", withShots: "Có ảnh chụp", csv: "Xuất CSV", noEntries: "Không có mục phù hợp.", openWeek: "Mở tuần",
      crmHint: "Chỉ đọc · cùng dữ liệu trợ lý nhìn thấy", saved: "Đã lưu", saving: "Đang lưu…", failed: "Không lưu được: {e}", localOnly: "Demo: chỉ lưu trong trình duyệt này", locked: "Tuần này đã gửi; đã khoá.",
      g: { title: "Hướng dẫn người kiểm", lines: ["Thứ Hai mở tab phòng khám: mặc định hiện tuần vừa kết thúc.", "Bấm Rút: 15 hội thoại trải đều theo cadence và sản phẩm đến hạn. Thêm khách khác từ danh sách đến hạn hoặc ô tìm. Các hội thoại đến hạn khác cũng chấm được, tính là thêm.", "Mở từng hội thoại Zalo và tick những gì tìm thấy trong hành trình khách. “Trợ lý đã tick” nghĩa là trợ lý đã đánh dấu đã gửi trên bảng của cô ấy.", "Viết nhận xét, thêm ảnh chụp, tick Lỗi dữ liệu nếu cần, rồi Đánh dấu đã kiểm.", "Viết nhận xét chung và bấm Hoàn tất tuần để gửi HO. HO duyệt rồi gửi cho trợ lý. Tổng quan gom mọi phòng khám."] },
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
  function settingsOf(code){ return (st.data && st.data.settings && st.data.settings[code || st.clinic]) || {}; }
  function sampleSize(code){ return Math.max(1, +(settingsOf(code).sample_size || 15) || 15); }
  function startWeek(){ var s = settingsOf().start_week; return /^\d{4}-\d{2}-\d{2}$/.test(s || "") ? monday(s) : lastWeek(); }
  function aKey(week, clinic, custKey){ return week + "|" + clinic + "|" + custKey; }
  function wKey(week, clinic){ return week + "|" + clinic; }
  function prodLabel(p){ return A.prodLabel(p); }
  function itemLabel(k, lang){ return ((Z.CP[lang || A.lang()] || Z.CP.vi)[k]) || k; }
  function stageOrder(a, b){ return Z.STAGES.indexOf(a) - Z.STAGES.indexOf(b); }
  function isLive(code){ return st.live.indexOf(code) !== -1; }
  function pct(a, b){ return b ? Math.round(a / b * 100) : null; }

  /* ------------------------------------------------------------------ data */
  /* mirrors app.js shape(): keys, split names, normalised product and phone */
  function shapeCustomers(list){
    var seen = {};
    return (list || []).map(function (c) {
      var parsed = Z.parseTag(c.tag), product = Z.normProduct(c.product) || (parsed && parsed.product) || "";
      var base = Z.customerKey(c.phone, c.name), key = base;
      if (seen[base]) key = base + "#" + (c.dep ? Z.yymmdd(c.dep) : c.coll ? Z.yymmdd(c.coll) : c.row);
      seen[base] = 1;
      return Object.assign({}, c, { key: key, base: base, names: Z.splitNames(c.name), product: product, phone: Z.normPhone(c.phone) || String(c.phone || "").trim(), exam: product === "Exam", parsed: parsed });
    });
  }
  /* The bootstrap: {role, reviewer, name, today, clinics:{code:{customers, das, cadence, tasks, settings}}, audits, weekly, shots, settings:{code}, cadenceCN} */
  R.shape = function (data) {
    st.data = data; st.ctx = {};
    st.live = Object.keys(data.clinics || {}).filter(function (c) { return data.clinics[c] && !data.clinics[c].error; });
    st.live.forEach(function (code) {
      var cd = data.clinics[code], cust = shapeCustomers(cd.customers), byKey = {};
      cust.forEach(function (c) { byKey[c.key] = c; });
      st.ctx[code] = { code: code, cust: cust, byKey: byKey, taskIdx: Z.doneIndex(cd.tasks || []), goLive: (cd.settings || {}).go_live || "", cadenceTab: cd.cadence || [], das: cd.das || {} };
    });
    if (!st.clinic || !isLive(st.clinic)) st.clinic = st.live[0] || ALL[0];
    st.audits = {}; (data.audits || []).forEach(function (a) { st.audits[a.key] = a; });
    st.weekly = {}; (data.weekly || []).forEach(function (w) { st.weekly[wKey(w.week, w.clinic)] = w; });
    st.shots = {}; (data.shots || []).forEach(function (s) { st.shots[s.id] = s; });
    R.selectClinic(st.clinic);
    if (!st.week) st.week = lastWeek() < startWeek() ? startWeek() : lastWeek();
  };
  /* app.js's st.cust / st.tasks / st.cadence / st.settings describe the selected clinic, so the CRM page and customer sheets work unchanged */
  R.selectClinic = function (code) {
    st.clinic = code;
    var cd = (st.data && st.data.clinics && st.data.clinics[code]) || { customers: [], das: {}, cadence: [], tasks: [], settings: {} };
    A.shapeClinic({ clinic: code, customers: cd.customers || [], das: cd.das || {}, cadence: cd.cadence || [], tasks: cd.tasks || [], settings: cd.settings || {}, details: [], imports: [], today: st.data ? st.data.today : A.today() });
  };
  function ctxOf(code){ return st.ctx[code || st.clinic] || { code: code, cust: [], byKey: {}, taskIdx: {}, goLive: "", cadenceTab: [], das: {} }; }
  function cust(key, code){ return ctxOf(code).byKey[key]; }

  /* ------------------------------------------------------------------ cadence: the whole journey */
  /* Every milestone the customer has, from the deposit, dated; D1 / D6-7 are kept after collection
     (the reviewer checks them too). before: due < go-live (the DA was not on the dashboard yet). */
  function journey(c, ctx){
    var out = [], prod = c.product;
    if (!Z.CAD[prod]) return out;
    for (var si = 0; si < Z.STAGES.length; si++) {
      var stage = Z.STAGES[si], info = Z.cadenceInfo(prod, stage, ctx.cadenceTab);
      if (!info) continue;
      var anchor = Z.OFFSETS[si][0] === 0 ? c.dep : c.coll;
      if (!anchor) continue;
      var due = Z.addDays(anchor, Z.OFFSETS[si][1]), open = Z.WINDOW_START[stage] ? Z.addDays(anchor, Z.WINDOW_START[stage]) : due;
      out.push({ stage: stage, si: si, due: due, open: open, items: info.items, touch: info.touch, text: info.text, before: !!(ctx.goLive && due < ctx.goLive) });
    }
    return out;
  }
  function dueInWeek(c, wk, ctx){ var end = Z.addDays(wk, 6); return journey(c, ctx).filter(function (m) { return m.due >= wk && m.due <= end; }); }
  function daBits(ctx, c, stage){ var d = ctx.taskIdx[c.key + "|" + stage]; return d && !d.undone_at ? String(d.bits || "") : ""; }
  function onCount(bits, n){ var on = 0; for (var i = 0; i < n; i++) if (bits.charAt(i) === "1") on++; return on; }
  function daState(ctx, c, m){ var b = daBits(ctx, c, m.stage); if (!b) return "none"; var on = onCount(b, m.items.length); return on >= m.items.length ? "sent" : on ? "partial" : "none"; }
  function cnText(prod, stage){ var list = (st.data && st.data.cadenceCN) || []; for (var i = 0; i < list.length; i++) if (list[i].product === prod && list[i].stage === stage) return list[i].text; return ""; }

  /* ------------------------------------------------------------------ records */
  function recsOf(week, clinic){ clinic = clinic || st.clinic; return Object.keys(st.audits).map(function (k) { return st.audits[k]; }).filter(function (a) { return a.week === week && a.clinic === clinic; }); }
  function isExtra(a){ return a.source === "extra"; }
  function bitsPts(bits, n){ var on = onCount(bits, n); return !n || !on ? 0 : on >= n ? 1 : 0.5; }
  function weekStatus(week, clinic){ var w = st.weekly[wKey(week, clinic || st.clinic)]; return (w && w.status) || "marking"; }
  function isLocked(week, clinic){ return weekStatus(week, clinic) !== "marking"; }
  /* verdict, points and item counts from the marks {stage: bits}; only milestones with a mark count */
  function evalRec(a){
    var ctx = ctxOf(a.clinic), c = ctx.byKey[a.custKey], j = c ? journey(c, ctx) : [], marks = a.marks || {}, end = Z.addDays(a.week, 6);
    var e = { n: 0, score: null, weekScore: null, notFound: 0, verdict: "open", found: "", missing: "", items: { on: 0, n: 0 }, weekItems: { on: 0, n: 0 }, stages: [] };
    var pts = [], wk = [], full = 0, none = 0, found = [], missing = [];
    j.forEach(function (m) {
      var bits = marks[m.stage]; if (bits === undefined || bits === "") return;
      var p = bitsPts(bits, m.items.length), inWeek = m.due >= a.week && m.due <= end, db = daBits(ctx, c, m.stage), miss = [], hits = [], misses = [];
      e.n++; pts.push(p); if (p === 1) full++; if (p === 0) none++;
      if (inWeek) wk.push(p);
      m.items.forEach(function (it, i) {
        var on = bits.charAt(i) === "1";
        e.items.n++; if (on) e.items.on++;
        if (inWeek) { e.weekItems.n++; if (on) e.weekItems.on++; }
        if (on) hits.push(it[0]); else { misses.push(it[0]); miss.push(itemLabel(it[0], "zh")); if (db.charAt(i) === "1") e.notFound++; }
      });
      if (p === 1) found.push(m.stage); else if (p === .5) found.push(m.stage + " ½");
      if (miss.length) missing.push(m.stage + ": " + miss.join("、"));
      e.stages.push({ stage: m.stage, inWeek: inWeek, pts: p, on: m.items.length - misses.length, n: m.items.length, hits: hits, misses: misses });
    });
    var avg = function (l) { return l.length ? Math.round(l.reduce(function (s, x) { return s + x; }, 0) / l.length * 100) : null; };
    e.score = avg(pts); e.weekScore = avg(wk); e.found = found.join(" · "); e.missing = missing.join("\n");
    e.verdict = a.data ? "data" : !e.n ? (a.status === "checked" ? (a.source && a.source.indexOf("sheet") === 0 ? "noted" : "fail") : "open") : full === e.n ? "pass" : none === e.n ? "fail" : "partial";
    return e;
  }
  function verdictPill(v){ var t = T(), m = { pass: ["p-ok", t.vPass], partial: ["p-warn", t.vPartial], fail: ["p-bad", t.vFail], data: ["p-inert", t.vData], noted: ["p-inert", t.vNoted], open: ["p-accent", t.vOpen] }[v] || ["p-inert", v]; return '<span class="pill ' + m[0] + '">' + esc(m[1]) + "</span>"; }
  function scoreColour(s){ return s === null || s === undefined ? "var(--muted)" : s >= 80 ? "var(--ok)" : s >= 50 ? "var(--warn)" : "var(--bad)"; }

  /* the week's figures for one clinic: the tiles, the scoreboard, the overview and the Weekly tab */
  function weekStats(week, clinic){
    clinic = clinic || st.clinic;
    var ctx = ctxOf(clinic), recs = recsOf(week, clinic), target = sampleSize(clinic);
    var s = { week: week, clinic: clinic, target: target, dueCustomers: 0, dueCadences: 0, sampled: recs.length, drawn: 0, extra: 0, checked: 0, pass: 0, partial: 0, fail: 0, data: 0, noted: 0, open: 0,
              score: null, weekScore: null, notFound: 0, itemsOn: 0, itemsN: 0, itemsPct: null, allOn: 0, allN: 0, earlier: 0, cadences: 0, daSent: null, daN: 0, daItemsOn: 0, daItemsN: 0,
              byStage: {}, items: {}, daItems: {}, status: weekStatus(week, clinic) };
    function stageRow(stage){ return s.byStage[stage] = s.byStage[stage] || { stage: stage, due: 0, daFull: 0, daPartial: 0, daNone: 0, daOn: 0, daN: 0, inSample: 0, on: 0, n: 0, full: 0, partial: 0, missed: 0, pts: 0 }; }
    ctx.cust.forEach(function (c) {
      if (c.exam) return;
      var d = dueInWeek(c, week, ctx); if (!d.length) return;
      s.dueCustomers++; s.dueCadences += d.length;
      d.forEach(function (m) {
        var r = stageRow(m.stage), b = daBits(ctx, c, m.stage), on = onCount(b, m.items.length), ds = !b ? "none" : on >= m.items.length ? "sent" : on ? "partial" : "none";
        r.due++; r.daOn += on; r.daN += m.items.length; s.daItemsOn += on; s.daItemsN += m.items.length; s.daN++;
        if (ds === "sent") r.daFull++; else if (ds === "partial") r.daPartial++; else r.daNone++;
        m.items.forEach(function (it, i) { var k = m.stage + "|" + it[0], x = s.daItems[k] = s.daItems[k] || { stage: m.stage, item: it[0], on: 0, n: 0 }; x.n++; if (b.charAt(i) === "1") x.on++; });
      });
    });
    var ptsAll = [], ptsWk = [];
    recs.forEach(function (a) {
      var e = evalRec(a); s[e.verdict] = (s[e.verdict] || 0) + 1;
      if (isExtra(a)) s.extra++; else s.drawn++;
      if (a.status === "checked") s.checked++;
      if (e.score !== null) ptsAll.push(e.score); if (e.weekScore !== null) ptsWk.push(e.weekScore);
      s.notFound += e.notFound; s.allOn += e.items.on; s.allN += e.items.n; s.cadences += e.n;
      e.stages.forEach(function (x) {
        if (!x.inWeek) { s.earlier++; return; }
        var r = stageRow(x.stage); r.inSample++; r.on += x.on; r.n += x.n; r.pts += x.pts; s.itemsOn += x.on; s.itemsN += x.n;
        if (x.pts === 1) r.full++; else if (x.pts === 0) r.missed++; else r.partial++;
        x.hits.forEach(function (k) { var y = s.items[x.stage + "|" + k] = s.items[x.stage + "|" + k] || { stage: x.stage, item: k, on: 0, n: 0 }; y.n++; y.on++; });
        x.misses.forEach(function (k) { var y = s.items[x.stage + "|" + k] = s.items[x.stage + "|" + k] || { stage: x.stage, item: k, on: 0, n: 0 }; y.n++; });
      });
    });
    var avg = function (l) { return l.length ? Math.round(l.reduce(function (x, y) { return x + y; }, 0) / l.length) : null; };
    s.score = avg(ptsAll); s.weekScore = avg(ptsWk); s.daSent = pct(s.daItemsOn, s.daItemsN); s.itemsPct = pct(s.itemsOn, s.itemsN);
    return s;
  }
  function statsLine(s){ return { week: s.week, clinic: s.clinic, dueCustomers: s.dueCustomers, dueCadences: s.dueCadences, sampled: s.sampled, checked: s.checked, pass: s.pass, partial: s.partial, fail: s.fail, data: s.data, score: s.itemsPct === null ? "" : s.itemsPct, weekScore: s.weekScore === null ? "" : s.weekScore, notFound: s.notFound, daSent: s.daSent === null ? "" : s.daSent }; }

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
    var ctx = ctxOf(), key = aKey(week, st.clinic, c.key), a = st.audits[key];
    if (a) { if (a.source === "extra" && source !== "extra") { a.source = source; save(a); } return a; }
    a = { key: key, week: week, clinic: st.clinic, custKey: c.key, tag: c.tag, name: A.custLabel(c), product: c.product, da: c.da,
          due: dueInWeek(c, week, ctx).map(function (m) { return m.stage; }).join(" "), status: "sampled", marks: {}, remark: "", data: 0, checkedAt: "", source: source || "manual", added: nowIso() };
    st.audits[key] = a; st.ui.open[key] = true; save(a); return a;
  }
  function removeFromSample(a){
    delete st.audits[a.key]; clearTimeout(st.timers[a.key]);
    A.post({ action: "auditRemove", keys: [a.key], clinic: a.clinic, stats: [statsLine(weekStats(a.week, a.clinic))] }).catch(function (e) { A.toast(fill(T().failed, { e: e.message }), true); });
  }
  /* Quotas: the target split across the cadences due this week, 3–5 each as a guide, at least one
     where a cadence is due, scaled so the total is the target. */
  function quotas(week){
    var ctx = ctxOf(), counts = {}, target = sampleSize();
    ctx.cust.forEach(function (c) { if (c.exam) return; dueInWeek(c, week, ctx).forEach(function (m) { counts[m.stage] = (counts[m.stage] || 0) + 1; }); });
    var stages = Object.keys(counts).sort(stageOrder), total = stages.reduce(function (n, k) { return n + counts[k]; }, 0), q = {};
    if (!stages.length) return { stages: [], q: q, counts: counts };
    if (stages.length >= target) { stages.slice().sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, target).forEach(function (k) { q[k] = 1; }); return { stages: stages, q: q, counts: counts }; }
    stages.forEach(function (k) { q[k] = Math.max(1, Math.min(QUOTA_MAX, counts[k], Math.round(target * counts[k] / total))); });
    var sum = function () { return stages.reduce(function (n, k) { return n + q[k]; }, 0); }, guard = 0;
    while (sum() > target && guard++ < 50) { var big = stages.slice().sort(function (a, b) { return q[b] - q[a] || counts[b] - counts[a]; })[0]; if (q[big] <= 1) break; q[big]--; }
    guard = 0;
    while (sum() < target && guard++ < 50) { var room = stages.filter(function (k) { return q[k] < Math.min(QUOTA_MAX, counts[k]); }).sort(function (a, b) { return (counts[b] - q[b]) - (counts[a] - q[a]); })[0]; if (!room) break; q[room]++; }
    return { stages: stages, q: q, counts: counts };
  }
  function covered(week){ var cov = {}; recsOf(week).forEach(function (a) { if (isExtra(a)) return; (a.due || "").split(/\s+/).forEach(function (s) { if (s) cov[s] = (cov[s] || 0) + 1; }); }); return cov; }
  /* Draw: fill each cadence's quota from a shuffled, product-alternating pool of customers not yet sampled;
     a chat counts toward every cadence it has due; then top up to the target from the biggest pools. */
  function draw(week, n){
    var ctx = ctxOf(), have = {}; recsOf(week).forEach(function (a) { have[a.custKey] = 1; });
    var qt = quotas(week), cov = covered(week), pools = {}, dueOf = {};
    ctx.cust.forEach(function (c) {
      if (have[c.key] || c.exam) return;
      var d = dueInWeek(c, week, ctx); if (!d.length) return;
      dueOf[c.key] = d.map(function (m) { return m.stage; });
      d.forEach(function (m) { (pools[m.stage] = pools[m.stage] || []).push(c); });
    });
    Object.keys(pools).forEach(function (k) {
      var list = pools[k];
      for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; }
      var byP = {}; list.forEach(function (c) { (byP[c.product] = byP[c.product] || []).push(c); });
      var mixed = [], more = true, ps = Object.keys(byP);
      while (more) { more = false; ps.forEach(function (p) { if (byP[p].length) { mixed.push(byP[p].shift()); more = true; } }); }
      pools[k] = mixed;
    });
    var picked = [], taken = {};
    function take(c){ taken[c.key] = 1; picked.push(c); dueOf[c.key].forEach(function (s) { cov[s] = (cov[s] || 0) + 1; }); }
    qt.stages.forEach(function (k) {
      var pool = pools[k] || [];
      while (picked.length < n && (cov[k] || 0) < (qt.q[k] || 0) && pool.length) { var c = pool.shift(); if (taken[c.key]) continue; take(c); }
    });
    var guard = 0;
    while (picked.length < n && guard++ < 500) {
      var best = Object.keys(pools).sort(function (a, b) { return pools[b].length - pools[a].length; })[0];
      if (!best || !pools[best].length) break;
      var c2 = pools[best].shift(); if (taken[c2.key]) continue; take(c2);
    }
    picked.forEach(function (c) { addToSample(c, week, "draw"); });
    return picked.length;
  }
  function saveFeedback(week, text){
    var k = wKey(week, st.clinic), w = st.weekly[k] || { week: week, clinic: st.clinic, status: "marking" };
    w.remark = text; w.updated = nowIso(); w.by = st.data.reviewer; st.weekly[k] = w;
    setStatus(k, "saving");
    A.post({ action: "feedbackSave", week: week, clinic: st.clinic, text: text, stats: statsLine(weekStats(week)) })
      .then(function (r) { setStatus(k, r && r.local ? "local" : "saved"); R.render(); })
      .catch(function (e) { setStatus(k, "failed " + e.message); });
  }
  function setWeekStatus(week, status){
    var t = T(), k = wKey(week, st.clinic), w = st.weekly[k] || { week: week, clinic: st.clinic };
    var was = w.status || "marking";
    w.status = status; if (status === "submitted") w.submittedAt = nowIso(); w.updated = nowIso(); w.by = st.data.reviewer; st.weekly[k] = w;
    R.render();
    A.post({ action: "weekStatus", week: week, clinic: st.clinic, status: status, stats: statsLine(weekStats(week)) })
      .then(function (r) { A.toast(status === "submitted" ? t.sent + (r && r.emailed ? " · ✉ " + r.emailed : "") : t.reopened); })
      .catch(function (e) { w.status = was; R.render(); A.toast(fill(t.failed, { e: e.message }), true); });
  }
  function completeWeek(week){
    var t = T(), s = weekStats(week);
    if (s.drawn < s.target && !window.confirm(fill(t.completeShort, { n: s.drawn, t: s.target }))) return;
    if (!window.confirm(fill(t.completeAsk, { c: st.clinic, w: wTag(week), n: s.drawn, t: s.target, x: s.extra }))) return;
    setWeekStatus(week, "submitted");
  }

  /* ------------------------------------------------------------------ screenshots */
  function shotsOf(a){ return Object.keys(st.shots).map(function (id) { return st.shots[id]; }).filter(function (s) { return s.week === a.week && s.clinic === a.clinic && s.custKey === a.custKey; }); }
  function readFile(file){ return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(fr.error); }; fr.readAsDataURL(file); }); }
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

  /* ------------------------------------------------------------------ routes and chrome */
  R.resolveRoute = function (r) {
    r = String(r || "").toLowerCase();
    if (r.indexOf("clinic-") === 0) { var code = ALL.filter(function (c) { return c.toLowerCase() === r.slice(7); })[0]; if (code && isLive(code)) { if (code !== st.clinic) R.selectClinic(code); return "clinic"; } return "overview"; }
    if (r === "crm") return "crm";
    return "overview";
  };
  R.navItems = function (route) {
    var t = T(), open = recsOf(st.week).filter(function (a) { return a.status !== "checked"; }).length;
    var items = [{ route: "overview", label: t.nav.overview, current: route === "overview" }];
    ALL.forEach(function (c) { items.push({ route: "clinic-" + c.toLowerCase(), label: c, off: !isLive(c), offLabel: t.notLive, current: route === "clinic" && st.clinic === c, count: route === "clinic" && st.clinic === c ? open : 0 }); });
    items.push({ route: "crm", label: t.nav.crm, current: route === "crm" });
    return items;
  };
  R.subText = function () { return fill(T().sub, { c: st.clinic, r: st.data ? (st.data.name || st.data.reviewer) : "" }); };
  R.title = function () { return T().title; };
  R.page = function (route) { return route === "clinic" ? pageClinic() : route === "crm" ? pageCrm() : pageOverview(); };
  R.guideHtml = function () { var t = T(); return '<div class="guide"><h2>' + esc(t.g.title) + "</h2><ol>" + t.g.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + '</ol><div class="gbtns"><button type="button" class="btn primary" data-act="guide-close">OK</button></div></div>'; };

  function weekBar(){
    var t = T(), cur = st.week, h = '<div class="rvweek">';
    h += '<button type="button" class="btn sm" data-act="rv-week" data-w="' + esc(Z.addDays(cur, -7)) + '" aria-label="' + esc(t.prevWeek) + '">‹</button>';
    h += '<div class="rvwk"><b>' + esc(wTag(cur)) + '</b> <span>' + esc(weekLabel(cur)) + " " + cur.slice(0, 4) + "</span>" + (cur === thisWeek() ? ' <span class="pill p-accent">' + esc(t.thisWeek) + "</span>" : cur === lastWeek() ? ' <span class="pill p-accent">' + esc(t.lastWeek) + "</span>" : "") + "</div>";
    h += '<button type="button" class="btn sm" data-act="rv-week" data-w="' + esc(Z.addDays(cur, 7)) + '" aria-label="' + esc(t.nextWeek) + '"' + (Z.addDays(cur, 7) > thisWeek() ? " disabled" : "") + ">›</button></div>";
    return h;
  }
  function statusLabel(status){ var t = T(); return { marking: t.stMarking, submitted: t.stSubmitted, review: t.stReview, published: t.stPublished, acknowledged: t.stAck }[status] || status; }
  function statusPill(status){ var cls = { marking: "p-accent", submitted: "p-warn", review: "p-warn", published: "p-ok", acknowledged: "p-ok" }[status] || "p-inert"; return '<span class="pill ' + cls + '">' + esc(statusLabel(status)) + "</span>"; }
  function tile(cls, big, label, sub){ return '<div class="stat ' + cls + '"><div class="sn">' + big + '</div><div class="sl">' + esc(label) + '</div><div class="sx">' + esc(sub) + "</div></div>"; }

  /* ------------------------------------------------------------------ overview */
  function pageOverview(){
    var t = T(), week = st.week, h = weekBar(), stats = {};
    st.live.forEach(function (c) { stats[c] = weekStats(week, c); });
    h += '<div class="ccards">' + ALL.map(function (c) {
      if (!isLive(c)) return '<div class="ccard off"><div class="cname">' + esc(c) + ' <span class="pill p-inert">' + esc(t.notLive) + '</span></div><div class="big">—</div><div class="bl">' + esc(t.ovCard.noCrm) + "</div></div>";
      var s = stats[c], wk = st.weekly[wKey(week, c)] || {}, hist = weeksList().slice(-8).map(function (w) { var x = w === week ? s : weekStats(w, c); return x.itemsPct === null ? 0 : x.itemsPct; });
      return '<a class="ccard" href="#/clinic-' + c.toLowerCase() + '"><div class="cname">' + esc(c) + " " + statusPill(s.status) + "</div>"
        + '<div class="big" style="color:' + scoreColour(s.itemsPct) + '">' + (s.itemsPct === null ? "—" : s.itemsPct + "<small>%</small>") + '</div><div class="bl">' + esc(t.ovCard.items) + " " + s.itemsOn + " / " + s.itemsN + "</div>"
        + '<div class="kv2"><span>' + esc(t.ovCard.sop) + "</span><b>" + (s.score === null ? "—" : s.score) + "</b><span>" + esc(t.ovCard.da) + "</span><b>" + (s.daSent === null ? "—" : s.daSent + "%") + "</b><span>" + esc(t.ovCard.gap) + '</span><b style="color:' + (s.notFound ? "var(--bad)" : "inherit") + '">' + s.notFound + "</b><span>" + esc(t.ovCard.marked) + "</span><b>" + s.drawn + "/" + s.target + (s.extra ? " + " + s.extra : "") + "</b></div>"
        + (wk.remark ? '<div class="fbq">' + esc(wk.remark.length > 140 ? wk.remark.slice(0, 140) + "…" : wk.remark) + "</div>" : "")
        + '<div class="spark">' + hist.map(function (v, i) { return "<i" + (i === hist.length - 1 ? ' class="last"' : "") + ' style="height:' + Math.max(8, v) + '%"></i>'; }).join("") + "</div></a>";
    }).join("") + "</div>";
    /* across clinics: cadence × clinic, most missed / most done over every live clinic */
    var stages = {}, items = {};
    st.live.forEach(function (c) { Object.keys(stats[c].byStage).forEach(function (k) { if (stats[c].byStage[k].inSample) stages[k] = 1; }); Object.keys(stats[c].items).forEach(function (k) { var x = stats[c].items[k], y = items[k] = items[k] || { stage: x.stage, item: x.item, on: 0, n: 0 }; y.on += x.on; y.n += x.n; }); });
    var sk = Object.keys(stages).sort(stageOrder), ik = Object.keys(items);
    h += '<div class="grid2"><div class="panel"><h3>' + esc(t.across) + ' <span class="hint">' + esc(t.acrossHint) + "</span></h3>";
    if (!sk.length) h += '<div class="empty">' + esc(t.noneYet) + "</div>";
    else {
      h += '<div class="pad"><div class="tblwrap"><table class="rvtbl heat"><thead><tr><th>' + esc(t.thCad) + "</th>" + ALL.map(function (c) { return '<th class="n">' + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
      sk.forEach(function (k) {
        h += '<tr><td class="mono">' + esc(k) + "</td>" + ALL.map(function (c) {
          if (!isLive(c) || !stats[c].byStage[k] || !stats[c].byStage[k].inSample) return '<td class="h hoff">—</td>';
          var r = stats[c].byStage[k], v = pct(r.on, r.n); return '<td class="h ' + (v >= 80 ? "hok" : v >= 50 ? "hwarn" : "hbad") + '">' + v + "%</td>";
        }).join("") + "</tr>";
      });
      h += "</tbody></table></div></div>";
    }
    h += "</div><div>" + rankPanel(t.mostMissed, t.acrossLive, ik.map(function (k) { return items[k]; }), true) + rankPanel(t.mostDone, "", ik.map(function (k) { return items[k]; }), false) + "</div></div>";
    /* needs attention */
    var att = [];
    st.live.forEach(function (c) {
      var s = stats[c], wk = st.weekly[wKey(week, c)] || {};
      if (s.status === "submitted") att.push([fill(t.attWaiting, { c: c, w: wTag(week) }), fill(t.attWaitingX, { t: fmtWhen(wk.submittedAt || wk.updated) }), c]);
      else if (s.status === "marking" && s.sampled) att.push([fill(t.attNotDone, { c: c, w: wTag(week), n: s.drawn, t: s.target }), fill(t.attNotDoneX, { c: c }), c]);
      else if (s.status === "marking" && s.dueCadences) att.push([fill(t.attNone, { c: c, w: wTag(week) }), fill(t.attNoneX, { c: c }), c]);
    });
    h += '<div class="panel"><h3>' + esc(t.attention) + "</h3>" + (att.length ? att.map(function (r) { return '<a class="lrow" href="#/clinic-' + r[2].toLowerCase() + '"><div><div class="nm">' + esc(r[0]) + '</div><div class="meta">' + esc(r[1]) + '</div></div><div class="right"><span class="btn sm">' + esc(fill(t.openClinic, { c: r[2] })) + "</span></div></a>"; }).join("") : '<div class="empty">' + esc(t.attNothing) + "</div>") + "</div>";
    return h;
  }
  function rankPanel(title, hint, list, missed){
    var t = T(), rows = list.filter(function (x) { return x.n; }).map(function (x) { return { stage: x.stage, item: x.item, a: missed ? x.n - x.on : x.on, n: x.n }; }).filter(function (x) { return x.a; });
    rows.sort(function (x, y) { return (y.a / y.n) - (x.a / x.n) || y.a - x.a; });
    var h = '<div class="panel"><h3>' + esc(title) + (hint ? ' <span class="hint">' + esc(hint) + "</span>" : "") + '</h3><div class="pad">';
    if (!rows.length) return h + '<div class="empty" style="padding:8px">' + esc(t.itemsNone) + "</div></div></div>";
    rows.slice(0, 6).forEach(function (r) { h += '<div class="rank"><span>' + esc(itemLabel(r.item)) + "<small>" + esc(r.stage) + '</small></span><div class="mb ' + (missed ? "bad" : "ok") + '"><i style="width:' + Math.round(r.a / r.n * 100) + '%"></i></div><span class="n">' + r.a + "/" + r.n + "</span></div>"; });
    return h + "</div></div>";
  }

  /* ------------------------------------------------------------------ clinic tab */
  function pageClinic(){
    var t = T(), week = st.week, s = weekStats(week), wk = st.weekly[wKey(week, st.clinic)] || {}, locked = isLocked(week), h = weekBar();
    h += '<div class="strip"><span class="lab">' + esc(wTag(week)) + " · " + esc(statusLabel(s.status)) + "</span>"
      + "<span>" + esc(locked ? fill(t.stripLocked, { t: fmtWhen(wk.submittedAt || wk.updated) }) : fill(t.stripMarking, { n: s.drawn, t: s.target, x: s.extra, c: s.checked })) + "</span>"
      + '<span class="right">' + (locked ? (s.status === "submitted" ? '<button type="button" class="btn sm" data-act="rv-reopen">' + esc(t.reopen) + "</button>" : "") : '<span class="hint">' + esc(t.stripHint) + '</span><button type="button" class="btn primary" data-act="rv-complete">' + esc(t.complete) + "</button>") + "</span></div>";
    h += scoreboard(s);
    var fk = wKey(week, st.clinic);
    h += '<div class="panel rvfb"><h3>' + esc(t.fbTitle) + ' <span class="hint">' + esc(t.fbHint) + '</span></h3><div class="pad">'
      + '<textarea id="rvFb" placeholder="' + esc(fill(t.fbPh, { c: st.clinic })) + '"' + (locked ? " disabled" : "") + ">" + esc(wk.remark || "") + "</textarea>"
      + '<div class="rvrow">' + (locked ? "" : '<button type="button" class="btn primary" data-act="rv-fb-save">' + esc(t.fbSave) + "</button>") + '<span data-rvstat="' + esc(fk) + '">' + statusHtml(fk) + "</span>"
      + (wk.updated && !st.pending[fk] ? '<span class="rvstat">' + esc(fill(t.fbSaved, { t: fmtWhen(wk.updated) })) + "</span>" : "") + "</div></div></div>";
    h += toMark(week, s, locked);
    h += dueList(week, locked);
    h += history();
    return h;
  }
  function scoreboard(s){
    var t = T(), u = st.ui, h = '<div class="panel"><h3>' + esc(t.sb) + ' <span class="hint">' + esc(t.sbHint) + '</span><span class="views"><span class="rtabs">'
      + [["cad", t.vCad], ["items", t.vItems], ["weeks", t.vWeeks]].map(function (v) { return '<button type="button" data-act="rv-view" data-v="' + v[0] + '" aria-pressed="' + (u.view === v[0]) + '">' + esc(v[1]) + "</button>"; }).join("") + '</span><span class="rtabs">'
      + [["audit", t.srcAudit], ["da", t.srcDa]].map(function (v) { return '<button type="button" data-act="rv-src" data-v="' + v[0] + '" aria-pressed="' + (u.src === v[0]) + '">' + esc(v[1]) + "</button>"; }).join("") + '</span></span></h3><div class="pad">';
    h += '<div class="tiles rv5" style="margin:0 0 12px">'
      + tile(s.itemsPct === null ? "" : s.itemsPct >= 80 ? "ok" : s.itemsPct >= 50 ? "warn" : "bad", s.itemsN ? s.itemsOn + "<small>/" + s.itemsN + "</small>" : "—", t.tItems, s.itemsN ? fill(t.tItemsX, { n: s.cadences - s.earlier, m: s.sampled, a: s.allOn + "/" + s.allN }) : t.none)
      + tile("", s.score === null ? "—" : String(s.score), t.tSop, t.tSopX)
      + tile("", s.daSent === null ? "—" : s.daSent + "<small>%</small>", t.tDa, fill(t.tDaX, { n: s.dueCadences }))
      + tile(s.notFound ? "bad" : "", String(s.notFound), t.tGap, t.tGapX)
      + tile(s.drawn >= s.target ? "ok" : "", s.drawn + "<small>/" + s.target + "</small>", t.tMarked, fill(t.tMarkedX, { x: s.extra, c: s.checked })) + "</div>";
    var stages = Object.keys(s.byStage).sort(stageOrder);
    if (u.view === "cad") {
      h += '<div class="tblwrap"><table class="rvtbl"><thead><tr><th>' + esc(t.thCad) + '</th><th class="n">' + esc(t.thDue) + "</th>";
      if (u.src === "audit") h += '<th class="n">' + esc(t.thSample) + '</th><th class="n">' + esc(t.thItems) + '</th><th class="n">' + esc(t.thFull) + '</th><th class="n">' + esc(t.thPartial) + '</th><th class="n">' + esc(t.thMissed) + '</th><th class="n">' + esc(t.thScore) + '</th><th class="n">' + esc(t.thDa) + "</th>";
      else h += '<th class="n">' + esc(t.thItems) + '</th><th class="n">' + esc(t.thFull) + '</th><th class="n">' + esc(t.thPartial) + '</th><th class="n">' + esc(t.thNotTicked) + '</th><th class="n">' + esc(t.thDa) + "</th>";
      h += "</tr></thead><tbody>";
      var tot = { due: 0, inSample: 0, on: 0, n: 0, full: 0, partial: 0, missed: 0, daOn: 0, daN: 0, daFull: 0, daPartial: 0, daNone: 0 };
      stages.forEach(function (k) {
        var r = s.byStage[k]; Object.keys(tot).forEach(function (f) { tot[f] += r[f] || 0; });
        var sc = pct(r.on, r.n), da = pct(r.daOn, r.daN);
        h += '<tr><td class="mono">' + esc(k) + '</td><td class="n">' + r.due + "</td>";
        if (u.src === "audit") h += '<td class="n">' + r.inSample + '</td><td class="n">' + (r.n ? r.on + " / " + r.n : "—") + '</td><td class="n">' + r.full + '</td><td class="n">' + r.partial + '</td><td class="n">' + r.missed + '</td><td class="n" style="color:' + scoreColour(sc) + ';font-weight:600">' + (sc === null ? "—" : sc + "%") + '</td><td class="n" style="color:var(--muted)">' + (da === null ? "—" : da + "%") + "</td>";
        else h += '<td class="n">' + r.daOn + " / " + r.daN + '</td><td class="n">' + r.daFull + '</td><td class="n">' + r.daPartial + '</td><td class="n">' + r.daNone + '</td><td class="n" style="color:' + scoreColour(da) + ';font-weight:600">' + (da === null ? "—" : da + "%") + "</td>";
        h += "</tr>";
      });
      var tsc = pct(tot.on, tot.n), tda = pct(tot.daOn, tot.daN);
      h += '<tr class="tot"><td>' + esc(t.total) + '</td><td class="n">' + tot.due + "</td>";
      if (u.src === "audit") h += '<td class="n">' + tot.inSample + '</td><td class="n">' + (tot.n ? tot.on + " / " + tot.n : "—") + '</td><td class="n">' + tot.full + '</td><td class="n">' + tot.partial + '</td><td class="n">' + tot.missed + '</td><td class="n" style="color:' + scoreColour(tsc) + '">' + (tsc === null ? "—" : tsc + "%") + '</td><td class="n" style="color:var(--muted)">' + (tda === null ? "—" : tda + "%") + "</td>";
      else h += '<td class="n">' + tot.daOn + " / " + tot.daN + '</td><td class="n">' + tot.daFull + '</td><td class="n">' + tot.daPartial + '</td><td class="n">' + tot.daNone + '</td><td class="n" style="color:' + scoreColour(tda) + '">' + (tda === null ? "—" : tda + "%") + "</td>";
      h += '</tr></tbody></table></div><div class="note2">' + esc(u.src === "audit" ? fill(t.cadNote, { n: s.earlier }) : t.daNote) + "</div>";
    } else if (u.view === "items") {
      var src = u.src === "audit" ? s.items : s.daItems, list = Object.keys(src).map(function (k) { return src[k]; });
      h += '<div class="grid2">' + rankPanel(t.itemsMissed, u.src === "audit" ? t.srcAudit : t.srcDa, list, true) + rankPanel(t.itemsDone, "", list, false) + "</div>";
    } else {
      h += weeksTable();
    }
    return h + "</div></div>";
  }
  function weeksList(){
    var out = [], k = startWeek(), guard = 0;
    Object.keys(st.audits).forEach(function (key) { if (st.audits[key].week < k) k = monday(st.audits[key].week); });
    while (k <= thisWeek() && guard++ < 120) { out.push(k); k = Z.addDays(k, 7); }
    return out;
  }
  function weeksTable(){
    var t = T(), weeks = weeksList().reverse();
    var h = '<div class="tblwrap"><table class="rvtbl"><thead><tr><th>' + esc(t.thWeek) + "</th><th>" + esc(t.thStatus) + '</th><th class="n">' + esc(t.thDue) + '</th><th class="n">' + esc(t.thSampled) + '</th><th class="n">' + esc(t.thChecked) + '</th><th class="n">' + esc(t.thItems) + '</th><th class="n">' + esc(t.thScore) + '</th><th class="n">' + esc(t.thDa) + '</th><th class="n">' + esc(t.tGap) + '</th><th class="n">' + esc(t.thPass) + '</th><th class="n">' + esc(t.thPartial) + '</th><th class="n">' + esc(t.thFail) + '</th><th class="n">' + esc(t.thData) + "</th><th>" + esc(t.thRemark) + "</th></tr></thead><tbody>";
    weeks.forEach(function (w) {
      var s = weekStats(w), wk = st.weekly[wKey(w, st.clinic)] || {}, rem = (wk.remark || "").replace(/\s+/g, " ");
      h += '<tr class="click' + (w === st.week ? " sel" : "") + '" data-act="rv-week" data-w="' + esc(w) + '"><td class="mono">' + esc(wTag(w)) + ' <span class="hint">' + esc(weekLabel(w)) + "</span></td><td>" + statusPill(s.status) + '</td><td class="n">' + s.dueCadences + '</td><td class="n">' + s.sampled + '</td><td class="n">' + s.checked + '</td><td class="n">' + (s.itemsN ? s.itemsOn + " / " + s.itemsN : "—") + "</td>"
        + '<td class="n" style="color:' + scoreColour(s.itemsPct) + ';font-weight:600">' + (s.itemsPct === null ? "—" : s.itemsPct + "%") + '</td><td class="n">' + (s.daSent === null ? "—" : s.daSent + "%") + '</td><td class="n"' + (s.notFound ? ' style="color:var(--bad);font-weight:600"' : "") + ">" + s.notFound + "</td>"
        + '<td class="n">' + s.pass + '</td><td class="n">' + s.partial + '</td><td class="n">' + s.fail + '</td><td class="n">' + s.data + '</td><td class="rem" title="' + esc(wk.remark || "") + '">' + esc(rem.length > 90 ? rem.slice(0, 90) + "…" : rem) + "</td></tr>";
    });
    return h + "</tbody></table></div>";
  }

  function toMark(week, s, locked){
    var t = T(), recs = recsOf(week).filter(function (a) { return !isExtra(a); }), qt = quotas(week), cov = covered(week);
    var have = {}; recsOf(week).forEach(function (a) { have[a.custKey] = 1; });
    var ctx = ctxOf(), pool = ctx.cust.filter(function (c) { return !have[c.key] && !c.exam && dueInWeek(c, week, ctx).length; }).length;
    var want = Math.max(s.target - recs.length, 0), nDraw = Math.min(want || 3, pool);
    var h = '<div class="panel" id="rvSample"><h3>' + esc(t.toMark) + ' <span class="hint">' + esc(fill(t.toMarkHint, { t: s.target })) + "</span></h3>";
    h += '<div class="fbar">' + (locked ? "" : '<button type="button" class="btn primary sm" data-act="rv-draw" data-n="' + nDraw + '" title="' + esc(t.drawHint) + '"' + (pool && want ? "" : " disabled") + ">" + esc(fill(t.draw, { n: nDraw })) + "</button>"
      + '<span class="hint">' + esc(!want ? t.drawDone : pool ? "" : t.drawNone) + "</span>")
      + (qt.stages.length ? '<span class="quota"><span class="lab">' + esc(t.quota) + "</span>" + qt.stages.map(function (k) { var c = cov[k] || 0, q = qt.q[k] || 0; return '<span class="' + (c > q ? "over" : c >= q ? "full" : "") + '">' + esc(k) + " " + c + "/" + q + "</span>"; }).join("") + "</span>" : "")
      + (locked ? "" : '<input type="search" id="rvAddQ" placeholder="' + esc(t.addAny) + '" autocomplete="off" style="margin-left:auto">') + '<span class="cnt">' + recs.length + " / " + s.target + '</span></div><div id="rvAddList"></div>';
    if (!recs.length) h += '<div class="empty">' + esc(t.sampleEmpty) + (locked ? "" : "<br><small>" + esc(t.sampleEmptyHint) + "</small>") + "</div>";
    recs.sort(function (a, b) { return (a.added || "") < (b.added || "") ? -1 : 1; });
    recs.forEach(function (a, i) { h += auditCard(a, i + 1, locked); });
    return h + "</div>";
  }

  function auditCard(a, n, locked){
    var t = T(), ctx = ctxOf(a.clinic), c = ctx.byKey[a.custKey], e = evalRec(a), open = st.ui.open[a.key] === true || (st.ui.open[a.key] !== false && a.status !== "checked" && !locked);
    var j = c ? journey(c, ctx).filter(function (m) { return m.due <= Z.addDays(a.week, 6); }) : [], dis = locked ? " disabled" : "";
    var h = '<div class="rvcard' + (a.status === "checked" ? " checked" : "") + '" data-key="' + esc(a.key) + '">';
    h += '<div class="rvhead">' + (n ? '<span class="rvn">' + n + "</span>" : "") + '<div class="rvwho"><div class="tag">' + esc(a.tag || a.name) + '</div><div class="meta">' + esc(a.name) + ' · <span class="prodchip">' + esc(prodLabel(a.product)) + "</span>"
      + (c && c.dep ? " · " + esc(A.t().dep) + " " + esc(Z.fmtDM(c.dep)) : "") + (c && c.coll ? " · " + esc(A.t().coll) + " " + esc(Z.fmtDM(c.coll)) : "")
      + (c && c.phone ? (st.ui.phones[a.key] ? ' · <span class="mono">' + esc(c.phone) + "</span>" : ' · <button type="button" class="linkbtn" data-act="rv-phone" data-key="' + esc(a.key) + '">' + esc(t.showPhone) + "</button>") : "")
      + (a.due ? ' · <span class="pill p-accent">' + esc(a.due) + "</span>" : "") + (isExtra(a) ? ' · <span class="pill p-inert">' + esc(t.extra) + "</span>" : "") + "</div></div>"
      + '<div class="rvverdict">' + verdictPill(e.verdict) + (e.score !== null ? ' <b style="color:' + scoreColour(e.score) + '">' + e.score + "%</b>" : "") + (e.notFound ? ' <span class="pill p-bad">' + e.notFound + " " + esc(t.notFound) + "</span>" : "") + (a.status === "checked" ? ' <span class="pill p-ok">' + esc(t.checked) + "</span>" : "")
      + ' <button type="button" class="btn sm" data-act="rv-toggle" data-key="' + esc(a.key) + '" data-open="' + (open ? 0 : 1) + '">' + esc(open ? t.close : t.open) + "</button></div></div>";
    if (!open) return h + "</div>";
    h += '<div class="rvbody"><div class="rvjourney"><div class="rvjt">' + esc(t.journey) + "</div>";
    if (a.source && a.source.indexOf("sheet") === 0 && (a.missing || a.remark) && !Object.keys(a.marks || {}).length) h += '<div class="rvlegacy">' + (a.missing ? "<div>" + esc(a.missing) + "</div>" : "") + "</div>";
    j.forEach(function (m) {
      var bits = (a.marks || {})[m.stage], marked = bits !== undefined && bits !== "", db = daBits(ctx, c, m.stage), inWeek = m.due >= a.week && m.due <= Z.addDays(a.week, 6);
      var p = marked ? bitsPts(bits, m.items.length) : null, ds = daState(ctx, c, m);
      h += '<div class="rvms' + (inWeek ? " now" : "") + (marked ? (p === 1 ? " full" : p === 0 ? " none" : " part") : "") + '"><div class="rvmh"><b>' + esc(m.stage) + '</b><span class="d">' + esc(Z.fmtDM(m.due)) + "</span>"
        + (inWeek ? '<span class="pill p-accent">' + esc(t.thisWeekChip) + "</span>" : "") + (m.before ? '<span class="pill p-inert">' + esc(t.beforeLive) + "</span>" : "")
        + '<span class="pill ' + (db ? (ds === "sent" ? "p-ok" : "p-warn") : "p-inert") + '">' + esc(db ? t.daTicked + (ds === "partial" ? " ½" : "") : t.daNone) + "</span>"
        + (locked ? "" : '<span class="rvmq"><button type="button" class="btn sm" data-act="rv-all" data-key="' + esc(a.key) + '" data-stage="' + esc(m.stage) + '" data-v="1">' + esc(t.allSent) + '</button><button type="button" class="btn sm" data-act="rv-all" data-key="' + esc(a.key) + '" data-stage="' + esc(m.stage) + '" data-v="0">' + esc(t.noneSent) + "</button></span>") + "</div>";
      var cn = A.lang() === "zh" ? cnText(a.product, m.stage) : "";
      if (cn) h += '<div class="rvcn">' + esc(cn) + "</div>";
      h += '<div class="rvitems">' + m.items.map(function (it, i) {
        var on = marked && bits.charAt(i) === "1", dOn = db.charAt(i) === "1";
        return '<label class="rvit' + (on ? " on" : marked ? " off" : "") + (dOn && marked && !on ? " gap" : "") + '"><input type="checkbox" data-rvtick="' + esc(a.key) + '" data-stage="' + esc(m.stage) + '" data-i="' + i + '"' + (on ? " checked" : "") + dis + "> " + esc(itemLabel(it[0])) + (dOn ? ' <span class="da">DA ✓</span>' : "") + "</label>";
      }).join("") + "</div></div>";
    });
    if (!j.length) h += '<div class="empty">' + esc(t.notChecked) + "</div>";
    h += "</div>";
    h += '<div class="rvside"><textarea data-rvrem="' + esc(a.key) + '" placeholder="' + esc(t.remarkPh) + '"' + dis + ">" + esc(a.remark || "") + "</textarea>"
      + '<label class="rvflag"><input type="checkbox" data-rvdata="' + esc(a.key) + '"' + (a.data ? " checked" : "") + dis + "> " + esc(t.dataIssue) + "</label>"
      + '<div class="rvjt">' + esc(t.shots) + "</div>" + shotsHtml(a, !locked)
      + '<div class="rvrow">' + (locked ? "" : '<button type="button" class="btn ' + (a.status === "checked" ? "good" : "primary") + '" data-act="rv-check" data-key="' + esc(a.key) + '">' + esc(a.status === "checked" ? t.checked : t.markChecked) + "</button>")
      + '<span data-rvstat="' + esc(a.key) + '">' + statusHtml(a.key) + "</span>" + (a.checkedAt && !st.pending[a.key] ? '<span class="rvstat">' + esc(fmtWhen(a.checkedAt)) + "</span>" : "")
      + (locked ? "" : '<button type="button" class="btn sm danger" data-act="rv-remove" data-key="' + esc(a.key) + '" style="margin-left:auto">' + esc(t.remove) + "</button>") + "</div></div></div></div>";
    return h;
  }

  function dueList(week, locked){
    var t = T(), u = st.ui, ctx = ctxOf(), rows = [], stages = {}, PAGE = 20, extras = {}, inSample = {};
    recsOf(week).forEach(function (a) { if (isExtra(a)) extras[a.custKey] = a; else inSample[a.custKey] = 1; });
    ctx.cust.forEach(function (c) {
      if (c.exam || inSample[c.key]) return;
      var d = dueInWeek(c, week, ctx);
      if (!d.length && !u.showAllDue && !extras[c.key]) return;
      d.forEach(function (m) { stages[m.stage] = 1; });
      rows.push({ c: c, d: d, a: extras[c.key] || null });
    });
    var q = u.dueQ.trim().toLowerCase();
    rows = rows.filter(function (r) {
      if (u.dueStage && !r.d.some(function (m) { return m.stage === u.dueStage; })) return false;
      if (u.dueProd && r.c.product !== u.dueProd) return false;
      if (u.dueDa) { var any = r.d.some(function (m) { var s = daState(ctx, r.c, m); return u.dueDa === "sent" ? s !== "none" : s === "none"; }); if (!any) return false; }
      if (q && ((r.c.tag || "") + " " + r.c.name + " " + (r.c.phone || "")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    rows.sort(function (x, y) { return (y.a ? 1 : 0) - (x.a ? 1 : 0) || (x.d[0] ? x.d[0].si : 99) - (y.d[0] ? y.d[0].si : 99) || (x.c.coll || x.c.dep || "").localeCompare(y.c.coll || y.c.dep || ""); });
    var n = rows.length, pages = Math.max(Math.ceil(n / PAGE), 1); if (u.duePage >= pages) u.duePage = pages - 1;
    var h = '<div class="panel" id="rvDue"><h3>' + esc(t.due) + ' <span class="hint">' + esc(t.dueHint) + "</span></h3>";
    h += '<div class="fbar"><input type="search" id="rvDueQ" placeholder="' + esc(t.search) + '" value="' + esc(u.dueQ) + '">'
      + '<select data-rvsel="dueStage"><option value="">' + esc(t.allStages) + "</option>" + Object.keys(stages).sort(stageOrder).map(function (s) { return '<option value="' + esc(s) + '"' + (u.dueStage === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="dueProd"><option value="">' + esc(t.allProds) + "</option>" + ["MC", "Kính", "OK", "Atropine"].map(function (p) { return '<option value="' + p + '"' + (u.dueProd === p ? " selected" : "") + ">" + esc(prodLabel(p)) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="dueDa"><option value="">' + esc(t.allDa) + '</option><option value="sent"' + (u.dueDa === "sent" ? " selected" : "") + ">" + esc(t.daSent) + '</option><option value="none"' + (u.dueDa === "none" ? " selected" : "") + ">" + esc(t.daNot) + "</option></select>"
      + '<label class="hint" style="display:flex;gap:5px;align-items:center"><input type="checkbox" data-rvchk="showAllDue"' + (u.showAllDue ? " checked" : "") + "> " + esc(t.allCust) + "</label>"
      + '<span class="cnt">' + n + "</span></div>";
    if (!n) return h + '<div class="empty">' + esc(u.showAllDue || q ? t.noMatch : t.dueEmpty) + "</div></div>";
    rows.slice(u.duePage * PAGE, u.duePage * PAGE + PAGE).forEach(function (r) {
      var c = r.c;
      if (r.a) { h += auditCard(r.a, 0, locked); return; }
      h += '<div class="rvdue"><div><div class="tag">' + esc(c.tag || A.custLabel(c)) + '</div><div class="meta">' + esc(A.custLabel(c)) + ' · <span class="prodchip">' + esc(prodLabel(c.product)) + "</span>"
        + (c.coll ? " · " + esc(A.t().coll) + " " + esc(Z.fmtDM(c.coll)) : c.dep ? " · " + esc(A.t().dep) + " " + esc(Z.fmtDM(c.dep)) : "") + "</div>"
        + '<div class="rvdl">' + r.d.map(function (m) { var s = daState(ctx, c, m); return '<span class="pill ' + (s === "sent" ? "p-ok" : s === "partial" ? "p-warn" : "p-bad") + '">' + esc(m.stage) + " · " + esc(s === "sent" ? t.stSent : s === "partial" ? t.stPartial : t.stNone) + "</span>"; }).join(" ") + "</div></div>"
        + "<div>" + (locked ? "" : '<button type="button" class="btn sm" data-act="rv-mark" data-key="' + esc(c.key) + '">' + esc(t.mark) + "</button>") + "</div></div>";
    });
    if (pages > 1) h += '<div class="rvpager"><button type="button" class="btn sm" data-act="rv-duepage" data-d="-1"' + (u.duePage ? "" : " disabled") + '>‹</button><span class="hint">' + (u.duePage + 1) + " / " + pages + '</span><button type="button" class="btn sm" data-act="rv-duepage" data-d="1"' + (u.duePage + 1 < pages ? "" : " disabled") + ">›</button></div>";
    return h + "</div>";
  }
  function addListHtml(q){
    var t = T(), have = {}; recsOf(st.week).forEach(function (a) { have[a.custKey] = 1; });
    q = q.trim().toLowerCase(); if (!q) return "";
    var list = ctxOf().cust.filter(function (c) { return !have[c.key] && ((c.tag || "") + " " + c.name + " " + (c.phone || "")).toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
    if (!list.length) return '<div class="empty">' + esc(t.noMatch) + "</div>";
    return list.map(function (c) { return '<div class="rvdue"><div><div class="tag">' + esc(c.tag || A.custLabel(c)) + '</div><div class="meta">' + esc(A.custLabel(c)) + ' · <span class="prodchip">' + esc(prodLabel(c.product)) + '</span></div></div><div><button type="button" class="btn sm" data-act="rv-add" data-key="' + esc(c.key) + '">' + esc(t.mark) + "</button></div></div>"; }).join("");
  }

  function history(){
    var t = T(), u = st.ui, h = '<div class="panel"><h3 class="ph"><button type="button" class="foldbtn" data-act="rv-hist" aria-expanded="' + u.hist + '"><span class="chev">' + (u.hist ? "▾" : "▸") + "</span><span>" + esc(t.hist) + ' <span class="hint">' + esc(t.histHint) + "</span></span></button></h3>";
    if (!u.hist) return h + "</div>";
    h += '<div class="pad">' + weeksTable() + "</div>";
    var weeks = weeksList().reverse(), all = Object.keys(st.audits).map(function (k) { return st.audits[k]; }).filter(function (a) { return a.clinic === st.clinic; }), q = u.trQ.trim().toLowerCase(), stages = {};
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
    h += '<h3 style="border-top:1px solid var(--rule-2)">' + esc(t.entries) + ' <span class="hint">' + esc(fill(t.entriesHint, { n: list.length })) + "</span></h3>";
    h += '<div class="fbar"><input type="search" id="rvTrQ" placeholder="' + esc(t.search) + '" value="' + esc(u.trQ) + '">'
      + '<select data-rvsel="trWeek"><option value="">' + esc(t.allWeeks) + "</option>" + weeks.map(function (w) { return '<option value="' + esc(w) + '"' + (u.trWeek === w ? " selected" : "") + ">" + esc(wTag(w) + " · " + weekLabel(w)) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="trVerdict"><option value="">' + esc(t.allVerdicts) + "</option>" + ["pass", "partial", "fail", "data", "open", "noted"].map(function (v) { return '<option value="' + v + '"' + (u.trVerdict === v ? " selected" : "") + ">" + esc(T()["v" + v.charAt(0).toUpperCase() + v.slice(1)]) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="trProd"><option value="">' + esc(t.allProds) + "</option>" + ["MC", "Kính", "OK", "Atropine"].map(function (p) { return '<option value="' + p + '"' + (u.trProd === p ? " selected" : "") + ">" + esc(prodLabel(p)) + "</option>"; }).join("") + "</select>"
      + '<select data-rvsel="trStage"><option value="">' + esc(t.allStages) + "</option>" + Object.keys(stages).sort(stageOrder).map(function (s) { return '<option value="' + esc(s) + '"' + (u.trStage === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select>"
      + '<label class="hint" style="display:flex;gap:5px;align-items:center"><input type="checkbox" data-rvchk="trShots"' + (u.trShots ? " checked" : "") + "> " + esc(t.withShots) + "</label>"
      + '<button type="button" class="btn sm" data-act="rv-csv">' + esc(t.csv) + '</button><span class="cnt">' + list.length + "</span></div>";
    if (!list.length) h += '<div class="empty">' + esc(t.noEntries) + "</div>";
    list.slice(0, 200).forEach(function (a) {
      var e = evalRec(a);
      h += '<div class="rventry"><div class="rvhead"><div class="rvwho"><div class="tag">' + esc(a.tag || a.name) + '</div><div class="meta">' + esc(a.name) + ' · <span class="prodchip">' + esc(prodLabel(a.product)) + "</span> · " + esc(wTag(a.week)) + " " + esc(weekLabel(a.week)) + (a.due ? ' · <span class="pill p-accent">' + esc(a.due) + "</span>" : "") + (isExtra(a) ? ' · <span class="pill p-inert">' + esc(t.extra) + "</span>" : "") + "</div></div>"
        + '<div class="rvverdict">' + verdictPill(e.verdict) + (e.score !== null ? ' <b style="color:' + scoreColour(e.score) + '">' + e.score + "%</b>" : "") + (e.notFound ? ' <span class="pill p-bad">' + e.notFound + " " + esc(t.notFound) + "</span>" : "") + ' <button type="button" class="btn sm" data-act="rv-week" data-w="' + esc(a.week) + '">' + esc(t.openWeek) + "</button></div></div>";
      if (e.found || e.missing || a.missing) h += '<div class="rvsum">' + (e.found ? "<div>✓ " + esc(e.found) + "</div>" : "") + (e.missing || a.missing ? '<div class="miss">✗ ' + esc((e.missing || a.missing).replace(/\n/g, " · ")) + "</div>" : "") + "</div>";
      if (a.remark) h += '<div class="rvrem">' + esc(a.remark) + "</div>";
      if (shotsOf(a).length) h += shotsHtml(a, false);
      h += "</div>";
    });
    return h + "</div>";
  }
  function csv(){
    var rows = [["week", "clinic", "tag", "customer", "product", "da", "due", "source", "status", "verdict", "score", "items_sent", "items_possible", "found", "missing", "da_ticked_not_found", "remark", "data_issue", "screenshots", "checked_at"]];
    Object.keys(st.audits).map(function (k) { return st.audits[k]; }).filter(function (a) { return a.clinic === st.clinic; }).sort(function (x, y) { return x.week < y.week ? -1 : x.week > y.week ? 1 : 0; }).forEach(function (a) {
      var e = evalRec(a);
      rows.push([a.week, a.clinic, a.tag, a.name, a.product, a.da, a.due, a.source || "", a.status, e.verdict, e.score === null ? "" : e.score, e.items.on, e.items.n, e.found, e.missing || a.missing || "", e.notFound, a.remark || "", a.data ? "Y" : "", shotsOf(a).map(function (s) { return s.url || s.file; }).join(" "), a.checkedAt || ""]);
    });
    var text = "﻿" + rows.map(function (r) { return r.map(function (v) { v = String(v === undefined || v === null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n");
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "zalo-sop-audit-" + st.clinic + "-" + A.today() + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function pageCrm(){ return '<div class="note"><p>' + esc(T().crmHint) + "</p></div>" + A.pageMembers(); }

  /* ------------------------------------------------------------------ events */
  R.after = function () {
    var q = $("rvAddQ"); if (q) q.oninput = function () { var l = $("rvAddList"); if (l) l.innerHTML = addListHtml(q.value); };
    var dq = $("rvDueQ"); if (dq) dq.oninput = function () { st.ui.dueQ = dq.value; st.ui.duePage = 0; var p = $("rvDue"); if (p) { p.outerHTML = dueList(st.week, isLocked(st.week)); R.after(); var n = $("rvDueQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } };
    var tq = $("rvTrQ"); if (tq) tq.oninput = function () { st.ui.trQ = tq.value; R.render(); var n = $("rvTrQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
    document.querySelectorAll("textarea[data-rvrem]").forEach(function (ta) { ta.oninput = function () { var a = st.audits[ta.dataset.rvrem]; if (!a) return; a.remark = ta.value; save(a); }; });
    document.querySelectorAll("input[data-rvupl]").forEach(function (inp) { inp.onchange = function () { var a = st.audits[inp.dataset.rvupl]; if (a) addShots(a, inp.files); }; });
    document.querySelectorAll("img.ph[data-shot]").forEach(function (img) { shotSrc(img.dataset.shot); });
  };
  R.render = function () { A.render(); };
  function goWeek(w){ if (w > thisWeek()) return; st.week = monday(w); st.ui.duePage = 0; R.render(); window.scrollTo(0, 0); }
  function guard(){ if (isLocked(st.week)) { A.toast(T().locked, true); return true; } return false; }

  R.click = function (act, el) {
    var a;
    switch (act) {
      case "rv-week": goWeek(el.dataset.w); return true;
      case "rv-view": st.ui.view = el.dataset.v; R.render(); return true;
      case "rv-src": st.ui.src = el.dataset.v; R.render(); return true;
      case "rv-hist": st.ui.hist = !st.ui.hist; R.render(); return true;
      case "rv-draw": if (guard()) return true; draw(st.week, +el.dataset.n || 1); R.render(); return true;
      case "rv-add": case "rv-mark": { if (guard()) return true; var c = cust(el.dataset.key); if (c) { addToSample(c, st.week, act === "rv-mark" ? "extra" : "manual"); R.render(); if (act === "rv-add") { var p = $("rvSample"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); } } return true; }
      case "rv-remove": if (guard()) return true; a = st.audits[el.dataset.key]; if (a) { removeFromSample(a); R.render(); } return true;
      case "rv-toggle": st.ui.open[el.dataset.key] = el.dataset.open === "1"; R.render(); return true;
      case "rv-phone": st.ui.phones[el.dataset.key] = true; R.render(); return true;
      case "rv-all": if (guard()) return true; a = st.audits[el.dataset.key]; if (a) { var ctx = ctxOf(a.clinic), c2 = ctx.byKey[a.custKey], m = c2 ? journey(c2, ctx).filter(function (x) { return x.stage === el.dataset.stage; })[0] : null; if (m) { a.marks = a.marks || {}; a.marks[m.stage] = m.items.map(function () { return el.dataset.v; }).join(""); save(a); R.render(); } } return true;
      case "rv-check": if (guard()) return true; a = st.audits[el.dataset.key]; if (a) { a.status = a.status === "checked" ? "sampled" : "checked"; a.checkedAt = a.status === "checked" ? nowIso() : ""; st.ui.open[a.key] = a.status !== "checked"; save(a); R.render(); } return true;
      case "rv-fb-save": { if (guard()) return true; var ta = $("rvFb"); if (ta) saveFeedback(st.week, ta.value); return true; }
      case "rv-complete": completeWeek(st.week); return true;
      case "rv-reopen": if (weekStatus(st.week) === "submitted" && window.confirm(T().reopenAsk)) setWeekStatus(st.week, "marking"); return true;
      case "rv-duepage": st.ui.duePage = Math.max(0, st.ui.duePage + (+el.dataset.d)); R.render(); return true;
      case "rv-csv": csv(); return true;
      case "rv-shot-del": if (guard()) return true; a = st.audits[el.dataset.key]; if (a) removeShot(a, el.dataset.id); return true;
      case "rv-shot-open": { var src = st.blobs[el.dataset.id]; if (!src) return true; var w = window.open(); if (w) { w.document.write('<img src="' + src + '" style="max-width:100%">'); } return true; }
    }
    return false;
  };
  R.change = function (el) {
    if (el.dataset.rvtick) { if (guard()) { R.render(); return true; } var a = st.audits[el.dataset.rvtick], ctx = a && ctxOf(a.clinic), c = a && ctx.byKey[a.custKey], m = c ? journey(c, ctx).filter(function (x) { return x.stage === el.dataset.stage; })[0] : null; if (!m) return true;
      a.marks = a.marks || {}; var bits = (a.marks[m.stage] || "").split(""); while (bits.length < m.items.length) bits.push("0"); bits[+el.dataset.i] = el.checked ? "1" : "0"; a.marks[m.stage] = bits.join(""); save(a); R.render(); return true; }
    if (el.dataset.rvdata) { if (guard()) { R.render(); return true; } var b = st.audits[el.dataset.rvdata]; if (b) { b.data = el.checked ? 1 : 0; save(b); R.render(); } return true; }
    if (el.dataset.rvsel) { st.ui[el.dataset.rvsel] = el.value; st.ui.duePage = 0; R.render(); return true; }
    if (el.dataset.rvchk) { st.ui[el.dataset.rvchk] = el.checked; st.ui.duePage = 0; R.render(); return true; }
    return false;
  };

  /* ------------------------------------------------------------------ demo (in memory, mirrors the script) */
  R.demo = {
    load: function (daDemo) {
      var saved = A.store("zalo_demo_rv"), d = null;
      if (saved) { try { d = JSON.parse(saved); if (d.today !== daDemo.today || d.v !== 2) d = null; } catch (e) { d = null; } }
      if (!d) d = { v: 2, role: "reviewer", reviewer: "CZ", name: "ChenZhong", today: daDemo.today, clinics: { NGT: { customers: daDemo.customers, das: daDemo.das, cadence: [], tasks: daDemo.tasks, settings: daDemo.settings } },
                    audits: [], weekly: [], shots: [], settings: { NGT: { sample_size: "15", start_week: Z.addDays(Z.weekBounds(daDemo.today).start, -14) } }, cadenceCN: [] };
      A.store("zalo_demo_rv", JSON.stringify(d)); return d;
    },
    save: function () { var d = st.data; if (!d) return; d.audits = Object.keys(st.audits).map(function (k) { return st.audits[k]; }); d.weekly = Object.keys(st.weekly).map(function (k) { return st.weekly[k]; }); d.shots = Object.keys(st.shots).map(function (k) { return st.shots[k]; }); try { A.store("zalo_demo_rv", JSON.stringify(d)); } catch (e) {} },
    get: function (p) { if (p && p.action === "shot") return { ok: 1, id: p.id, mime: "image/png", data: (st.blobs[p.id] || "").split(",")[1] || "" }; R.demo.save(); return st.data; },
    post: function (b) {
      switch (b.action) {
        case "auditSave": case "auditRemove": case "feedbackSave": case "shotRemove": R.demo.save(); return { ok: 1, local: true };
        case "weekStatus": R.demo.save(); return { ok: 1, local: true, status: b.status, emailed: 0 };
        case "shotUpload": R.demo.save(); return { ok: 1, local: true, id: b.shot.id, url: "", file: b.shot.name, uploaded: nowIso() };
      }
      throw new Error("unknown action");
    }
  };

  R.init = function (hooks) { A = hooks; };
  return R;
})();
