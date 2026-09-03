# DA Dashboard

A DA signs in and lands on a KPI overview for the month: their own Zalo SOP
score, and the clinic's sales and leads against target. Each card zooms in
to its own page. Built for a phone.

Live at https://kohsinlong.github.io/DA-Dashboard-/ (GitHub Pages, `main` /
root).

## Pages

| Page | What it shows | Data |
|---|---|---|
| `/` KPI | Three cards: Zalo SOP (you, month to date), Sales and Leads (clinic, latest report week), each with target, pace line and a zoom-in link | SOP real; sales from the weekly report; leads modelled |
| `/sop/` Zalo SOP | Your follow-ups: due today, due this week, missed, open queries, data flags, streaks, team | Real (sent marks modelled) |
| `/sales/` Sales | Member revenue MTD vs target, members, revenue this week, repurchase / referral / rescue split, week-by-week trend | Weekly report |
| `/leads/` Leads | Leads MTD vs target, conversion to referral customers, week by week | Modelled until the report carries leads |

Shared pieces: `shell.js` (sign-in, DA picker, session, language, header,
navigation, live-feed loading), `theme.css`, `kpi-core.js` (report data helpers,
SOP scoring helpers), `kpi-data.js` (generated from the weekly report) and `optom-core.js`.

## The Zalo SOP page

- **Tiles** — due today, due this week (with how many are already closed
  and how many still to come), missed or incomplete (this week and last),
  open queries, data flags.
- **Today** — a ring that fills as the day's cadences are sent, with
  customers done / in progress / not started and messages sent.
- **Your score** — today, month to date and since July, on exactly the
  head-office scoring (1 per cadence fully sent, 0.5 partial, 0 missed).
  Only cadences whose window has closed count; days ahead are shown to
  plan, not scored. A line says what tonight's month score becomes if
  today's tasks are finished.
- **Your month, day by day** — one square per day, coloured by that day's
  score, with current streak, best streak and perfect days.
- **This week** — Mon to Sun, due count per day, closed days split into
  full / partial / missed.
- **Due today** — every Zalo tag with the exact CRM items still to send,
  and when a windowed cadence (D6-7, CD+3-5) opened. Filter by to do /
  in progress / done. Due tomorrow shown underneath.
- **Missed and incomplete** — newest first, grouped yesterday / this week /
  last week, older behind a button.
- **Open queries** — every real question or request a customer raised, kept
  open until a real answer lands (see below).
- **Team this month** and **Data flags to fix**.

Sign in with the clinic's username and the shared password. The username is
the clinic name without spaces, upper-case, plus `_DA` (`NGT_DA`, `CTED5_DA`),
so a new clinic in the feed needs no code change; extra aliases go in `USERS`
in `index.html`. The password is stored only as a SHA-256 hash (`PW_HASH`).
After sign-in the DA picks their name from that clinic's list once; the
phone remembers it. Languages:
EN / Tiếng Việt / 中文 (`?lang=vi` to open in Vietnamese).

## Sign-in

Sign in with the clinic's username and the shared password. The username is
the clinic name without spaces, upper-case, plus `_DA` (`NGT_DA`, `CTED5_DA`),
so a new clinic in the feed needs no code change; extra aliases go in `USERS`
in `shell.js`. The password is stored only as a SHA-256 hash (`PW_HASH` in
`shell.js`). After sign-in the DA picks their name from that clinic's list
once; the phone remembers it. Languages: EN / Tiếng Việt / 中文 (`?lang=vi`
to open in Vietnamese).

## Sales and leads — from the weekly report

`kpi-data.js` is generated from the Optometry Membership Weekly Report
workbook (the one with a `Wnn` sheet per week):

    python3 tools/kpi-from-report.py <report.xlsx> > kpi-data.js

Run it whenever a new week is filled in, commit, and the KPI card, Sales
and Leads pages pick up the new week. Per week and per hospital it carries
total members, member revenue MTD, target revenue, the hospital's total
revenue, and the repurchase / referral / rescue split (customers and
revenue). The pace line on every gauge is the report's data cut-off day
as a share of the month.

Two fallbacks, both flagged on the page:

- A week with revenue but no customer counts (W35 as delivered) takes the
  customer counts of the latest earlier week in the same month, marked
  "customers as of W34".
- Leads are not in the report yet. The target is derived as revenue target
  ÷ 7m average bill ÷ 15% lead-to-referral conversion, and the MTD count is
  a deterministic draw around pace, marked modelled. Fill in Leads MTD in
  the report and the real number takes over.

The workbook itself is not in the repo; only the generated numbers are.

## Data

`optom-core.js` is shared with the head-office dashboard
(https://github.com/kohsinlong/zalo-sop-dashboard): the embedded snapshot of
the Membership trackers, the live-feed settings (`LIVE`), and the rules that
turn tracker rows into scored cases. Keep the two copies identical so a
customer scores the same on every page. Whether each message was actually
sent is modelled until the Salework Zalo API is connected.

`?feed=<url>` overrides the feed for testing; `?asof=YYYY-MM-DD` moves the
reporting date.

## Open queries — the chat-log ledger

`tools/chat-queries.gs` is a Google Apps Script that turns Zalo chat logs
into a ledger of open queries:

1. Paste (or pipe) the conversation export into a **Chat log** sheet:
   `Thread | Time | Sender (customer / da) | Text | Clinic | DA | Zalo tag`.
   `sample/chat-log.csv` shows the shape. Strip phone numbers first.
2. Every 15 minutes `scan()` sends each thread that has new messages to
   Claude (last 40 messages plus that thread's open queries) and asks, with
   a fixed JSON schema, which customer messages are real questions or
   requests, and whether each open query is now **resolved** (an actual
   answer), **promised** ("để em kiểm tra", no answer yet), or **chased**
   (the customer asked again). Greetings, thanks and acknowledgements are
   ignored.
3. Results land in a **Queries** sheet, one row per query with asked-at,
   category, paraphrase, status, promised-at, chased count, resolved-at and
   response hours. Status can be edited by hand (resolved after a phone
   call, dismissed if it was not a question).
4. The script's web app serves the ledger as JSON; put its URL and token
   into `QUERIES` near the top of the script in `sop/index.html` and the panel
   switches from the modelled sample to live rows.

Same pipeline, two uses: the structured columns drive the dashboard counts
("promised and still waiting", median hours to answer), and the per-thread
paraphrases are what an "ask about your chats" box would search over.

The API key lives in the Apps Script's Script properties, never in the
repo. Message text is sent to the Claude API for classification only.

Static HTML, no build step. No patient data appears on the page: Zalo tags
carry the child's name reduced to initials.
