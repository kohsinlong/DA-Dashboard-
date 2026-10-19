# DA Zalo Dashboard — design, operations and change log

**Status:** v1.3.0 live: script deployed 16 Oct 2026, address baked into `zalo/app.js` · **Go-live:** 16 Oct 2026 · **Clinic:** NGT · **Last updated:** 16 Oct 2026

This file is the single source of truth for the DA Zalo Dashboard. Part 1 is the view at a
glance, Part 2 the granular rules, Part 3 the change log. Every change to the dashboard updates
the section it affects **and** adds a dated line to the change log. Handing the project to
someone new, or to Claude, means giving them this file and the `zalo/` folder.

---

## Part 1 — At a glance

### What it is

The DA's one-stop page for Zalo SOP follow-ups. She opens it on her phone, sees what to send
today, ticks what she sent, adds new customers, records glass collections and, on a PC, uploads
the QK daily report so most new customers are filled in for her. It replaces the DA's direct
use of the CRM form. The CRM form (the Google Sheet `CRM - DA Follow up - NGT`) stays the
information store; the dashboard writes to it.

### Who does what

| Person | Does |
|---|---|
| DA (Tiên) | signs in, works the task list, adds customers, records collections, uploads the QK report, confirms Zalo tag renames |
| Manager (you) | edits the SOP content and the high/low split in the `Cadence (VN)` tab, changes settings in `DA_Settings`, reads `DA_Log` |
| Head office | unchanged: the head-office SOP page reads the same sheet through its own feed |

### Moving parts

```
 DA's phone / PC
   │  opens  https://kohsinlong.github.io/DA-Dashboard-/zalo/        (static page on GitHub Pages)
   ▼
 zalo/index.html  ·  zalo/app.js (screens)  ·  zalo/core.js (rules: cadence, tags, import, matching)
   │
   │  GET / POST  (JSON; every call carries the sign-in hash)
   ▼
 Google Apps Script web app   zalo/tools/zalo-sop.gs        (deployed once, "execute as me, anyone")
   │  reads and writes
   ▼
 Google Sheet  "CRM - DA Follow up - NGT"
   ├─ Membership_NGT      the CRM form — source of truth, formula columns never touched
   ├─ Cadence (VN)        SOP content per product/milestone  +  new column E "Touch" (High/Low)
   ├─ DA_Tasks            what was marked sent
   ├─ DA_Imports          every uploaded QK order and what became of it
   ├─ DA_Details          parent name, relation, gender
   ├─ DA_Settings         go-live date, import cutoff, grace periods
   └─ DA_Log              every write, old and new value

 QK NGT Daily report.xlsx ──► Import page (parsed in the browser) ──► proposals ──► ticked rows written to Membership_NGT
```

The page holds no customer data of its own. Everything is fetched after sign-in and nothing is
cached beyond the browser session.

Files in `zalo/`:

| File | Role |
|---|---|
| `index.html` | the one page: sign-in card, name picker, header, nav, the screens' container |
| `app.js` | screens, sign-in, API calls, demo engine, strings in VI / EN / ZH |
| `core.js` | every rule: dates, names and phones, products, cadence milestones, the task plan, tag suggestions, QK parsing, matching. Runs in the browser and in Node |
| `zalo.css` | page styles on top of the shared `../theme.css` |
| `demo-data.js` | synthetic customers for `?demo=1` |
| `vendor/xlsx.full.min.js` | the Excel reader (SheetJS 0.18.5, Apache-2.0), loaded only when an .xlsx is chosen |
| `tools/zalo-sop.gs` | the Apps Script web app (reads and writes the workbook) |
| `tools/test-core.js`, `tools/test-gs.js` | rule tests and script tests (`node zalo/tools/test-core.js`, `node zalo/tools/test-gs.js`) |
| `README.md` | this document |

### The rules in one breath

- **Due dates** come from the deposit date (column K) for D1 and D6-7, and from the collected
  date (column L) for CD and after. The date inside the Zalo tag is not used.
- **High touch** (personal, one by one) is everything up to and including the first week after
  collection. **Low touch** (mass send) is CD+14 and later. The split is a column in the
  `Cadence (VN)` tab and can be changed there.
- **Due today** shows high touch only. **Mass sends** shows low touch for the whole week, grouped
  by milestone and content. Once a customer has a collected date, the deposit-phase messages
  (D1, D6-7) are dropped for them.
- **Nothing before go-live** (16 Oct 2026) is ever due or overdue.
- **Zalo tag**: `MCY 260720 Mẹ bé Avan Nguyễn 0772786699` — product, Y/N, date, relation, child,
  phone. Collected → Y with the collection date; not yet → N with the deposit date.
- **The dashboard never renames a tag on its own.** It proposes the new tag, the DA renames in
  Zalo, taps confirm, then the sheet is updated.
- **Siblings** are one row per child sharing the parent's phone; the task list merges them into
  one card so the parent is messaged once.
- **Imports lose nothing**: every uploaded order is remembered; rows not ticked are parked on
  the No Zalo Add List.

### Where to change common things

| Want to | Where |
|---|---|
| Change the go-live date, import cutoff, grace periods | `DA_Settings` tab |
| Move a milestone between high and low touch | `Cadence (VN)` column E |
| Change what a milestone says to do | `Cadence (VN)` column C |
| Change the username or password | `USERS` / `PW_HASH` in `zalo-sop.gs` (sha256 of the new password), then publish a new version of the script |
| Add a clinic or a username | add the workbook to `CLINICS` and the username to `USERS` in `zalo-sop.gs`, then publish a new version |
| Update the script after editing it | Apps Script editor → Deploy → Manage deployments → Edit → New version |

---

## Part 2 — Granular

### 2.1 Sign-in and access

- Username `NGT_DA1`, one shared password. Only usernames listed in `USERS` can sign in. Only the SHA-256 hash of the password is stored, and
  only in the script (`PW_HASH` in `zalo-sop.gs`); the page holds neither the password nor its
  hash, so nothing in the public page source can be brute-forced. The page hashes what the DA
  types, sends the hash with every request, and the script refuses anything else.
- After sign-in the DA picks her name once (the list comes from column H); the phone remembers it.
- Everyone signed in sees the clinic. Task lists are filtered to the picked DA. Pending
  collection, the No Zalo Add List and the Member list are clinic-wide.
- Sessions live in the browser tab (sessionStorage). Sign out clears them.

### 2.2 Data model

**Membership_NGT** (the CRM form). Columns the dashboard reads and may write:

| Col | Header | Dashboard |
|---|---|---|
| A | STT (formula) | read only |
| B | Ngày kết bạn | written on add: today, `dd/mm/yyyy` |
| C | Tên khách hàng | written on add; may hold two kids on old rows ("A, B" or "A & B") |
| D | Tuổi (formula) | read only |
| E | Ngày sinh | written on add / edit |
| F | SĐT | written on add / edit |
| G | Sản phẩm | written on add / edit: `MC`, `Kính`, `OK`, `Atropine`, `Exam` |
| H | Trợ lý BS | written on add: the signed-in DA |
| I | Zalo tag | written on add; later only through a confirmed tag update |
| J | Trạng thái | `Đã là hội viên` written when a collected date is set |
| K | Ngày đặt cọc | written on add / edit (real date) |
| L | Ngày nhận kính | written when a collection is recorded (real date) |
| M | Bảo hành | read only |
| N | Ghi chú | written on edit |
| O | deprecated | never touched |
| P–U | auto columns | never touched |
| V | Tên bé thứ 2 | written when a sibling row is added (the other child's name) |
| W–AH | hidden helpers | never touched |

Rows below the data already carry the formulas; adding a customer means writing into the first
row whose C is empty. STT numbers itself.

**Dashboard tabs** (created by `setup()`; headers in row 1):

| Tab | Columns |
|---|---|
| `DA_Tasks` | key · clinic · da · stage · due (date) · bits (e.g. `1101`) · score (1 / 0.5) · sent_at · undone_at · note |
| `DA_Imports` | code · clinic · uploaded_at · uploaded_by · deposit · appointment · status · name · phone · patient_code · lens · product · state (`confirmed` / `parked` / `dismissed`) · result (`added:<key>` / `collected:<key>` / `repeat:<key>` / `sibling:<key>` / `manual`) · last_seen · collected · note |
| `DA_Details` | key · parent_name · relation · gender · updated_at · updated_by |
| `DA_Settings` | key · value · note — keys: `go_live` 2026-10-16 · `import_cutoff` 2026-07-20 · `late_grace_weeks` 1 · `overdue_fold_days` 14 · `week_start` Mon |
| `DA_Log` | at · by · action · key · row · cell · old · new |

**Customer key** = phone + normalised child name, e.g. `0772786699|avan nguyen` (lower case,
accents stripped, spaces collapsed). Rows without a phone use `|name`. Rows with two kids are
keyed on the first name and matched on every name. The script re-finds the row by key before
every write and refuses if the row's name and phone no longer match.

**Cadence (VN) tab**: column A product, B milestone, C what to do, D key, **E Touch** (`High` /
`Low`, added by `setup()`, filled with the table in 2.3). The script serves C and E; the page
uses them, with its built-in copy as a fallback if the tab is unreachable.

### 2.3 Cadence engine (`zalo/core.js`)

Milestones and offsets, shared with the head-office page:

| Milestone | Anchor | Day | Window |
|---|---|---|---|
| D1 | deposit | 0 | — |
| D6-7 | deposit | 7 | opens day 6 |
| CD | collected | 0 | — |
| CDN (OK) | collected | 0 | evening of collection |
| CD+1 (OK) | collected | 1 | — |
| CD+3-5 | collected | 5 | opens day 3 |
| CD+7 | collected | 7 | — |
| CD+14 (MC) | collected | 14 | — |
| CD+30 · CD+90 · CD+180 · CD+270 · CD+365 | collected | n | — |

Which milestones each product has, and the content items of each, follow the head-office
definitions (MC, Kính, OK, Atropine). Exam rows have no milestones. A row with a deposit date
but no collected date has only D1 and D6-7 due; the CD cadences appear once L is set.

High / low touch, as seeded into `Cadence (VN)` column E:

| Product | High touch | Low touch |
|---|---|---|
| MC | D1, D6-7, CD, CD+3-5 | CD+14, CD+30, CD+90, CD+180, CD+270, CD+365 |
| Kính | D1, D6-7, CD, CD+3-5, CD+7 | CD+30, CD+90, CD+180, CD+270, CD+365 |
| OK | D1, D6-7, CD, CDN, CD+1, CD+3-5, CD+7 | CD+30, CD+90, CD+180, CD+270, CD+365 |
| Atropine | D1, D6-7, CD, CD+7 | CD+90, CD+180, CD+270, CD+365 |

Timing words used everywhere:

- **due date** = the last day of the window (or the only day).
- **open** = from the first day of the window to the due date.
- **overdue** = after the due date and not sent.
- **go-live**: milestones whose due date is before `go_live` are ignored entirely.
- Dates are Vietnam time. `?asof=YYYY-MM-DD` on the URL moves "today" for testing.

Score, for the tiles and for the head-office page: a milestone marked fully sent scores 1,
partially sent 0.5, not sent after its due date 0.

### 2.4 Task lists and ticking

| List | Contains | Order |
|---|---|---|
| Overdue | high-touch, due before today, not sent, since go-live; items older than `overdue_fold_days` fold behind a button | oldest first |
| Due today | high-touch, due today or open today | by customer |
| Upcoming this week | high-touch, tomorrow to Sunday | by day |
| Mass sends due this week | low-touch, due Monday to Sunday of this week, in groups | by group |

**Mass-send groups.** A group = the same milestone **and** identical content items, across
products. MC CD+90 and Kính CD+90 merge (same text); MC CD+30 and MC CD+90 do not. Each group
shows its text once, then its customers with a milestone chip each, a select-all box, one
**Mark sent** button and a **Copy names** button that copies the Zalo tags for pasting into
Zalo. Low-touch items not sent by Sunday stay in their group with a **late** chip for
`late_grace_weeks`, then count as missed and move to Overdue.

**Undo everywhere.** Every write reports with a toast that carries an **Undo** button for nine
seconds: ticks and mass sends, a recorded collection, a confirmed or kept tag, a member-card
edit, dismiss and restore. The "member recorded" screen has an Undo that clears the row just
written, and an import write shows **Undo this write** that clears the rows it added and removes
the collected dates it set. The script allows clearing a row only when `DA_Log` shows the
dashboard added it; rows typed into the sheet by hand can never be cleared from the page.

**Ticking.** One tap on a card marks the whole milestone sent (bits all 1, score 1). Tapping
again undoes it (the `DA_Tasks` row gets `undone_at`; history is kept). Expanding a card
shows the content items; ticking some of them records a partial send (score 0.5). Ticks are
written immediately; if the write fails the card reverts and says so.

**Family merge.** Rows sharing a phone render as one card: the parent's tag once, then one
line per child and milestone. Marking the card sent writes one `DA_Tasks` row per child.
Copy names lists each parent once.

**Fun.** A ticked card strikes through and slides into a Done group at the bottom of its list.
When Due today reaches zero a short confetti burst plays once per day.

### 2.5 Pages

All pages are one HTML file with hash routes (`#/overview`, `#/add`, `#/collections`,
`#/members`, `#/legacy`) so data loads once per session. Every list panel has a collapsible
header (▾ / ▸); the fold state is remembered per device so the DA can keep only what she is
working on open.

**Overview** (landing after sign-in), top to bottom:
1. Tiles — **Today**: high-touch done / due · **Missed personal outreach**: overdue high-touch
   count · **Mass sends**: groups done / due and people reached / people due this week.
2. Overdue band (red, count, opens on tap).
3. Due today.
4. Upcoming this week.
5. Mass sends due, one block per group.
Each task row shows: Zalo tag, phone, deposit date, collection date, the milestone, and the
exact content items to send.

**Add members** — the single-member form (child name*, gender, parent name, relation, birthday,
deposit date* with "not applicable / unconverted", collection date, product*, Zalo tag*
suggested and editable, "Zalo not added", note), then **New members from the QK report**
underneath: the upload, and the new entries the file contains, newest deposit first. Nothing is
pre-ticked and there is no select-all: the DA ticks **Zalo added** on the customers she actually
has on Zalo; the tag is suggested at that moment (until then the box stays empty with a hint),
she completes product and relation (empty until she picks it), and writes those; every unticked
row goes to the No Zalo Add List. A line under the file name counts the same upload's collection
confirmations and links to Glass collections. **Repeat purchases** (same child and phone, the
member's row already collected, the new deposit after that collection) are listed like new
entries with a "repeat purchase · last collected …" chip and the parent's name and relation
pre-filled; confirming writes a second row for the child with the new deposit date, so the
cadence starts again, and the old row stays as it is. The same child twice within a month is one
purchase (the later order is skipped as a duplicate); months apart is another purchase and comes
up again. Orders already in the member list, already on that list, or imported earlier never
come up as new. Relation labels follow the page language while the stored value and the tag stay
Vietnamese (Mẹ bé …). Parent's name is optional.

**Glass collections** — **Pending collection** (every row with a deposit and no collected date:
Collected ✓ | date | Save, with the expected pickup from the last upload when known), then
**Zalo tag updates** (renames waiting for the DA: N → Y after a collection, the & form after a
sibling, edits made on a member card; the DA renames in Zalo, taps confirmed, then the sheet
is written), then **Collection updates from the QK report** underneath: the same upload, and
the rows of members whose glasses the report says are collected (members with a deposit and no
collected date in the form, DONE in the report), newest first, ticked by default. One upload
serves both pages; a line under the file name counts the upload's new members and links to Add
members.

**Member list** — search that filters as you type, chips for product, **To fix** and **No tag**,
a date filter on deposit or collected date, and a sort (newest, name, deposit date, collected
date). A member card shows details, parent details, the cadence timeline and editable fields;
tag edits go through Tag updates. Exam members are converted here.

**No Zalo Add List** (route `#/legacy`) — customers not added on Zalo yet, grouped by collection
month; every month folds and unfolds, the two newest open by default, each row with its note, its upcoming milestones, **Add to CRM**
(opens Add members pre-filled, note included) and **Dismiss**. **Repeat orders** for existing
members sit under their own heading with **Start a new cadence**. A **Dismissed** filter shows
hidden rows with **Restore**.

**Guide** (the **?** button in the header) — a sheet with the daily routine, a section per page
and a **Tour this page** button in each. A tour highlights the real elements of the page one by
one (tiles, overdue band, panel headers, search, filters, a member row), with a card explaining
each, Back / Next / Exit, Escape to leave; steps whose element is not on the page right now
(no overdue, no file loaded) are skipped. On the first sign-in on a device a welcome opens with
**Show me around** (starts the Overview tour) and **Later**; it never opens again on that device
(`zalo_guide_seen` in local storage), the **?** button is always there. All three languages.

**Resources** (route `#/resources`) — the weekly MSG training decks. One collapsible panel per
week, newest on top and open, older weeks folded, numbered from the oldest ("Tuần 5 · 14/10/2026").
The deck shown follows the page language (VI / EN / 中文); the tabs on a week switch it for that
week until the language is toggled again, and a week without a deck in the page language falls
back to one it has and says so. The viewer flips with the arrows, a tap on the slide, a swipe,
the ←/→ keys or the dots, shows "3 / 10", has **Full screen** (Escape leaves) and **Download
.pptx**, which hands over the original file under its original name. The list comes from
`zalo/resources/manifest.json`; slides are JPEGs rendered from the decks (§2.14).

### 2.6 Zalo tag rule

```
<MC | KT | OK | Atr><Y | N> <YYMMDD> <relation> bé <child name> <phone>
MCN 261016 Mẹ bé An 0909123456          deposit only, not collected
MCY 261023 Mẹ bé An 0909123456          collected on 23 Oct 2026
KTY 261023 Ba bé Bình 0909123456        glasses, father is the contact
Exam 261016 Mẹ bé An 0909123456         exam only / unconverted: no Y/N
MCY&KTY 261023 Mẹ bé An & Bình 0909123456   two kids on one Zalo
```

- The date stays before the phone because the sheet's helper formulas and the head-office feed
  read the first run of digits as the date.
- Y uses the collection date; N uses the deposit date.
- The suggestion is rebuilt whenever a field changes until the DA edits the tag by hand.
- Tag changes after the first write always go through the Tag updates page.

### 2.7 Import (QK NGT Daily report)

**File.** The workbook as downloaded (.xlsx or .xls, parsed in the browser with SheetJS, which
ships with the page in `zalo/vendor/` so no CDN is needed) or the order tab saved as text
(.csv, .txt or .tsv). Text is decoded as UTF-8, UTF-16 (Excel "Unicode Text") or the Windows
Vietnamese code page (Excel's plain "CSV"), whichever fits, and the delimiter (comma,
semicolon or tab) is detected from the first lines. The page prefers the tab named `SO TTKSCT`
when its header is found, else the first tab with the header, searching the first 80 rows. The
header is matched by meaning after stripping accents, so renamed, reordered or extra columns
still work (`Ngày đặt cọc`, `Mã ĐH`, an `STT` column in front, `Trạng thái`, a phone column of
its own); the deposit date, the order code and the customer column are the minimum. When
nothing matches, the error names the tabs seen and the first filled row, so the file can be
diagnosed from a screenshot.

**Columns.** A deposit date · B appointment ("Ngày Hẹn", the promised pickup) · C order code
(unique) · D patient code (current format) or name (old format) · E customer info · F lens ·
G status (`DONE`, `Chờ Tròng`, `Đang CPN`, `Chờ Lấy`). Two row formats are read: before July
2026, E holds the phone alone and D the name; from July 2026, E holds name, address and phone
on three lines and D the patient code.

**Filter.** Optional date range, matching rows whose A **or** B falls inside it. Rows with A
before `import_cutoff` are ignored.

**Duplicates.** The order code is the key. Codes already in `DA_Imports` with the same status
and dates are skipped; codes whose status or appointment changed come back as updates; a code
already `confirmed` never produces a second row.

**Product from lens name.** `Myocare`, `Stellest`, `MiYOSMART`, `Myopilux`, `Myopsee` → MC.
Any other lens → Kính. Blank, frames only (`gọng`), contact lenses → the DA picks.

**Collected date.** Column B **only when G is DONE**. Other statuses carry B as the expected
date, shown on Pending collection. A DONE date later than today must be confirmed by the DA.

**Matching an order to the form** (phones and names normalised, two-kid cells split):

| Finds | Becomes |
|---|---|
| phone and child name agree | Collection update for that row |
| name agrees, phone differs or blank in the form | Collection update with a "check phone" note |
| phone agrees, different child | New entry with a "sibling of …" chip; confirming adds a separate row with the parent's phone, fills V on both rows, proposes the & tag |
| same child, row already collected, new deposit after that collection | Repeat purchase: a new entry with a chip and the parent's details pre-filled; confirming adds a second row (key suffixed `#yymmdd`, written with `allowDuplicate`); unticked it goes to the No Zalo Add List under Repeat orders |
| nothing agrees | New entry |

**Screens.** New entries (pre-filled, newest first; product and relation to complete, the tag
suggested once **Zalo added** is ticked; one tick box per row, no select all; mandatory fields
enforced before confirm) · Collection updates (date editable; tick
box; select all) · Submit writes only ticked rows. Everything not ticked is stored as `parked`
and appears on Not in CRM. Two orders for the same new child in one file are offered once
(the second lands under Nothing to do). Rows ticked by default: new entries whose product
could be read from the lens name, and collection updates whose date is not in the future.

### 2.8 Script API (`zalo/tools/zalo-sop.gs`)

Every request carries `u` (username) and `h` (password hash). Posts are JSON sent as
`text/plain` so the browser sends them without a preflight.

| Call | Does | Writes |
|---|---|---|
| `GET ?action=bootstrap&da=` | returns settings, cadence content and touch, all customers, tasks, imports, details | — |
| `POST addCustomer` | adds a row; returns its key and row number | Membership B C E F G H I J K L N V, DA_Details, DA_Log |
| `POST updateCustomer` | edits cells of one row by key | the cells given, DA_Log |
| `POST setCollected` | sets L and J; queues the tag update | L, J, DA_Log |
| `POST confirmTag` | writes the confirmed tag | I, DA_Log |
| `POST markSent` | one or many milestones sent / undone | DA_Tasks |
| `POST storeImports` | records uploaded orders and their states | DA_Imports |
| `POST confirmImports` | adds rows and sets collected dates for ticked orders | as addCustomer / setCollected, DA_Imports |
| `POST saveDetails` | parent name, relation, gender, pending tag | DA_Details |
| `POST removeCustomer` | undo of an add: clears the data cells of a row the dashboard added (checked against DA_Log) | Membership data cells, DA_Log |
| `POST removeImport` | undo of a typed-in "Zalo not added" entry | DA_Imports |

Every write takes a script lock, re-finds the row by key, checks name and phone, writes, and
logs old and new values. Errors come back as `{error: "…"}` and the page shows them.

### 2.9 Settings (`DA_Settings`)

| Key | Default | Meaning |
|---|---|---|
| `go_live` | 2026-10-16 | milestones due before this are ignored |
| `import_cutoff` | 2026-07-20 | uploaded orders before this are ignored |
| `late_grace_weeks` | 1 | weeks a low-touch item stays in its group after its week |
| `overdue_fold_days` | 14 | overdue items older than this fold behind a button |
| `week_start` | Mon | first day of the task week |

### 2.10 Deployment and updates

One-time, by the manager (about ten minutes; the workbook tabs and the Touch column were
already created on 16 Oct 2026, and `setup()` is safe to run again):

1. Open https://script.google.com → **New project** → delete the sample code → paste the whole
   of `zalo/tools/zalo-sop.gs` → name the project (e.g. "DA Zalo Dashboard"). `CLINICS` already
   holds the NGT workbook ID and `PW_HASH` the agreed password's hash; change either there if
   needed.
2. Run `setup` once from the editor's function dropdown (▶). The first run asks for permission
   to use your Google Sheets; allow it. The log should read "NGT: tabs ok".
3. **Deploy → New deployment** → type **Web app** → Execute as **Me** → Who has access
   **Anyone** → Deploy → copy the URL ending in `/exec`.
4. Either paste that URL into `API.url` at the top of `zalo/app.js` and commit (the permanent
   way), or on the sign-in card open **Connect the script (advanced)** and paste it there, once
   per device. Sending the URL to Claude also works: it commits it.
5. Open https://kohsinlong.github.io/DA-Dashboard-/zalo/, sign in as `NGT_DA1`, pick the DA,
   and upload the latest QK report under Import QK.

After editing the script: Deploy → Manage deployments → Edit → Version: New version → Deploy.
The URL does not change. After editing the page: bump the `?v=` on the script and stylesheet
tags in `zalo/index.html` (and `VERSION` in `app.js`), commit to `main`; GitHub Pages publishes
within a few minutes. Browsers cache the old files for up to ten minutes; the `?v=` bump is what
makes every phone pick up the new version on its next open.

After editing the script: Deploy → Manage deployments → Edit → Version: New version. The URL
does not change. After editing the page: commit to `main`; GitHub Pages publishes in a minute.

### 2.11 Testing

- `node zalo/tools/test-core.js` — 99 checks on the rules: dates, names and phones, products,
  milestones, the task plan (overdue, due today, upcoming, mass groups, late, partial sends),
  tag suggestions and parsing, CSV, QK parsing in both formats, matching, duplicate handling.
- `node zalo/tools/test-gs.js` — 66 checks on the script against a fake spreadsheet: sign-in,
  setup, bootstrap, every write, row re-location after rows move, refusals (duplicates, bad
  dates, formula columns), import confirmation, details merge, growth past the formatted rows.
- The QK export of 16 Oct 2026 was run through the parser and matcher and reproduced the
  independent Python analysis exactly (924 orders since July: 545 phone+name matches, 26
  name-only, 17 sibling, 336 new).
- Every screen was walked in headless Chromium in demo mode, 63 checks: sign-in, picker, folds
  and their persistence, ticks, undo from the toast, partial ticks, mass send, member list
  search, date filter, sort and backspace behaviour, member edit, add with undo, duplicate
  refusal, no-Zalo parking, CSV import with the Zalo-added ticks, undo of the import write and
  re-import, pending collection with undo, tag updates, Not in CRM dismiss with undo, three
  languages.
- `?demo=1` loads synthetic sample data (no real customers). `?asof=YYYY-MM-DD` moves "today".
  `?api=<url>` points the page at a test deployment.

### 2.12 Security and privacy

- The page is public on GitHub Pages, so it holds no data and no token; the script checks the
  password hash on every call. Anyone with the password can write to the form: keep it to DAs.
- Names and phones of the clinic's customers are shown to signed-in users only and are never
  embedded in the repo.
- `DA_Log` records every write with who and when; undo is a matter of reading the old value.

### 2.13 Not in v1

Resources page · Zalo API sent-marks (ticks are manual) · per-DA passwords · clinics other
than NGT (supported by config, not switched on) · manager views · using `DA_Tasks` ticks on the
head-office page (its scores stay modelled until then; its due dates do move to K/L in this
release) · a conversion follow-up for Exam customers.

---

### 2.14 Adding a training week

```
python3 zalo/tools/add-week.py 2026-10-14 --vi Deck_VN.pptx --en Deck_EN.pptx --zh Deck_CN.pptx --title "MSG DA Training"
git add zalo/resources && git commit -m "Resources: week of 14 Oct 2026" && git push
```

The script needs LibreOffice (`soffice` on the PATH, or `--soffice "<command>"`) and Poppler's
`pdftoppm`. For each deck it converts the .pptx to PDF, renders every page as a JPEG 1600 px wide
into `zalo/resources/<date>/<lang>/NN.jpg`, copies the deck as `<lang>.pptx` beside them (the
original file name is kept in the manifest for the download button) and rewrites
`zalo/resources/manifest.json`:

```
{ "weeks": [ { "date": "2026-10-14", "title": "MSG DA Training",
               "decks": { "vi": { "slides": 10, "w": 1600, "h": 900, "file": "vi.pptx",
                                  "name": "20261014_MSG_DA_Training_Deck_VN_Final.pptx", "rev": "a1b2c3d4" }, … } } ] }
```

Running it again with the same date replaces that week; `rev` (a hash of the deck) busts the
browser cache. A deck handed over as .pdf skips LibreOffice. Any language can be missing. Each
week costs roughly 4–17 MB in the repository (the .pptx files are most of it); if that becomes
a problem, keep the decks elsewhere and link them — the manifest's `file` can be any URL.

## Part 3 — Change log

Newest first. Each entry: date · version · what changed · why · files.

| Date | Version | Change | Why | Files |
|---|---|---|---|---|
| 2026-10-19 | 1.3.0 | **Resources** page: the weekly MSG training decks, one panel per week, shown in the page's language with per-week tabs, a slide flipper (arrows, tap, swipe, keys, dots, full screen) and the original .pptx for download; `zalo/tools/add-week.py` renders a week's decks and updates the manifest. Five weeks loaded (25 Aug, 2 Sep, 24 Sep, 1 Oct, 14 Oct 2026). Also: a late mass-send task marked sent today now stays in its group, ticked, instead of vanishing. | DAs get every week's training on the dashboard. | `zalo/app.js`, `zalo/zalo.css`, `zalo/index.html`, `zalo/tools/add-week.py`, `zalo/resources/` |
| 2026-10-18 | 1.2.0 | On-page guide: **?** button opening the routine and a section per page, a step-by-step tour that highlights the page's own elements, and a one-time welcome on first sign-in per device; in Vietnamese, English and Chinese. | DAs can learn the dashboard on the spot without a separate manual. | `zalo/app.js`, `zalo/index.html`, `zalo/zalo.css` |
| 2026-10-16 | 1.1.6 | Import reader hardened after a "could not read the file" report: text files decoded as UTF-8, UTF-16 or Windows Vietnamese (Excel's plain CSV); comma, semicolon or tab delimiter detected; the header found anywhere in the first 80 rows and matched by meaning (renamed, reordered or extra columns, a separate phone column); the error now says which tabs and first row were seen. | A real export failed on live with the exact-match header check. | `zalo/core.js`, `zalo/app.js`, `zalo/index.html`, `zalo/tools/test-core.js` |
| 2026-10-16 | 1.1.5 | QK import: the tag is suggested only once **Zalo added** is ticked (empty with a hint before); new entries listed newest first; repeat purchases (same child and phone, bought again after collecting) come up as entries with a chip and the parent's details pre-filled, and confirming writes a second row so the cadence restarts; the same child twice within a month counts as one purchase; a line under the file name links the same upload's other half (collection confirmations ↔ new members). | DA review of the first live import. | `zalo/app.js`, `zalo/zalo.css`, `zalo/index.html` |
| 2026-10-16 | 1.1.4 | Fix: choosing an .xlsx failed silently since 1.1.0 (the reader's source list was lost in the page restructure); the browser walkthrough now uploads the real workbook. | Excel upload hung on live. | `zalo/app.js` |
| 2026-10-16 | 1.1.3 | Excel reader shipped with the page instead of fetched from a CDN; real progress text while a workbook is read; a 30-second timeout with a CSV hint instead of a silent hang. | Upload appeared stuck on first use. | `zalo/vendor/`, `zalo/app.js`, `zalo/index.html` |
| 2026-10-16 | 1.1.2 | Username changed to `NGT_DA1` with a new password; the generic `<CLINIC>_DA` sign-in rule removed so only listed usernames work; page files carry a version tag so phones fetch new releases. | Launch. | `zalo/tools/zalo-sop.gs`, `zalo/app.js`, `zalo/index.html` |
| 2026-10-16 | 1.1.1 | "Not in CRM" renamed to **No Zalo Add List**; every month group on it folds (the newest ones could not); bigger section headers. | Launch review. | `zalo/app.js`, `zalo/zalo.css` |
| 2026-10-16 | 1.1.0 | Pages restructured to Overview · Add members · Glass collections · Member list · Not in CRM; the QK import sits under Add members (new entries, with a note field) and under Glass collections (collection updates), one upload serving both; every list panel collapsible with the fold state remembered; member list filters by date and sorts; search filters in place (no re-render per keystroke, which broke typing on phones); deposit-phase cadences dropped once collected; orders already in the member list or on Not in CRM never offered again; imported new members are written only when ticked "Zalo added" (no select-all, nothing pre-ticked), relation empty by default with language-aware labels, parent's name optional; Undo on every write (toast button, recorded screen, import result) with two new script actions `removeCustomer` and `removeImport`; `DA_Imports` gains a `note` column. | First review on the live page. | `zalo/app.js`, `zalo/core.js`, `zalo/zalo.css`, `zalo/tools/zalo-sop.gs`, tests |
| 2026-10-16 | 1.0.0 | First build: all pages, rules engine, Apps Script, demo mode, tests. Workbook tabs `DA_Tasks`, `DA_Imports`, `DA_Details`, `DA_Settings`, `DA_Log` created and `Cadence (VN)` column E "Touch" filled. Head-office feed and both rule copies now anchor on K/L with the tag date as fallback. | Launch for NGT. | `zalo/*`, `optom-core.js`, head-office `index.html` and `tools/live-feed.gs` |
| 2026-10-16 | 0.1 | Design agreed and written up. No code yet. | Starting point for the build and for hand-over. | `zalo/README.md` |
