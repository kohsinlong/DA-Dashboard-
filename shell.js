/* DA Dashboard - shared shell.
   Sign-in gate (clinic username + shared password), DA picker, session,
   language, header with feed status and navigation, live-feed loading.
   Every page calls SHELL.init({ page, root, onRender }) and renders into
   #app from SHELL.state. */
window.SHELL = (function(){
  "use strict";
  var Z = window.ZSOP, DATA = Z.DATA;

  /* One shared password; the username picks the clinic. A username is the
     clinic name without spaces, upper-case, plus _DA (NGT -> NGT_DA,
     CTE D5 -> CTED5_DA), so a new clinic in the feed needs no code change.
     USERS holds any extra aliases. */
  var PW_HASH = "0fc190fe4ff2e5f3040c5cf8152c8a93f3e1e4c0da8b732ec286d82c6d290b75";
  var USERS = { "NGT_DA":"NGT", "CTED5_DA":"CTE D5" };

  var PAGES = [["home","./"],["sop","sop/"],["sales","sales/"],["leads","leads/"]];
  var st = { lang:"en", clinic:"", me:"", session:false, cases:DATA.cases, snapshot:DATA.cases,
             feed:{ mode:"snapshot", at:DATA.generated || "", error:"" }, today:Z.todayISO() };
  var opts = { page:"home", root:"./", onRender:function(){} };

  var L = {
    en:{ brand:"DA Dashboard", glede:"Sign in with your clinic's username, e.g. NGT_DA.", luser:"Username", lpass:"Password",
         signin:"Sign in", signingin:"Signing in…", badlogin:"Incorrect username or password. Please try again.",
         pickTitle:"Who are you?", pickLede:"Pick your name. This phone will remember it.", kh:"customers",
         signout:"Sign out", switchWho:"Not you?", asOf:"as of",
         feedLive:"Live · sheets read", feedLoading:"Reading the sheets…", feedFailed:"Sheets unreachable · snapshot of", feedSnap:"Snapshot of",
         nav:{home:"KPI", sop:"Zalo SOP", sales:"Sales", leads:"Leads"},
         months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
    vi:{ brand:"Bảng KPI trợ lý", glede:"Đăng nhập bằng tên đăng nhập của phòng khám, ví dụ NGT_DA.", luser:"Tên đăng nhập", lpass:"Mật khẩu",
         signin:"Đăng nhập", signingin:"Đang đăng nhập…", badlogin:"Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại.",
         pickTitle:"Bạn là ai?", pickLede:"Chọn tên của bạn. Điện thoại này sẽ ghi nhớ.", kh:"khách",
         signout:"Đăng xuất", switchWho:"Không phải bạn?", asOf:"tính đến",
         feedLive:"Trực tiếp · đã đọc sheet", feedLoading:"Đang đọc sheet…", feedFailed:"Không đọc được sheet · bản chụp", feedSnap:"Bản chụp",
         nav:{home:"KPI", sop:"SOP Zalo", sales:"Doanh số", leads:"Leads"},
         months:["Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"] },
    zh:{ brand:"助理 KPI 看板", glede:"使用诊所的用户名登录，例如 NGT_DA。", luser:"用户名", lpass:"密码",
         signin:"登录", signingin:"正在登录…", badlogin:"用户名或密码不正确，请重试。",
         pickTitle:"你是谁？", pickLede:"选择你的姓名。本手机会记住。", kh:"位客户",
         signout:"退出", switchWho:"不是你？", asOf:"截至",
         feedLive:"实时 · 已读取表格", feedLoading:"正在读取表格…", feedFailed:"无法读取表格 · 快照", feedSnap:"快照",
         nav:{home:"KPI", sop:"Zalo SOP", sales:"销售", leads:"线索"},
         months:["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"] }
  };
  function T(){ return L[st.lang]; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function fill(s, o){ Object.keys(o).forEach(function(k){ s = s.split("{"+k+"}").join(o[k]); }); return s; }
  function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k) || ""; if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} return v; }
  function daKey(c){ return c[0] + "│" + c[1]; }
  function daName(k){ return k.split("│")[1]; }
  function daClinic(k){ return k.split("│")[0]; }
  function fmtWhen(iso){
    if(!iso) return "";
    var t = T(), d = new Date(iso);
    if(isNaN(d)) return iso;
    var day = d.getDate() + " " + t.months[d.getMonth()];
    return iso.length > 10 ? day + " " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0") : day;
  }
  function userClinic(u){
    u = String(u || "").trim().toUpperCase();
    if(USERS[u]) return USERS[u];
    var hit = "";
    st.cases.forEach(function(c){ if(c[0].replace(/\s+/g,"").toUpperCase() + "_DA" === u) hit = c[0]; });
    return hit;
  }
  function meKnown(){ return !!st.me && daClinic(st.me) === st.clinic && st.cases.some(function(c){ return daKey(c) === st.me; }); }

  /* ---------------- crypto ---------------- */
  function utf8(str){var o="",i,c;for(i=0;i<str.length;i++){c=str.charCodeAt(i);
    if(c<128)o+=String.fromCharCode(c);else if(c<2048)o+=String.fromCharCode(192|(c>>6),128|(c&63));
    else o+=String.fromCharCode(224|(c>>12),128|((c>>6)&63),128|(c&63));}return o;}
  function sha256sync(a){function rr(v,x){return(v>>>x)|(v<<(32-x));}
    var mm=Math.pow,mp=mm(2,32),i,j,res="",w=[],bl=a.length*8,h=sha256sync.h,k=sha256sync.k;
    if(!h){h=sha256sync.h=[];k=sha256sync.k=[];var n=0,ic={};
      for(var cd=2;n<64;cd++){if(!ic[cd]){for(i=0;i<313;i+=cd)ic[i]=cd;
        h[n]=(mm(cd,.5)*mp)|0;k[n++]=(mm(cd,1/3)*mp)|0;}}h=h.slice(0,8);sha256sync.h=h;}
    a+="\x80";while(a.length%64-56)a+="\x00";
    for(i=0;i<a.length;i++){j=a.charCodeAt(i);if(j>>8)return null;w[i>>2]|=j<<((3-i)%4)*8;}
    w[w.length]=(bl/mp)|0;w[w.length]=bl;var H=h.slice(0);
    for(j=0;j<w.length;){var ww=w.slice(j,j+=16),old=H.slice(0);
      for(i=0;i<64;i++){var w15=ww[i-15],w2=ww[i-2],A=H[0],E=H[4];
        var t1=H[7]+(rr(E,6)^rr(E,11)^rr(E,25))+((E&H[5])^((~E)&H[6]))+k[i]
          +(ww[i]=(i<16)?ww[i]:(ww[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+ww[i-7]
            +(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
        var t2=(rr(A,2)^rr(A,13)^rr(A,22))+((A&H[1])^(A&H[2])^(H[1]&H[2]));
        H=[(t1+t2)|0].concat(H);H[4]=(H[4]+t1)|0;H.length=8;}
      for(i=0;i<8;i++)H[i]=(H[i]+old[i])|0;}
    for(i=0;i<8;i++)for(j=3;j+1;j--){var b=(H[i]>>(j*8))&255;res+=((b<16)?"0":"")+b.toString(16);}
    return res;}
  function sha256(t){if(window.crypto&&crypto.subtle&&window.isSecureContext){try{
      return crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)).then(function(b){
        return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,"0")}).join("");
      }).catch(function(){return sha256sync(utf8(t))});}catch(e){}}
    return Promise.resolve(sha256sync(utf8(t)));}

  /* ---------------- DOM ---------------- */
  function $(id){ return document.getElementById(id); }
  function mount(){
    var gate = document.createElement("div"); gate.id = "gate";
    gate.innerHTML = '<form class="gatecard" id="gateform" autocomplete="on">'
      + '<div class="brand">Bệnh viện Mắt Sài Gòn</div><h2 id="gTitle"></h2><p class="lede" id="gateLede"></p>'
      + '<div class="gateerr" id="gateErr"></div>'
      + '<div class="field"><label for="gu" id="luser"></label><input type="text" id="gu" name="username" autocomplete="username" autocapitalize="characters" required autofocus></div>'
      + '<div class="field"><label for="gp" id="lpass"></label><input type="password" id="gp" name="password" autocomplete="current-password" required></div>'
      + '<button type="submit" class="gatebtn" id="gateBtn"></button></form>';
    var pick = document.createElement("div"); pick.id = "pick"; pick.className = "gone";
    pick.innerHTML = '<div class="gatecard pickcard"><div class="brand">Bệnh viện Mắt Sài Gòn</div><h2 id="pickTitle"></h2><p class="lede" id="pickLede"></p><div id="pickBody"></div></div>';
    document.body.insertBefore(pick, document.body.firstChild);
    document.body.insertBefore(gate, document.body.firstChild);
    var head = document.createElement("header"); head.className = "top";
    head.innerHTML = '<div class="titleblock"><h1 id="pgTitle"></h1><div class="sub" id="pgSub"></div></div>'
      + '<div class="controls"><span class="feed" id="feed"></span><span class="who" id="whoami"></span>'
      + '<div class="seg" id="langseg" role="group" aria-label="Language"><button data-l="en">EN</button><button data-l="vi">Tiếng Việt</button><button data-l="zh">中文</button></div></div>';
    var nav = document.createElement("nav"); nav.className = "nav"; nav.id = "nav";
    var wrap = $("wrap");
    wrap.insertBefore(nav, wrap.firstChild);
    wrap.insertBefore(head, wrap.firstChild);
  }
  function applyGateLang(){
    var t = T();
    $("gTitle").textContent = t.brand; $("gateLede").textContent = t.glede;
    $("luser").textContent = t.luser; $("lpass").textContent = t.lpass;
    $("pickTitle").textContent = t.pickTitle; $("pickLede").textContent = t.pickLede;
    var b = $("gateBtn"); if(!b.disabled) b.textContent = t.signin;
    $("langseg").querySelectorAll("button").forEach(function(x){ x.setAttribute("aria-pressed", String(x.dataset.l === st.lang)); });
    document.body.className = st.lang === "zh" ? "lang-zh" : "";
  }
  function renderChrome(){
    var t = T();
    $("nav").innerHTML = PAGES.map(function(p){
      return '<a href="'+opts.root+p[1]+'"'+(p[0]===opts.page ? ' aria-current="page"' : '')+'>'+esc(t.nav[p[0]])+'</a>';
    }).join("");
    var el = $("whoami");
    el.innerHTML = st.session ? '<button type="button" id="swBtn">'+esc(t.switchWho)+'</button><button type="button" id="soBtn">'+esc(t.signout)+'</button>' : "";
    if(st.session){ $("soBtn").onclick = signOut; $("swBtn").onclick = showPick; }
    renderFeed();
  }
  function renderFeed(){
    var t = T(), el = $("feed"), m = st.feed.mode;
    if(!Z.feedUrl() && m !== "live"){ el.className = "feed"; el.innerHTML = '<i></i>' + esc(t.feedSnap) + ' ' + esc(fmtWhen(st.feed.at)); return; }
    el.className = "feed " + m;
    el.innerHTML = '<i></i>' + esc(m === "live" ? t.feedLive + " " + fmtWhen(st.feed.at) : m === "loading" ? t.feedLoading : t.feedFailed + " " + fmtWhen(st.feed.at));
    if(m === "failed") el.title = st.feed.error;
  }
  function setTitle(title, sub){ $("pgTitle").textContent = title; $("pgSub").innerHTML = sub; }
  function render(){ renderChrome(); opts.onRender(st); }

  function showPick(){
    var by = {}, t = T(), h = "";
    st.cases.forEach(function(c){ if(c[0] !== st.clinic) return; by[daKey(c)] = (by[daKey(c)] || 0) + 1; });
    h += '<div class="pickclinic">'+esc(st.clinic)+'</div><div class="pickrow">';
    Object.keys(by).sort().forEach(function(k){
      h += '<button data-me="'+esc(k)+'"'+(k===st.me?' class="on"':'')+'>'+esc(daName(k))+'<span>'+by[k]+' '+esc(t.kh)+'</span></button>';
    });
    h += '</div>';
    $("pickBody").innerHTML = h;
    document.querySelectorAll("[data-me]").forEach(function(b){
      b.onclick = function(){ st.me = store("zsop_da_me", b.dataset.me); $("pick").classList.add("gone"); $("wrap").hidden = false; render(); };
    });
    $("wrap").hidden = true; $("pick").classList.remove("gone");
  }
  function saveSession(){ st.session = true; try{ sessionStorage.setItem("zsop_da_clinic", st.clinic); }catch(e){} }
  function loadSession(){ try{ var c = sessionStorage.getItem("zsop_da_clinic"); if(c){ st.clinic = c; st.session = true; return true; } }catch(e){} return false; }
  function signOut(){
    st.session = false; st.clinic = "";
    try{ sessionStorage.removeItem("zsop_da_clinic"); }catch(e){}
    $("wrap").hidden = true; $("pick").classList.add("gone"); $("gate").classList.remove("gone");
    $("gp").value = ""; $("gu").focus();
  }
  function enterApp(){
    $("gate").classList.add("gone");
    if(meKnown()){ $("wrap").hidden = false; render(); } else showPick();
    if(Z.feedUrl()){
      st.feed = { mode:"loading", at:"", error:"" }; renderFeed();
      Z.loadFeed().then(function(f){ st.cases = f.cases; st.feed = { mode:"live", at:f.generated, error:"" }; })
        .catch(function(err){ st.cases = st.snapshot; st.feed = { mode:"failed", at:DATA.generated || "", error:String(err && err.message || err) }; })
        .then(function(){
          if(!st.session) return;
          if(meKnown()){ $("pick").classList.add("gone"); $("wrap").hidden = false; render(); } else showPick();
        });
    }
  }
  function setLang(l){
    st.lang = l; store("zsop_da_lang", l); applyGateLang();
    if(!st.session) return;
    if($("pick").classList.contains("gone")) render(); else showPick();
  }

  function init(o){
    Object.keys(o || {}).forEach(function(k){ opts[k] = o[k]; });
    st.lang = store("zsop_da_lang") || "en";
    var ql = /[?&]lang=(en|vi|zh)/.exec(location.search); if(ql) st.lang = ql[1];
    st.me = store("zsop_da_me") || "";
    mount(); applyGateLang();
    $("gateform").addEventListener("submit", function(ev){
      ev.preventDefault();
      var t = T(), btn = $("gateBtn"), err = $("gateErr");
      btn.disabled = true; btn.textContent = t.signingin; err.classList.remove("on");
      var cl = userClinic($("gu").value);
      sha256($("gp").value).then(function(hh){
        btn.disabled = false; btn.textContent = t.signin;
        if(hh !== PW_HASH || !cl){ err.textContent = t.badlogin; err.classList.add("on"); $("gp").value = ""; $("gp").focus(); return; }
        st.clinic = cl; saveSession(); enterApp();
      }).catch(function(){ btn.disabled = false; btn.textContent = t.signin; err.textContent = t.badlogin; err.classList.add("on"); });
    });
    $("langseg").querySelectorAll("button").forEach(function(b){ b.onclick = function(){ setLang(b.dataset.l); }; });
    if(loadSession()) enterApp(); else $("gu").focus();
  }

  return { init:init, state:st, T:T, esc:esc, fill:fill, fmtWhen:fmtWhen, setTitle:setTitle, render:render,
           daKey:daKey, daName:daName, daClinic:daClinic, showPick:showPick, signOut:signOut, months:function(){ return T().months; } };
})();
