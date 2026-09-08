# Bob-n-Pam Drive — Product Plan

| | |
|---|---|
| **Purpose** | What the product is, who it serves, and how booking works |
| **Companion doc** | [IMPLEMENTATION.md](./IMPLEMENTATION.md) — technical build details |
| **Last updated** | 2026-09-04 |

## Changelog

- **2026-09-04** — Apple Maps uses trip addresses only (no PC GPS): To pickup
  fills To; To drop-off is pickup → drop-off (PLAN-driven).
- **2026-09-04** — Apple Maps To pickup / To drop-off pass a From origin
  (GPS when allowed, else Current Location or pickup) (PLAN-driven).
- **2026-09-04** — Customer booking: pickup and drop-off require street, city,
  state, and ZIP; addresses are checked against US records (PLAN-driven).
- **2026-09-04** — Driver Rides: To pickup / To drop-off open Apple Maps driving
  directions from the driver’s current location (PLAN-driven).
- **2026-09-03** — Monthly rides and destinations report: trip log with date range, print, Excel CSV.
- **2026-09-03** — Fares by Month report: date range, monthly driver totals, print, Excel CSV export.
- **2026-09-03** — Reports tab: horizontal menu for Fares by Month and Monthly rides and destinations (content TBD).
- **2026-09-03** — Driver board: Reports tab between Hours and Settings (placeholder until report content is defined).
- **2026-09-03** — Hold hours label and field hidden on driver ride records (calendar hold still set at booking).
- **2026-09-03** — Driver ride row: Confirm/Done then No-show/Decline in a 2x2; Hold hours under payment; wider driver board.
- **2026-09-03** — Driver Rides payment: compact Charged/Received boxes side by side with $ prefix; Save $ to the right; labels stay on one line.
- **2026-09-03** — Driver Rides payment fields: Charged and Received stay side by side with room for amounts; Save $ sits to the right at the same height.
- **2026-09-03** — Confirmed rides highlight light green on the driver Rides datagrid and mobile cards.
- **2026-09-03** — Customer receives confirmation or decline email when driver changes booking status.
- **2026-09-02** — Customer page uses a phone agenda slot list below 768px; driver board stacks controls on narrow screens.
- **2026-09-02** — Pending rides highlight light red on the driver Rides datagrid (Show Pending checked by default).
- **2026-09-02** — Driver Rides tab: sortable datagrid with Show Done / Show Confirmed filters; driver totals panels unchanged.
- **2026-09-02** — Driver Settings edits are not overwritten by background refresh until saved.
- **2026-09-02** — Driver Settings: customer message text and highlight background color; shorter site banner and calendar headers.
- **2026-09-02** — Customer week calendar shows month and year above the day headers (spans two months when needed).
- **2026-09-02** — Customer calendar and driver board auto-refresh every 15s (and when the browser tab refocuses) so bookings and hour changes stay in sync.
- **2026-09-02** — Calendar groups same-time slots so Bob and Pam both appear when their hours overlap.
- **2026-09-02** — Slot booking form opens beside calendar (desktop) or above it (mobile), not at page bottom.
- **2026-09-02** — Initial Next.js app implemented (IMPLEMENTATION-driven; behavior unchanged).
- **2026-09-02** — Initial product spec seeded from planning conversation (PLAN-driven).

---

## Overview

**Bob-n-Pam Drive** is a simple ride-booking website for South Carolina. It is **not** like Uber: no payments, no live map, no driver tracking. Customers reserve a time (or request ASAP); drivers call to confirm and use contact info to reach the customer.

## Branding

- **Business name:** Bob-n-Pam Drive (shown on banner)
- **Page subtitle:** Short description under the business name (editable in driver Settings)
- **Banner backdrop:** Sky blue (configurable later in driver Settings)
- Branding is experimental; name and colors should be changeable without code changes

## Users

| User | Goal |
|------|------|
| **Customer** | Book a ride or request ASAP; receive email with change/cancel link; notified by email when ride is confirmed or declined |
| **Driver (Bob & Pam)** | See bookings, call customers, confirm/adjust rides, set own availability |

## Pages

### 1. Customer booking page (`/`)

- Colorful banner with business name
- Short service description (South Carolina, mostly airport, scheduled + same-day)
- **Calendar of open slots** for the next **14 days** (configurable)
- Each open slot shows the **driver’s first name**
- **ASAP button:** “Need a ride as soon as possible”
- Booking form (see below)
- After submit: **“We’ll call to confirm”** + confirmation email with change/cancel link
- Optional: public business phone for “just call us” (open question)

### 2. Driver board (`/driver`)

- **Shared password** (one password for both drivers)
- **Rides tab:** datagrid of bookings (sort by When, Customer, Trip, Status); filters for Pending (on), Confirmed (on), Done, Declined, and No-Show (last three off by default); **pending rows highlighted light red**; **confirmed rows highlighted light green**; payment fields; status actions in a 2x2 (Confirm/Done, No-show/Decline); tap-to-call; **To pickup** opens Apple Maps with To = pickup; **To drop-off** opens From = pickup and To = drop-off (no computer GPS); driver taps Go in Maps for spoken turns
- **Fares tab:** per-driver completed-ride money totals
- **Hours tab:** each driver sets their own weekly availability and days off
- **Reports tab:** submenu for **Fares by Month** (date range; charged/received/tips by month and driver; print; Excel CSV) and **Monthly rides and destinations** (trip log by month with pickup/drop-off; print; Excel CSV)
- **Settings tab:** business name, banner color, **calendar slot button color**, booking window (days), **customer message text**, and **message highlight color**

## Booking form fields

| Field | Required |
|-------|----------|
| Name | Yes |
| Phone | Yes |
| Email | Yes |
| Pickup: street, city, state, ZIP | Yes (all four; checked against US records) |
| Drop-off: street, city, state, ZIP | Yes (all four; checked against US records) |
| Date/time (from selected slot, or ASAP) | Yes |
| Number of passengers | Yes |
| Trip type (dropdown) | Yes |
| Notes (wheelchair, car seat, bags, etc.) | No |

### Addresses

- Pickup and drop-off each need **street, city, state, and ZIP** (state defaults to SC)
- The site checks the address against US records and stores a full line (better for Apple Maps)
- If the check finds no match, the customer can still book after confirming **Use this address anyway**
- No in-form address autocomplete

### Trip types

- **Airport** — use the terminal’s street address, city, state, and ZIP (not only “CHS”)
- **Medical**
- **School**
- **Other** — does **not** require a description (optional notes only)

## Booking rules

### Slot booking

1. Customer picks an **open slot** labeled with a driver’s first name
2. System **holds** that driver’s time so no one else can book it
3. Status starts as **Pending** until a driver calls to confirm
4. Unconfirmed bookings **stay held** (prefer blocking the calendar over missing rides)

### Hold duration (default, before driver adjusts)

| Trip type | Hold from start time |
|-----------|----------------------|
| Airport | 3 hours |
| Medical, School, Other | 1 hour |

Driver may **extend or shorten** the hold when confirming (e.g. long airport run or gap before next ride).

### Buffer between rides

- **v1:** No automatic travel-time buffer
- Driver manually adjusts block length when confirming if the next pickup is far away
- Future: distance/maps-based buffer

### Same-day and “now”

- Customers may book **any remaining open slot today**
- **ASAP** does not require picking a calendar time:
  - If a driver is **on duty:** create urgent request; both on-duty drivers see it; hold goes to whoever has the **sooner** next open slot (default proposal)
  - If **nobody on duty:** show message to pick a later slot or call

### Booking window

- **14 days** ahead (configurable in Settings; may change later)

### Cancel and change

- Customer may cancel or change via **email link** or by **calling**
- Driver may **Decline / Release** to free a slot
- Cancel releases the held time on the calendar

## Driver workflow

1. See new booking as **Pending** (or ASAP urgent)
2. **Tap phone number** to call customer
3. **To pickup** / **To drop-off** open Apple Maps (drop-off uses pickup as From), then tap Go
4. Mark status: **Pending → Confirmed → Done** (or **No-show**)
5. Adjust trip block duration when confirming
6. Record **amount charged** and **amount received** (includes tips) on completed rides
7. Set **own availability** on Hours tab (weekly schedule + exceptions)

## Drivers and calendar

- **Two drivers**, different schedules
- **One shared calendar** — open slots indicate **which driver**
- When **both drivers are open at the same time**, the calendar shows **one time row with a button for each driver** (Bob and Pam side by side)
- Each driver manages **their own** availability
- Driver first names on slots (assumed **Bob** and **Pam** — confirm before launch)

## Responsive design

One website for all devices:

| Device | Experience |
|--------|------------|
| **iPhone (Safari)** | Stacked layout; agenda/day slot list; tap-to-call; Apple Maps pickup/drop-off; Add to Home Screen friendly |
| **Windows (Edge, Chrome, Firefox)** | Wider layout; week-style calendar; roomier driver table |
| **Tablet** | Between phone and desktop layouts |

- Phone-first design; desktop gets more horizontal space
- No hover-only actions (must work on touch)
- Same URLs and data everywhere
- **Live sync:** customer calendar refreshes when drivers change hours; driver board refreshes when customers book (polling every 15 seconds while the tab is open, plus on tab focus)
- **Slot booking UX:** after picking a time, the trip form appears **next to** the calendar on desktop (sticky side panel) or **above** the calendar on phone — never buried at the bottom of the page
- **Calendar context:** the week view shows **month and year** at the top (e.g. “September 2026”, or a range when the week crosses months)
- **Customer notices:** success, error, hints, ASAP info, and footer use a **highlight background** (color set in driver Settings); message wording is editable there too

## Out of scope (v1)

- Payments (cash/Venmo/etc. not on site)
- Address autocomplete; in-app map (Apple Maps links on driver rides are in scope)
- App Store native app
- Google Calendar as the booking engine (optional phone-calendar sync later)
- Legal disclaimers
- Spanish or other languages
- Live driver tracking or dispatch map

## Open questions

| # | Question | Default / proposal |
|---|----------|-------------------|
| 1 | Driver first names on calendar | Bob and Pam (confirm) |
| 2 | ASAP when both on duty | Both see request; hold sooner next slot |
| 3 | Public business phone on customer page | TBD |
| 4 | Email from-address and inbox for confirm + ASAP alerts | TBD (one shared inbox OK) |
| 5 | Hosting / domain | TBD |

---

When product behavior changes, update this file first, then [IMPLEMENTATION.md](./IMPLEMENTATION.md). See `.cursor/rules/keep-docs-updated.mdc`.
