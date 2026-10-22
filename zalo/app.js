/* DA Zalo Dashboard — the page: sign-in, screens, API calls. All rules live in core.js.
   See zalo/README.md. */
(function () {
  "use strict";
  var Z = window.ZALO, DEMO = window.ZALO_DEMO, RV = window.ZALO_REVIEW;
  /* Paste the Apps Script /exec URL here after deploying (README §2.10). ?api=<url> and the
     "Connect" box on the sign-in card override it for testing. */
  var API = { url: "https://script.google.com/macros/s/AKfycbwselLgmfAg8ffK5IqBpXVvY8Ppqv2hDNCOStNABLLNfSalUvx5UKR7GC6LIxKuVEO9kg/exec" };
  var VERSION = "1.4.0";

  /* ------------------------------------------------------------------ strings */
  var L = {
    vi: {
      brand: "DA Zalo Dashboard", sub: "{c} · {d}", glede: "Đăng nhập bằng tên đăng nhập của phòng khám, ví dụ NGT_DA1.", luser: "Tên đăng nhập", lpass: "Mật khẩu",
      signin: "Đăng nhập", signingin: "Đang đăng nhập…", badlogin: "Tên đăng nhập hoặc mật khẩu không đúng.", neterr: "Không kết nối được với Google Sheets: {e}",
      demo: "Xem bản demo (dữ liệu giả)", adv: "Kết nối script (nâng cao)", lapi: "Địa chỉ Apps Script (/exec)", apiHint: "Chỉ cần nhập một lần trên mỗi thiết bị. Để trống để dùng địa chỉ đã cài sẵn.",
      noapi: "Chưa kết nối Google Sheets. Triển khai script theo hướng dẫn trong README rồi dán địa chỉ /exec vào mục nâng cao, hoặc xem bản demo.",
      pickTitle: "Bạn là ai?", pickLede: "Chọn tên của bạn. Thiết bị này sẽ ghi nhớ.", kh: "khách",
      feedLive: "Đã kết nối · đọc lúc {t}", feedDemo: "Bản demo · dữ liệu giả", feedFailed: "Không đọc được sheet", feedLoading: "Đang đọc sheet…", feedOffline: "Chưa kết nối",
      signout: "Đăng xuất", switchWho: "Không phải bạn?", reload: "Tải lại",
      rel: { "Mẹ": "Mẹ", "Ba": "Ba", "Ông ngoại": "Ông ngoại", "Bà ngoại": "Bà ngoại", "Ông nội": "Ông nội", "Bà nội": "Bà nội", "Cô": "Cô", "Dì": "Dì", "Chú": "Chú", "Khác": "Khác" },
      aZaloAdded: "Đã kết bạn Zalo", iConfirmM: "Ghi {n} khách đã có Zalo", iNewHint2: "chưa có trong CRM · tick những khách đã kết bạn Zalo rồi điền phần còn thiếu; khách không tick sẽ vào danh sách chưa kết bạn Zalo",
      tSkipped: "Đã giữ nguyên tag", iUndoWrite: "Hoàn tác lần ghi này", aUndo: "Hoàn tác (xoá khách vừa ghi)", undoneRow: "Đã hoàn tác: dòng vừa ghi đã được xoá", undoneImport: "Đã hoàn tác lần ghi", collUndone: "Đã bỏ ngày nhận kính",
      iLibFail: "Không tải được bộ đọc Excel. Thử lại, hoặc lưu tab SO TTKSCT thành .csv rồi tải lên.", iReading: "Đang đọc {f}… (file lớn có thể mất tới một phút)",
      iRepeatOf: "mua lại · lần trước nhận {d}", iTagAfterTick: "gợi ý sau khi tick Đã kết bạn Zalo", iAlsoColl: "Cùng file này: {n} khách cần xác nhận ngày nhận kính →", iReadAs: "Đã đọc được — tab: {tabs} · dòng đầu: {row}", iAlsoNew: "Cùng file này: {n} khách mới →",
      nav: { overview: "Tổng quan", add: "Thêm khách", collections: "Nhận kính", members: "Danh sách khách", legacy: "Chưa kết bạn Zalo", resources: "Tài liệu" },
      r: { title: "Tài liệu đào tạo", hint: "Slide buổi đào tạo MSG mỗi tuần, theo ngôn ngữ đang chọn — lật từng trang hoặc tải file gốc.", week: "Tuần {n}", slide: "{i} / {n}", download: "Tải .pptx", full: "Toàn màn hình", close: "Đóng", loading: "Đang tải danh sách…", none: "Chưa có tài liệu.", failed: "Không tải được danh sách tài liệu.", noLang: "Tuần này chưa có bản {l}, đang hiện bản {o}.", prev: "Trang trước", next: "Trang sau" },
      g: { btn: "Hướng dẫn", title: "Hướng dẫn sử dụng", version: "Phiên bản {v}", hello: "Chào {da}!", welcome: "Đây là bảng việc Zalo của bạn: tin cần gửi hôm nay, khách mới từ báo cáo QK và ngày nhận kính — tất cả ở một chỗ, tự ghi vào CRM.",
        startTour: "Xem hướng dẫn từng bước", later: "Để sau", gotit: "Đã hiểu", tourThis: "Dẫn trang này", next: "Tiếp", back: "Lại", done: "Xong", skip: "Thoát", stepOf: "Bước {i}/{n}", routineTitle: "Việc mỗi ngày",
        routine: ["Mở Tổng quan: nhìn 3 ô số rồi làm mục Hôm nay — mỗi khách một tin, gửi xong bấm ✓.", "Gửi hàng loạt: cùng một mẫu tin cho cả nhóm — chọn tất cả, gửi, bấm Đã gửi.", "Quá hạn: trễ dưới 1 tuần vẫn gửi bình thường; cũ hơn 2 tuần được gấp lại, mở khi cần.", "Cứ 2–3 ngày: tải báo cáo QK ở Thêm khách (khách mới), rồi sang Nhận kính (xác nhận ngày nhận).", "Khách nhận kính: tick ở Nhận kính, đổi tag N→Y trong Zalo rồi bấm xác nhận.", "Bấm nhầm? Mọi thao tác đều có Hoàn tác trong vài giây."],
        pages: { resources: ["Slide đào tạo MSG mỗi tuần, tuần mới nhất ở trên; bản hiện ra theo ngôn ngữ đang chọn (VI/EN/中文), đổi được bằng nút trên mỗi tuần.", "Lật trang bằng mũi tên, vuốt, hoặc phím ←/→; Toàn màn hình để xem lớn.", "Tải .pptx để lưu file gốc về máy."], overview: ["3 ô số: hôm nay đã gửi / phải gửi · trễ trong tuần · nhóm gửi hàng loạt đã xong.", "Hôm nay (chăm sóc kỹ): từng khách với nội dung ghi sẵn; bấm ✓ khi gửi xong, tick từng mục nếu gửi dở.", "Tuần này: việc sắp tới để chủ động.", "Gửi hàng loạt (nhẹ): cùng mốc, cùng nội dung — chọn tất cả → Đã gửi; Sao chép tên để tìm nhanh trong Zalo.", "Quá hạn: ân hạn 1 tuần; cũ hơn 2 tuần được gấp lại."],
          add: ["Thêm từng khách: tên bé, phụ huynh, quan hệ, SĐT, sản phẩm, ngày cọc; tag Zalo tự gợi ý; tick “Chưa kết bạn Zalo” nếu chưa add được — khách vào danh sách chờ.", "Nhập từ báo cáo QK: tải file .xlsx (hoặc tab SO TTKSCT dạng .csv) 2–3 ngày một lần; khách mới hiện theo ngày cọc mới nhất.", "Tick “Đã kết bạn Zalo” → tag được gợi ý → bổ sung phần thiếu → Ghi. Khách không tick sẽ sang danh sách Chưa kết bạn Zalo.", "Mua lại (cùng bé, cùng SĐT, cọc sau lần nhận trước) hiện như khách mới kèm nhãn “mua lại”; ghi sẽ tạo dòng mới và lịch chăm sóc bắt đầu lại."],
          collections: ["Chờ nhận kính: mọi khách có ngày cọc nhưng chưa có ngày nhận; tick + chọn ngày + Lưu khi khách đã lấy kính.", "Cập nhật tag: sau khi nhận kính, trang đề xuất tag N→Y (hoặc tag & cho anh em) — đổi tên trong Zalo trước, rồi bấm xác nhận để ghi vào sheet.", "Cập nhật từ báo cáo QK: cùng file đã tải, các khách báo cáo ghi DONE — kiểm tra rồi Ghi."],
          members: ["Tìm theo tên, tag, SĐT hoặc tên phụ huynh — lọc ngay khi gõ.", "Lọc theo sản phẩm, Cần sửa (thiếu dữ liệu) hoặc Chưa có tag; lọc theo ngày cọc / ngày nhận; sắp xếp.", "Bấm vào khách để xem chi tiết, lịch chăm sóc và sửa thông tin; sửa tag sẽ đi qua Cập nhật tag."],
          legacy: ["Khách chưa kết bạn Zalo (kể cả khách cũ trước CRM), gom theo tháng; mỗi tháng gấp/mở được.", "Khi đã add Zalo: bấm Thêm vào CRM (form điền sẵn) hoặc Ẩn nếu không theo nữa.", "Đơn mua lại của khách cũ nằm riêng với nút Bắt đầu chu kỳ mới."] },
        steps: { "rs-week": ["Tuần đào tạo", "Mỗi tuần một khung, tuần mới nhất mở sẵn; bấm tiêu đề để gấp hoặc mở."], "rs-view": ["Lật trang", "Mũi tên, vuốt hoặc phím ←/→. Bấm vào slide để sang trang sau."], "rs-dl": ["Ngôn ngữ và tải về", "Bản hiện theo ngôn ngữ đang chọn; đổi tại đây. Tải .pptx để lưu file gốc; Toàn màn hình để xem lớn."], "ov-tiles": ["Ba ô số", "Hôm nay đã gửi / phải gửi · trễ trong tuần · nhóm gửi hàng loạt đã xong. Xanh là ổn."], "ov-over": ["Quá hạn", "Bấm để mở. Trễ dưới 1 tuần vẫn gửi bình thường; cũ hơn 2 tuần gấp lại phía dưới."], "ov-today": ["Hôm nay", "Mỗi thẻ là một khách với nội dung cần gửi. Gửi xong bấm ✓; gửi dở thì tick từng mục. Bấm ✓ lần nữa để hoàn tác."], "ov-up": ["Tuần này", "Việc của các ngày tới, để bạn chủ động."], "ov-mass": ["Gửi hàng loạt", "Cùng mốc, cùng nội dung: chọn tất cả → Đã gửi. Sao chép tên để dán vào ô tìm kiếm Zalo."],
          "ad-form": ["Thêm từng khách", "Điền tên bé, SĐT, sản phẩm, ngày cọc — tag Zalo tự gợi ý. Chưa add được Zalo thì tick “Chưa kết bạn Zalo”."], "ad-imp": ["Nhập từ báo cáo QK", "2–3 ngày một lần: tải file QK lên, khách mới hiện ở đây, mới nhất trước."], "ad-drop": ["Chọn file", "File .xlsx như tải về, hoặc tab SO TTKSCT lưu .csv. Khoảng ngày là tuỳ chọn."], "ad-tick": ["Đã kết bạn Zalo", "Tick khách bạn đã add → tag được gợi ý → bổ sung phần thiếu → Ghi. Không tick sẽ sang danh sách chờ."],
          "co-pend": ["Chờ nhận kính", "Khách đã lấy kính: tick, chọn ngày, Lưu. Lịch chăm sóc chuyển sang các mốc sau nhận."], "co-tags": ["Cập nhật tag", "Đổi tên trong Zalo trước (N→Y), rồi bấm xác nhận — lúc đó sheet mới được ghi."], "co-imp": ["Cập nhật từ báo cáo QK", "Cùng file đã tải: khách báo cáo ghi DONE được tick sẵn — kiểm tra rồi Ghi."],
          "me-search": ["Tìm khách", "Gõ tên, tag, SĐT hoặc tên phụ huynh."], "me-chips": ["Bộ lọc", "Theo sản phẩm, Cần sửa, Chưa có tag."], "me-date": ["Ngày và sắp xếp", "Lọc theo ngày cọc hoặc ngày nhận; sắp xếp theo mới nhất, tên, ngày."], "me-row": ["Thẻ khách", "Bấm vào để xem chi tiết, lịch chăm sóc và sửa thông tin."],
          "lg-list": ["Chưa kết bạn Zalo", "Gom theo tháng; bấm tiêu đề tháng để gấp hoặc mở."], "lg-add": ["Thêm vào CRM", "Khi khách đã add Zalo: bấm để mở form điền sẵn. Ẩn nếu không theo nữa."], "lg-rep": ["Mua lại", "Đơn mới của khách cũ: Bắt đầu chu kỳ mới."] } },
      aSection: "Thêm từng khách", iTitleM: "Nhập khách mới từ báo cáo QK", iTitleC: "Cập nhật ngày nhận kính từ báo cáo QK", iChange: "Đổi file", iLoaded: "File {f} · {n} đơn từ {d}",
      iWhy: { same: "đã có trong CRM", expected: "chưa DONE (chỉ có ngày hẹn)", parked: "đã ở danh sách chưa kết bạn Zalo", parkedOther: "đã ở danh sách chưa kết bạn Zalo", dup: "trùng trong file", done: "đã nhập lần trước", dismissed: "đã ẩn", update: "ngày nhận đã ghi", "update-checkphone": "ngày nhận đã ghi" },
      iResultM: "Đã ghi {a} khách mới · {p} để ở danh sách chưa kết bạn Zalo · {e} lỗi", iResultC: "Đã ghi {c} ngày nhận kính · {e} lỗi", iNothing: "Không có dòng nào cho mục này trong file.",
      mDate: "Lọc theo", mDep: "ngày cọc", mColl: "ngày nhận", mFrom: "từ", mTo: "đến", mSort: "Sắp xếp", sortNew: "Mới nhất", sortName: "Tên A→Z", sortDep: "Ngày cọc", sortColl: "Ngày nhận", mClear: "Bỏ lọc",
      tToday: "Hôm nay", tTodayX: "{d}/{n} high touch đã gửi", tMissed: "Bỏ lỡ cá nhân", tMissedX: "high touch quá hạn chưa gửi", tMass: "Gửi hàng loạt", tMassX: "{g}/{G} nhóm · {p}/{P} khách tuần này",
      secOverdue: "Quá hạn", overdueHint: "chưa gửi, cũ nhất trước", secToday: "Đến hạn hôm nay", todayHint: "high touch · gửi riêng từng khách", secUp: "Sắp tới trong tuần", upHint: "high touch · từ ngày mai đến Chủ nhật",
      secMass: "Gửi hàng loạt tuần này", massHint: "low touch · gửi chung cả nhóm, bất kỳ lúc nào trong tuần", secDone: "Đã gửi hôm nay",
      perfect: "Xong hết việc hôm nay. Tuyệt vời!", nothingToday: "Hôm nay không có việc high touch nào.", nothingUp: "Không còn việc nào trong tuần.", nothingMass: "Tuần này không có nhóm gửi hàng loạt.",
      nothingOver: "Không có việc quá hạn. Rất tốt.", showOlder: "Xem {n} việc cũ hơn", hideOlder: "Ẩn việc cũ", late: "trễ", overdueBy: "trễ {n} ngày", dueOn: "hạn {d}", opens: "mở từ {d}", dep: "cọc", coll: "nhận", noDate: "chưa có ngày",
      undo: "Hoàn tác", markSent: "Đã gửi ({n})", selectAll: "Chọn tất cả", copyNames: "Sao chép tên", copied: "Đã sao chép {n} tên", sentToast: "Đã ghi {n} tin đã gửi", undoneToast: "Đã hoàn tác", errToast: "Không ghi được: {e}",
      massDone: "Nhóm này đã gửi xong", sendBtn: "Gửi xong", high: "High touch", low: "Low touch", missedMass: "mass send bỏ lỡ", sendTo: "Gửi cho {n} khách", mins: "mỗi khách",
      search: "Tìm tên, số điện thoại hoặc tag…", fAll: "Tất cả", fFix: "Cần sửa", fNoTag: "Chưa có tag", fExam: "Khám", showing: "{a}/{b}", noCust: "Không có khách nào.",
      lPhone: "Điện thoại", lProduct: "Sản phẩm", lDA: "Trợ lý", lDep: "Ngày đặt cọc", lColl: "Ngày nhận kính", lStatus: "Trạng thái", lTag: "Zalo tag", lNote: "Ghi chú", lParent: "Phụ huynh", lRel: "Quan hệ", lGender: "Giới tính", lDob: "Ngày sinh", lRow: "Dòng", lKid2: "Bé thứ 2",
      timeline: "Lịch chăm sóc", edit: "Sửa", save: "Lưu", saving: "Đang lưu…", saved: "Đã lưu", cancel: "Huỷ", close: "Đóng", pendingTag: "Tag mới đang chờ đổi trên Zalo", tagChangeNote: "Tag mới sẽ vào mục Đổi tag; sheet chỉ đổi sau khi bạn đổi trên Zalo và xác nhận.",
      fix: { nodates: "Thiếu ngày cọc và ngày nhận", notag: "Chưa có Zalo tag", nophone: "Thiếu số điện thoại", noprod: "Sản phẩm không rõ", future: "Ngày nhận kính ở tương lai", badtag: "Tag không đọc được" },
      stSent: "đã gửi", stPartial: "gửi một phần", stMissed: "bỏ lỡ", stToday: "hôm nay", stUp: "sắp tới", stOpen: "đang mở",
      addTitle: "Thêm khách mới", aChild: "Tên bé", aGender: "Giới tính", aParent: "Tên phụ huynh", aRel: "Quan hệ với bé", aDob: "Ngày sinh", aDep: "Ngày đặt cọc", aNA: "Chưa chuyển đổi / không áp dụng",
      aColl: "Ngày nhận kính", aProduct: "Sản phẩm", aTag: "Zalo tag", aTagHint: "Gợi ý theo quy ước; sửa được.", aNoZalo: "Chưa kết bạn Zalo / không có tag", aNote: "Ghi chú", aSubmit: "Ghi khách mới", aSubmitting: "Đang ghi…",
      aRecorded: "Đã ghi khách mới", aRecordedX: "{n} đã vào CRM form, dòng {r}.", aParked: "Đã lưu vào danh sách chưa kết bạn Zalo", aParkedX: "{n} sẽ nằm ở danh sách Chưa kết bạn Zalo cho đến khi có tag.", aAnother: "Thêm khách khác", aBack: "Về việc hôm nay",
      req: "bắt buộc", genders: { "": "—", "Nam": "Nam", "Nữ": "Nữ" }, other: "Khác", relText: "Ghi rõ (ví dụ: Cô Lan)", today: "hôm nay", dupWarn: "Khách này hình như đã có trong CRM (dòng {r}).",
      pTitle: "Chờ nhận kính", pHint: "đã đặt cọc, chưa có ngày nhận", pCollected: "Đã nhận", pSubmit: "Ghi", pExpected: "QK hẹn {d}", pNone: "Không có khách nào đang chờ nhận kính.", pDone: "Đã ghi ngày nhận kính cho {n}.",
      tTitle: "Đổi tag Zalo", tHint: "đổi trên điện thoại trước, rồi xác nhận để sheet cập nhật", tOld: "Tag hiện tại", tNew: "Tag mới", tCopy: "Sao chép", tConfirm: "Đã đổi trên Zalo", tSkip: "Giữ nguyên", tNone: "Không có tag nào cần đổi.",
      tWhyNY: "đã nhận kính, tag còn N", tWhySib: "thêm bé thứ 2 cùng Zalo", tWhyEdit: "bạn đã sửa tag", tConfirmed: "Đã cập nhật tag trong sheet",
      iTitle: "Nhập báo cáo QK", iHint: "tải file QK NGT Daily report (.xlsx) hoặc tab SO TTKSCT dạng .csv", iDrop: "Bấm để chọn file, hoặc kéo thả vào đây", iFrom: "Từ ngày", iTo: "Đến ngày", iRangeHint: "Tuỳ chọn. Lấy đơn có ngày đặt hoặc ngày hẹn trong khoảng.",
      iParsing: "Đang đọc file…", iFound: "{n} đơn trong tab “{s}” (sau {c} bỏ qua vì trước {d})", iNoSheet: "Không thấy tab SO TTKSCT hay tab có cột Ngày Đặt / Ngày Hẹn / Mã Đơn Hàng…", iBadFile: "Không đọc được file: {e}",
      iNew: "Khách mới", iNewHint: "chưa có trong CRM · điền phần còn thiếu, tick để ghi", iColl: "Cập nhật ngày nhận kính", iCollHint: "khách đã có trong CRM, QK báo DONE", iRepeat: "Mua lại", iRepeatHint: "khách đã có ngày nhận trước đó", iInfo: "Không cần làm gì",
      iInfoHint: "đã có trong CRM với cùng thông tin, hoặc chưa DONE", iSibling: "cùng SĐT với {n}", iCheckPhone: "SĐT khác với CRM ({p})", iSeen: "đã nhập lần trước", iChanged: "có thay đổi", iFuture: "ngày nhận ở tương lai — kiểm tra",
      iConfirm: "Ghi {n} dòng đã chọn", iSubmitting: "Đang ghi…", iDone: "Đã ghi xong", iDoneX: "{a} khách mới · {c} ngày nhận · {p} để ở Chưa kết bạn Zalo · {e} lỗi", iNoneSel: "Chưa chọn dòng nào", iAgain: "Nhập file khác", iToTasks: "Về việc hôm nay",
      iPick: "— chọn —", iSteps: ["Chọn file", "Kiểm tra", "Ghi vào sheet"], iDismiss: "Bỏ qua", iCutoff: "Đơn trước {d} không được nhập (cài đặt import_cutoff).", iExpectedOnly: "chỉ cập nhật ngày hẹn", iLibLoading: "Đang tải bộ đọc Excel…",
      lTitle: "Chưa kết bạn Zalo", lHint: "khách chưa kết bạn Zalo, chưa có trong CRM · nhóm theo tháng nhận kính", lAdd: "Thêm vào CRM", lDismiss: "Ẩn", lRestore: "Khôi phục", lShowDismissed: "Xem đã ẩn ({n})", lHideDismissed: "Ẩn danh sách đã ẩn",
      lRepeat: "Mua lại", lRepeatHint: "đơn mới của khách đã có trong CRM", lStartNew: "Tạo chu kỳ mới", lUpcoming: "Sắp đến", lNone: "Danh sách trống. Tải báo cáo QK ở trang Thêm khách để lấy khách chưa kết bạn Zalo.", lNoColl: "Chưa nhận kính", lManual: "nhập tay",
      prod: { MC: "MC", "Kính": "Kính", OK: "Ortho-K", Atropine: "Atropine", Exam: "Khám" }, months: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"], days: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
      foot: "Ngày đến hạn tính từ ngày đặt cọc (K) và ngày nhận kính (L) trong CRM form. Mọi thay đổi ở đây được ghi vào Google Sheet và lưu lại trong DA_Log. Phiên bản {v}.",
      setupTitle: "Chưa kết nối Google Sheets", confettiMsg: "🎉 Xong hết việc hôm nay!", demoWrite: "Bản demo: thay đổi chỉ lưu trên trình duyệt này.", notConnected: "Chưa kết nối sheet: không ghi được."
    },
    en: {
      brand: "DA Zalo Dashboard", sub: "{c} · {d}", glede: "Sign in with your clinic's username, e.g. NGT_DA1.", luser: "Username", lpass: "Password",
      signin: "Sign in", signingin: "Signing in…", badlogin: "Incorrect username or password.", neterr: "Could not reach Google Sheets: {e}",
      demo: "Try the demo (sample data)", adv: "Connect the script (advanced)", lapi: "Apps Script address (/exec)", apiHint: "Needed once per device. Leave empty to use the built-in address.",
      noapi: "Google Sheets is not connected yet. Deploy the script as described in the README and paste its /exec address under Advanced, or try the demo.",
      pickTitle: "Who are you?", pickLede: "Pick your name. This device will remember it.", kh: "customers",
      feedLive: "Connected · read at {t}", feedDemo: "Demo · sample data", feedFailed: "Sheets unreachable", feedLoading: "Reading the sheets…", feedOffline: "Not connected",
      signout: "Sign out", switchWho: "Not you?", reload: "Reload",
      rel: { "Mẹ": "Mother", "Ba": "Father", "Ông ngoại": "Maternal grandfather", "Bà ngoại": "Maternal grandmother", "Ông nội": "Paternal grandfather", "Bà nội": "Paternal grandmother", "Cô": "Aunt (father's side)", "Dì": "Aunt (mother's side)", "Chú": "Uncle", "Khác": "Other" },
      aZaloAdded: "Zalo added", iConfirmM: "Write {n} members with Zalo", iNewHint2: "not in the CRM · tick the ones you have on Zalo and complete their details; the rest go to the No Zalo Add List",
      tSkipped: "Tag kept as is", iUndoWrite: "Undo this write", aUndo: "Undo (remove the row just written)", undoneRow: "Undone: the row just written was cleared", undoneImport: "The write was undone", collUndone: "Collected date removed",
      iLibFail: "The Excel reader could not be loaded. Try again, or save the SO TTKSCT tab as .csv and upload that.", iReading: "Reading {f}… (a large file can take up to a minute)",
      iRepeatOf: "repeat purchase · last collected {d}", iTagAfterTick: "suggested once Zalo added is ticked", iAlsoColl: "Same file: {n} collection confirmations →", iReadAs: "What was read — tabs: {tabs} · first row: {row}", iAlsoNew: "Same file: {n} new members →",
      nav: { overview: "Overview", add: "Add members", collections: "Glass collections", members: "Member list", legacy: "No Zalo Add List", resources: "Resources" },
      r: { title: "Training resources", hint: "The weekly MSG training deck in the language you have selected — flip through it or download the original file.", week: "Week {n}", slide: "{i} / {n}", download: "Download .pptx", full: "Full screen", close: "Close", loading: "Loading the list…", none: "No resources yet.", failed: "The resource list could not be loaded.", noLang: "No {l} deck this week, showing {o}.", prev: "Previous", next: "Next" },
      g: { btn: "Guide", title: "How to use this dashboard", version: "Version {v}", hello: "Hi {da}!", welcome: "This is your Zalo work list: every message due today, new members from the QK report and glass collections, in one place and written to the CRM for you.",
        startTour: "Show me around", later: "Later", gotit: "Got it", tourThis: "Tour this page", next: "Next", back: "Back", done: "Done", skip: "Exit", stepOf: "Step {i}/{n}", routineTitle: "Daily routine",
        routine: ["Open Overview: glance at the three tiles, then work Due today — one message per member, ✓ when sent.", "Mass send: one template for the whole group — select all, send, Mark sent.", "Overdue: under a week late still goes out; older than two weeks folds away until you need it.", "Every 2–3 days: upload the QK report under Add members (new members), then Glass collections (collection dates).", "Glasses collected: tick under Glass collections, rename the tag N→Y in Zalo, then confirm.", "Wrong tap? Everything has Undo for a few seconds."],
        pages: { resources: ["The weekly MSG training deck, newest week on top; the deck shown follows the page language (VI/EN/中文), switchable per week.", "Flip with the arrows, a swipe, or the ←/→ keys; Full screen to see it large.", "Download .pptx keeps the original file."], overview: ["Three tiles: sent / due today · missed this week · mass groups done.", "Due today (high touch): one card per member with the content to send; ✓ when sent, tick single items for a partial send.", "This week: what is coming, so you can plan.", "Mass send (low touch): same milestone, same content — select all → Mark sent; Copy names to find them in Zalo.", "Overdue: one week of grace; older than two weeks is folded."],
          add: ["Add one member: child, parent, relation, phone, product, deposit date; the Zalo tag is suggested; tick “Zalo not added” when you could not add them — they go to the waiting list.", "QK report import: upload the .xlsx (or the SO TTKSCT tab as .csv) every 2–3 days; new members appear newest deposit first.", "Tick “Zalo added” → the tag is suggested → complete what is missing → Write. Unticked rows go to the No Zalo Add List.", "Repeat purchases (same child and phone, deposit after the last collection) appear as new entries with a “repeat purchase” chip; writing adds a new row and the cadence starts again."],
          collections: ["Pending collection: every member with a deposit and no collected date; tick + date + Save when the glasses are picked up.", "Tag updates: after a collection the page proposes N→Y (or the & tag for siblings) — rename in Zalo first, then confirm to write the sheet.", "Collection updates from the QK: the same upload, members the report marks DONE — check, then Write."],
          members: ["Search by name, tag, phone or parent — filters as you type.", "Filter by product, To fix (missing data) or No tag; by deposit / collected date; sort.", "Tap a member for details, the cadence timeline and editable fields; tag edits go through Tag updates."],
          legacy: ["Members not on Zalo yet (including customers from before the CRM), grouped by month; every month folds.", "Once they add Zalo: Add to CRM (form pre-filled) or Dismiss.", "Repeat orders of existing members sit apart with Start a new cadence."] },
        steps: { "rs-week": ["Training week", "One panel per week, the newest open; tap the heading to fold or unfold."], "rs-view": ["Flip through", "Arrows, swipe, or the ←/→ keys. Tap the slide for the next one."], "rs-dl": ["Language and download", "The deck follows the page language; switch it here. Download .pptx keeps the original; Full screen shows it large."], "ov-tiles": ["Three tiles", "Sent / due today · missed this week · mass groups done. Green means fine."], "ov-over": ["Overdue", "Tap to open. Under a week late still goes out; older than two weeks folds below."], "ov-today": ["Due today", "Each card is a member with the content to send. Tap ✓ when sent; tick single items for a partial send. ✓ again undoes."], "ov-up": ["This week", "The coming days, so you can plan."], "ov-mass": ["Mass send", "Same milestone, same content: select all → Mark sent. Copy names to paste into Zalo search."],
          "ad-form": ["Add one member", "Child, phone, product, deposit date — the tag is suggested. Could not add them on Zalo? Tick “Zalo not added”."], "ad-imp": ["QK report import", "Every 2–3 days: upload the report; new members appear here, newest first."], "ad-drop": ["Choose the file", "The .xlsx as downloaded, or the SO TTKSCT tab saved as .csv. The date range is optional."], "ad-tick": ["Zalo added", "Tick the ones you added → tag suggested → complete → Write. Unticked rows go to the waiting list."],
          "co-pend": ["Pending collection", "Glasses picked up: tick, pick the date, Save. The cadence moves to the post-collection milestones."], "co-tags": ["Tag updates", "Rename in Zalo first (N→Y), then confirm — only then is the sheet written."], "co-imp": ["Collection updates from the QK", "Same upload: members the report marks DONE are pre-ticked — check, then Write."],
          "me-search": ["Search", "Name, tag, phone or the parent's name."], "me-chips": ["Filters", "Product, To fix, No tag."], "me-date": ["Dates and sort", "Filter by deposit or collected date; sort by newest, name, date."], "me-row": ["Member card", "Tap for details, the timeline and edits."],
          "lg-list": ["No Zalo Add List", "Grouped by month; tap a month to fold or unfold."], "lg-add": ["Add to CRM", "Once they add Zalo: opens the form pre-filled. Dismiss to stop following."], "lg-rep": ["Repeat orders", "A new order from an existing member: Start a new cadence."] } },
      aSection: "Add one member", iTitleM: "New members from the QK report", iTitleC: "Collection updates from the QK report", iChange: "Change file", iLoaded: "File {f} · {n} orders since {d}",
      iWhy: { same: "already in the CRM", expected: "not DONE yet (appointment only)", parked: "already on the No Zalo Add List", parkedOther: "already on the No Zalo Add List", dup: "duplicate within the file", done: "imported earlier", dismissed: "dismissed", update: "collected date already recorded", "update-checkphone": "collected date already recorded" },
      iResultM: "Written: {a} new members · {p} parked on the No Zalo Add List · {e} errors", iResultC: "Written: {c} collected dates · {e} errors", iNothing: "Nothing in this file for this section.",
      mDate: "Filter by", mDep: "deposit date", mColl: "collected date", mFrom: "from", mTo: "to", mSort: "Sort", sortNew: "Newest", sortName: "Name A→Z", sortDep: "Deposit date", sortColl: "Collected date", mClear: "Clear",
      tToday: "Today", tTodayX: "{d}/{n} high touch sent", tMissed: "Missed personal", tMissedX: "high touch overdue, not sent", tMass: "Mass sends", tMassX: "{g}/{G} groups · {p}/{P} people this week",
      secOverdue: "Overdue", overdueHint: "not sent, oldest first", secToday: "Due today", todayHint: "high touch · one by one", secUp: "Upcoming this week", upHint: "high touch · tomorrow to Sunday",
      secMass: "Mass sends this week", massHint: "low touch · send the whole group any day this week", secDone: "Sent today",
      perfect: "Everything due today is sent. Nice!", nothingToday: "No high-touch tasks fall due today.", nothingUp: "Nothing more this week.", nothingMass: "No mass sends this week.",
      nothingOver: "Nothing overdue. Great.", showOlder: "Show {n} older", hideOlder: "Hide older", late: "late", overdueBy: "{n} d overdue", dueOn: "due {d}", opens: "opens {d}", dep: "deposit", coll: "collected", noDate: "no date",
      undo: "Undo", markSent: "Mark sent ({n})", selectAll: "Select all", copyNames: "Copy names", copied: "Copied {n} names", sentToast: "Recorded {n} sent", undoneToast: "Undone", errToast: "Could not save: {e}",
      massDone: "This group is done", sendBtn: "Sent", high: "High touch", low: "Low touch", missedMass: "missed mass send", sendTo: "Send to {n} people", mins: "per person",
      search: "Search name, phone or tag…", fAll: "All", fFix: "To fix", fNoTag: "No tag", fExam: "Exam", showing: "{a}/{b}", noCust: "No customers.",
      lPhone: "Phone", lProduct: "Product", lDA: "DA", lDep: "Deposit date", lColl: "Collected date", lStatus: "Status", lTag: "Zalo tag", lNote: "Note", lParent: "Parent", lRel: "Relation", lGender: "Gender", lDob: "Birthday", lRow: "Row", lKid2: "2nd child",
      timeline: "Cadence timeline", edit: "Edit", save: "Save", saving: "Saving…", saved: "Saved", cancel: "Cancel", close: "Close", pendingTag: "New tag waiting to be renamed in Zalo", tagChangeNote: "A new tag goes to Tag updates; the sheet changes only after you rename it in Zalo and confirm.",
      fix: { nodates: "No deposit and no collected date", notag: "No Zalo tag", nophone: "No phone", noprod: "Unknown product", future: "Collected date in the future", badtag: "Tag cannot be read" },
      stSent: "sent", stPartial: "partly sent", stMissed: "missed", stToday: "today", stUp: "upcoming", stOpen: "open",
      addTitle: "Add a customer", aChild: "Child's name", aGender: "Gender", aParent: "Parent's name", aRel: "Relation to the child", aDob: "Birthday", aDep: "Deposit date", aNA: "Not applicable / unconverted",
      aColl: "Collection date", aProduct: "Product", aTag: "Zalo tag", aTagHint: "Suggested from the convention; editable.", aNoZalo: "Zalo not added / no tag yet", aNote: "Note", aSubmit: "Record customer", aSubmitting: "Recording…",
      aRecorded: "Customer recorded", aRecordedX: "{n} is in the CRM form, row {r}.", aParked: "Saved to the No Zalo Add List", aParkedX: "{n} stays on the No Zalo Add List until a tag exists.", aAnother: "Add another", aBack: "Back to tasks",
      req: "required", genders: { "": "—", "Nam": "Male", "Nữ": "Female" }, other: "Other", relText: "Specify (e.g. Cô Lan)", today: "today", dupWarn: "This customer seems to be in the CRM already (row {r}).",
      pTitle: "Pending collection", pHint: "deposit paid, no collected date yet", pCollected: "Collected", pSubmit: "Save", pExpected: "QK expects {d}", pNone: "Nobody is waiting for glasses.", pDone: "Collected date saved for {n}.",
      tTitle: "Zalo tag updates", tHint: "rename on your phone first, then confirm so the sheet follows", tOld: "Current tag", tNew: "New tag", tCopy: "Copy", tConfirm: "Renamed in Zalo", tSkip: "Keep as is", tNone: "No tags waiting.",
      tWhyNY: "collected, tag still N", tWhySib: "second child on the same Zalo", tWhyEdit: "you edited the tag", tConfirmed: "Tag updated in the sheet",
      iTitle: "Import the QK report", iHint: "upload QK NGT Daily report (.xlsx) or the SO TTKSCT tab as .csv", iDrop: "Tap to choose a file, or drop it here", iFrom: "From", iTo: "To", iRangeHint: "Optional. Keeps orders whose deposit or appointment date is in range.",
      iParsing: "Reading the file…", iFound: "{n} orders in tab “{s}” ({c} skipped: before {d})", iNoSheet: "No SO TTKSCT tab, and no tab with the Ngày Đặt / Ngày Hẹn / Mã Đơn Hàng… header", iBadFile: "Could not read the file: {e}",
      iNew: "New entries", iNewHint: "not in the CRM · fill what's missing, tick to write", iColl: "Collection updates", iCollHint: "already in the CRM, QK says DONE", iRepeat: "Repeat orders", iRepeatHint: "customers already collected earlier", iInfo: "Nothing to do",
      iInfoHint: "in the CRM with the same data, or not DONE yet", iSibling: "same phone as {n}", iCheckPhone: "phone differs from the CRM ({p})", iSeen: "uploaded before", iChanged: "changed", iFuture: "collected date in the future — check",
      iConfirm: "Write {n} selected rows", iSubmitting: "Writing…", iDone: "Written", iDoneX: "{a} new · {c} collected dates · {p} parked on No Zalo Add List · {e} errors", iNoneSel: "Nothing selected", iAgain: "Import another file", iToTasks: "Back to tasks",
      iPick: "— pick —", iSteps: ["Choose file", "Review", "Write to sheet"], iDismiss: "Dismiss", iCutoff: "Orders before {d} are ignored (setting import_cutoff).", iExpectedOnly: "expected date only", iLibLoading: "Loading the Excel reader…",
      lTitle: "No Zalo Add List", lHint: "customers not added on Zalo yet, not in the CRM · by collection month", lAdd: "Add to CRM", lDismiss: "Dismiss", lRestore: "Restore", lShowDismissed: "Show dismissed ({n})", lHideDismissed: "Hide dismissed",
      lRepeat: "Repeat orders", lRepeatHint: "new orders for customers already in the CRM", lStartNew: "Start a new cadence", lUpcoming: "Upcoming", lNone: "The list is empty. Upload the QK report under Add members to fill it.", lNoColl: "Not collected yet", lManual: "typed in",
      prod: { MC: "MC", "Kính": "Glasses", OK: "Ortho-K", Atropine: "Atropine", Exam: "Exam" }, months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      foot: "Due dates come from the deposit date (K) and collected date (L) in the CRM form. Every change here is written to the Google Sheet and recorded in DA_Log. Version {v}.",
      setupTitle: "Google Sheets not connected", confettiMsg: "🎉 Everything due today is done!", demoWrite: "Demo: changes stay in this browser only.", notConnected: "Not connected to the sheet: nothing was saved."
    },
    zh: {
      brand: "助理 Zalo 看板", sub: "{c} · {d}", glede: "使用诊所的用户名登录，例如 NGT_DA1。", luser: "用户名", lpass: "密码",
      signin: "登录", signingin: "正在登录…", badlogin: "用户名或密码不正确。", neterr: "无法连接 Google Sheets：{e}",
      demo: "查看演示（示例数据）", adv: "连接脚本（高级）", lapi: "Apps Script 地址（/exec）", apiHint: "每台设备只需输入一次。留空则使用内置地址。",
      noapi: "尚未连接 Google Sheets。请按 README 部署脚本并在“高级”中粘贴 /exec 地址，或查看演示。",
      pickTitle: "你是谁？", pickLede: "选择你的姓名。本设备会记住。", kh: "位客户",
      feedLive: "已连接 · 读取于 {t}", feedDemo: "演示 · 示例数据", feedFailed: "无法读取表格", feedLoading: "正在读取表格…", feedOffline: "未连接",
      signout: "退出", switchWho: "不是你？", reload: "刷新",
      rel: { "Mẹ": "母亲", "Ba": "父亲", "Ông ngoại": "外公", "Bà ngoại": "外婆", "Ông nội": "爷爷", "Bà nội": "奶奶", "Cô": "姑姑", "Dì": "阿姨", "Chú": "叔叔", "Khác": "其他" },
      aZaloAdded: "已加 Zalo", iConfirmM: "写入 {n} 位已加 Zalo 的会员", iNewHint2: "不在 CRM · 勾选已加 Zalo 的客户并补齐信息；未勾选的进入“未加 Zalo 名单”",
      tSkipped: "已保留标签", iUndoWrite: "撤销本次写入", aUndo: "撤销（删除刚写入的行）", undoneRow: "已撤销：刚写入的行已清除", undoneImport: "已撤销本次写入", collUndone: "已移除取镜日期",
      iLibFail: "无法加载 Excel 读取器。请重试，或将 SO TTKSCT 工作表另存为 .csv 后上传。", iReading: "正在读取 {f}…（大文件可能需要一分钟）",
      iRepeatOf: "复购 · 上次取镜 {d}", iTagAfterTick: "勾选“已加 Zalo”后给出建议", iAlsoColl: "同一文件：{n} 位需确认取镜日期 →", iReadAs: "已读取 — 工作表：{tabs} · 首行：{row}", iAlsoNew: "同一文件：{n} 位新会员 →",
      nav: { overview: "总览", add: "新增会员", collections: "取镜", members: "会员列表", legacy: "未加 Zalo 名单", resources: "资料" },
      r: { title: "培训资料", hint: "每周 MSG 培训幻灯片，按当前语言显示——逐页翻看或下载原文件。", week: "第 {n} 周", slide: "{i} / {n}", download: "下载 .pptx", full: "全屏", close: "关闭", loading: "正在加载列表…", none: "暂无资料。", failed: "无法加载资料列表。", noLang: "本周没有{l}版本，显示{o}版本。", prev: "上一页", next: "下一页" },
      g: { btn: "使用指南", title: "使用指南", version: "版本 {v}", hello: "{da}，你好！", welcome: "这是你的 Zalo 工作清单：今天要发的消息、QK 报表里的新会员和取镜日期，全在一处，并自动写入 CRM。",
        startTour: "逐步引导", later: "稍后", gotit: "知道了", tourThis: "引导本页", next: "下一步", back: "上一步", done: "完成", skip: "退出", stepOf: "第 {i}/{n} 步", routineTitle: "每日流程",
        routine: ["打开总览：看一眼三个数字块，然后处理“今天”——每位会员一条消息，发完点 ✓。", "批量发送：同一模板发给整组——全选、发送、点“已发送”。", "逾期：迟一周内照常发送；超过两周会折叠起来，需要时再展开。", "每 2–3 天：在“新增会员”上传 QK 报表（新会员），再到“取镜”确认取镜日期。", "会员取镜后：在“取镜”勾选，在 Zalo 里把标签 N→Y 改名，然后确认。", "点错了？所有操作几秒内都可撤销。"],
        pages: { resources: ["每周 MSG 培训幻灯片，最新一周在最上；显示的版本跟随页面语言（VI/EN/中文），每周可单独切换。", "用箭头、滑动或 ←/→ 键翻页；全屏可放大查看。", "下载 .pptx 保存原文件。"], overview: ["三个数字块：今天已发 / 应发 · 本周错过 · 批量组已完成。", "今天（重点关怀）：每位会员一张卡片，附要发的内容；发完点 ✓，部分发送则勾选单项。", "本周：即将到来的事项，便于安排。", "批量发送（轻度）：同一节点、同一内容——全选 → 已发送；复制姓名以便在 Zalo 里查找。", "逾期：一周宽限；超过两周折叠。"],
          add: ["逐个新增：孩子姓名、家长、关系、电话、产品、订金日期；自动建议 Zalo 标签；加不上 Zalo 就勾“未加 Zalo”——进入等待名单。", "从 QK 报表导入：每 2–3 天上传 .xlsx（或 SO TTKSCT 工作表另存的 .csv）；新会员按订金日期从新到旧显示。", "勾“已加 Zalo”→ 给出标签建议 → 补齐缺项 → 写入。未勾选的进入“未加 Zalo 名单”。", "复购（同一孩子、同一电话、订金晚于上次取镜）作为新条目显示并带“复购”标记；写入会新增一行，关怀周期重新开始。"],
          collections: ["待取镜：所有有订金日期但没有取镜日期的会员；取镜后勾选 + 选日期 + 保存。", "标签更新：取镜后页面会建议 N→Y（兄弟姐妹则是 & 标签）——先在 Zalo 里改名，再点确认写入表格。", "从 QK 报表更新：同一文件，报表标为 DONE 的会员——核对后写入。"],
          members: ["按姓名、标签、电话或家长姓名搜索——边输入边筛选。", "按产品、待修正（缺数据）或无标签筛选；按订金 / 取镜日期筛选；排序。", "点击会员查看详情、关怀时间线并编辑；标签修改会走“标签更新”。"],
          legacy: ["尚未加 Zalo 的会员（含 CRM 之前的老客户），按月分组；每个月可折叠。", "加上 Zalo 后：点“加入 CRM”（表单已预填）或“忽略”。", "老会员的复购订单单独列出，可“开始新周期”。"] },
        steps: { "rs-week": ["培训周", "每周一个面板，最新一周默认展开；点标题折叠或展开。"], "rs-view": ["翻页", "箭头、滑动或 ←/→ 键。点击幻灯片进入下一页。"], "rs-dl": ["语言与下载", "版本跟随页面语言，可在此切换。下载 .pptx 保存原文件；全屏放大查看。"], "ov-tiles": ["三个数字块", "今天已发 / 应发 · 本周错过 · 批量组已完成。绿色表示正常。"], "ov-over": ["逾期", "点击展开。迟一周内照常发送；超过两周折叠在下方。"], "ov-today": ["今天", "每张卡片是一位会员和要发的内容。发完点 ✓；部分发送则勾选单项。再点 ✓ 可撤销。"], "ov-up": ["本周", "接下来几天的事项，便于安排。"], "ov-mass": ["批量发送", "同一节点、同一内容：全选 → 已发送。复制姓名粘贴到 Zalo 搜索框。"],
          "ad-form": ["逐个新增", "填孩子姓名、电话、产品、订金日期——自动建议标签。加不上 Zalo 就勾“未加 Zalo”。"], "ad-imp": ["从 QK 报表导入", "每 2–3 天：上传报表，新会员显示在这里，最新在前。"], "ad-drop": ["选择文件", "下载的 .xlsx 原文件，或 SO TTKSCT 工作表另存的 .csv。日期范围可选。"], "ad-tick": ["已加 Zalo", "勾选已加的会员 → 建议标签 → 补齐 → 写入。未勾选的进入等待名单。"],
          "co-pend": ["待取镜", "已取镜：勾选、选日期、保存。关怀周期转到取镜后的节点。"], "co-tags": ["标签更新", "先在 Zalo 改名（N→Y），再点确认——此时才写入表格。"], "co-imp": ["从 QK 报表更新", "同一文件：报表标为 DONE 的会员已预先勾选——核对后写入。"],
          "me-search": ["搜索", "姓名、标签、电话或家长姓名。"], "me-chips": ["筛选", "产品、待修正、无标签。"], "me-date": ["日期与排序", "按订金或取镜日期筛选；按最新、姓名、日期排序。"], "me-row": ["会员卡片", "点击查看详情、时间线并编辑。"],
          "lg-list": ["未加 Zalo 名单", "按月分组；点月份标题折叠或展开。"], "lg-add": ["加入 CRM", "会员加上 Zalo 后：点击打开已预填的表单。不再跟进则忽略。"], "lg-rep": ["复购", "老会员的新订单：开始新周期。"] } },
      aSection: "逐个新增", iTitleM: "从 QK 报表导入新会员", iTitleC: "从 QK 报表更新取镜日期", iChange: "更换文件", iLoaded: "文件 {f} · {d} 起 {n} 条订单",
      iWhy: { same: "已在 CRM", expected: "尚未 DONE（仅预约）", parked: "已在“未加 Zalo 名单”", parkedOther: "已在“未加 Zalo 名单”", dup: "文件内重复", done: "之前已导入", dismissed: "已忽略", update: "取镜日期已记录", "update-checkphone": "取镜日期已记录" },
      iResultM: "已写入 {a} 位新会员 · {p} 条留在“未加 Zalo 名单” · {e} 个错误", iResultC: "已写入 {c} 个取镜日期 · {e} 个错误", iNothing: "文件中没有本节的内容。",
      mDate: "按", mDep: "定金日期", mColl: "取镜日期", mFrom: "从", mTo: "到", mSort: "排序", sortNew: "最新", sortName: "姓名 A→Z", sortDep: "定金日期", sortColl: "取镜日期", mClear: "清除",
      tToday: "今天", tTodayX: "{d}/{n} 高触达已发", tMissed: "遗漏个人跟进", tMissedX: "高触达逾期未发", tMass: "群发", tMassX: "{g}/{G} 组 · {p}/{P} 人本周",
      secOverdue: "逾期", overdueHint: "未发送，最早在前", secToday: "今日到期", todayHint: "高触达 · 逐一发送", secUp: "本周即将到期", upHint: "高触达 · 明天到周日",
      secMass: "本周群发", massHint: "低触达 · 本周任意一天整组发送", secDone: "今日已发",
      perfect: "今天的任务全部完成，太棒了！", nothingToday: "今天没有高触达任务。", nothingUp: "本周没有更多任务。", nothingMass: "本周没有群发。",
      nothingOver: "没有逾期任务。很好。", showOlder: "显示 {n} 条更早", hideOlder: "隐藏更早", late: "延迟", overdueBy: "逾期 {n} 天", dueOn: "到期 {d}", opens: "{d} 开始", dep: "定金", coll: "取镜", noDate: "无日期",
      undo: "撤销", markSent: "已发送（{n}）", selectAll: "全选", copyNames: "复制名单", copied: "已复制 {n} 个名字", sentToast: "已记录 {n} 条发送", undoneToast: "已撤销", errToast: "保存失败：{e}",
      massDone: "本组已完成", sendBtn: "已发", high: "高触达", low: "低触达", missedMass: "遗漏的群发", sendTo: "发送给 {n} 人", mins: "每人",
      search: "搜索姓名、电话或标签…", fAll: "全部", fFix: "待修正", fNoTag: "无标签", fExam: "检查", showing: "{a}/{b}", noCust: "没有客户。",
      lPhone: "电话", lProduct: "产品", lDA: "助理", lDep: "定金日期", lColl: "取镜日期", lStatus: "状态", lTag: "Zalo 标签", lNote: "备注", lParent: "家长", lRel: "关系", lGender: "性别", lDob: "生日", lRow: "行", lKid2: "第二个孩子",
      timeline: "跟进时间线", edit: "编辑", save: "保存", saving: "保存中…", saved: "已保存", cancel: "取消", close: "关闭", pendingTag: "新标签待在 Zalo 中改名", tagChangeNote: "新标签进入“改标签”；在 Zalo 改名并确认后表格才会更新。",
      fix: { nodates: "缺定金和取镜日期", notag: "没有 Zalo 标签", nophone: "缺电话", noprod: "产品不明", future: "取镜日期在未来", badtag: "标签无法解析" },
      stSent: "已发", stPartial: "部分发送", stMissed: "遗漏", stToday: "今天", stUp: "即将", stOpen: "进行中",
      addTitle: "新增客户", aChild: "孩子姓名", aGender: "性别", aParent: "家长姓名", aRel: "与孩子的关系", aDob: "生日", aDep: "定金日期", aNA: "未转化 / 不适用",
      aColl: "取镜日期", aProduct: "产品", aTag: "Zalo 标签", aTagHint: "按规则建议；可修改。", aNoZalo: "尚未加 Zalo / 无标签", aNote: "备注", aSubmit: "记录客户", aSubmitting: "记录中…",
      aRecorded: "已记录客户", aRecordedX: "{n} 已进入 CRM 表，第 {r} 行。", aParked: "已存入“未加 Zalo 名单”", aParkedX: "{n} 会留在“未加 Zalo 名单”直到有标签。", aAnother: "再加一位", aBack: "返回任务",
      req: "必填", genders: { "": "—", "Nam": "男", "Nữ": "女" }, other: "其他", relText: "请注明（例如 Cô Lan）", today: "今天", dupWarn: "此客户似乎已在 CRM 中（第 {r} 行）。",
      pTitle: "待取镜", pHint: "已付定金，尚无取镜日期", pCollected: "已取镜", pSubmit: "保存", pExpected: "QK 预约 {d}", pNone: "没有待取镜的客户。", pDone: "已保存 {n} 的取镜日期。",
      tTitle: "Zalo 标签更新", tHint: "先在手机上改名，再确认，表格随之更新", tOld: "当前标签", tNew: "新标签", tCopy: "复制", tConfirm: "已在 Zalo 改名", tSkip: "保持不变", tNone: "没有待改的标签。",
      tWhyNY: "已取镜，标签仍为 N", tWhySib: "同一 Zalo 的第二个孩子", tWhyEdit: "你编辑了标签", tConfirmed: "表格中的标签已更新",
      iTitle: "导入 QK 报表", iHint: "上传 QK NGT Daily report（.xlsx）或 SO TTKSCT 工作表的 .csv", iDrop: "点击选择文件，或拖放到此处", iFrom: "起", iTo: "止", iRangeHint: "可选。保留定金或预约日期在范围内的订单。",
      iParsing: "正在读取文件…", iFound: "工作表“{s}”中 {n} 条订单（{c} 条早于 {d} 已跳过）", iNoSheet: "没有 SO TTKSCT 工作表，也没有带 Ngày Đặt / Ngày Hẹn / Mã Đơn Hàng… 表头的工作表", iBadFile: "无法读取文件：{e}",
      iNew: "新客户", iNewHint: "不在 CRM · 补齐缺项，勾选后写入", iColl: "取镜日期更新", iCollHint: "已在 CRM，QK 显示 DONE", iRepeat: "复购", iRepeatHint: "之前已取镜的客户", iInfo: "无需处理",
      iInfoHint: "CRM 中信息相同，或尚未 DONE", iSibling: "与 {n} 同一电话", iCheckPhone: "电话与 CRM 不同（{p}）", iSeen: "之前已导入", iChanged: "有变化", iFuture: "取镜日期在未来 — 请检查",
      iConfirm: "写入 {n} 条所选", iSubmitting: "写入中…", iDone: "已写入", iDoneX: "{a} 位新客户 · {c} 个取镜日期 · {p} 条留在“未加 Zalo” · {e} 个错误", iNoneSel: "未选择任何行", iAgain: "导入另一个文件", iToTasks: "返回任务",
      iPick: "— 选择 —", iSteps: ["选择文件", "核对", "写入表格"], iDismiss: "忽略", iCutoff: "早于 {d} 的订单不导入（设置 import_cutoff）。", iExpectedOnly: "仅更新预约日期", iLibLoading: "正在加载 Excel 读取器…",
      lTitle: "未加 Zalo 名单", lHint: "尚未加 Zalo、不在 CRM 的客户 · 按取镜月份分组", lAdd: "加入 CRM", lDismiss: "忽略", lRestore: "恢复", lShowDismissed: "查看已忽略（{n}）", lHideDismissed: "隐藏已忽略",
      lRepeat: "复购", lRepeatHint: "CRM 已有客户的新订单", lStartNew: "开始新周期", lUpcoming: "即将", lNone: "名单为空。请在“新增会员”上传 QK 报表。", lNoColl: "尚未取镜", lManual: "手动录入",
      prod: { MC: "MC", "Kính": "眼镜", OK: "Ortho-K", Atropine: "阿托品", Exam: "检查" }, months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], days: ["一", "二", "三", "四", "五", "六", "日"],
      foot: "到期日期根据 CRM 表中的定金日期（K）和取镜日期（L）计算。此处的每项更改都会写入 Google 表格并记录在 DA_Log。版本 {v}。",
      setupTitle: "尚未连接 Google Sheets", confettiMsg: "🎉 今天的任务全部完成！", demoWrite: "演示：更改仅保存在本浏览器。", notConnected: "未连接表格：未保存。"
    }
  };

  /* ------------------------------------------------------------------ state */
  var st = { lang: "vi", role: "da", clinic: "", da: "", u: "", h: "", session: false, demo: false, data: null, cust: [], byKey: {}, det: {}, tasks: [], imports: [], cadence: [], settings: {},
             today: "", feed: { mode: "offline", at: "" }, route: "tasks", busy: false,
             ui: { res: {}, search: "", cfilter: "all", dateKind: "dep", from: "", to: "", sort: "new", overdueOpen: false, foldOpen: false, massSel: {}, imp: null, impRaw: null, impResult: {}, showDismissed: false, addPrefill: null, addDone: null, sheetKey: "", folds: {} } };

  /* ------------------------------------------------------------------ utils */
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fill(s, o){ Object.keys(o || {}).forEach(function (k) { s = s.split("{" + k + "}").join(o[k]); }); return s; }
  function T(){ return L[st.lang] || L.vi; }
  function store(k, v){ try { if (v === undefined) return localStorage.getItem(k) || ""; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return v; }
  function sstore(k, v){ try { if (v === undefined) return sessionStorage.getItem(k) || ""; if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} return v; }
  var toastTimer, toastUndo = null;
  /* every write reports with a toast; pass an undo function and the toast carries an Undo button */
  function toast(msg, bad, undo){
    var el = $("toast"); el.innerHTML = "<span>" + esc(msg) + "</span>" + (undo ? '<button type="button" class="tundo">' + esc(T().undo) + "</button>" : "");
    el.className = "toast on" + (bad ? " bad" : ""); toastUndo = undo || null;
    if (undo) el.querySelector(".tundo").onclick = function () { el.className = "toast"; var f = toastUndo; toastUndo = null; if (f) f(); };
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.className = "toast"; toastUndo = null; }, undo ? 9000 : bad ? 5000 : 2600);
  }
  function prodLabel(p){ return T().prod[p] || p || "?"; }
  function relLabel(v){ return v === "Khác" ? T().other : (T().rel[v] || v); }
  function itemLabel(k){ return (Z.CP[st.lang] || Z.CP.vi)[k] || k; }
  function dm(iso){ return iso ? Z.fmtDM(iso) : ""; }
  function dmy(iso){ return iso ? Z.fmtDMY(iso) : ""; }
  function dayName(iso){ return T().days[Z.dow(iso)] + " " + dm(iso); }
  function tel(p){ return p ? '<a href="tel:' + esc(p) + '" class="mono">' + esc(p) + "</a>" : ""; }
  function nowIso(){ return new Date().toISOString(); }
  function copyText(text){
    function legacy(){ var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { legacy(); });
    legacy(); return Promise.resolve();
  }
  /* sha256: WebCrypto when available (https), tiny fallback otherwise */
  function utf8(str){ var o = "", i, c; for (i = 0; i < str.length; i++) { c = str.charCodeAt(i); if (c < 128) o += String.fromCharCode(c); else if (c < 2048) o += String.fromCharCode(192 | (c >> 6), 128 | (c & 63)); else o += String.fromCharCode(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); } return o; }
  function sha256sync(a){ function rr(v, x){ return (v >>> x) | (v << (32 - x)); }
    var mm = Math.pow, mp = mm(2, 32), i, j, res = "", w = [], bl = a.length * 8, h = sha256sync.h, k = sha256sync.k;
    if (!h) { h = sha256sync.h = []; k = sha256sync.k = []; var nn = 0, ic = {}; for (var cd = 2; nn < 64; cd++) { if (!ic[cd]) { for (i = 0; i < 313; i += cd) ic[i] = cd; h[nn] = (mm(cd, .5) * mp) | 0; k[nn++] = (mm(cd, 1 / 3) * mp) | 0; } } h = h.slice(0, 8); sha256sync.h = h; }
    a += "\x80"; while (a.length % 64 - 56) a += "\x00";
    for (i = 0; i < a.length; i++) { j = a.charCodeAt(i); if (j >> 8) return null; w[i >> 2] |= j << ((3 - i) % 4) * 8; }
    w[w.length] = (bl / mp) | 0; w[w.length] = bl; var H = h.slice(0);
    for (j = 0; j < w.length;) { var ww = w.slice(j, j += 16), old = H.slice(0);
      for (i = 0; i < 64; i++) { var w15 = ww[i - 15], w2 = ww[i - 2], A = H[0], E = H[4];
        var t1 = H[7] + (rr(E, 6) ^ rr(E, 11) ^ rr(E, 25)) + ((E & H[5]) ^ ((~E) & H[6])) + k[i] + (ww[i] = (i < 16) ? ww[i] : (ww[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + ww[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(A, 2) ^ rr(A, 13) ^ rr(A, 22)) + ((A & H[1]) ^ (A & H[2]) ^ (H[1] & H[2]));
        H = [(t1 + t2) | 0].concat(H); H[4] = (H[4] + t1) | 0; H.length = 8; }
      for (i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0; }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (H[i] >> (j * 8)) & 255; res += ((b < 16) ? "0" : "") + b.toString(16); }
    return res; }
  function sha256(t){ if (window.crypto && crypto.subtle && window.isSecureContext) { try { return crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }).catch(function () { return sha256sync(utf8(t)); }); } catch (e) {} } return Promise.resolve(sha256sync(utf8(t))); }

  /* ------------------------------------------------------------------ API */
  function apiUrl(){ var q = /[?&]api=([^&]+)/.exec(location.search); if (q) return decodeURIComponent(q[1]); return store("zalo_api") || API.url; }
  function creds(){ return { u: st.u, h: st.h, da: st.da }; }
  function apiGet(params){
    if (st.demo) return Promise.resolve(DemoAPI.get(params));
    var url = apiUrl(); if (!url) return Promise.reject(new Error("no api"));
    var p = Object.assign({}, creds(), params || {}, { t: Date.now() });
    var qs = Object.keys(p).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(p[k] === undefined ? "" : p[k]); }).join("&");
    return fetch(url + (url.indexOf("?") === -1 ? "?" : "&") + qs, { method: "GET", redirect: "follow" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (j.error) throw new Error(j.error); return j; });
  }
  function apiPost(body){
    if (st.demo) return Promise.resolve().then(function () { return DemoAPI.post(body); });
    var url = apiUrl(); if (!url) return Promise.reject(new Error(T().notConnected));
    return fetch(url, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({}, creds(), body)) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (j.error) throw new Error(j.error); return j; });
  }

  /* ------------------------------------------------------------------ demo engine (mirrors the script, in memory) */
  var DemoAPI = {
    load: function () {
      var saved = store("zalo_demo_state"), today = st.today;
      if (saved) { try { var d = JSON.parse(saved); if (d.today === today) return d; } catch (e) {} }
      var fresh = DEMO.build(Z, today); store("zalo_demo_state", JSON.stringify(fresh)); return fresh;
    },
    save: function () { try { store("zalo_demo_state", JSON.stringify(st.data)); } catch (e) {} },
    get: function (p) { return st.role === "reviewer" ? RV.demo.get(p) : DemoAPI.load(); },
    post: function (b) {
      if (st.role === "reviewer") return RV.demo.post(b);
      var d = st.data, at = nowIso();
      function keyOf(ph, nm){ return Z.customerKey(ph, nm); }
      function find(ref){ var c = d.customers.filter(function (x) { return x.row === ref.row; })[0]; if (!c || Z.normName(c.name) !== Z.normName(ref.name)) { c = d.customers.filter(function (x) { return Z.normName(x.name) === Z.normName(ref.name) && Z.normPhone(x.phone) === Z.normPhone(ref.phone); })[0]; } if (!c) throw new Error("row not found"); return c; }
      function addC(f, det){
        if (!f.name) throw new Error("name is required"); if (Z.PRODUCTS.indexOf(f.product) === -1) throw new Error("bad product");
        var key = f.key || keyOf(f.phone, f.name);
        if (!f.allowDuplicate && d.customers.some(function (c) { return keyOf(c.phone, c.name) === keyOf(f.phone, f.name); })) throw new Error("already in the form");
        var row = d.customers.reduce(function (m, c) { return Math.max(m, c.row); }, 1) + 1;
        d.customers.push({ row: row, stt: String(row - 1), friend: Z.fmtDMY(st.today), name: f.name, dob: f.dob || "", phone: f.phone || "", product: f.product, da: f.da || st.da, tag: f.tag || "", status: f.coll ? "Đã là hội viên" : "", dep: f.dep || "", coll: f.coll || "", note: f.note || "", kid2: f.kid2 || "" });
        if (det) upsert(key, det);
        return { ok: 1, row: row, key: key };
      }
      function upsert(key, det){ var cur = d.details.filter(function (x) { return x.key === key; })[0]; if (!cur) { cur = { key: key, clinic: "NGT", parent_name: "", relation: "", gender: "", pending_tag: "" }; d.details.push(cur); } Object.keys(det).forEach(function (k) { if (det[k] !== undefined) cur[k] = det[k]; }); cur.updated_at = at; return { ok: 1 }; }
      function upd(ref, ch){ var c = find(ref); if (ch.coll && c.dep && Z.toISO(ch.coll) < c.dep) throw new Error("collection date is before the deposit date"); Object.keys(ch).forEach(function (k) { c[k] = k === "dep" || k === "coll" || k === "dob" ? (Z.toISO(ch[k]) || "") : ch[k]; }); return { ok: 1, row: c.row, changes: ch }; }
      function storeImports(orders){ var added = 0, updated = 0; (orders || []).forEach(function (o) { var cur = d.imports.filter(function (x) { return x.code === o.code; })[0]; if (cur) { if (o.status) cur.status = o.status; if (o.appointment || o.appt) cur.appointment = o.appointment || o.appt; if (o.state) cur.state = o.state; if (o.result !== undefined) cur.result = o.result; if (o.collected !== undefined) cur.collected = o.collected; if (o.note !== undefined) cur.note = o.note; if (o.product) cur.product = o.product; cur.last_seen = at; updated++; } else { d.imports.push({ code: o.code, clinic: "NGT", uploaded_at: at, uploaded_by: st.da, deposit: o.deposit || o.dep || "", appointment: o.appointment || o.appt || "", status: o.status || "", name: o.name || "", phone: o.phone || "", patient_code: o.patient || "", lens: o.lens || "", product: o.product || "", state: o.state || "parked", result: o.result || "", last_seen: at, collected: o.collected || "", note: o.note || "" }); added++; } }); return { ok: 1, added: added, updated: updated }; }
      var res;
      switch (b.action) {
        case "addCustomer": res = addC(b.fields || {}, b.details); break;
        case "updateCustomer": res = upd(b.ref, b.changes || {}); break;
        case "setCollected": res = upd(b.ref, { coll: b.date, status: "Đã là hội viên" }); break;
        case "confirmTag": res = upd(b.ref, { tag: b.tag }); break;
        case "markSent": (b.items || []).forEach(function (it) { d.tasks.push({ key: it.key, clinic: "NGT", da: st.da, stage: it.stage, due: it.due, bits: it.bits, score: it.score, sent_at: at, undone_at: "" }); });
          (b.undo || []).forEach(function (u) { for (var i = d.tasks.length - 1; i >= 0; i--) if (d.tasks[i].key === u.key && d.tasks[i].stage === u.stage && !d.tasks[i].undone_at) { d.tasks[i].undone_at = at; break; } }); res = { ok: 1 }; break;
        case "storeImports": res = storeImports(b.orders); break;
        case "confirmImports": var results = {}, states = [];
          (b.adds || []).forEach(function (a) { try { var r = addC(a.fields || {}, a.details); results[a.code] = r; states.push({ code: a.code, state: "confirmed", result: "added:" + r.key, collected: (a.fields || {}).coll || "" }); } catch (e) { results[a.code] = { error: e.message }; } });
          (b.collections || []).forEach(function (c) { try { var r = upd(c.ref, { coll: c.date, status: "Đã là hội viên" }); results[c.code] = r; states.push({ code: c.code, state: "confirmed", result: "collected:" + keyOf(c.ref.phone, c.ref.name), collected: c.date }); } catch (e) { results[c.code] = { error: e.message }; } });
          (b.park || []).forEach(function (code) { states.push({ code: code, state: "parked" }); results[code] = { ok: 1, parked: 1 }; });
          (b.dismiss || []).forEach(function (code) { states.push({ code: code, state: "dismissed" }); results[code] = { ok: 1, dismissed: 1 }; });
          var byCode = {}; (b.orders || []).forEach(function (o) { byCode[o.code] = o; }); states.forEach(function (s) { byCode[s.code] = Object.assign({}, byCode[s.code] || { code: s.code }, s); });
          res = { ok: 1, results: results, stored: storeImports(Object.keys(byCode).map(function (k) { return byCode[k]; })) }; break;
        case "saveDetails": res = upsert(b.key, b.details || {}); break;
        case "removeCustomer": { var rc = find(b.ref); if (!rc.friend || rc.row <= 48) throw new Error("only rows added by the dashboard can be removed"); d.customers.splice(d.customers.indexOf(rc), 1); res = { ok: 1, row: rc.row }; break; }
        case "removeImport": { var ri = d.imports.filter(function (x) { return x.code === b.code; })[0]; if (ri) d.imports.splice(d.imports.indexOf(ri), 1); res = { ok: 1, removed: ri ? 1 : 0 }; break; }
        default: throw new Error("unknown action");
      }
      DemoAPI.save(); return res;
    }
  };

  /* ------------------------------------------------------------------ data shaping */
  function shape(data){
    st.data = data; st.cadence = data.cadence || []; st.settings = data.settings || {}; st.tasks = data.tasks || []; st.imports = data.imports || [];
    var q = /[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(location.search); st.today = q ? q[1] : (data.today || Z.todayISO());
    var seen = {};
    st.cust = (data.customers || []).map(function (c) {
      var parsed = Z.parseTag(c.tag), product = Z.normProduct(c.product) || (parsed && parsed.product) || "";
      var base = Z.customerKey(c.phone, c.name), key = base;
      if (seen[base]) key = base + "#" + (c.dep ? Z.yymmdd(c.dep) : c.coll ? Z.yymmdd(c.coll) : c.row);
      seen[base] = 1;
      return Object.assign({}, c, { key: key, base: base, names: Z.splitNames(c.name), product: product, phone: Z.normPhone(c.phone) || String(c.phone || "").trim(), exam: product === "Exam", parsed: parsed });
    });
    st.byKey = {}; st.cust.forEach(function (c) { st.byKey[c.key] = c; });
    st.det = {}; (data.details || []).forEach(function (dd) { st.det[dd.key] = dd; });
  }
  function planOpts(){ return { today: st.today, goLive: st.settings.go_live || "", lateGraceWeeks: +(st.settings.late_grace_weeks || 1), foldDays: +(st.settings.overdue_fold_days || 14), cadenceTab: st.cadence, da: st.da }; }
  function currentPlan(){ return Z.plan(st.cust, st.tasks, planOpts()); }
  function detailsOf(c){ return st.det[c.key] || st.det[c.base] || {}; }
  function fixes(c){
    var f = [];
    if (c.exam) return f;
    if (!c.dep && !c.coll) f.push("nodates");
    if (!c.tag) f.push("notag"); else if (!c.parsed) f.push("badtag");
    if (!c.phone) f.push("nophone");
    if (!c.product) f.push("noprod");
    if (c.coll && c.coll > st.today) f.push("future");
    return f;
  }
  /* tag proposals: pending_tag from details, else N tag with a collected date */
  function tagProposals(){
    var out = [];
    st.cust.forEach(function (c) {
      var d = detailsOf(c), pending = (d.pending_tag || "").trim();
      if (pending && pending !== c.tag) { out.push({ cust: c, from: c.tag, to: pending, why: /&/.test(pending) && !/&/.test(c.tag || "") ? "tWhySib" : "tWhyEdit", pending: true }); return; }
      if (pending && pending === c.tag) return;                      /* "keep as is" */
      if (c.parsed && c.parsed.yn === "N" && c.coll && c.product && c.product !== "Exam") {
        var to = [(Z.PREFIX[c.product] || c.parsed.prefix) + "Y" + (c.parsed.second ? "&" + Z.PREFIX[c.parsed.second] + "Y" : ""), Z.yymmdd(c.coll), c.parsed.who, c.parsed.phone || c.phone].filter(Boolean).join(" ");
        if (to !== c.tag) out.push({ cust: c, from: c.tag, to: to, why: "tWhyNY", pending: false });
      }
    });
    return out;
  }
  function parkedImports(){ return st.imports.filter(function (i) { return i.state === "parked"; }); }

  /* ------------------------------------------------------------------ chrome */
  function applyGateLang(){
    var t = T();
    $("gTitle").textContent = t.brand; $("gateLede").textContent = t.glede; $("luser").textContent = t.luser; $("lpass").textContent = t.lpass;
    $("demoBtn").textContent = t.demo; $("advSum").textContent = t.adv; $("lapi").textContent = t.lapi; $("apiHint").textContent = t.apiHint;
    $("pickTitle").textContent = t.pickTitle; $("pickLede").textContent = t.pickLede;
    var b = $("gateBtn"); if (!b.disabled) b.textContent = t.signin;
    document.querySelectorAll("#gateLang button, #langseg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.l === st.lang)); });
    document.body.className = st.lang === "zh" ? "lang-zh" : ""; document.documentElement.lang = st.lang;
  }
  function renderChrome(){
    var t = T(), p = st.plan, rv = st.role === "reviewer";
    var counts = rv ? RV.navCounts() : { overview: p ? (p.tiles.today.due - p.tiles.today.done) + p.tiles.missed : 0, collections: st.cust.filter(function (c) { return c.dep && !c.coll && !c.exam; }).length + tagProposals().length, legacy: parkedImports().length };
    $("nav").innerHTML = (rv ? RV.routes() : ["overview", "add", "collections", "members", "legacy", "resources"]).map(function (r) {
      return '<a href="#/' + r + '"' + (st.route === r ? ' aria-current="page"' : "") + ">" + esc(rv ? RV.navLabel(r) : t.nav[r]) + (counts[r] ? '<span class="cn">' + counts[r] + "</span>" : "") + "</a>";
    }).join("");
    $("pgTitle").textContent = rv ? RV.L[st.lang].title : "DA Zalo Dashboard";
    $("pgSub").innerHTML = esc(rv ? RV.subText() : fill(t.sub, { c: st.clinic, d: st.da })) + " · " + esc(dmy(st.today));
    $("whoami").innerHTML = '<button type="button" id="rlBtn">' + esc(t.reload) + "</button>" + (rv ? "" : '<button type="button" id="swBtn">' + esc(t.switchWho) + "</button>") + '<button type="button" id="soBtn">' + esc(t.signout) + "</button>";
    $("soBtn").onclick = signOut; if (!rv) $("swBtn").onclick = showPick; $("rlBtn").onclick = function () { reload(); };
    var f = $("feed"), m = st.feed.mode;
    f.className = "feed " + (m === "live" ? "live" : m === "demo" ? "live" : m === "loading" ? "loading" : m === "failed" ? "failed" : "");
    f.innerHTML = "<i></i>" + esc(m === "live" ? fill(t.feedLive, { t: st.feed.at }) : m === "demo" ? t.feedDemo : m === "loading" ? t.feedLoading : m === "failed" ? t.feedFailed : t.feedOffline);
    $("foot").innerHTML = fill(t.foot, { v: VERSION });
  }
  function render(){
    if (!st.session) return;
    st.plan = currentPlan();
    renderChrome(); $("helpBtn").title = T().g.btn;
    var r = st.route, h = st.role === "reviewer" ? RV.page(r) : r === "members" ? pageMembers() : r === "add" ? pageAdd() : r === "collections" ? pageCollections() : r === "legacy" ? pageLegacy() : r === "resources" ? pageResources() : pageTasks();
    $("app").innerHTML = h;
    afterRender(); if (st.role === "reviewer") RV.after();
    maybeConfetti();
  }
  var ALIAS = { tasks: "overview", customers: "members", pending: "collections", tags: "collections", import: "add", nozalo: "legacy" };
  function route(){
    var m = /^#\/([a-z]+)/.exec(location.hash || ""); st.route = m ? (ALIAS[m[1]] || m[1]) : "overview";
    var allowed = st.role === "reviewer" ? RV.routes() : ["overview", "add", "collections", "members", "legacy", "resources"];
    if (allowed.indexOf(st.route) === -1) st.route = allowed[0];
    render(); window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ shared pieces */
  function section(title, hint, cnt){ return '<div class="sec"><h2>' + esc(title) + "</h2>" + (hint ? '<span class="hint">' + esc(hint) + "</span>" : "") + (cnt !== undefined && cnt !== "" ? '<span class="cnt">' + esc(cnt) + "</span>" : "") + "</div>"; }
  function tile(cls, big, label, sub, frac){ return '<div class="stat ' + cls + '"><div class="sn">' + big + '</div><div class="sl">' + esc(label) + '</div><div class="sx">' + esc(sub) + "</div>" + (frac === null ? "" : '<div class="bar"><i style="width:' + Math.round(frac * 100) + '%"></i></div>') + "</div>"; }
  function setupNotice(){ var t = T(); return '<div class="setup"><b>' + esc(t.setupTitle) + "</b><br>" + esc(t.noapi) + "</div>"; }
  function custLabel(c){ return c.names.length > 1 ? c.names.join(" & ") : c.name; }

  /* collapsible panel heads: the fold state is remembered per device */
  function isFolded(id){ return !!st.ui.folds[id]; }
  function foldHead(id, title, hint, right){
    return '<h3 class="ph"><button type="button" class="foldbtn" data-act="fold-panel" data-id="' + esc(id) + '" aria-expanded="' + (!isFolded(id)) + '"><span class="chev">' + (isFolded(id) ? "▸" : "▾") + "</span><span>" + title + (hint ? ' <span class="hint">' + esc(hint) + "</span>" : "") + "</span></button>" + (right || "") + "</h3>";
  }
  function cardsHtml(tasks, ctx){ return Z.mergeByContact(tasks).map(function (card, i) { return cardHtml(card, ctx + "-" + i); }).join(""); }
  function cardHtml(card, id){
    var t = T(), c0 = card.custs[0]; st.cards[id] = card;
    var allDone = card.done, anyPartial = card.partial;
    var one = card.custs.length === 1;
    var meta = [tel(card.phone), one && c0.dep ? t.dep + " " + dm(c0.dep) : "", one && c0.coll ? t.coll + " " + dm(c0.coll) : "", '<span class="pill p-prod">' + esc(card.custs.map(function (c) { return prodLabel(c.product); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(" + ")) + "</span>"].filter(Boolean);
    var lines = card.tasks.map(function (tk, ti) {
      var who = (one ? "" : esc(tk.cust.names[0] || tk.cust.name) + " · ") + esc(tk.stage);
      var flags = (tk.daysOver ? '<span class="pill overflag">' + esc(fill(t.overdueBy, { n: tk.daysOver })) + "</span>" : "")
        + (!tk.daysOver && tk.open > st.today ? '<span class="pill p-inert">' + esc(fill(t.opens, { d: dm(tk.open) })) + "</span>" : "")
        + (!tk.daysOver && tk.open <= st.today && tk.due !== st.today ? '<span class="pill p-inert">' + esc(fill(t.dueOn, { d: dm(tk.due) })) + "</span>" : "")
        + (tk.late ? '<span class="pill p-late">' + esc(t.late) + "</span>" : "") + (tk.touch !== "High" ? '<span class="pill p-low">' + esc(t.low) + "</span>" : "");
      var bits = tk.done ? String(tk.done.bits || "") : "";
      var items = tk.items.map(function (it, i) { return '<span class="it' + (bits.charAt(i) === "1" ? " on" : "") + '" data-act="item" data-card="' + id + '" data-task="' + ti + '" data-i="' + i + '">' + esc(itemLabel(it[0])) + "</span>"; }).join("");
      return '<div class="line"><span class="who">' + who + "</span>" + flags + '<span class="items">' + items + "</span></div>";
    }).join("");
    return '<div class="card' + (allDone ? " done" : "") + '" id="' + id + '"><div class="pbar p-' + esc(c0.product) + '"></div><div class="main"><div class="tag">' + esc(card.tag || custLabel(c0)) + '</div><div class="meta">' + meta.join(" · ") + '</div><div class="lines">' + lines + "</div></div>"
      + '<button type="button" class="check' + (allDone ? " on" : anyPartial ? " half" : "") + '" data-act="tick" data-card="' + id + '" aria-label="' + esc(allDone ? t.undo : t.sendBtn) + '">✓</button></div>';
  }
  function massHtml(g){
    var t = T(), id = "g-" + g.key.replace(/[^a-z0-9]/gi, "_"); st.groups[id] = g;
    var sel = st.ui.massSel[id] || {}, open = g.tasks.filter(function (x) { return !x.full; }), nsel = open.filter(function (x) { return sel[x.key + "|" + x.stage]; }).length;
    var text = g.products.map(function (p) { return (g.products.length > 1 ? "<b>" + esc(prodLabel(p)) + ":</b> " : "") + esc(g.texts[p] || ""); }).join("<br>");
    var chips = g.items.map(function (it) { return '<span class="it">' + esc(itemLabel(it[0])) + "</span>"; }).join(" ");
    var folded = isFolded(id);
    var h = '<div class="panel mass" id="' + id + '"><h3 class="ph"><button type="button" class="foldbtn" data-act="fold-panel" data-id="' + id + '" aria-expanded="' + (!folded) + '"><span class="chev">' + (folded ? "▸" : "▾") + '</span><div class="gtitle"><span class="gname">' + esc(g.stage) + " · " + esc(g.products.map(prodLabel).join(" + ")) + ' <span class="dsub">' + g.done + "/" + g.tasks.length + " " + esc(t.stSent) + "</span></span>"
      + (folded ? "" : '<span class="gtext">' + text + '</span><span class="items" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' + chips + "</span>") + "</div></button>"
      + (folded ? "" : '<div class="gtools"><button type="button" class="btn sm" data-act="copy-group" data-g="' + id + '">' + esc(t.copyNames) + "</button></div>") + "</h3>";
    if (folded) return h + "</div>";
    h += '<div class="ihead"><label><input type="checkbox" data-act="sel-all" data-g="' + id + '"' + (open.length && nsel === open.length ? " checked" : "") + (open.length ? "" : " disabled") + "> " + esc(t.selectAll) + '</label><span class="cnt">' + g.done + "/" + g.tasks.length + " " + esc(t.stSent) + "</span></div>";
    g.tasks.forEach(function (x) {
      var k = x.key + "|" + x.stage;
      h += '<div class="mrow' + (x.full ? " done" : "") + '"><input type="checkbox" data-act="sel" data-g="' + id + '" data-k="' + esc(k) + '"' + (x.full ? " disabled" : "") + (sel[k] && !x.full ? " checked" : "") + '><span class="prodchip">' + esc(prodLabel(x.product)) + "</span>"
        + '<span><div class="tag">' + esc(x.cust.tag || custLabel(x.cust)) + '</div><div class="meta">' + [x.cust.phone, x.cust.coll ? t.coll + " " + dm(x.cust.coll) : "", t.dueOn.replace("{d}", dm(x.due))].filter(Boolean).map(esc).join(" · ") + (x.late ? ' · <span class="pill p-late">' + esc(t.late) + "</span>" : "") + "</div></span>"
        + (x.done ? '<button type="button" class="btn sm" data-act="undo-one" data-k="' + esc(k) + '">' + esc(t.undo) + (x.partial ? " ½" : "") + "</button>" : "<span></span>") + "</div>";
    });
    h += '<div class="mfoot"><button type="button" class="btn good" data-act="send-group" data-g="' + id + '"' + (nsel ? "" : " disabled") + ">" + esc(fill(t.markSent, { n: nsel })) + '</button><span class="cnt">' + esc(open.length ? fill(t.sendTo, { n: open.length }) : t.massDone) + "</span></div></div>";
    return h;
  }

  /* ------------------------------------------------------------------ page: tasks */
  function pageTasks(){
    var t = T(), p = st.plan, h = "";
    st.cards = {}; st.groups = {};
    if (!st.demo && !apiUrl()) h += setupNotice();
    var td = p.tiles.today, m = p.tiles.mass;
    h += '<div class="tiles">' + tile(td.due ? (td.done === td.due ? "ok" : "acc") : "", td.done + "<small>/" + td.due + "</small>", t.tToday, fill(t.tTodayX, { d: td.done, n: td.due }), td.due ? td.done / td.due : 0)
      + tile(p.tiles.missed ? "bad" : "ok", String(p.tiles.missed), t.tMissed, t.tMissedX, null)
      + tile(m.groups ? (m.groupsDone === m.groups ? "ok" : "warn") : "", m.groupsDone + "<small>/" + m.groups + "</small>", t.tMass, fill(t.tMassX, { g: m.groupsDone, G: m.groups, p: m.peopleDone, P: m.people }), m.people ? m.peopleDone / m.people : 0) + "</div>";
    if (p.overdue.length) {
      h += '<button type="button" class="band" data-act="toggle-overdue"><span class="bn">' + p.overdue.length + '</span><span><div class="bt">' + esc(t.secOverdue) + '</div><div class="bs">' + esc(t.overdueHint) + (p.tiles.missedMass ? " · " + p.tiles.missedMass + " " + esc(t.missedMass) : "") + '</div></span><span class="chev">' + (st.ui.overdueOpen ? "▲" : "▼") + "</span></button>";
      if (st.ui.overdueOpen) h += '<div class="panel">' + cardsHtml(p.overdueRecent, "over") + (p.overdueOld.length ? (st.ui.foldOpen ? cardsHtml(p.overdueOld, "overold") + '<button type="button" class="more" data-act="fold">' + esc(t.hideOlder) + "</button>" : '<button type="button" class="more" data-act="fold">' + esc(fill(t.showOlder, { n: p.overdueOld.length })) + "</button>") : "") + "</div>";
    } else h += '<div class="band ok"><span class="bn">0</span><span><div class="bt">' + esc(t.secOverdue) + '</div><div class="bs">' + esc(t.nothingOver) + "</div></span></div>";
    var open = p.dueToday.filter(function (x) { return !x.full; }), done = p.dueToday.filter(function (x) { return x.full; });
    h += '<div class="panel">' + foldHead("today", esc(t.secToday) + (p.dueToday.length ? ' <span class="dsub">' + td.done + "/" + td.due + "</span>" : ""), t.todayHint);
    if (!isFolded("today")) h += (open.length ? cardsHtml(open, "today") : '<div class="empty' + (p.dueToday.length ? " good" : "") + '">' + esc(p.dueToday.length ? t.perfect : t.nothingToday) + "</div>") + (done.length ? '<div class="grpd">' + esc(t.secDone) + "</div>" + cardsHtml(done, "todaydone") : "");
    h += "</div>";
    var nUp = p.upcoming.reduce(function (n, u) { return n + u.tasks.length; }, 0);
    h += '<div class="panel">' + foldHead("upcoming", esc(t.secUp) + (nUp ? ' <span class="dsub">' + nUp + "</span>" : ""), t.upHint);
    if (!isFolded("upcoming")) h += (p.upcoming.length ? p.upcoming.map(function (u, i) { return '<div class="grpd">' + esc(dayName(u.day)) + "</div>" + cardsHtml(u.tasks, "up" + i); }).join("") : '<div class="empty">' + esc(t.nothingUp) + "</div>");
    h += "</div>";
    h += section(t.secMass, t.massHint, m.groups ? m.peopleDone + "/" + m.people : "");
    if (!p.mass.length) h += '<div class="panel"><div class="empty">' + esc(t.nothingMass) + "</div></div>"; else p.mass.forEach(function (g) { h += massHtml(g); });
    return h;
  }

  /* ------------------------------------------------------------------ page: members */
  function memberList(){
    var t = T(), q = Z.normName(st.ui.search), raw = st.ui.search.trim(), f = st.ui.cfilter, kind = st.ui.dateKind, from = st.ui.from, to = st.ui.to, sort = st.ui.sort;
    var list = st.cust.filter(function (c) {
      if (f === "fix") { if (!fixes(c).length) return false; }
      else if (f === "notag") { if (c.tag) return false; }
      else if (f !== "all" && c.product !== f) return false;
      if (from || to) { var d = kind === "coll" ? c.coll : c.dep; if (!d) return false; if (from && d < from) return false; if (to && d > to) return false; }
      if (q) { var hay = Z.normName(c.name + " " + c.tag + " " + c.phone + " " + (detailsOf(c).parent_name || "")); if (hay.indexOf(q) === -1 && String(c.phone).indexOf(raw) === -1) return false; }
      return true;
    });
    list.sort(function (a, b) {
      if (sort === "name") return custLabel(a).localeCompare(custLabel(b), "vi");
      if (sort === "dep") return (b.dep || "") < (a.dep || "") ? -1 : (b.dep || "") > (a.dep || "") ? 1 : b.row - a.row;
      if (sort === "coll") return (b.coll || "") < (a.coll || "") ? -1 : (b.coll || "") > (a.coll || "") ? 1 : b.row - a.row;
      return b.row - a.row;
    });
    return list;
  }
  function memberListHtml(){
    var t = T(), list = memberList(), h = "";
    if (!list.length) h += '<div class="empty">' + esc(t.noCust) + "</div>";
    list.slice(0, 300).forEach(function (c) {
      var fx = fixes(c);
      h += '<div class="lrow" data-act="open-cust" data-key="' + esc(c.key) + '"><div><div class="nm">' + esc(custLabel(c)) + (c.tag ? ' <span class="mono" style="font-weight:400;color:var(--muted);font-size:.78rem">' + esc(c.tag) + "</span>" : "") + '</div><div class="meta">' + [c.phone, prodLabel(c.product), c.dep ? t.dep + " " + dm(c.dep) : "", c.coll ? t.coll + " " + dm(c.coll) : t.lNoColl].filter(Boolean).map(esc).join(" · ") + "</div></div>"
        + '<div class="right">' + (fx.length ? '<span class="pill p-bad">' + fx.length + " " + esc(t.fFix.toLowerCase()) + "</span>" : "#" + esc(c.stt || c.row)) + "</div></div>";
    });
    if (list.length > 300) h += '<div class="empty">' + esc(fill(t.showing, { a: 300, b: list.length })) + "</div>";
    return '<div class="chips" style="justify-content:flex-end"><span class="cnt">' + esc(fill(t.showing, { a: list.length, b: st.cust.length })) + "</span></div>" + h;
  }
  function pageMembers(){
    var t = T(), f = st.ui.cfilter;
    var chips = [["all", t.fAll], ["MC", "MC"], ["Kính", prodLabel("Kính")], ["OK", prodLabel("OK")], ["Atropine", prodLabel("Atropine")], ["Exam", t.fExam], ["fix", t.fFix], ["notag", t.fNoTag]];
    var nfix = st.cust.filter(function (c) { return fixes(c).length; }).length;
    var h = '<input type="search" class="search" id="custSearch" placeholder="' + esc(t.search) + '" value="' + esc(st.ui.search) + '">';
    h += '<div class="panel"><div class="chips">' + chips.map(function (c) { return '<button type="button" data-act="cfilter" data-f="' + c[0] + '" aria-pressed="' + (f === c[0]) + '">' + esc(c[1]) + (c[0] === "fix" && nfix ? ' <span class="cn">' + nfix + "</span>" : "") + "</button>"; }).join("") + "</div>";
    h += '<div class="fbar"><span class="hint">' + esc(t.mDate) + '</span><select id="memKind"><option value="dep"' + (st.ui.dateKind === "dep" ? " selected" : "") + ">" + esc(t.mDep) + '</option><option value="coll"' + (st.ui.dateKind === "coll" ? " selected" : "") + ">" + esc(t.mColl) + "</option></select>"
      + '<span class="hint">' + esc(t.mFrom) + '</span><input type="date" id="memFrom" value="' + esc(st.ui.from) + '"><span class="hint">' + esc(t.mTo) + '</span><input type="date" id="memTo" value="' + esc(st.ui.to) + '">'
      + '<span class="sep"></span><span class="hint">' + esc(t.mSort) + '</span><select id="memSort">' + [["new", t.sortNew], ["name", t.sortName], ["dep", t.sortDep], ["coll", t.sortColl]].map(function (o) { return '<option value="' + o[0] + '"' + (st.ui.sort === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"
      + '<button type="button" data-act="mclear">' + esc(t.mClear) + "</button></div>";
    h += '<div id="memList">' + memberListHtml() + "</div></div>";
    return h;
  }
  function timelineHtml(c){
    var t = T(), idx = Z.doneIndex(st.tasks), ms = Z.milestones(c, { goLive: "", cadenceTab: st.cadence });
    if (!ms.length) return "";
    return '<h3 style="margin:14px 0 4px;font-size:.9rem">' + esc(t.timeline) + '</h3><div class="tl">' + ms.map(function (m) {
      var d = idx[c.key + "|" + m.stage], done = d && !d.undone_at, cls, lab;
      if (done) { cls = +d.score === 0.5 ? "partial" : "sent"; lab = +d.score === 0.5 ? t.stPartial : t.stSent; }
      else if (m.due < st.today) { cls = "missed"; lab = t.stMissed; }
      else if (m.open <= st.today) { cls = "today"; lab = m.due === st.today ? t.stToday : t.stOpen; }
      else { cls = ""; lab = t.stUp; }
      return '<div class="tr ' + cls + '"><i></i><span>' + esc(m.stage) + ' <span class="pill ' + (m.touch === "High" ? "p-high" : "p-low") + '">' + esc(m.touch === "High" ? t.high : t.low) + "</span> " + m.items.map(function (it) { return esc(itemLabel(it[0])); }).join(", ") + '</span><span class="d">' + esc(dm(m.due)) + " · " + esc(lab) + "</span></div>";
    }).join("") + "</div>";
  }
  function custSheetHtml(c, editing){
    var t = T(), d = detailsOf(c), fx = fixes(c), pending = (d.pending_tag || "").trim();
    var h = "<h2>" + esc(custLabel(c)) + '</h2><div class="sub">' + esc(t.lRow + " " + (c.stt || c.row) + " · " + prodLabel(c.product) + " · " + c.da) + "</div>";
    if (fx.length) h += '<div class="setup" style="margin-top:10px">' + fx.map(function (k) { return esc(t.fix[k]); }).join("<br>") + "</div>";
    if (pending && pending !== c.tag) h += '<div class="note" style="margin-top:10px"><p><b>' + esc(t.pendingTag) + ":</b> " + esc(pending) + "</p></div>";
    if (!editing) {
      h += '<dl class="kv"><dt>' + esc(t.lTag) + '</dt><dd class="mono">' + esc(c.tag || "—") + "</dd><dt>" + esc(t.lPhone) + "</dt><dd>" + (tel(c.phone) || "—") + "</dd><dt>" + esc(t.lDep) + "</dt><dd>" + esc(dmy(c.dep) || "—") + "</dd><dt>" + esc(t.lColl) + "</dt><dd>" + esc(dmy(c.coll) || "—") + "</dd>"
        + "<dt>" + esc(t.lStatus) + "</dt><dd>" + esc(c.status || "—") + "</dd><dt>" + esc(t.lDob) + "</dt><dd>" + esc(dmy(c.dob) || "—") + "</dd><dt>" + esc(t.lParent) + "</dt><dd>" + esc([d.parent_name, d.relation].filter(Boolean).join(" · ") || "—") + "</dd><dt>" + esc(t.lGender) + "</dt><dd>" + esc(t.genders[d.gender] || d.gender || "—") + "</dd>"
        + (c.kid2 ? "<dt>" + esc(t.lKid2) + "</dt><dd>" + esc(c.kid2) + "</dd>" : "") + "<dt>" + esc(t.lNote) + "</dt><dd>" + esc(c.note || "—") + "</dd></dl>";
      if (st.role !== "reviewer") h += '<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary" data-act="edit-cust" data-key="' + esc(c.key) + '">' + esc(t.edit) + "</button></div>";
      h += timelineHtml(c);
    } else {
      var rel = d.relation || "", relKnown = Z.RELATIONS.indexOf(rel) !== -1 || !rel;
      h += '<form id="custForm" data-key="' + esc(c.key) + '"><div class="row2"><div class="field"><label>' + esc(t.lDep) + '</label><input type="date" name="dep" value="' + esc(c.dep) + '"></div><div class="field"><label>' + esc(t.lColl) + '</label><input type="date" name="coll" value="' + esc(c.coll) + '"></div></div>'
        + '<div class="row2"><div class="field"><label>' + esc(t.lProduct) + '</label><select name="product">' + Z.PRODUCTS.map(function (p) { return '<option value="' + p + '"' + (c.product === p ? " selected" : "") + ">" + esc(prodLabel(p)) + "</option>"; }).join("") + '</select></div><div class="field"><label>' + esc(t.lPhone) + '</label><input type="tel" name="phone" value="' + esc(c.phone) + '"></div></div>'
        + '<div class="field"><label>' + esc(t.lTag) + '</label><input type="text" name="tag" value="' + esc(pending && pending !== c.tag ? pending : c.tag) + '"><p class="hint">' + esc(t.tagChangeNote) + "</p></div>"
        + '<div class="row2"><div class="field"><label>' + esc(t.lParent) + '</label><input type="text" name="parent_name" value="' + esc(d.parent_name || "") + '"></div><div class="field"><label>' + esc(t.lRel) + '</label><select name="relation">' + ['<option value="">—</option>'].concat(Z.RELATIONS.map(function (r) { return '<option value="' + esc(r) + '"' + (rel === r ? " selected" : "") + ">" + esc(r === "Khác" ? t.other : r) + "</option>"; })).join("") + (relKnown ? "" : '<option value="' + esc(rel) + '" selected>' + esc(rel) + "</option>") + "</select></div></div>"
        + '<div class="row2"><div class="field"><label>' + esc(t.lGender) + '</label><select name="gender">' + ["", "Nam", "Nữ"].map(function (g) { return '<option value="' + g + '"' + ((d.gender || "") === g ? " selected" : "") + ">" + esc(t.genders[g]) + "</option>"; }).join("") + '</select></div><div class="field"><label>' + esc(t.lDob) + '</label><input type="date" name="dob" value="' + esc(c.dob) + '"></div></div>'
        + '<div class="field"><label>' + esc(t.lNote) + '</label><textarea name="note">' + esc(c.note) + "</textarea></div>"
        + '<div style="display:flex;gap:8px"><button type="submit" class="btn primary">' + esc(t.save) + '</button><button type="button" class="btn" data-act="open-cust" data-key="' + esc(c.key) + '">' + esc(t.cancel) + "</button></div></form>";
    }
    return h;
  }
  function openSheet(html){ $("sheetBody").innerHTML = html; $("sheet").classList.remove("gone"); document.body.style.overflow = "hidden"; }
  function closeSheet(){ $("sheet").classList.add("gone"); document.body.style.overflow = ""; st.ui.sheetKey = ""; }

  /* ------------------------------------------------------------------ page: add */
  function newAddForm(pre){
    var f = { child: "", gender: "", parent: "", relation: "", relText: "", dob: "", dep: st.today, depNA: false, coll: "", product: "", tag: "", tagManual: false, noZalo: false, note: "", code: "", allowDuplicate: false, key: "", phone: "", sibling: "" };
    if (pre) Object.keys(pre).forEach(function (k) { f[k] = pre[k]; });
    f.tag = f.tagManual ? f.tag : suggest(f);
    return f;
  }
  function suggest(f){
    var prod = f.depNA ? "Exam" : f.product;
    return Z.suggestTag({ product: prod, dep: f.depNA ? "" : f.dep, coll: f.depNA ? "" : f.coll, relation: f.relation, relationText: f.relText, child: f.child, phone: f.phone, date: st.today });
  }
  function pageAdd(){
    var t = T();
    if (st.ui.addDone) {
      var dn = st.ui.addDone;
      return '<div class="panel donecard"><div class="big">' + (dn.parked ? "📥" : "✅") + "</div><h2>" + esc(dn.parked ? t.aParked : t.aRecorded) + "</h2><p>" + esc(fill(dn.parked ? t.aParkedX : t.aRecordedX, { n: dn.name, r: dn.row })) + '</p><div class="acts"><button type="button" class="btn primary" data-act="add-another">' + esc(t.aAnother) + '</button><a class="btn" href="#/overview">' + esc(t.aBack) + '</a><button type="button" class="btn danger" data-act="add-undo"' + (st.busy ? " disabled" : "") + ">" + esc(t.aUndo) + "</button></div></div>" + importSection("members");
    }
    if (!st.ui.addForm) st.ui.addForm = newAddForm(st.ui.addPrefill); st.ui.addPrefill = null;
    var f = st.ui.addForm, dup = !f.allowDuplicate && f.child && st.cust.filter(function (c) { return c.base === Z.customerKey(f.phone, f.child); })[0];
    function opts(name, list, val, labels){ return '<div class="opts">' + list.map(function (v) { return '<button type="button" data-act="add-opt" data-name="' + name + '" data-v="' + esc(v) + '" aria-pressed="' + (val === v) + '">' + esc(labels ? labels(v) : v) + "</button>"; }).join("") + "</div>"; }
    var h = '<div class="panel">' + foldHead("addform", esc(t.aSection) + (f.code ? ' <span class="hint">' + esc(f.code) + "</span>" : ""), "") + (isFolded("addform") ? "</div>" : '<form id="addForm" class="pad" autocomplete="off">');
    if (isFolded("addform")) return h + importSection("members");
    h += '<div class="row2"><div class="field' + (f.err && f.err.child ? " err" : "") + '"><label>' + esc(t.aChild) + ' <span class="req">*</span></label><input type="text" name="child" value="' + esc(f.child) + '"></div><div class="field"><label>' + esc(t.aGender) + "</label>" + opts("gender", ["Nam", "Nữ"], f.gender, function (v) { return t.genders[v]; }) + "</div></div>";
    h += '<div class="row2"><div class="field' + (f.err && f.err.parent ? " err" : "") + '"><label>' + esc(t.aParent) + '</label><input type="text" name="parent" value="' + esc(f.parent) + '"></div><div class="field"><label>' + esc(t.lPhone) + ' <span class="req">*</span></label><input type="tel" name="phone" value="' + esc(f.phone) + '"' + (f.err && f.err.phone ? ' class="bad"' : "") + "></div></div>";
    h += '<div class="field"><label>' + esc(t.aRel) + "</label>" + opts("relation", Z.RELATIONS, f.relation, relLabel) + (f.relation === "Khác" ? '<input type="text" name="relText" style="margin-top:8px" placeholder="' + esc(t.relText) + '" value="' + esc(f.relText) + '">' : "") + "</div>";
    h += '<div class="row2"><div class="field"><label>' + esc(t.aDob) + '</label><input type="date" name="dob" value="' + esc(f.dob) + '"></div><div class="field' + (f.err && f.err.dep ? " err" : "") + '"><label>' + esc(t.aDep) + ' <span class="req">*</span></label><input type="date" name="dep" value="' + esc(f.dep) + '"' + (f.depNA ? " disabled" : "") + '><label style="display:flex;gap:6px;align-items:center;margin-top:6px;text-transform:none;letter-spacing:0;font-family:inherit;font-size:.82rem"><input type="checkbox" name="depNA"' + (f.depNA ? " checked" : "") + "> " + esc(t.aNA) + "</label></div></div>";
    h += '<div class="row2"><div class="field"><label>' + esc(t.aColl) + '</label><input type="date" name="coll" value="' + esc(f.coll) + '"' + (f.depNA ? " disabled" : "") + '></div><div class="field' + (f.err && f.err.product ? " err" : "") + '"><label>' + esc(t.aProduct) + ' <span class="req">*</span></label>' + opts("product", Z.PRODUCTS, f.depNA ? "Exam" : f.product, prodLabel) + "</div></div>";
    h += '<div class="field' + (f.err && f.err.tag ? " err" : "") + '"><label>' + esc(t.aTag) + ' <span class="req">*</span></label><input type="text" name="tag" value="' + esc(f.tag) + '"' + (f.noZalo ? " disabled" : "") + '><p class="hint">' + esc(t.aTagHint) + '</p><label style="display:flex;gap:6px;align-items:center;margin-top:6px;text-transform:none;letter-spacing:0;font-family:inherit;font-size:.82rem"><input type="checkbox" name="noZalo"' + (f.noZalo ? " checked" : "") + "> " + esc(t.aNoZalo) + "</label></div>";
    h += '<div class="field"><label>' + esc(t.aNote) + '</label><input type="text" name="note" value="' + esc(f.note) + '"></div>';
    if (f.sibling) h += '<p class="hint">' + esc(fill(t.iSibling, { n: f.sibling })) + "</p>";
    if (dup) h += '<div class="setup">' + esc(fill(t.dupWarn, { r: dup.stt || dup.row })) + "</div>";
    h += '<button type="submit" class="btn primary block" id="addSubmit"' + (st.busy ? " disabled" : "") + ">" + esc(st.busy ? t.aSubmitting : t.aSubmit) + "</button></form></div>";
    return h + importSection("members");
  }
  function readAddForm(){
    var form = $("addForm"), f = st.ui.addForm; if (!form) return f;
    ["child", "parent", "phone", "relText", "dob", "dep", "coll", "tag", "note"].forEach(function (k) { var el = form.elements[k]; if (el) f[k] = el.value; });
    f.depNA = !!form.elements.depNA.checked; f.noZalo = !!form.elements.noZalo.checked;
    return f;
  }
  function submitAdd(){
    var t = T(), f = readAddForm(); f.err = {};
    f.child = Z.cleanCell(f.child); f.parent = Z.cleanCell(f.parent); f.phone = Z.normPhone(f.phone) || f.phone.trim();
    var product = f.depNA ? "Exam" : f.product;
    if (!f.child) f.err.child = 1; if (!product) f.err.product = 1; if (!f.phone) f.err.phone = 1;
    if (!f.depNA && !f.dep) f.err.dep = 1; if (!f.noZalo && !f.tag.trim()) f.err.tag = 1;
    if (Object.keys(f.err).length) { render(); toast(T().req, true); return; }
    st.busy = true; render();
    var p;
    if (f.noZalo) {
      var code = f.code || ("MAN-" + Date.now());
      p = apiPost({ action: "storeImports", orders: [{ code: code, deposit: f.depNA ? "" : f.dep, appointment: f.coll, status: f.coll ? "DONE" : "", name: f.child, phone: f.phone, lens: "", product: product, state: "parked", result: f.code ? "" : "manual", collected: f.coll, note: f.note || "" }] })
        .then(function () { st.ui.addDone = { parked: true, name: f.child, code: code, manual: !f.code, form: f }; });
    } else {
      var fields = { name: f.child, phone: f.phone, product: product, tag: f.tag.trim(), dep: f.depNA ? "" : f.dep, coll: f.depNA ? "" : f.coll, dob: f.dob, note: f.note, da: st.da, kid2: f.kid2 || "" };
      if (f.allowDuplicate) { fields.allowDuplicate = true; fields.key = f.key || (Z.customerKey(f.phone, f.child) + "#" + Z.yymmdd(f.dep || st.today)); }
      var details = { parent_name: f.parent, relation: f.relation === "Khác" ? f.relText : f.relation, gender: f.gender };
      p = apiPost({ action: "addCustomer", fields: fields, details: details }).then(function (res) {
        st.ui.addDone = { parked: false, name: f.child, row: res.row, ref: { row: res.row, name: f.child, phone: f.phone }, code: f.code, form: f };
        if (f.code) return apiPost({ action: "storeImports", orders: [{ code: f.code, state: "confirmed", result: "added:" + res.key, collected: fields.coll, product: product, note: f.note || "" }] });
      });
    }
    p.then(function () { return reload(true); }).then(function () { st.busy = false; st.ui.addForm = null; render(); })
      .catch(function (e) { st.busy = false; render(); toast(fill(t.errToast, { e: e.message }), true); });
  }

  /* ------------------------------------------------------------------ page: pending collection */
  function expectedFor(c){
    var hit = st.imports.filter(function (i) { return i.status && i.status !== "DONE" && i.appointment && Z.normPhone(i.phone) === c.phone && c.names.some(function (n) { return Z.normName(n) === Z.normName(i.name); }); })[0];
    return hit ? Z.toISO(hit.appointment) : "";
  }
  function pendingSection(){
    var t = T(), list = st.cust.filter(function (c) { return c.dep && !c.coll && !c.exam; }).sort(function (a, b) { return a.dep < b.dep ? -1 : a.dep > b.dep ? 1 : 0; });
    var h = '<div class="panel">' + foldHead("pending", esc(t.pTitle) + ' <span class="dsub">' + list.length + "</span>", t.pHint);
    if (isFolded("pending")) return h + "</div>";
    if (!list.length) h += '<div class="empty">' + esc(t.pNone) + "</div>";
    list.forEach(function (c) {
      var ex = expectedFor(c), id = "p-" + c.row;
      h += '<div class="prow" id="' + id + '"><div><div class="nm" style="font-weight:600">' + esc(custLabel(c)) + ' <span class="mono" style="font-weight:400;color:var(--muted);font-size:.78rem">' + esc(c.tag) + '</span></div><div class="meta" style="font-size:.76rem;color:var(--muted)">' + [c.phone, prodLabel(c.product), t.dep + " " + dm(c.dep), ex ? fill(t.pExpected, { d: dm(ex) }) : ""].filter(Boolean).map(esc).join(" · ") + "</div></div>"
        + '<div class="act"><label style="display:flex;gap:6px;align-items:center;font-size:.84rem"><input type="checkbox" data-act="p-check" data-row="' + c.row + '"> ' + esc(t.pCollected) + '</label><input type="date" data-pdate="' + c.row + '" value="' + esc(ex && ex <= st.today ? ex : st.today) + '" max="' + esc(st.today) + '" min="' + esc(c.dep) + '"><button type="button" class="btn primary sm" data-act="p-submit" data-key="' + esc(c.key) + '" disabled>' + esc(t.pSubmit) + "</button></div></div>";
    });
    return h + "</div>";
  }

  /* ------------------------------------------------------------------ page: tag updates */
  function tagsSection(){
    var t = T(), list = tagProposals();
    var h = '<div class="panel">' + foldHead("tags", esc(t.tTitle) + ' <span class="dsub">' + list.length + "</span>", t.tHint);
    if (isFolded("tags")) return h + "</div>";
    if (!list.length) h += '<div class="empty">' + esc(t.tNone) + "</div>";
    list.forEach(function (p) {
      h += '<div class="tagup"><div style="font-weight:600">' + esc(custLabel(p.cust)) + ' <span class="hint">' + esc(t[p.why]) + '</span></div><div class="old">' + esc(p.from || "—") + '</div><div class="new">' + esc(p.to) + '</div><div class="act"><button type="button" class="btn sm" data-act="tag-copy" data-tag="' + esc(p.to) + '">' + esc(t.tCopy) + '</button><button type="button" class="btn good sm" data-act="tag-confirm" data-key="' + esc(p.cust.key) + '" data-tag="' + esc(p.to) + '">' + esc(t.tConfirm) + '</button><button type="button" class="btn sm" data-act="tag-skip" data-key="' + esc(p.cust.key) + '">' + esc(t.tSkip) + "</button></div></div>";
    });
    return h + "</div>";
  }

  function pageCollections(){ return pendingSection() + tagsSection() + importSection("collections"); }

  /* ------------------------------------------------------------------ import (shared by Add members and Glass collections) */
  /* one upload serves both pages: the parsed orders stay in st.ui.impRaw and are
     re-classified against the current member list whenever a section renders */
  function classifyImport(){
    var raw = st.ui.impRaw; if (!raw) return null;
    var idx = Z.indexCustomers(st.cust), parkedIdx = {};
    st.imports.forEach(function (i) { if (i.state !== "parked") return; var k = Z.normPhone(i.phone) + "|" + Z.normName(i.name); if (k !== "|") (parkedIdx[k] = parkedIdx[k] || []).push(i); });
    var prev = st.ui.imp || { edits: {}, sel: {} }, edits = prev.edits, sel = prev.sel;
    var orders = Z.dedupe(raw.orders, st.imports), groups = { new: [], coll: [], info: [] }, why = {}, seenNew = {};
    orders.sort(function (a, b) { return a.dep < b.dep ? -1 : a.dep > b.dep ? 1 : 0; });      /* oldest first while classifying */
    function info(o, w){ o.why = w; why[w] = (why[w] || 0) + 1; groups.info.push(o); }
    function near(a, b){ return a && b && Math.abs(Z.diffDays(a, b)) <= 30; }
    orders.forEach(function (o) {
      o.match = Z.matchOrder(o, idx);
      var k = o.match.kind, dk = o.phone + "|" + o.nameNorm;
      if (o.prior && o.prior.state === "dismissed") return info(o, "dismissed");
      if (o.seen === "done") return info(o, "done");
      if (k === "new" || k === "sibling" || k === "repeat") {
        if (o.prior && o.prior.state === "parked" && o.seen !== "changed") return info(o, "parked");
        var parkedSame = (parkedIdx[dk] || []).filter(function (i) { return i.code !== o.code && near(Z.toISO(i.deposit), o.dep); });
        if (parkedSame.length) return info(o, "parkedOther");
        /* the same child twice within a month is one purchase; months apart is a new one */
        if ((seenNew[dk] || []).some(function (d) { return near(d, o.dep); })) return info(o, "dup");
        (seenNew[dk] = seenNew[dk] || []).push(o.dep); groups.new.push(o);
        if (!edits[o.code]) {
          var crm = k === "repeat" ? o.match.cust : null, det = crm ? detailsOf(crm) : {};
          edits[o.code] = { child: o.name, parent: det.parent_name || "", relation: det.relation || "", relText: "", product: o.product, phone: o.phone, dep: o.dep, coll: o.collected, tag: "", tagManual: false, note: "",
                            sibling: k === "sibling" ? o.match.cust : null, repeatOf: crm };
          sel[o.code] = false;                       /* the DA ticks the ones she has on Zalo; the tag is suggested then */
        }
      } else if ((k === "update" || k === "update-checkphone") && o.collected) {
        groups.coll.push(o); if (!edits[o.code]) { edits[o.code] = { coll: o.collected }; sel[o.code] = !o.futureDone; }
      } else info(o, k);
    });
    groups.new.sort(function (a, b) { return a.dep < b.dep ? 1 : a.dep > b.dep ? -1 : 0; });   /* newest first on screen */
    groups.coll.sort(function (a, b) { return (a.collected || a.dep) < (b.collected || b.dep) ? 1 : -1; });
    st.ui.imp = { orders: orders, groups: groups, edits: edits, sel: sel, why: why, sheetName: raw.sheetName, skipped: raw.skipped, fileName: raw.fileName };
    return st.ui.imp;
  }
  function impSuggest(e){ return Z.suggestTag({ product: e.product, dep: e.dep, coll: e.coll, relation: e.relation, relationText: e.relText, child: e.child, phone: e.phone }); }
  function importSection(mode){
    var t = T(), id = "imp-" + mode, title = mode === "members" ? t.iTitleM : t.iTitleC;
    var h = '<div class="panel">' + foldHead(id, esc(title), t.iHint);
    if (isFolded(id)) return h + "</div>";
    if (!st.ui.impRaw) {
      h += '<div class="pad"><label class="drop" id="drop"><input type="file" id="impFile" accept=".xlsx,.xls,.csv,.txt,.tsv">' + esc(st.ui.impStatus || t.iDrop) + "</label>"
        + '<div class="row2" style="margin-top:14px"><div class="field"><label>' + esc(t.iFrom) + '</label><input type="date" id="impFrom" value="' + esc(st.ui.impFrom || "") + '"></div><div class="field"><label>' + esc(t.iTo) + '</label><input type="date" id="impTo" value="' + esc(st.ui.impTo || "") + '"></div></div><p class="hint">' + esc(t.iRangeHint) + " " + esc(fill(t.iCutoff, { d: dmy(st.settings.import_cutoff || "") })) + "</p>"
        + (st.ui.impError ? '<div class="setup">' + esc(st.ui.impError) + "</div>" : "") + "</div></div>";
      return h;
    }
    var imp = classifyImport(), sel = imp.sel;
    h += '<div class="ihead"><span>' + esc(fill(t.iLoaded, { f: imp.fileName, n: imp.orders.length, d: dmy(st.settings.import_cutoff || "") })) + '</span><button type="button" class="btn sm" data-act="imp-reset" style="margin-left:auto">' + esc(t.iChange) + "</button></div>";
    /* the other page's share of the same upload */
    var other = mode === "members" ? imp.groups.coll.length : imp.groups.new.length;
    if (other) h += '<div class="ihead"><a class="xpage" href="' + (mode === "members" ? "#/collections" : "#/add") + '">' + esc(fill(mode === "members" ? t.iAlsoColl : t.iAlsoNew, { n: other })) + " " + esc(mode === "members" ? t.nav.collections : t.nav.add) + "</a></div>";
    if (st.ui.impResult[mode]) h += '<div class="note" style="margin:10px 16px"><p>' + esc(st.ui.impResult[mode].text) + (st.ui.impResult[mode].undo ? ' <button type="button" class="btn danger sm" data-act="imp-undo" data-mode="' + mode + '"' + (st.busy ? " disabled" : "") + ">" + esc(t.iUndoWrite) + "</button>" : "") + "</p>" + (st.ui.impResult[mode].errors.length ? '<p style="margin-top:6px;color:var(--bad)">' + st.ui.impResult[mode].errors.map(esc).join("<br>") + "</p>" : "") + "</div>";
    function selAll(codes){ var all = codes.length && codes.every(function (c) { return sel[c]; }); return '<div class="ihead"><label><input type="checkbox" data-act="imp-selall" data-codes="' + esc(codes.join(",")) + '"' + (all ? " checked" : "") + (codes.length ? "" : " disabled") + "> " + esc(t.selectAll) + '</label><span class="cnt">' + codes.length + "</span></div>"; }
    if (mode === "members") {
      var news = imp.groups.new;
      h += '<div class="grpd">' + esc(t.iNew) + ' · <span style="text-transform:none;letter-spacing:0">' + esc(t.iNewHint2) + '</span></div><div class="ihead"><span class="cnt" style="margin-left:0">' + news.length + "</span></div>";
      if (!news.length) h += '<div class="empty">' + esc(t.iNothing) + "</div>";
      news.forEach(function (o) {
        var e = imp.edits[o.code], m = o.match;
        h += '<div class="irow' + (sel[o.code] ? " on" : "") + '"><label class="zck"><input type="checkbox" data-act="imp-sel" data-code="' + esc(o.code) + '"' + (sel[o.code] ? " checked" : "") + '><span>' + esc(t.aZaloAdded) + '</span></label><div><div class="nm">' + esc(o.name || "?") + ' <span class="mono" style="font-weight:400;color:var(--muted);font-size:.78rem">' + esc(o.code) + "</span></div>"
          + '<div class="meta">' + [o.phone, o.lens || "—", t.dep + " " + dm(o.dep), o.collected ? t.coll + " " + dm(o.collected) : (o.expected ? esc(o.status) + " · " + dm(o.expected) : o.status)].filter(Boolean).map(esc).join(" · ")
          + (m.kind === "sibling" ? ' · <span class="pill p-warn">' + esc(fill(t.iSibling, { n: custLabel(m.cust) })) + "</span>" : "") + (m.kind === "repeat" ? ' · <span class="pill p-accent">' + esc(fill(t.iRepeatOf, { d: dm(m.cust.coll) })) + "</span>" : "") + (o.seen === "changed" ? ' · <span class="pill p-accent">' + esc(t.iChanged) + "</span>" : "") + (o.futureDone ? ' · <span class="pill p-bad">' + esc(t.iFuture) + "</span>" : "") + "</div>"
          + '<div class="edit"><div><label>' + esc(t.aChild) + '</label><input type="text" data-imp="child" data-code="' + esc(o.code) + '" value="' + esc(e.child) + '"' + (e.child ? "" : ' class="bad"') + "></div>"
          + "<div><label>" + esc(t.aParent) + '</label><input type="text" data-imp="parent" data-code="' + esc(o.code) + '" value="' + esc(e.parent) + '"></div>'
          + "<div><label>" + esc(t.aRel) + '</label><select data-imp="relation" data-code="' + esc(o.code) + '"><option value="">' + esc(t.iPick) + "</option>" + Z.RELATIONS.map(function (r) { return '<option value="' + esc(r) + '"' + (e.relation === r ? " selected" : "") + ">" + esc(relLabel(r)) + "</option>"; }).join("") + "</select></div>"
          + "<div><label>" + esc(t.aProduct) + '</label><select data-imp="product" data-code="' + esc(o.code) + '"' + (e.product ? "" : ' class="bad"') + '><option value="">' + esc(t.iPick) + "</option>" + Z.PRODUCTS.map(function (p) { return '<option value="' + p + '"' + (e.product === p ? " selected" : "") + ">" + esc(prodLabel(p)) + "</option>"; }).join("") + "</select></div>"
          + "<div><label>" + esc(t.lPhone) + '</label><input type="tel" data-imp="phone" data-code="' + esc(o.code) + '" value="' + esc(e.phone) + '"></div>'
          + "<div><label>" + esc(t.aDep) + '</label><input type="date" data-imp="dep" data-code="' + esc(o.code) + '" value="' + esc(e.dep) + '"></div>'
          + "<div><label>" + esc(t.aColl) + '</label><input type="date" data-imp="coll" data-code="' + esc(o.code) + '" value="' + esc(e.coll) + '"></div>'
          + '<div class="tagline"><label>' + esc(t.aTag) + '</label><input type="text" data-imp="tag" data-code="' + esc(o.code) + '" value="' + esc(e.tag) + '"' + (e.tag || !sel[o.code] ? "" : ' class="bad"') + ' placeholder="' + esc(t.iTagAfterTick) + '"></div>'
          + '<div class="tagline"><label>' + esc(t.lNote) + '</label><input type="text" data-imp="note" data-code="' + esc(o.code) + '" value="' + esc(e.note || "") + '"></div></div></div></div>';
      });
    } else {
      var colls = imp.groups.coll;
      h += '<div class="grpd">' + esc(t.iColl) + ' · <span style="text-transform:none;letter-spacing:0">' + esc(t.iCollHint) + "</span></div>" + selAll(colls.map(function (o) { return o.code; }));
      if (!colls.length) h += '<div class="empty">' + esc(t.iNothing) + "</div>";
      colls.forEach(function (o) {
        var e = imp.edits[o.code], c = o.match.cust;
        h += '<div class="irow"><input type="checkbox" data-act="imp-sel" data-code="' + esc(o.code) + '"' + (sel[o.code] ? " checked" : "") + '><div><div class="nm">' + esc(custLabel(c)) + ' <span class="mono" style="font-weight:400;color:var(--muted);font-size:.78rem">' + esc(c.tag) + "</span></div>"
          + '<div class="meta">' + [c.phone, prodLabel(c.product), t.dep + " " + dm(c.dep || o.dep), o.lens].filter(Boolean).map(esc).join(" · ") + (o.match.checkphone ? ' · <span class="pill p-warn">' + esc(fill(t.iCheckPhone, { p: o.phone })) + "</span>" : "") + (o.futureDone ? ' · <span class="pill p-bad">' + esc(t.iFuture) + "</span>" : "") + "</div>"
          + '<div class="edit"><div><label>' + esc(t.aColl) + '</label><input type="date" data-imp="coll" data-code="' + esc(o.code) + '" value="' + esc(e.coll) + '" max="' + esc(st.today) + '"></div></div></div></div>';
      });
    }
    var whyLine = Object.keys(imp.why).map(function (w) { return imp.why[w] + " " + (t.iWhy[w] || w); }).join(" · ");
    h += '<div class="grpd">' + esc(t.iInfo) + ' · ' + imp.groups.info.length + (whyLine ? ' <span style="text-transform:none;letter-spacing:0">(' + esc(whyLine) + ")</span>" : "") + "</div>";
    var codes = (mode === "members" ? imp.groups.new : imp.groups.coll).map(function (o) { return o.code; }), nsel = codes.filter(function (c) { return sel[c]; }).length;
    h += '<div class="mfoot"><button type="button" class="btn primary" id="impSubmit-' + mode + '" data-act="imp-submit" data-mode="' + mode + '"' + (nsel && !st.busy ? "" : " disabled") + ">" + esc(st.busy ? t.iSubmitting : fill(mode === "members" ? t.iConfirmM : t.iConfirm, { n: nsel })) + "</button></div></div>";
    return h;
  }
  function impCount(){
    if (!st.ui.imp) return;
    ["members", "collections"].forEach(function (mode) {
      var b = $("impSubmit-" + mode); if (!b) return;
      var codes = (mode === "members" ? st.ui.imp.groups.new : st.ui.imp.groups.coll).map(function (o) { return o.code; }), n = codes.filter(function (c) { return st.ui.imp.sel[c]; }).length;
      b.disabled = !n || st.busy; b.textContent = fill(mode === "members" ? T().iConfirmM : T().iConfirm, { n: n });
    });
  }
  /* the Excel reader ships with the page (zalo/vendor); the CDNs are only fallbacks */
  var XLSX_SRC = ["vendor/xlsx.full.min.js?v=" + VERSION, "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"];
  function loadScript(list){ return new Promise(function (res, rej) {
    if (window.XLSX) return res();
    var i = 0, done = false, timer = setTimeout(function () { if (!done) { done = true; rej(new Error(T().iLibFail)); } }, 30000);
    (function next() { if (done) return; if (i >= list.length) { done = true; clearTimeout(timer); return rej(new Error(T().iLibFail)); }
      var sc = document.createElement("script"); sc.src = list[i++]; sc.onload = function () { if (!done) { done = true; clearTimeout(timer); res(); } }; sc.onerror = next; document.head.appendChild(sc); })();
  }); }
  function nextTick(v){ return new Promise(function (res) { setTimeout(function () { res(v); }, 30); }); }
  /* Text saved by Excel can be UTF-8 (with or without BOM), UTF-16 ("Unicode Text") or the
     Windows Vietnamese code page (plain "CSV"); tried in that order. */
  function decodeText(ab){
    var b = new Uint8Array(ab);
    function dec(label, fatal){ try { return new TextDecoder(label, { fatal: !!fatal }).decode(b); } catch (e) { return null; } }
    if (b[0] === 0xFF && b[1] === 0xFE) return dec("utf-16le");
    if (b[0] === 0xFE && b[1] === 0xFF) return dec("utf-16be");
    if (b.length > 3 && b[0] !== 0 && b[1] === 0 && b[3] === 0) return dec("utf-16le");
    var t = dec("utf-8", true); if (t !== null) return t;
    return dec("windows-1258") || dec("windows-1252") || dec("utf-8");
  }
  /* Resolves to [{name, rows}]: the order tab in full, or, when no tab has the header, the first
     rows of every tab so the error can say what was seen. */
  function readWorkbook(file){
    var name = file.name.toLowerCase();
    if (/\.(csv|txt|tsv)$/.test(name)) return file.arrayBuffer().then(function (ab) { return [{ name: "csv", rows: Z.parseCSV(decodeText(ab)) }]; });
    st.ui.impStatus = T().iLibLoading; render();
    return loadScript(XLSX_SRC).then(function () { st.ui.impStatus = fill(T().iReading, { f: file.name }); render(); return nextTick(); }).then(function () { return file.arrayBuffer(); }).then(function (ab) {
      var X = window.XLSX, peek = X.read(ab, { type: "array", bookSheets: true }), names = peek.SheetNames || [], probed = {};
      var target = names.filter(function (n) { return /^\s*so\s+ttksct\s*$/i.test(Z.stripAccents(n)); })[0] || null;
      function rowsOf(wb, n){ return X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }); }
      function hasHeader(n){ var f = Z.findOrderSheet([{ name: n, rows: probed[n] || [] }]); return !!(f && f.header >= 0); }
      if (target) probed[target] = rowsOf(X.read(ab, { type: "array", sheets: [target], sheetRows: Z.HEADER_LOOK }), target);
      if (!(target && hasHeader(target))) {
        var probe = X.read(ab, { type: "array", sheetRows: Z.HEADER_LOOK });
        probe.SheetNames.forEach(function (n) { probed[n] = rowsOf(probe, n); });
        target = names.filter(hasHeader)[0] || null;
      }
      if (!target) return names.map(function (n) { return { name: n, rows: probed[n] || [] }; });
      var wb = X.read(ab, { type: "array", cellDates: true, sheets: [target] });
      return [{ name: target, rows: rowsOf(wb, target) }];
    });
  }
  /* for the "could not read" message: tab names and the first row with three filled cells */
  function seenText(sheets){
    var names = (sheets || []).map(function (s) { return s.name; }).filter(Boolean), first = "";
    (sheets || []).forEach(function (s) { if (first) return; for (var r = 0; r < Math.min(Z.HEADER_LOOK, (s.rows || []).length); r++) {
      var cells = (s.rows[r] || []).map(function (c) { return String(c === undefined || c === null ? "" : c).replace(/\s+/g, " ").trim(); }).filter(Boolean);
      if (cells.length >= 3) { first = cells.slice(0, 8).join(" | ").slice(0, 120); break; } } });
    return fill(T().iReadAs, { tabs: names.join(", ").slice(0, 80) || "—", row: first || "—" });
  }
  function importFile(file){
    var t = T(); st.ui.impError = ""; st.ui.impStatus = t.iParsing; render();
    st.ui.impFrom = ($("impFrom") || {}).value || st.ui.impFrom; st.ui.impTo = ($("impTo") || {}).value || st.ui.impTo;
    Promise.resolve().then(function () { return readWorkbook(file); }).then(function (sheets) {
      var found = Z.findOrderSheet(sheets);
      if (!found || found.header < 0) throw new Error(t.iNoSheet + " " + seenText(sheets));
      var cutoff = st.settings.import_cutoff || "", all = Z.parseOrders(found.rows.slice(found.header + 1), { today: st.today, map: found.map }), kept = all.filter(function (o) { return !cutoff || o.dep >= cutoff; });
      if (st.ui.impFrom || st.ui.impTo) kept = Z.inRange(kept, st.ui.impFrom, st.ui.impTo);
      st.ui.impRaw = { orders: kept, sheetName: found.name, skipped: all.length - kept.length, fileName: file.name }; st.ui.imp = null; st.ui.impResult = {};
      st.ui.impStatus = ""; render();
    }).catch(function (e) { st.ui.impStatus = ""; st.ui.impError = fill(t.iBadFile, { e: e.message }); render(); });
  }
  function submitImport(mode){
    var t = T(), imp = st.ui.imp, adds = [], colls = [], park = [], errors = [];
    if (mode === "members") imp.groups.new.forEach(function (o) {
      var e = imp.edits[o.code];
      if (!imp.sel[o.code]) { park.push(o.code); return; }
      if (!e.child || !e.product || !e.tag) { errors.push(o.code + ": " + t.req); park.push(o.code); return; }
      var fields = { name: e.child, phone: Z.normPhone(e.phone) || e.phone, product: e.product, tag: e.tag, dep: e.dep, coll: e.coll, note: e.note || "", da: st.da };
      if (e.sibling) fields.kid2 = e.sibling.names[0] || e.sibling.name;
      if (e.repeatOf) { fields.allowDuplicate = true; fields.key = Z.customerKey(fields.phone, e.child) + "#" + Z.yymmdd(e.dep || st.today); }
      adds.push({ code: o.code, fields: fields, details: { parent_name: e.parent, relation: e.relation === "Khác" ? e.relText : e.relation } });
    });
    else imp.groups.coll.forEach(function (o) { if (!imp.sel[o.code]) return; var c = o.match.cust; colls.push({ code: o.code, ref: { row: c.row, name: c.name, phone: c.phone }, date: imp.edits[o.code].coll }); });
    var oldColl = {}; colls.forEach(function (x) { var c = st.byKey[Z.customerKey(x.ref.phone, x.ref.name)] || st.cust.filter(function (cc) { return cc.row === x.ref.row; })[0]; oldColl[x.code] = { coll: c ? c.coll : "", status: c ? c.status : "" }; });
    var orders = imp.orders.map(function (o) { var e = imp.edits[o.code] || {}; return { code: o.code, deposit: o.dep, appointment: o.appt, status: o.status, name: o.name, phone: o.phone, patient: o.patient, lens: o.lens, product: e.product || o.product, collected: o.collected, note: e.note || "",
      result: o.match.kind === "repeat" ? "repeat:" + o.match.cust.key : o.match.kind === "sibling" ? "sibling:" + o.match.cust.key : "", state: o.prior ? o.prior.state : "parked" }; });
    st.busy = true; render();
    apiPost({ action: "confirmImports", adds: adds, collections: colls, park: park, orders: orders }).then(function (res) {
      var a = 0, c = 0, p = 0;
      adds.forEach(function (x) { var r = res.results[x.code] || {}; if (r.error) { errors.push(x.code + ": " + r.error); p++; } else a++; });
      colls.forEach(function (x) { var r = res.results[x.code] || {}; if (r.error) errors.push(x.code + ": " + r.error); else c++; });
      p += park.length;
      var undo = { adds: [], colls: [] };
      adds.forEach(function (x) { var r = res.results[x.code] || {}; if (!r.error) undo.adds.push({ code: x.code, ref: { row: r.row, name: x.fields.name, phone: x.fields.phone } }); });
      colls.forEach(function (x) { var r = res.results[x.code] || {}; if (!r.error) undo.colls.push({ code: x.code, ref: x.ref, old: oldColl[x.code] }); });
      st.ui.impResult[mode] = { text: mode === "members" ? fill(t.iResultM, { a: a, p: p, e: errors.length }) : fill(t.iResultC, { c: c, e: errors.length }), errors: errors, undo: (undo.adds.length || undo.colls.length) ? undo : null };
      st.busy = false; st.ui.imp = null;              /* re-classify against the refreshed member list */
      return reload(true);
    }).then(function () { render(); toast(st.ui.impResult[mode].text); }).catch(function (e) { st.busy = false; render(); toast(fill(t.errToast, { e: e.message }), true); });
  }

  /* ------------------------------------------------------------------ page: not in CRM */
  function pageLegacy(){
    var t = T(), parked = parkedImports(), dismissed = st.imports.filter(function (i) { return i.state === "dismissed"; });
    var repeats = parked.filter(function (i) { return /^repeat:/.test(i.result || ""); }), rest = parked.filter(function (i) { return !/^repeat:/.test(i.result || ""); });
    function monthOf(i){ var d = Z.toISO(i.collected) || Z.toISO(i.appointment) || Z.toISO(i.deposit); return d ? d.slice(0, 7) : ""; }
    var byM = {}; rest.forEach(function (i) { var m = monthOf(i); (byM[m] = byM[m] || []).push(i); });
    var months = Object.keys(byM).filter(Boolean).sort().reverse(); if (byM[""]) months.unshift("");
    var h = '<div class="panel">' + foldHead("legacy", esc(t.lTitle) + ' <span class="dsub">' + rest.length + "</span>", t.lHint);
    if (isFolded("legacy")) { h += "</div>"; months = []; }
    else if (!rest.length) h += '<div class="empty">' + esc(t.lNone) + "</div>";
    months.forEach(function (m, mi) {
      var fk = "lg:" + m, open = st.ui.folds[fk] === undefined ? (!m || mi < 2) : !st.ui.folds[fk];
      h += '<button type="button" class="grpd" style="width:100%;text-align:left;border:0;border-bottom:1px solid var(--rule-2);cursor:pointer" data-act="lg-month" data-m="' + esc(m) + '" data-open="' + (open ? 1 : 0) + '">' + (open ? "▾ " : "▸ ") + (m ? esc(t.months[+m.slice(5, 7) - 1] + " " + m.slice(0, 4)) : esc(t.noDate)) + " · " + byM[m].length + "</button>";
      if (open) byM[m].sort(function (a, b) { return (b.collected || b.deposit) < (a.collected || a.deposit) ? -1 : 1; }).forEach(function (i) { h += legacyRow(i, false); });
    });
    if (!isFolded("legacy")) h += "</div>";
    if (repeats.length) { h += '<div class="panel">' + foldHead("repeats", esc(t.lRepeat) + ' <span class="dsub">' + repeats.length + "</span>", t.lRepeatHint); if (!isFolded("repeats")) repeats.forEach(function (i) { h += legacyRow(i, true); }); h += "</div>"; }
    if (dismissed.length) {
      h += '<div class="panel"><h3><button type="button" class="linkbtn" data-act="lg-toggle-dismissed">' + esc(st.ui.showDismissed ? t.lHideDismissed : fill(t.lShowDismissed, { n: dismissed.length })) + "</button></h3>";
      if (st.ui.showDismissed) dismissed.forEach(function (i) { h += legacyRow(i, false, true); });
      h += "</div>";
    }
    return h;
  }
  function legacyRow(i, isRepeat, isDismissed){
    var t = T(), prod = i.product || Z.lensProduct(i.lens), dep = Z.toISO(i.deposit), coll = Z.toISO(i.collected), crm = isRepeat ? st.byKey[(i.result || "").slice(7)] : null;
    var up = prod && (dep || coll) ? Z.milestones({ product: prod, dep: dep, coll: coll }, { cadenceTab: st.cadence }).filter(function (m) { return m.due >= st.today; }).slice(0, 2) : [];
    return '<div class="irow"><span></span><div><div class="nm">' + esc(crm ? custLabel(crm) : (i.name || "?")) + ' <span class="mono" style="font-weight:400;color:var(--muted);font-size:.78rem">' + esc(i.code) + (i.result === "manual" ? " · " + esc(t.lManual) : "") + "</span></div>"
      + '<div class="meta">' + [i.phone, i.lens ? i.lens + (prod ? " → " + prodLabel(prod) : "") : prodLabel(prod), dep ? t.dep + " " + dm(dep) : "", coll ? t.coll + " " + dm(coll) : (i.status || t.lNoColl), i.note ? "“" + i.note + "”" : ""].filter(Boolean).map(esc).join(" · ")
      + (up.length ? ' · <span class="pill p-accent">' + esc(t.lUpcoming) + ": " + up.map(function (m) { return esc(m.stage + " " + dm(m.due)); }).join(", ") + "</span>" : "") + "</div>"
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + (isDismissed ? '<button type="button" class="btn sm" data-act="lg-restore" data-code="' + esc(i.code) + '">' + esc(t.lRestore) + "</button>"
        : (isRepeat ? '<button type="button" class="btn primary sm" data-act="lg-startnew" data-code="' + esc(i.code) + '">' + esc(t.lStartNew) + "</button>" : '<button type="button" class="btn primary sm" data-act="lg-add" data-code="' + esc(i.code) + '">' + esc(t.lAdd) + "</button>")
        + '<button type="button" class="btn sm" data-act="lg-dismiss" data-code="' + esc(i.code) + '">' + esc(t.lDismiss) + "</button>") + "</div></div></div>";
  }

  /* ------------------------------------------------------------------ page: resources */
  /* zalo/resources/manifest.json lists the weeks (zalo/tools/add-week.py writes it); each deck is
     a folder of JPEG slides plus the original .pptx for download. */
  var LANG_ORDER = ["vi", "en", "zh"], LANG_LABEL = { vi: "VI", en: "EN", zh: "中文" };
  function loadResources(){
    if (st.res) return; st.res = "loading";
    fetch("resources/manifest.json?v=" + VERSION, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (m) { st.res = m && m.weeks ? m : { weeks: [] }; if (st.route === "resources") render(); })
      .catch(function () { st.res = { weeks: [], error: true }; if (st.route === "resources") render(); });
  }
  function resWeeks(){ return ((st.res && st.res.weeks) || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); }
  function resWeek(date){ return resWeeks().filter(function (w) { return w.date === date; })[0]; }
  function resLangs(w){ return LANG_ORDER.filter(function (l) { return w.decks && w.decks[l] && w.decks[l].slides; }); }
  /* the deck shown follows the page language; a tab on the week overrides it until the language is toggled again */
  function resState(w){
    var langs = resLangs(w), ui = st.ui.res[w.date] = st.ui.res[w.date] || { i: 0, lang: "", langFor: "", full: false };
    if (ui.langFor !== st.lang || langs.indexOf(ui.lang) === -1) { ui.lang = langs.indexOf(st.lang) !== -1 ? st.lang : langs[0]; ui.langFor = st.lang; ui.i = 0; }
    return ui;
  }
  function slideUrl(w, lang, i){ var d = w.decks[lang]; return "resources/" + w.date + "/" + lang + "/" + Z.pad2(i + 1) + ".jpg?r=" + (d.rev || ""); }
  function pageResources(){
    var t = T(), r = t.r;
    loadResources();
    if (!st.res || st.res === "loading") return '<div class="panel"><div class="empty">' + esc(r.loading) + "</div></div>";
    var weeks = resWeeks(), h = '<p class="hint" style="margin:0 0 10px">' + esc(r.hint) + "</p>";
    if (!weeks.length) return h + '<div class="panel"><div class="empty">' + esc(st.res.error ? r.failed : r.none) + "</div></div>";
    weeks.forEach(function (w, i) {
      var id = "res:" + w.date;
      if (st.ui.folds[id] === undefined && i > 0) st.ui.folds[id] = true;                 /* older weeks start folded */
      h += '<div class="panel">' + foldHead(id, esc(fill(r.week, { n: weeks.length - i })) + ' <span class="dsub">' + esc(dmy(w.date)) + "</span>", w.title || "");
      if (!isFolded(id) && resLangs(w).length) h += viewerHtml(w);
      h += "</div>";
    });
    return h;
  }
  function viewerHtml(w){
    var t = T(), r = t.r, ui = resState(w), langs = resLangs(w), d = w.decks[ui.lang], n = d.slides || 0, wd = esc(w.date), cnt = fill(r.slide, { i: ui.i + 1, n: n });
    var dots = n <= 30 ? '<div class="sdots">' + Array.apply(null, Array(n)).map(function (_, k) { return '<button type="button" data-act="res-go" data-week="' + wd + '" data-i="' + k + '"' + (k === ui.i ? ' class="on"' : "") + ' aria-label="' + (k + 1) + '"></button>'; }).join("") + "</div>" : "";
    return '<div class="rv' + (ui.full ? " full" : "") + '" id="rv-' + wd + '" data-week="' + wd + '" tabindex="-1">'
      + '<div class="rbar"><div class="rtabs">' + langs.map(function (l) { return '<button type="button" data-act="res-lang" data-week="' + wd + '" data-l="' + l + '" aria-pressed="' + (l === ui.lang) + '">' + LANG_LABEL[l] + "</button>"; }).join("") + "</div>"
      + (langs.indexOf(st.lang) === -1 ? '<span class="hint">' + esc(fill(r.noLang, { l: LANG_LABEL[st.lang] || st.lang, o: LANG_LABEL[ui.lang] })) + "</span>" : "")
      + '<span class="cnt rcount">' + esc(cnt) + "</span>"
      + '<a class="btn sm" href="resources/' + wd + "/" + esc(d.file) + '" download="' + esc(d.name || d.file) + '">' + esc(r.download) + "</a>"
      + '<button type="button" class="btn sm" data-act="res-full" data-week="' + wd + '">' + esc(ui.full ? r.close : r.full) + "</button></div>"
      + '<div class="slides"><button type="button" class="sarr prev" data-act="res-prev" data-week="' + wd + '" aria-label="' + esc(r.prev) + '"' + (ui.i > 0 ? "" : " disabled") + ">‹</button>"
      + '<img class="slide" src="' + esc(slideUrl(w, ui.lang, ui.i)) + '" alt="' + esc(cnt) + '" data-act="res-next" data-week="' + wd + '" width="' + (d.w || 1600) + '" height="' + (d.h || 900) + '">'
      + '<button type="button" class="sarr next" data-act="res-next" data-week="' + wd + '" aria-label="' + esc(r.next) + '"' + (ui.i < n - 1 ? "" : " disabled") + ">›</button></div>" + dots + "</div>";
  }
  function resGo(date, i){
    var w = resWeek(date); if (!w) return; var ui = resState(w), n = (w.decks[ui.lang] || {}).slides || 0, cnt;
    ui.i = Math.max(0, Math.min(n - 1, i)); cnt = fill(T().r.slide, { i: ui.i + 1, n: n });
    var rv = $("rv-" + date); if (!rv) return render();
    var img = rv.querySelector("img.slide"); img.src = slideUrl(w, ui.lang, ui.i); img.alt = cnt;
    rv.querySelector(".rcount").textContent = cnt;
    rv.querySelector(".sarr.prev").disabled = ui.i <= 0; rv.querySelector(".sarr.next").disabled = ui.i >= n - 1;
    rv.querySelectorAll(".sdots button").forEach(function (b, k) { b.classList.toggle("on", k === ui.i); });
    if (ui.i + 1 < n) { var pre = new Image(); pre.src = slideUrl(w, ui.lang, ui.i + 1); }
  }
  function resLang(date, l){ var w = resWeek(date); if (!w || !w.decks[l]) return; var ui = resState(w); ui.lang = l; ui.langFor = st.lang; ui.i = 0; render(); }
  function fullRes(){ var d = ""; Object.keys(st.ui.res).forEach(function (k) { if (st.ui.res[k].full) d = k; }); return d; }
  function resFull(date){
    var w = resWeek(date); if (!w) return; var ui = resState(w), on = !ui.full;
    Object.keys(st.ui.res).forEach(function (k) { st.ui.res[k].full = false; }); ui.full = on;
    document.body.style.overflow = on ? "hidden" : ""; render(); var rv = $("rv-" + date); if (rv) rv.focus();
  }
  function openRes(){ var f = fullRes(); if (f) return f; var rv = document.querySelector(".rv"); return rv ? rv.dataset.week : ""; }
  var swipe = null;
  document.addEventListener("touchstart", function (ev) { var sl = ev.target.closest(".slides"); swipe = sl ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY, week: sl.closest(".rv").dataset.week } : null; }, { passive: true });
  document.addEventListener("touchend", function (ev) {
    if (!swipe) return; var dx = ev.changedTouches[0].clientX - swipe.x, dy = ev.changedTouches[0].clientY - swipe.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && st.ui.res[swipe.week]) resGo(swipe.week, st.ui.res[swipe.week].i + (dx < 0 ? 1 : -1));
    swipe = null;
  }, { passive: true });

  /* GitHub Pages caches index.html for ten minutes, so a phone can run the old release with the
     new one already published. version.json is fetched fresh on every start; when it names a
     newer release than this file, the page reloads once under a fresh URL. */
  function checkVersion(){
    fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.v || j.v === VERSION) return;
      var key = "zalo_reloaded_" + j.v; if (sstore(key)) return; sstore(key, "1");
      location.replace(location.pathname + (location.search ? location.search + "&" : "?") + "r=" + Date.now() + location.hash);
    }).catch(function () {});
  }

  /* ------------------------------------------------------------------ guide and tour */
  /* Tour steps per page: a selector and a key into t.g.steps. Steps whose element is not on the
     page right now (no overdue band, no file loaded) are skipped. */
  var TOURS = {
    overview: [{ sel: ".tiles", k: "ov-tiles" }, { sel: ".band", k: "ov-over" }, { sel: '[data-act="fold-panel"][data-id="today"]', k: "ov-today" }, { sel: '[data-act="fold-panel"][data-id="upcoming"]', k: "ov-up" }, { sel: ".sec", k: "ov-mass" }],
    add: [{ sel: '[data-act="fold-panel"][data-id="addform"]', k: "ad-form" }, { sel: '[data-act="fold-panel"][data-id="imp-members"]', k: "ad-imp" }, { sel: ".drop", k: "ad-drop" }, { sel: ".zck", k: "ad-tick" }],
    collections: [{ sel: '[data-act="fold-panel"][data-id="pending"]', k: "co-pend" }, { sel: '[data-act="fold-panel"][data-id="tags"]', k: "co-tags" }, { sel: '[data-act="fold-panel"][data-id="imp-collections"]', k: "co-imp" }],
    members: [{ sel: "#custSearch", k: "me-search" }, { sel: ".chips", k: "me-chips" }, { sel: ".fbar", k: "me-date" }, { sel: ".lrow", k: "me-row" }],
    legacy: [{ sel: '[data-act="fold-panel"][data-id="legacy"]', k: "lg-list" }, { sel: '[data-act="lg-add"]', k: "lg-add" }, { sel: '[data-act="fold-panel"][data-id="repeats"]', k: "lg-rep" }],
    resources: [{ sel: '[data-act="fold-panel"][data-id^="res:"]', k: "rs-week" }, { sel: ".slides", k: "rs-view" }, { sel: ".rbar", k: "rs-dl" }]
  };
  var PAGES = ["overview", "add", "collections", "members", "legacy", "resources"], tour = null;
  function guideHtml(mode){
    var t = T(), g = t.g, welcome = mode === "welcome";
    var h = '<div class="guide">' + (welcome ? "<h2>" + esc(fill(g.hello, { da: st.da || "" })) + '</h2><p class="lede">' + esc(g.welcome) + "</p>"
      : "<h2>" + esc(g.title) + '</h2><div class="sub">' + esc(fill(g.version, { v: VERSION })) + "</div>");
    if (welcome) h += '<div class="gbtns"><button type="button" class="btn primary" data-act="tour-start" data-page="overview">' + esc(g.startTour) + '</button><button type="button" class="btn" data-act="guide-close">' + esc(g.later) + "</button></div>";
    h += '<div class="note"><b>' + esc(g.routineTitle) + "</b><ol>" + g.routine.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>";
    PAGES.forEach(function (pg) {
      h += '<details class="gsec"' + (!welcome && pg === st.route ? " open" : "") + "><summary>" + esc(t.nav[pg]) + "</summary><ul>" + g.pages[pg].map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("")
        + '</ul><button type="button" class="btn sm" data-act="tour-start" data-page="' + pg + '">' + esc(g.tourThis) + " ▸</button></details>";
    });
    if (!welcome) h += '<div class="gbtns"><button type="button" class="btn primary" data-act="guide-close">' + esc(g.gotit) + "</button></div>";
    return h + "</div>";
  }
  function openGuide(mode){ store("zalo_guide_seen", "1"); st.ui.sheetKey = "guide"; openSheet(st.role === "reviewer" ? RV.guideHtml() : guideHtml(mode)); }
  /* the welcome opens once per device, on the first sign-in */
  function firstRun(){ if (st.role === "reviewer" || store("zalo_guide_seen")) return; setTimeout(function () { if (st.session && !st.ui.sheetKey) openGuide("welcome"); }, 500); }
  function startTour(page){
    closeSheet(); store("zalo_guide_seen", "1"); endTour(); tour = { page: page, i: 0, el: null, k: "", n: 0 };
    if (st.route !== page) location.hash = "#/" + page;
    var tries = 0;
    (function wait(){ if (!tour) return; if (st.route === page) showStep(); else if (++tries < 40) setTimeout(wait, 50); else endTour(); })();
  }
  function tourSteps(){ return (TOURS[tour.page] || []).filter(function (s) { var e = document.querySelector(s.sel); return e && e.getClientRects().length; }); }
  function showStep(){
    if (!tour) return;
    var steps = tourSteps();
    if (!steps.length || tour.i >= steps.length) return endTour();
    if (tour.i < 0) tour.i = 0;
    var s = steps[tour.i]; tour.el = document.querySelector(s.sel); tour.k = s.k; tour.n = steps.length;
    $("tour").classList.remove("gone");
    tour.el.scrollIntoView({ block: "center" });
    var t = T(), g = t.g, txt = g.steps[s.k] || ["", ""], i = tour.i + 1;
    $("tourCard").innerHTML = '<div class="tstep">' + esc(fill(g.stepOf, { i: i, n: tour.n })) + "</div><h4>" + esc(txt[0]) + "</h4><p>" + esc(txt[1]) + "</p>"
      + '<div class="tbtns">' + (i > 1 ? '<button type="button" class="btn sm" data-act="tour-back">' + esc(g.back) + "</button>" : "") + '<button type="button" class="btn sm" data-act="tour-end">' + esc(g.skip) + "</button>"
      + '<button type="button" class="btn primary sm" data-act="tour-next">' + esc(i === tour.n ? g.done : g.next) + "</button></div>";
    placeTour();
  }
  function placeTour(){
    if (!tour || !tour.el) return;
    var r = tour.el.getBoundingClientRect(), pad = 6, hl = $("tourHl"), card = $("tourCard");
    hl.style.top = (r.top - pad) + "px"; hl.style.left = (r.left - pad) + "px"; hl.style.width = (r.width + pad * 2) + "px"; hl.style.height = (r.height + pad * 2) + "px";
    var ch = card.offsetHeight, below = r.bottom + pad + 10;
    card.style.top = (below + ch < window.innerHeight - 8 ? below : Math.max(8, r.top - pad - ch - 10)) + "px";
  }
  function endTour(){ tour = null; $("tour").classList.add("gone"); }
  window.addEventListener("resize", placeTour); window.addEventListener("scroll", placeTour, { passive: true });

  /* ------------------------------------------------------------------ writes */
  function recordSent(items){
    var t = T(), at = nowIso(), added = items.map(function (it) { var r = { key: it.key, clinic: st.clinic, da: st.da, stage: it.stage, due: it.due, bits: it.bits, score: it.score, sent_at: at, undone_at: "", _local: true }; st.tasks.push(r); return r; });
    render();
    return apiPost({ action: "markSent", items: items }).then(function () { toast(fill(t.sentToast, { n: items.length }), false, function () { recordUndo(items.map(function (it) { return { key: it.key, stage: it.stage }; })); }); })
      .catch(function (e) { added.forEach(function (r) { st.tasks.splice(st.tasks.indexOf(r), 1); }); render(); toast(fill(t.errToast, { e: e.message }), true); });
  }
  function recordUndo(list){
    var t = T(), at = nowIso(), touched = [];
    list.forEach(function (u) { for (var i = st.tasks.length - 1; i >= 0; i--) { var r = st.tasks[i]; if (r.key === u.key && r.stage === u.stage && !r.undone_at) { r.undone_at = at; touched.push(r); break; } } });
    render();
    var again = touched.map(function (r) { return { key: r.key, stage: r.stage, due: r.due, bits: r.bits, score: r.score }; });
    return apiPost({ action: "markSent", undo: list }).then(function () { toast(t.undoneToast, false, again.length ? function () { recordSent(again); } : null); })
      .catch(function (e) { touched.forEach(function (r) { r.undone_at = ""; }); render(); toast(fill(t.errToast, { e: e.message }), true); });
  }
  function fullItem(tk){ return { key: tk.key, stage: tk.stage, due: tk.due, bits: tk.items.map(function () { return "1"; }).join(""), score: 1 }; }
  function tickCard(card){
    if (card.done) return recordUndo(card.tasks.map(function (tk) { return { key: tk.key, stage: tk.stage }; }));
    return recordSent(card.tasks.filter(function (tk) { return !tk.full; }).map(fullItem));
  }
  function toggleItem(card, ti, i){
    var tk = card.tasks[ti], bits = (tk.done ? String(tk.done.bits || "") : "").split(""); while (bits.length < tk.items.length) bits.push("0");
    bits[i] = bits[i] === "1" ? "0" : "1";
    var on = bits.filter(function (b) { return b === "1"; }).length;
    if (!on) return recordUndo([{ key: tk.key, stage: tk.stage }]);
    return recordSent([{ key: tk.key, stage: tk.stage, due: tk.due, bits: bits.join(""), score: on === tk.items.length ? 1 : 0.5 }]);
  }
  function updateLocalCustomer(key, changes){ var c = st.byKey[key]; if (!c) return; Object.keys(changes).forEach(function (k) { c[k] = changes[k]; }); c.parsed = Z.parseTag(c.tag); c.product = Z.normProduct(c.product) || (c.parsed && c.parsed.product) || ""; c.exam = c.product === "Exam"; }
  function saveLocalDetails(key, d){ var cur = st.det[key] || (st.det[key] = { key: key }); Object.keys(d).forEach(function (k) { cur[k] = d[k]; }); }

  function reload(quiet){
    if (!quiet) { st.feed = { mode: "loading", at: "" }; renderChrome(); }
    return apiGet({ action: "bootstrap" }).then(function (d) { if (st.role === "reviewer") RV.shape(d); else shape(d); st.feed = { mode: st.demo ? "demo" : "live", at: new Date().toTimeString().slice(0, 5) }; if (!quiet) render(); })
      .catch(function (e) { st.feed = { mode: "failed", at: "" }; if (!quiet) render(); toast(fill(T().neterr, { e: e.message }), true); });
  }

  /* ------------------------------------------------------------------ events */
  function afterRender(){
    var s = $("custSearch"); if (s) { s.oninput = function () { st.ui.search = s.value; var l = $("memList"); if (l) l.innerHTML = memberListHtml(); }; }
    ["memKind", "memFrom", "memTo", "memSort"].forEach(function (id) { var el = $(id); if (el) el.onchange = function () { st.ui[{ memKind: "dateKind", memFrom: "from", memTo: "to", memSort: "sort" }[id]] = el.value; var l = $("memList"); if (l) l.innerHTML = memberListHtml(); }; });
    var f = $("addForm"); if (f) { f.onsubmit = function (ev) { ev.preventDefault(); submitAdd(); }; f.oninput = function (ev) { var fm = readAddForm(); if (ev.target.name === "tag") fm.tagManual = true; if (!fm.tagManual) { var el = f.elements.tag; if (el) el.value = suggest(fm); fm.tag = el ? el.value : fm.tag; } if (ev.target.name === "depNA" || ev.target.name === "noZalo") render(); }; }
    var fi = $("impFile"); if (fi) { fi.onchange = function () { if (fi.files[0]) importFile(fi.files[0]); }; var dz = $("drop"); dz.ondragover = function (e) { e.preventDefault(); dz.classList.add("on"); }; dz.ondragleave = function () { dz.classList.remove("on"); }; dz.ondrop = function (e) { e.preventDefault(); dz.classList.remove("on"); if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0]); }; }
    var cf = $("custForm"); if (cf) cf.onsubmit = function (ev) { ev.preventDefault(); saveCust(cf); };
  }
  function saveCust(form){
    var t = T(), key = form.dataset.key, c = st.byKey[key], d = detailsOf(c), changes = {}, det = {};
    ["dep", "coll", "product", "phone", "note", "dob"].forEach(function (k) { var v = form.elements[k].value; if (k === "phone") v = Z.normPhone(v) || v.trim(); if ((c[k] || "") !== v) changes[k] = v; });
    var tag = form.elements.tag.value.trim(); if (tag !== (c.tag || "") && tag !== (d.pending_tag || "")) det.pending_tag = tag; if (tag === (c.tag || "") && d.pending_tag) det.pending_tag = "";
    ["parent_name", "relation", "gender"].forEach(function (k) { var v = form.elements[k].value; if ((d[k] || "") !== v) det[k] = v; });
    if (changes.coll && !changes.status && !c.status) changes.status = "Đã là hội viên";
    var oldCh = {}, oldDet = {}; Object.keys(changes).forEach(function (k) { oldCh[k] = c[k] || ""; }); Object.keys(det).forEach(function (k) { oldDet[k] = d[k] || ""; });
    var ref0 = { row: c.row, name: c.name, phone: c.phone };
    function apply(ch, dt){ var p = Promise.resolve();
      if (Object.keys(ch).length) p = p.then(function () { return apiPost({ action: "updateCustomer", ref: ref0, changes: ch }); }).then(function () { updateLocalCustomer(key, ch); });
      if (Object.keys(dt).length) p = p.then(function () { return apiPost({ action: "saveDetails", key: key, details: dt }); }).then(function () { saveLocalDetails(key, dt); });
      return p; }
    apply(changes, det).then(function () { openSheet(custSheetHtml(st.byKey[key], false)); render();
      toast(t.saved, false, (Object.keys(changes).length || Object.keys(det).length) ? function () { apply(oldCh, oldDet).then(function () { if (st.ui.sheetKey === key) openSheet(custSheetHtml(st.byKey[key], false)); render(); toast(t.undoneToast); }).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); }); } : null);
    }).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); });
  }
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]"); if (!el) return;
    var act = el.dataset.act, t = T();
    if (el.tagName === "INPUT" && el.type === "checkbox") return;        /* handled on change */
    if (act.indexOf("rv-") === 0) { if (el.tagName !== "A") ev.preventDefault(); RV.click(act, el); return; }
    switch (act) {
      case "tick": ev.preventDefault(); tickCard(st.cards[el.dataset.card]); break;
      case "item": ev.preventDefault(); toggleItem(st.cards[el.dataset.card], +el.dataset.task, +el.dataset.i); break;
      case "toggle-overdue": st.ui.overdueOpen = !st.ui.overdueOpen; render(); break;
      case "fold": st.ui.foldOpen = !st.ui.foldOpen; render(); break;
      case "send-group": { var g = st.groups[el.dataset.g], sel = st.ui.massSel[el.dataset.g] || {}, items = g.tasks.filter(function (x) { return !x.full && sel[x.key + "|" + x.stage]; }).map(fullItem); st.ui.massSel[el.dataset.g] = {}; if (items.length) recordSent(items); break; }
      case "copy-group": { var gg = st.groups[el.dataset.g], names = []; gg.tasks.forEach(function (x) { var n = x.cust.tag || custLabel(x.cust); if (names.indexOf(n) === -1) names.push(n); }); copyText(names.join("\n")).then(function () { toast(fill(t.copied, { n: names.length })); }); break; }
      case "undo-one": { var kk = el.dataset.k.split("|"); recordUndo([{ key: kk.slice(0, -1).join("|"), stage: kk[kk.length - 1] }]); break; }
      case "cfilter": st.ui.cfilter = el.dataset.f; render(); break;
      case "mclear": st.ui.search = ""; st.ui.from = ""; st.ui.to = ""; render(); break;
      case "fold-panel": st.ui.folds[el.dataset.id] = !st.ui.folds[el.dataset.id]; store("zalo_folds", JSON.stringify(st.ui.folds)); render(); break;
      case "open-cust": openSheet(custSheetHtml(st.byKey[el.dataset.key], false)); st.ui.sheetKey = el.dataset.key; break;
      case "edit-cust": openSheet(custSheetHtml(st.byKey[el.dataset.key], true)); afterRender(); break;
      case "add-opt": { var fm = readAddForm(); fm[el.dataset.name] = fm[el.dataset.name] === el.dataset.v && el.dataset.name !== "product" ? "" : el.dataset.v; if (!fm.tagManual) fm.tag = suggest(fm); render(); break; }
      case "add-another": st.ui.addDone = null; st.ui.addForm = null; render(); break;
      case "add-undo": { var dn = st.ui.addDone; if (!dn) return; st.busy = true; render();
        var pu = dn.parked ? (dn.manual ? apiPost({ action: "removeImport", code: dn.code }) : apiPost({ action: "storeImports", orders: [{ code: dn.code, state: "parked" }] }))
                           : apiPost({ action: "removeCustomer", ref: dn.ref }).then(function () { if (dn.code) return apiPost({ action: "storeImports", orders: [{ code: dn.code, state: "parked", result: "" }] }); });
        pu.then(function () { return reload(true); }).then(function () { st.busy = false; st.ui.addDone = null; st.ui.addForm = dn.form; st.ui.addForm.err = {}; render(); toast(t.undoneRow); }).catch(function (e) { st.busy = false; render(); toast(fill(t.errToast, { e: e.message }), true); }); break; }
      case "p-submit": { var c = st.byKey[el.dataset.key], date = document.querySelector('[data-pdate="' + c.row + '"]').value; if (!date) return; el.disabled = true;
        var oldC = { coll: c.coll, status: c.status }, refC = { row: c.row, name: c.name, phone: c.phone };
        apiPost({ action: "setCollected", ref: refC, date: date }).then(function () { updateLocalCustomer(c.key, { coll: date, status: "Đã là hội viên" }); render();
          toast(fill(t.pDone, { n: custLabel(c) }), false, function () { apiPost({ action: "updateCustomer", ref: refC, changes: { coll: "", status: oldC.status } }).then(function () { updateLocalCustomer(c.key, { coll: "", status: oldC.status }); render(); toast(t.collUndone); }).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); }); });
        }).catch(function (e) { el.disabled = false; toast(fill(t.errToast, { e: e.message }), true); }); break; }
      case "tag-copy": copyText(el.dataset.tag).then(function () { toast(fill(t.copied, { n: 1 })); }); break;
      case "tag-confirm": { var cc = st.byKey[el.dataset.key], tag = el.dataset.tag, oldTag = cc.tag, oldPend = detailsOf(cc).pending_tag || "", refT = { row: cc.row, name: cc.name, phone: cc.phone }; el.disabled = true;
        apiPost({ action: "confirmTag", ref: refT, tag: tag }).then(function () { updateLocalCustomer(cc.key, { tag: tag }); return apiPost({ action: "saveDetails", key: cc.key, details: { pending_tag: "" } }); }).then(function () { saveLocalDetails(cc.key, { pending_tag: "" }); render();
          toast(t.tConfirmed, false, function () { apiPost({ action: "confirmTag", ref: { row: cc.row, name: cc.name, phone: cc.phone }, tag: oldTag }).then(function () { updateLocalCustomer(cc.key, { tag: oldTag }); return apiPost({ action: "saveDetails", key: cc.key, details: { pending_tag: oldPend } }); }).then(function () { saveLocalDetails(cc.key, { pending_tag: oldPend }); render(); toast(t.undoneToast); }).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); }); });
        }).catch(function (e) { el.disabled = false; toast(fill(t.errToast, { e: e.message }), true); }); break; }
      case "tag-skip": { var cs = st.byKey[el.dataset.key], oldP = detailsOf(cs).pending_tag || "";
        apiPost({ action: "saveDetails", key: cs.key, details: { pending_tag: cs.tag } }).then(function () { saveLocalDetails(cs.key, { pending_tag: cs.tag }); render();
          toast(t.tSkipped, false, function () { apiPost({ action: "saveDetails", key: cs.key, details: { pending_tag: oldP } }).then(function () { saveLocalDetails(cs.key, { pending_tag: oldP }); render(); toast(t.undoneToast); }).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); }); });
        }).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); }); break; }
      case "imp-submit": submitImport(el.dataset.mode); break;
      case "imp-undo": { var mode = el.dataset.mode, u = st.ui.impResult[mode] && st.ui.impResult[mode].undo; if (!u) return; st.busy = true; render();
        var seq = Promise.resolve();
        u.adds.forEach(function (x) { seq = seq.then(function () { return apiPost({ action: "removeCustomer", ref: x.ref }); }).then(function () { return apiPost({ action: "storeImports", orders: [{ code: x.code, state: "parked", result: "" }] }); }); });
        u.colls.forEach(function (x) { seq = seq.then(function () { return apiPost({ action: "updateCustomer", ref: x.ref, changes: { coll: "", status: x.old.status } }); }).then(function () { return apiPost({ action: "storeImports", orders: [{ code: x.code, state: "parked", result: "" }] }); }); });
        seq.then(function () { return reload(true); }).then(function () { st.busy = false; st.ui.impResult[mode] = null; st.ui.imp = null; render(); toast(t.undoneImport); }).catch(function (e) { st.busy = false; render(); toast(fill(t.errToast, { e: e.message }), true); }); break; }
      case "imp-reset": st.ui.imp = null; st.ui.impRaw = null; st.ui.impResult = {}; st.ui.impError = ""; render(); break;
      case "lg-add": case "lg-startnew": { var im = st.imports.filter(function (i) { return i.code === el.dataset.code; })[0]; if (!im) return; var prod = im.product || Z.lensProduct(im.lens), crm = act === "lg-startnew" ? st.byKey[(im.result || "").slice(7)] : null;
        st.ui.addPrefill = { child: crm ? crm.names[0] : im.name, phone: Z.normPhone(im.phone) || im.phone, product: prod, dep: Z.toISO(im.deposit), coll: Z.toISO(im.collected), code: im.code, allowDuplicate: !!crm, parent: crm ? (detailsOf(crm).parent_name || "") : "", relation: crm ? (detailsOf(crm).relation || "Mẹ") : "Mẹ", dob: crm ? crm.dob : "", note: im.note || "" };
        st.ui.addForm = null; st.ui.addDone = null; location.hash = "#/add"; break; }
      case "lg-dismiss": case "lg-restore": { var code = el.dataset.code, state = act === "lg-dismiss" ? "dismissed" : "parked", back = state === "dismissed" ? "parked" : "dismissed"; el.disabled = true;
        var setState = function (stt, msg, undo) { return apiPost({ action: "storeImports", orders: [{ code: code, state: stt }] }).then(function () { st.imports.forEach(function (i) { if (i.code === code) i.state = stt; }); render(); toast(msg, false, undo); }); };
        setState(state, state === "dismissed" ? t.lDismiss : t.lRestore, function () { setState(back, t.undoneToast, null).catch(function (e) { toast(fill(t.errToast, { e: e.message }), true); }); }).catch(function (e) { el.disabled = false; toast(fill(t.errToast, { e: e.message }), true); }); break; }
      case "lg-toggle-dismissed": st.ui.showDismissed = !st.ui.showDismissed; render(); break;
      case "guide-open": openGuide(); break;
      case "guide-close": closeSheet(); break;
      case "tour-start": startTour(el.dataset.page); break;
      case "tour-next": if (tour) { tour.i++; showStep(); } break;
      case "tour-back": if (tour) { tour.i--; showStep(); } break;
      case "tour-end": endTour(); break;
      case "res-prev": if (st.ui.res[el.dataset.week]) resGo(el.dataset.week, st.ui.res[el.dataset.week].i - 1); break;
      case "res-next": if (st.ui.res[el.dataset.week]) resGo(el.dataset.week, st.ui.res[el.dataset.week].i + 1); break;
      case "res-go": resGo(el.dataset.week, +el.dataset.i); break;
      case "res-lang": resLang(el.dataset.week, el.dataset.l); break;
      case "res-full": resFull(el.dataset.week); break;
      case "lg-month": st.ui.folds["lg:" + el.dataset.m] = el.dataset.open === "1"; store("zalo_folds", JSON.stringify(st.ui.folds)); render(); break;
    }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target; if (!el.dataset) return;
    if (st.role === "reviewer" && RV.change(el)) return;
    if (el.dataset.act === "sel") { var sel = st.ui.massSel[el.dataset.g] = st.ui.massSel[el.dataset.g] || {}; sel[el.dataset.k] = el.checked; render(); }
    else if (el.dataset.act === "sel-all") { var g = st.groups[el.dataset.g], s2 = st.ui.massSel[el.dataset.g] = {}; if (el.checked) g.tasks.forEach(function (x) { if (!x.full) s2[x.key + "|" + x.stage] = true; }); render(); }
    else if (el.dataset.act === "p-check") { var btn = document.querySelector('#p-' + el.dataset.row + ' [data-act="p-submit"]'); if (btn) btn.disabled = !el.checked; }
    else if (el.dataset.act === "imp-sel") { st.ui.imp.sel[el.dataset.code] = el.checked; var ed = st.ui.imp.edits[el.dataset.code];
      if (ed && !ed.tagManual) { ed.tag = el.checked ? impSuggest(ed) : ""; var tin = document.querySelector('[data-imp="tag"][data-code="' + CSS.escape(el.dataset.code) + '"]'); if (tin) { tin.value = ed.tag; tin.classList.toggle("bad", !ed.tag); } }
      var rowEl = el.closest(".irow"); if (rowEl) rowEl.classList.toggle("on", el.checked); impCount(); }
    else if (el.dataset.act === "imp-selall") { var on = el.checked; el.dataset.codes.split(",").forEach(function (c) { if (c) { st.ui.imp.sel[c] = on; var cb = document.querySelector('[data-act="imp-sel"][data-code="' + CSS.escape(c) + '"]'); if (cb) cb.checked = on; } }); impCount(); }
    else if (el.dataset.imp) { var e = st.ui.imp.edits[el.dataset.code]; if (!e) return; e[el.dataset.imp] = el.value; el.classList.toggle("bad", !el.value && ["child", "product", "tag"].indexOf(el.dataset.imp) !== -1);
      if (el.dataset.imp === "tag") e.tagManual = true; else if (!e.tagManual) { e.tag = Z.suggestTag({ product: e.product, dep: e.dep, coll: e.coll, relation: e.relation, relationText: e.relText, child: e.child, phone: e.phone }); var ti = document.querySelector('[data-imp="tag"][data-code="' + CSS.escape(el.dataset.code) + '"]'); if (ti) { ti.value = e.tag; ti.classList.toggle("bad", !e.tag); } } }
  });
  document.addEventListener("input", function (ev) { var el = ev.target; if (el.dataset && el.dataset.imp && ["child", "parent", "phone", "note", "tag"].indexOf(el.dataset.imp) !== -1) { var e = st.ui.imp.edits[el.dataset.code]; if (e) { e[el.dataset.imp] = el.value; if (el.dataset.imp === "tag") e.tagManual = true; } } });
  $("sheetClose").onclick = closeSheet; $("sheet").addEventListener("click", function (ev) { if (ev.target === $("sheet")) closeSheet(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { if (tour) endTour(); else if (fullRes()) resFull(fullRes()); else closeSheet(); return; }
    if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && st.route === "resources" && !/INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || "")) {
      var wk = openRes(); if (wk && st.ui.res[wk]) { resGo(wk, st.ui.res[wk].i + (ev.key === "ArrowRight" ? 1 : -1)); ev.preventDefault(); }
    }
  });

  /* ------------------------------------------------------------------ confetti */
  function maybeConfetti(){
    var p = st.plan; if (st.route !== "overview" || !p || !p.tiles.today.due || p.tiles.today.done !== p.tiles.today.due) return;
    if (store("zalo_confetti") === st.today + "|" + st.da) return;
    store("zalo_confetti", st.today + "|" + st.da); confetti(); toast(T().confettiMsg);
  }
  function confetti(){
    var cv = $("confetti"), ctx = cv.getContext("2d"), W = cv.width = window.innerWidth, H = cv.height = window.innerHeight, cols = ["#2438B8", "#17795E", "#E6EE6B", "#A6690A", "#AE2E48", "#8D99F7"];
    var ps = []; for (var i = 0; i < 140; i++) ps.push({ x: W / 2 + (Math.random() - .5) * W * .5, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, g: .35 + Math.random() * .2, s: 5 + Math.random() * 6, c: cols[i % cols.length], r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3 });
    cv.style.display = "block"; var t0 = Date.now();
    (function frame() { ctx.clearRect(0, 0, W, H); var alive = 0; ps.forEach(function (p) { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; if (p.y < H + 20) alive++; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); });
      if (alive && Date.now() - t0 < 3200) requestAnimationFrame(frame); else { cv.style.display = "none"; ctx.clearRect(0, 0, W, H); } })();
  }

  /* ------------------------------------------------------------------ sign-in, picker, start */
  function showPick(){
    var t = T(), by = st.data ? st.data.das || {} : {}, h = '<div class="pickclinic">' + esc(st.clinic) + '</div><div class="pickrow">';
    var names = Object.keys(by).sort(); if (!names.length) names = [st.da || "DA"];
    names.forEach(function (n) { h += '<button type="button" data-me="' + esc(n) + '"' + (n === st.da ? ' class="on"' : "") + ">" + esc(n) + "<span>" + (by[n] || 0) + " " + esc(t.kh) + "</span></button>"; });
    $("pickBody").innerHTML = h + "</div>";
    document.querySelectorAll("[data-me]").forEach(function (b) { b.onclick = function () { st.da = b.dataset.me; store("zalo_da", st.da); $("pick").classList.add("gone"); $("wrap").hidden = false; route(); firstRun(); }; });
    $("wrap").hidden = true; $("pick").classList.remove("gone");
  }
  function enterApp(){
    $("gate").classList.add("gone"); st.session = true;
    sstore("zalo_s", JSON.stringify({ u: st.u, h: st.h, clinic: st.clinic, demo: st.demo, role: st.role }));
    if (st.role === "reviewer") { $("wrap").hidden = false; route(); return; }
    var known = st.da && st.data && st.data.das && st.data.das[st.da];
    if (known) { $("wrap").hidden = false; route(); firstRun(); } else showPick();
  }
  /* a bootstrap that says role:"reviewer" opens the audit view instead of the DA's task list */
  function takeBootstrap(d){
    if (d.role === "reviewer") { st.role = "reviewer"; st.da = ""; RV.shape(d); if (!store("zalo_lang") && !/[?&]lang=/.test(location.search)) setLang("zh"); }
    else { st.role = "da"; st.clinic = d.clinic; shape(d); }
  }
  function signOut(){ st.session = false; st.role = "da"; st.u = st.h = ""; st.demo = false; st.data = null; sstore("zalo_s", null); $("wrap").hidden = true; $("pick").classList.add("gone"); $("gate").classList.remove("gone"); $("gp").value = ""; $("gu").focus(); }
  function startDemo(mode){
    st.demo = true; st.clinic = "NGT"; st.u = "NGT_DA"; st.h = "demo"; st.today = (/[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(location.search) || [])[1] || Z.todayISO();
    if (mode === "reviewer") { st.role = "reviewer"; st.u = "CZ"; var daDemo = DemoAPI.load(); st.today = daDemo.today; RV.shape(RV.demo.load(daDemo)); st.feed = { mode: "demo", at: "" }; enterApp(); return; }
    shape(DemoAPI.load()); st.feed = { mode: "demo", at: "" }; if (!st.da) st.da = "Tiên"; enterApp(); }
  function login(u, pw){
    var t = T(), btn = $("gateBtn"), err = $("gateErr"); btn.disabled = true; btn.textContent = t.signingin; err.classList.remove("on");
    sha256(pw).then(function (hh) { st.u = u.trim().toUpperCase(); st.h = hh; st.demo = false; return apiGet({ action: "bootstrap" }); })
      .then(function (d) { takeBootstrap(d); st.feed = { mode: "live", at: new Date().toTimeString().slice(0, 5) }; btn.disabled = false; btn.textContent = t.signin; enterApp(); })
      .catch(function (e) { btn.disabled = false; btn.textContent = t.signin; err.textContent = /forbidden|unknown user/.test(e.message) ? t.badlogin : e.message === "no api" ? t.noapi : fill(t.neterr, { e: e.message }); err.classList.add("on"); $("gp").value = ""; });
  }
  function setLang(l){ st.lang = l; store("zalo_lang", l); applyGateLang(); if (st.session) render(); }
  function init(){
    st.lang = store("zalo_lang") || "vi"; var ql = /[?&]lang=(en|vi|zh)/.exec(location.search); if (ql) st.lang = ql[1];
    st.da = store("zalo_da") || "";
    try { st.ui.folds = JSON.parse(store("zalo_folds") || "{}") || {}; } catch (e) { st.ui.folds = {}; }
    applyGateLang();
    $("apiUrl").value = store("zalo_api") || ""; $("apiUrl").onchange = function () { store("zalo_api", $("apiUrl").value.trim() || null); };
    document.querySelectorAll("#gateLang button, #langseg button").forEach(function (b) { b.onclick = function () { setLang(b.dataset.l); }; });
    $("gateform").addEventListener("submit", function (ev) { ev.preventDefault(); login($("gu").value, $("gp").value); });
    $("demoBtn").onclick = startDemo;
    window.addEventListener("hashchange", route);
    checkVersion();
    window.addEventListener("hashchange", function () { if (tour && tour.page !== st.route) endTour(); });
    if (/[?&]demo=reviewer/.test(location.search)) return startDemo("reviewer");
    if (/[?&]demo=1/.test(location.search)) return startDemo();
    var s = sstore("zalo_s"); if (s) { try { s = JSON.parse(s); } catch (e) { s = null; } }
    if (s && s.demo) return startDemo(s.role === "reviewer" ? "reviewer" : "");
    if (s && s.u && s.h) { st.u = s.u; st.h = s.h; st.clinic = s.clinic; apiGet({ action: "bootstrap" }).then(function (d) { takeBootstrap(d); st.feed = { mode: "live", at: new Date().toTimeString().slice(0, 5) }; enterApp(); }).catch(function () { $("gu").value = s.u; $("gu").focus(); }); return; }
    $("gu").focus();
  }
  RV.init({
    lang: function () { return st.lang; }, esc: esc, fill: fill, t: T, today: function () { return st.today; },
    settings: function () { return st.settings; }, cadenceTab: function () { return st.cadence; }, customers: function () { return st.cust; },
    shapeClinic: function (d) { st.clinic = d.clinic; shape(d); }, prodLabel: prodLabel, custLabel: custLabel, pageMembers: pageMembers,
    get: apiGet, post: apiPost, toast: toast, store: store, render: render
  });
  init();
})();
