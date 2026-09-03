#!/usr/bin/env python3
"""Build kpi-data.js from the Optometry Membership Weekly Report workbook.

    python3 tools/kpi-from-report.py <report.xlsx> > kpi-data.js

Reads every populated Wnn sheet (a week counts as populated when its
Total Members is non-zero) and emits, per week and per hospital: members,
member revenue MTD, target revenue, the hospital's total revenue MTD, the
repurchase / referral / rescue split (customers and revenue), and leads.

Two fallbacks, both flagged in the output:
  * A week with revenue but no customer counts (W35 as delivered) takes the
    customer counts of the latest earlier week in the same month; the
    hospital record carries custWeek = that week's id.
  * Leads are not filled in the report yet. Where Leads MTD is empty or
    zero, a target is derived (target revenue / 7m average bill / 15%
    lead-to-referral conversion) and the MTD count is modelled as a
    deterministic draw around pace; leads.modelled = true. Real values in
    the report take over automatically.
"""
import json, re, sys, calendar, hashlib
from datetime import datetime
import openpyxl

SEGS = [("repurchase", "Repurchase"), ("referral", "Referral"), ("rescue", "Rescue")]
AVG_BILL = 7_000_000      # VND, from the report's avg bill sizes (4.3m-12.5m)
CONVERSION = 0.15         # lead -> referral customer, assumption

def d(s):
    s = str(s).strip()
    for f in ("%d %b %Y", "%d %B %Y"):
        try: return datetime.strptime(s, f).date()
        except ValueError: pass
    raise ValueError(s)

def num(v):
    return float(v) if isinstance(v, (int, float)) else 0.0

def rng(seed):
    """deterministic 0..1 from a string"""
    h = int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16)
    return (h % 10000) / 10000.0

def read_week(ws):
    wid = ws.title
    m = re.search(r"(\d{1,2} \w{3} \d{4})\s*→\s*(\d{1,2} \w{3} \d{4})", str(ws["B3"].value or ""))
    if not m: return None
    start, end = d(m.group(1)), d(m.group(2))
    cutoff = d(ws["B4"].value) if ws["B4"].value else end
    hosp = {}
    r = 12
    while ws.cell(r, 1).value and not str(ws.cell(r, 1).value).startswith("Total"):
        name = str(ws.cell(r, 1).value).strip()
        hosp[name] = {
            "members": int(num(ws.cell(r, 2).value)),
            "memberRevenue": num(ws.cell(r, 3).value),
            "targetRevenue": num(ws.cell(r, 4).value),
            "totalRevenue": num(ws.cell(r, 6).value),
            "leadsMtd": num(ws.cell(r, 8).value),
            "seg": {}, "custWeek": None,
        }
        r += 1
    # segment block: hospital rows at 24, 28, 32, ... each followed by 3 segment rows
    r = 24
    while r < ws.max_row and ws.cell(r, 1).value and not str(ws.cell(r, 1).value).startswith("Grand"):
        name = str(ws.cell(r, 1).value).strip()
        if name in hosp:
            for i, (key, _) in enumerate(SEGS):
                hosp[name]["seg"][key] = {"cust": int(num(ws.cell(r + i, 3).value)),
                                          "rev": num(ws.cell(r + i, 5).value)}
        r += 4
    total_members = int(num(ws["B17"].value))
    if not total_members: return None
    return {"id": wid, "period": f"{start.strftime('%d %b')} - {end.strftime('%d %b %Y')}",
            "start": start.isoformat(), "end": end.isoformat(), "cutoff": cutoff.isoformat(),
            "month": cutoff.strftime("%Y-%m"), "hospitals": hosp}

def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    weeks = []
    for ws in wb.worksheets:
        if re.fullmatch(r"W\d+", ws.title):
            w = read_week(ws)
            if w: weeks.append(w)
    weeks.sort(key=lambda w: w["cutoff"])
    # customer-count fallback and leads
    for i, w in enumerate(weeks):
        days = calendar.monthrange(int(w["month"][:4]), int(w["month"][5:7]))[1]
        frac = int(w["cutoff"][8:10]) / days
        w["frac"] = round(frac, 4)
        for name, h in w["hospitals"].items():
            if sum(s["cust"] for s in h["seg"].values()) == 0 and any(s["rev"] for s in h["seg"].values()):
                for prev in reversed(weeks[:i]):
                    ph = prev["hospitals"].get(name)
                    if prev["month"] == w["month"] and ph and sum(s["cust"] for s in ph["seg"].values()):
                        for k in h["seg"]: h["seg"][k]["cust"] = ph["seg"][k]["cust"]
                        h["custWeek"] = prev["id"]; break
            target = round(h["targetRevenue"] / AVG_BILL / CONVERSION) if h["targetRevenue"] else 0
            if h["leadsMtd"] > 0:
                h["leads"] = {"target": target, "mtd": int(h["leadsMtd"]), "modelled": False}
            else:
                k = 0.75 + rng(f"leads|{name}|{w['id']}") * 0.4
                mtd = round(target * frac * k)
                for prev in reversed(weeks[:i]):        # MTD never goes down within a month
                    ph = prev["hospitals"].get(name)
                    if prev["month"] == w["month"] and ph and "leads" in ph:
                        mtd = max(mtd, ph["leads"]["mtd"]); break
                h["leads"] = {"target": target, "mtd": mtd, "modelled": True}
            del h["leadsMtd"]
        w["total"] = {
            "members": sum(h["members"] for h in w["hospitals"].values()),
            "memberRevenue": sum(h["memberRevenue"] for h in w["hospitals"].values()),
            "targetRevenue": sum(h["targetRevenue"] for h in w["hospitals"].values()),
        }
    out = {"generated": datetime.now().date().isoformat(), "source": path.split("/")[-1],
           "segments": [k for k, _ in SEGS], "assumptions": {"avgBill": AVG_BILL, "conversion": CONVERSION},
           "weeks": weeks}
    print("/* Generated by tools/kpi-from-report.py from the Optometry Membership Weekly Report.")
    print("   Do not edit by hand: drop in the new report and re-run the script. */")
    print("window.KPI_DATA = " + json.dumps(out, ensure_ascii=False, indent=1) + ";")

if __name__ == "__main__":
    main(sys.argv[1])
