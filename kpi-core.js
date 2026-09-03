/* DA Dashboard - KPI helpers shared by the home, sales and leads pages.

   Sales figures come from kpi-data.js, generated from the Optometry
   Membership Weekly Report (tools/kpi-from-report.py): per week and per
   hospital, member revenue MTD against target, members, and the
   repurchase / referral / rescue split. Leads are modelled until the
   report carries them (leads.modelled). SOP numbers are real: same rules
   as the head-office page. */
window.KPI = (function(){
  "use strict";
  var Z = window.ZSOP, D = window.KPI_DATA || { weeks:[], segments:[] };
  var SEGS = D.segments.length ? D.segments : ["repurchase","referral","rescue"];

  function weeks(){ return D.weeks; }
  function latest(){ return D.weeks.length ? D.weeks[D.weeks.length-1] : null; }
  function week(id){ for(var i=0;i<D.weeks.length;i++) if(D.weeks[i].id === id) return D.weeks[i]; return latest(); }
  function hosp(w, cl){ return w && w.hospitals[cl] ? w.hospitals[cl] : null; }
  /* the week before w in the same month, for this-week deltas */
  function prevInMonth(w){
    var i = D.weeks.indexOf(w);
    for(var j=i-1;j>=0;j--) if(D.weeks[j].month === w.month) return D.weeks[j];
    return null;
  }
  function thisWeek(w, cl, get){
    var h = hosp(w, cl); if(!h) return null;
    var p = prevInMonth(w), ph = p ? hosp(p, cl) : null;
    return ph ? get(h) - get(ph) : get(h);
  }
  function daysIn(m){ return new Date(Date.UTC(+m.slice(0,4), +m.slice(5,7), 0)).getUTCDate(); }
  function pct(a,b){ return b ? Math.round(a/b*100) : 0; }
  function paceClass(ach, tgt, frac){
    if(!tgt) return "";
    if(frac >= 1) return ach >= tgt ? "ok" : "bad";
    var ratio = (ach / tgt) / frac;
    return ratio >= 0.97 ? "ok" : ratio >= 0.85 ? "warn" : "bad";
  }
  function money(v, lang){
    if(Math.abs(v) >= 1e9){ var b = (v/1e9).toFixed(2).replace(/\.?0+$/,""); return lang === "vi" ? b + " tỷ" : "₫" + b + "bn"; }
    var mm = (Math.round(v/1e5)/10).toLocaleString("en-US"); return lang === "vi" ? mm + " tr" : "₫" + mm + "m";
  }
  function fmtDay(iso, months){ return +iso.slice(8,10) + " " + months[+iso.slice(5,7)-1]; }

  /* ---------------- SOP, same rules as the head-office page ---------------- */
  var STAGES = Z.STAGES, OFF = Z.OFF, CAD = Z.CAD;
  function defs(c, si){ return CAD[c[2]][STAGES[si]] || null; }
  function dueDate(c, si){ var a = OFF[si][0] === 0 ? c[4] : c[5]; return a ? Z.addDays(a, OFF[si][1]) : null; }
  function cadencePoints(c, si){
    var bits = c[8][si], got = 0;
    for(var i=0;i<bits.length;i++) if(bits.charAt(i)==="1") got++;
    return got === 0 ? 0 : got === bits.length ? 1 : 0.5;
  }
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
  return { SEGS:SEGS, DATA:D, weeks:weeks, latest:latest, week:week, hosp:hosp, prevInMonth:prevInMonth, thisWeek:thisWeek,
           daysIn:daysIn, pct:pct, paceClass:paceClass, money:money, fmtDay:fmtDay, sop:sop, dueOn:dueOn };
})();
