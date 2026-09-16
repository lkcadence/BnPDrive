# Bob-n-Pam Drive — Product Plan

| | |
|---|---|
| **Purpose** | What the product is, who it serves, and how booking works |
| **Companion doc** | [IMPLEMENTATION.md](./IMPLEMENTATION.md) — technical build details |
| **Last updated** | 2026-09-15 |

## Changelog

- **2026-09-15** — Driver Rides: with Bob’s and Pam’s boxes unchecked,
  Pending and Confirmed still list every driver’s rides; Done, Declined,
  and No-Show stay hidden unless those boxes are checked (PLAN-driven).
- **2026-09-15** — Driver Rides: Bob’s Rides and Pam’s Rides both start
  unchecked (PLAN-driven).
- **2026-09-15** — Driver Rides: Bob’s Rides starts unchecked; Pam’s starts
  checked (PLAN-driven).
- **2026-09-15** — Customer submit button is “Click here to request your
  ride”. ASAP requests are not assigned to a driver until the board picks
  one (PLAN-driven).
- **2026-09-15** — Customer ASAP explanation, calendar hint, and footer note
  are hidden when those Settings fields are blank (PLAN-driven).
- **2026-09-15** — Page subtitle may be blank; the customer banner hides it
  when empty. Empty Settings text is stored as empty, not replaced by
  defaults (PLAN-driven).
- **2026-09-14** — Driver Settings Save must match what the server stored;
  leaving and returning to Settings keeps that saved copy (PLAN-driven).
- **2026-09-14** — Driver Settings form keeps the saved values on screen;
  a background reload cannot put the previous text back (PLAN-driven).
- **2026-09-14** — Driver Settings Save writes immediately and is not reverted
  by the ride board’s 15-second refresh (PLAN-driven).
- **2026-09-14** — Driver Rides: Edit under Status; rows show email, flight
  info, passengers, and notes. Customer page applies Settings immediately
  (PLAN-driven).
- **2026-09-14** — Customer form: Flight Information panel (airline, flight
  number from, flight number to) between Email and Pickup (PLAN-driven).
- **2026-09-14** — ASAP form no longer shows “ASAP — we’ll call as soon as we
  can” under the heading (PLAN-driven).
- **2026-09-14** — ASAP form heading is “Please enter your ride details”
  (PLAN-driven).
- **2026-09-14** — Customer page hides the booking calendar and the Pick a time
  slot / Need a ride ASAP buttons; customers see the ASAP ride form by default
  (easier for elderly riders; PLAN-driven).
- **2026-09-12** — Browser tab shows the Bob-n-Pam car favicon next to the site
  URL (PLAN-driven).
- **2026-09-10** — Driver Rides: Add Ride after the driver-name filters; popout
  for phone-in bookings (name, optional phone, From/To addresses, open-slot
  date/time, driver dropdown). Saved as confirmed. Button shows even with no
  rides (PLAN-driven).
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

**Bob-n-Pam Drive** is a simple ride-booking website for South Carolina. It is **not** like Uber: no payments, no live map, no driver tracking. Customers request an ASAP ride (the slot calendar is hidden for now); drivers call to confirm and use contact info to reach the customer. Scheduled rides can still be taken by phone on the driver board.

## Branding

- **Business name:** Bob-n-Pam Drive (shown on banner)
- **Favicon:** Teal-to-blue rounded badge with a white car; shown in the
  browser tab with the site URL
- **Page subtitle:** Short description under the business name (editable in driver Settings; may be blank)
- **Banner backdrop:** Sky blue (configurable later in driver Settings)
- Branding is experimental; name and colors should be changeable without code changes

## Users

| User | Goal |
|------|------|
| **Customer** | Request an ASAP ride; receive email with change/cancel link; notified by email when ride is confirmed or declined |
| **Driver (Bob & Pam)** | See bookings, call customers, confirm/adjust rides, set own availability |

## Pages

### 1. Customer booking page (`/`)

- Colorful banner with business name
- Short service description (South Carolina, mostly airport, scheduled + same-day)
- **ASAP ride form** shown by default (no mode toggle); heading **Please enter
  your ride details** (no ASAP subtitle under the heading); the yellow ASAP
  explanation notice is omitted when that Settings field is blank; **Flight
  Information** panel between Email and Pickup; submit button **Click here to
  request your ride**
- **Temporarily hidden** (drivers asked for a simpler page for elderly customers):
  the **calendar of open slots**, **Pick a time slot**, and **Need a ride ASAP**
- Slot calendar (next **14 days**, driver first names on each slot) stays in the
  product for later; drivers still pick open slots when adding a phone-in ride
- After submit: **“We’ll call to confirm”** + confirmation email with change/cancel link
- Optional: public business phone for “just call us” (open question)

### 2. Driver board (`/driver`)

- **Shared password** (one password for both drivers)
- **Rides tab:** datagrid of bookings (sort by When, Customer, Trip, Status); filters for Pending (on), Confirmed (on), Done, Declined, and No-Show (last three off by default); **Bob’s Rides and Pam’s Rides off** (both off still shows every pending and confirmed ride; checking a name narrows to that driver plus Unassigned); **pending rows highlighted light red**; **confirmed rows highlighted light green**; customer ASAP rides start as **Unassigned** and stay visible for both drivers until Edit picks Bob or Pam; payment fields; status actions in a 2x2 (Confirm/Done, No-show/Decline); **Edit** under the Status badge opens a popout to change ride details (name, phone, email, flight info, From/To, passengers, trip type, notes, driver, time); rows show email, airline, flight numbers, passengers, and notes; tap-to-call; **To pickup** opens Apple Maps with To = pickup; **To drop-off** opens From = pickup and To = drop-off (no computer GPS); driver taps Go in Maps for spoken turns; **Add Ride** (after the `{name}'s Rides` filters, including when the list is empty) opens the booking popout for a phone-in ride
- **Fares tab:** per-driver completed-ride money totals
- **Hours tab:** each driver sets their own weekly availability and days off
- **Reports tab:** submenu for **Fares by Month** (date range; charged/received/tips by month and driver; print; Excel CSV) and **Monthly rides and destinations** (trip log by month with pickup/drop-off; print; Excel CSV)
- **Settings tab:** business name, banner color, **calendar slot button color**, booking window (days), **customer message text**, and **message highlight color**; Save writes immediately and the form keeps those values; the ride list can keep refreshing without putting old Settings back

## Booking form fields

| Field | Required |
|-------|----------|
| Name | Yes |
| Phone | Yes |
| Email | Yes |
| Airline name | No |
| Flight number from | No |
| Flight number to | No |
| Pickup: street, city, state, ZIP | Yes (all four; checked against US records) |
| Drop-off: street, city, state, ZIP | Yes (all four; checked against US records) |
| Date/time (ASAP now; selected slot when the calendar is shown) | Yes |
| Number of passengers | Yes |
| Trip type (dropdown) | Yes |
| Notes (wheelchair, car seat, bags, etc.) | No |

### Addresses

- Pickup and drop-off each need **street, city, state, and ZIP** (state defaults to SC)
- The site checks the address against US records and stores a full line (better for Apple Maps)
- If the check finds no match, the customer can still book after confirming **Use this address anyway**
- No in-form address autocomplete

### Driver Add Ride (phone-in)

Drivers can add a ride for someone who calls instead of using the website.
**Add Ride** sits after the `{name}'s Rides` checkboxes and is available even
when there are no bookings yet.

| Field | Required |
|-------|----------|
| Driver (dropdown; defaults to the person signed in) | Yes |
| Name | Yes |
| Phone | No |
| From: street, city, state, ZIP | Yes (same address check as customer booking) |
| To: street, city, state, ZIP | Yes (all four; same check) |
| Date and time | Yes — **open slots only** for the chosen driver |

- Saved as **Confirmed** (the driver already took the call)
- No email, passenger count, or trip type on this form (stored as 1 passenger,
  trip type Other, empty email; no customer email is sent)
- That slot is held on the customer calendar like any other confirmed ride

### Trip types

- **Airport** — use the terminal’s street address, city, state, and ZIP (not only “CHS”); optional **Flight Information** (airline, flight number from, flight number to)
- **Medical**
- **School**
- **Other** — does **not** require a description (optional notes only)

## Booking rules

### Slot booking

Customer slot picking is **hidden for now**. The steps below still apply to
driver **Add Ride** and will apply on the public page when the calendar returns.

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

- **For now, customers submit the ASAP form** (they do not pick a calendar time)
- **ASAP** does not require picking a calendar time:
  - If a driver is **on duty:** create an urgent request with **no driver
    assigned**; both drivers see it and pick who takes it
  - If **nobody on duty:** show a message to **call** (calendar is hidden)
- When the calendar is shown again, customers may also book **any remaining open
  slot today**

### Booking window

- **14 days** ahead (configurable in Settings; may change later)

### Cancel and change

- Customer may cancel or change via **email link** or by **calling**
- Driver may **Decline / Release** to free a slot
- Cancel releases the held time on the calendar

## Driver workflow

1. See new booking as **Pending** (or ASAP urgent), or add a phone-in ride
   with **Add Ride** (starts **Confirmed**)
2. **Tap phone number** to call customer (hidden when the ride has no phone)
3. **To pickup** / **To drop-off** open Apple Maps (drop-off uses pickup as From), then tap Go
4. Mark status: **Pending → Confirmed → Done** (or **No-show**)
5. Adjust trip block duration when confirming
6. Record **amount charged** and **amount received** (includes tips) on completed rides
7. Set **own availability** on Hours tab (weekly schedule + exceptions)

## Drivers and calendar

- **Two drivers**, different schedules
- **One shared calendar** — open slots indicate **which driver**
- The **customer calendar is hidden for now**; drivers still use open slots for **Add Ride**
- When **both drivers are open at the same time**, the calendar shows **one time row with a button for each driver** (Bob and Pam side by side)
- Each driver manages **their own** availability
- Driver first names on slots (assumed **Bob** and **Pam** — confirm before launch)

## Responsive design

One website for all devices:

| Device | Experience |
|--------|------------|
| **iPhone (Safari)** | Stacked ASAP form (calendar hidden for now); tap-to-call; Apple Maps pickup/drop-off; Add to Home Screen friendly |
| **Windows (Edge, Chrome, Firefox)** | Wider ASAP form (week calendar hidden for now); roomier driver table |
| **Tablet** | Between phone and desktop layouts |

- Phone-first design; desktop gets more horizontal space
- No hover-only actions (must work on touch)
- Same URLs and data everywhere
- **Live sync:** driver board refreshes when customers book (polling every 15 seconds while the tab is open, plus on tab focus); **customer page loads Settings on open** and again every 15 seconds / on tab focus; slot list still refreshes in the background for when the calendar is shown again
- **Slot booking UX** (when the calendar is shown): after picking a time, the trip form appears **next to** the calendar on desktop (sticky side panel) or **above** the calendar on phone — never buried at the bottom of the page
- **Calendar context** (when shown): the week view shows **month and year** at the top (e.g. “September 2026”, or a range when the week crosses months)
- **Customer notices:** success, error, hints, ASAP info, and footer use a **highlight background** (color set in driver Settings); message wording is editable there too; hint, ASAP info, and footer are omitted when their Settings text is blank

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
| 2 | ASAP when both on duty | Both see request; no driver until board assigns |
| 3 | Public business phone on customer page | TBD |
| 4 | Email from-address and inbox for confirm + ASAP alerts | TBD (one shared inbox OK) |
| 5 | Hosting / domain | TBD |

---

When product behavior changes, update this file first, then [IMPLEMENTATION.md](./IMPLEMENTATION.md). See `.cursor/rules/keep-docs-updated.mdc`.
