/* DA Dashboard - KPI inputs and helpers shared by the home, sales and
   leads pages.

   ILLUSTRATIVE. Sales and leads have no data source yet: TARGETS are
   placeholders per clinic per month and actuals() models "achieved" from
   them. Replace TARGETS with the real monthly targets and point actuals()
   at the sales tracker / Salework when those are available. Revenue in VND.
   SOP numbers are real: same rules as the head-office page. */
window.KPI = (function(){
  "use strict";
  var Z = window.ZSOP, MS = Z.MS;
  var STREAMS = ["member","repurchase","referral"];
  var TARGETS = {
    "CTE D5": { rev:{member:600e6, repurchase:220e6, referral:140e6}, cust:{member:110, repurchase:55, referral:28}, leads:380 },
    "NGT":    { rev:{member:900e6, repurchase:340e6, referral:210e6}, cust:{member:170, repurchase:85, referral:42}, leads:560 }
  };
  function daysIn(m){ return new Date(Date.UTC(+m.slice(0,4), +m.slice(5,7), 0)).getUTCDate(); }
  function monthFrac(m, today){
    var cur = today.slice(0,7);
    if(m < cur) return 1;
    if(m > cur) return 0;
    return +today.slice(8,10) / daysIn(m);
  }
  function weeksOf(m){
    var n = daysIn(m), out = [], d = m + "-01", i = 1;
    while(d.slice(0,7) === m){
      var wd = (new Date(Date.parse(d)).getUTCDay() + 6) % 7, end = Z.addDays(d, 6 - wd);
      if(end.slice(0,7) !== m) end = m + "-" + String(n).padStart(2,"0");
      var days = Math.round((Date.parse(end) - Date.parse(d)) / MS) + 1;
      out.push({ start:d, end:end, frac: days / n, i:i++ });
      d = Z.addDays(end, 1);
    }
    return out;
  }
  function empty(m){
    var out = { rev:{}, cust:{}, leads:0, leadsByWeek: weeksOf(m).map(function(w){ return {w:w, n:null}; }) };
    STREAMS.forEach(function(s){ out.rev[s] = 0; out.cust[s] = 0; });
    return out;
  }
  function targets(cl){ return TARGETS[cl] || null; }
  /* achieved so far: a deterministic draw around the target, scaled by
     how much of the month has elapsed */
  function actuals(cl, m, today){
    var t = TARGETS[cl]; if(!t) return empty(m);
    var r = Z.prng(Z.hash32("kpi│" + cl + "│" + m)), frac = monthFrac(m, today);
    var out = { rev:{}, cust:{}, leads:0, leadsByWeek:[] };
    STREAMS.forEach(function(s){
      var k = 0.72 + r()*0.45;
      out.rev[s]  = Math.round(t.rev[s]  * frac * k / 1e6) * 1e6;
      out.cust[s] = Math.round(t.cust[s] * frac * (k*0.9 + r()*0.2));
    });
    out.leads = Math.round(t.leads * frac * (0.7 + r()*0.5));
    var weeks = weeksOf(m), left = out.leads;
    weeks.forEach(function(w, i){
      if(w.start > today){ out.leadsByWeek.push({w:w, n:null}); return; }
      var share = (i === weeks.length-1 || weeks[i+1].start > today) ? left : Math.round(out.leads * w.frac * (0.8 + r()*0.4));
      share = Math.max(0, Math.min(left, share)); left -= share;
      out.leadsByWeek.push({w:w, n:share});
    });
    return out;
  }
  function pct(a,b){ return b ? Math.round(a/b*100) : 0; }
  function paceClass(ach, tgt, frac){
    if(!tgt) return "";
    if(frac >= 1) return ach >= tgt ? "ok" : "bad";
    var ratio = (ach / tgt) / frac;
    return ratio >= 0.97 ? "ok" : ratio >= 0.85 ? "warn" : "bad";
  }
  function money(v, lang){
    if(Math.abs(v) >= 1e9){ var b = (v/1e9).toFixed(2).replace(/\.?0+$/,""); return lang === "vi" ? b + " tỷ" : "₫" + b + "bn"; }
    var mm = Math.round(v/1e6).toLocaleString("en-US"); return lang === "vi" ? mm + " tr" : "₫" + mm + "m";
  }

  /* ---------------- SOP, same rules as the head-office page ---------------- */
  var STAGES = Z.STAGES, OFF = Z.OFF, CAD = Z.CAD;
  function defs(c, si){ return CAD[c[2]][STAGES[si]] || null; }
  function dueDate(c, si){ var a = OFF[si][0] === 0 ? c[4] : c[5]; return a ? Z.addDays(a, OFF[si][1]) : null; }
  function cadencePoints(c, si){
    var bits = c[8][si], got = 0;
    for(var i=0;i<bits.length;i++) if(bits.charAt(i)==="1") got++;
    return got === 0 ? 0 : got === bits.length ? 1 : 0.5;
  }
  /* closed cadences in month m for the cases that pass keep() */
  function sop(cases, keep, m, today){
    var due=0, pts=0, miss=0, cust={};
    cases.forEach(function(c){
      if(!keep(c)) return;
      for(var si=0; si<STAGES.length; si++){
        if(!defs(c, si)) continue;
        var d = dueDate(c, si);
        if(!d || d >= today || d < Z.START || (m && d.slice(0,7) !== m)) continue;
        var v = cadencePoints(c, si); due++; pts += v; if(v === 0) miss++; cust[c[0]+"│"+c[6]] = 1;
      }
    });
    return { due:due, pts:pts, miss:miss, score:pct(pts, due), n:Object.keys(cust).length };
  }
  /* cadences due on one day for keep() cases: for the "today" ring */
  function dueOn(cases, keep, day){
    var n=0, full=0, part=0, items=0, sent=0;
    cases.forEach(function(c){
      if(!keep(c)) return;
      for(var si=0; si<STAGES.length; si++){
        if(!defs(c, si) || dueDate(c, si) !== day) continue;
        var v = cadencePoints(c, si); n++; if(v===1) full++; else if(v===0.5) part++;
        var bits = c[8][si]; items += bits.length; for(var i=0;i<bits.length;i++) if(bits.charAt(i)==="1") sent++;
      }
    });
    return { n:n, full:full, part:part, items:items, sent:sent };
  }
  function clinics(cases){ var s = {}; cases.forEach(function(c){ s[c[0]] = 1; }); return Object.keys(s).sort(); }
  function months(today){
    var out = [], m = Z.START.slice(0,7), cur = today.slice(0,7);
    while(m <= cur){ out.push(m); var y = +m.slice(0,4), mo = +m.slice(5,7)+1; if(mo > 12){ mo = 1; y++; } m = y + "-" + String(mo).padStart(2,"0"); }
    return out;
  }
  return { STREAMS:STREAMS, TARGETS:TARGETS, targets:targets, actuals:actuals, daysIn:daysIn, monthFrac:monthFrac, weeksOf:weeksOf,
           pct:pct, paceClass:paceClass, money:money, sop:sop, dueOn:dueOn, clinics:clinics, months:months };
})();
