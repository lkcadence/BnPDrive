'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';
import { US_STATE_CODES } from '@/lib/address';
import FaresByMonthReport from '@/components/reports/FaresByMonthReport';
import MonthlyRidesDestinationsReport from '@/components/reports/MonthlyRidesDestinationsReport';

type Tab = 'rides' | 'fares' | 'hours' | 'reports' | 'settings';
type ReportView = 'fares-by-month' | 'monthly-rides';

type Booking = {
  id: number;
  driverId: number;
  driverName: string;
  status: string;
  bookingType: string;
  tripType: string;
  startAt: string;
  holdEndAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupAddress: string;
  dropoffAddress: string;
  passengerCount: number;
  notes: string | null;
  amountCharged: number | null;
  amountReceived: number | null;
};

type OpenSlot = {
  driverId: number;
  driverName: string;
  startAt: string;
  endAt: string;
  dateKey: string;
};

type SlotDay = {
  dateKey: string;
  label: string;
  slots: OpenSlot[];
};

type AddRideForm = {
  customerName: string;
  customerPhone: string;
  pickupStreet: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  dropoffStreet: string;
  dropoffCity: string;
  dropoffState: string;
  dropoffZip: string;
  allowUnverifiedPickup: boolean;
  allowUnverifiedDropoff: boolean;
};

const emptyAddRideForm: AddRideForm = {
  customerName: '',
  customerPhone: '',
  pickupStreet: '',
  pickupCity: '',
  pickupState: 'SC',
  pickupZip: '',
  dropoffStreet: '',
  dropoffCity: '',
  dropoffState: 'SC',
  dropoffZip: '',
  allowUnverifiedPickup: false,
  allowUnverifiedDropoff: false,
};

type DriverMoneyTotal = {
  driverId: number;
  driverName: string;
  rideCount: number;
  totalCharged: number;
  totalReceived: number;
  totalTips: number;
};

type AvailabilityRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type DriverHours = {
  id: number;
  firstName: string;
  availability: AvailabilityRow[];
  exceptions: { id: number; date: string }[];
};

type Settings = {
  businessName: string;
  bannerSubtitle: string;
  bannerColor: string;
  bookingWindowDays: number;
  calendarEventColor: string;
  messageBackgroundColor: string;
  messageBookingSuccess: string;
  messageAsapInfo: string;
  messageBookingHint: string;
  messageFooterNote: string;
  messageSlotUnavailable: string;
  messageSelectSlot: string;
  messageAsapNoDriver: string;
  messageAsapNoSlot: string;
  messageCancelSuccess: string;
  messageChangeByPhone: string;
};

const customerMessageFields: {
  key: keyof Settings;
  label: string;
  rows?: number;
}[] = [
  { key: 'messageBookingSuccess', label: 'After booking (success)', rows: 2 },
  { key: 'messageAsapInfo', label: 'ASAP explanation', rows: 3 },
  { key: 'messageBookingHint', label: 'Calendar hint (before slot pick)', rows: 2 },
  { key: 'messageFooterNote', label: 'Footer note', rows: 2 },
  { key: 'messageSlotUnavailable', label: 'Slot no longer available', rows: 2 },
  { key: 'messageSelectSlot', label: 'Prompt to select a slot', rows: 2 },
  { key: 'messageAsapNoDriver', label: 'ASAP: no driver on duty', rows: 2 },
  { key: 'messageAsapNoSlot', label: 'ASAP: no open slots soon', rows: 2 },
  { key: 'messageCancelSuccess', label: 'Cancel page: cancelled', rows: 2 },
  { key: 'messageChangeByPhone', label: 'Cancel page: change by phone', rows: 2 },
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type RideSortColumn = 'when' | 'customer' | 'trip' | 'status';
type RideSortDirection = 'asc' | 'desc';

function rideTripLabel(booking: Booking): string {
  return `${booking.tripType} ${booking.pickupAddress} ${booking.dropoffAddress}`;
}

/**
 * Official Apple Maps directions URL (`source` = From, `destination` = To).
 * Do not use this PC's GPS — it is not the trip start.
 */
function appleMapsDirectionsUrl(destination: string, source?: string): string {
  const params = new URLSearchParams({
    mode: 'driving',
    destination: destination.trim(),
  });
  if (source?.trim()) {
    params.set('source', source.trim());
  }
  return `https://maps.apple.com/directions?${params.toString()}`;
}

function RideMapsLinks({
  pickupAddress,
  dropoffAddress,
}: {
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const pickup = pickupAddress.trim();
  const dropoff = dropoffAddress.trim();

  if (!pickup && !dropoff) {
    return null;
  }

  return (
    <div className="ride-maps">
      {pickup ? (
        <a
          href={appleMapsDirectionsUrl(pickup)}
          target="_blank"
          rel="noopener noreferrer"
        >
          To pickup
        </a>
      ) : null}
      {dropoff ? (
        <a
          href={appleMapsDirectionsUrl(dropoff, pickup || undefined)}
          target="_blank"
          rel="noopener noreferrer"
        >
          To drop-off
        </a>
      ) : null}
    </div>
  );
}

function compareRideBookings(
  left: Booking,
  right: Booking,
  column: RideSortColumn,
  direction: RideSortDirection
): number {
  let result = 0;

  switch (column) {
    case 'when':
      result = new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
      break;
    case 'customer':
      result = left.customerName.localeCompare(right.customerName);
      break;
    case 'trip':
      result = rideTripLabel(left).localeCompare(rideTripLabel(right));
      break;
    case 'status':
      result = left.status.localeCompare(right.status);
      break;
    default:
      break;
  }

  return direction === 'asc' ? result : -result;
}

function filterRideBookings(
  bookings: Booking[],
  showPending: boolean,
  showDone: boolean,
  showConfirmed: boolean,
  showDeclined: boolean,
  showNoShow: boolean,
  showDriverIds: number[]
): Booking[] {
  return bookings.filter((booking) => {
    if (showDriverIds.length > 0 && !showDriverIds.includes(booking.driverId)) {
      return false;
    }

    if (booking.status === 'pending' && !showPending) {
      return false;
    }

    if (booking.status === 'done' && !showDone) {
      return false;
    }

    if (booking.status === 'confirmed' && !showConfirmed) {
      return false;
    }

    if (booking.status === 'declined' && !showDeclined) {
      return false;
    }

    if (booking.status === 'no_show' && !showNoShow) {
      return false;
    }

    return true;
  });
}

function sortIndicator(active: boolean, direction: RideSortDirection): string {
  if (!active) {
    return '↕';
  }

  return direction === 'asc' ? '↑' : '↓';
}

function formatMoney(amount: number | null): string {
  if (amount === null) {
    return '';
  }

  return amount.toFixed(2);
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default function DriverBoardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('rides');
  const [reportView, setReportView] = useState<ReportView>('fares-by-month');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [driverTotals, setDriverTotals] = useState<DriverMoneyTotal[]>([]);
  const [drivers, setDrivers] = useState<DriverHours[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [holdHours, setHoldHours] = useState<Record<number, number>>({});
  const [showPending, setShowPending] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [showDeclined, setShowDeclined] = useState(false);
  const [showNoShow, setShowNoShow] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState<number | null>(null);
  const [allDrivers, setAllDrivers] = useState<{ id: number; firstName: string }[]>([]);
  const [driverFilters, setDriverFilters] = useState<Record<number, boolean>>({});
  const [sortColumn, setSortColumn] = useState<RideSortColumn>('when');
  const [sortDirection, setSortDirection] = useState<RideSortDirection>('asc');
  const [addRideOpen, setAddRideOpen] = useState(false);
  const tabRef = useRef<Tab>('rides');
  const settingsDirtyRef = useRef(false);

  tabRef.current = tab;
  settingsDirtyRef.current = settingsDirty;

  const patchSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((current) => (current ? { ...current, ...partial } : current));
    setSettingsDirty(true);
  }, []);

  const loadAll = useCallback(async () => {
    const [ridesRes, hoursRes, settingsRes] = await Promise.all([
      fetch('/api/driver/bookings', { cache: 'no-store' }),
      fetch('/api/driver/availability', { cache: 'no-store' }),
      fetch('/api/driver/settings', { cache: 'no-store' }),
    ]);

    if (ridesRes.status === 401) {
      router.push('/driver/login');
      return;
    }

    const ridesData = await ridesRes.json();
    const hoursData = await hoursRes.json();
    const settingsData = await settingsRes.json();

    setBookings(ridesData.bookings || []);
    setDriverTotals(ridesData.driverTotals || []);

    if (tabRef.current !== 'hours') {
      setDrivers(hoursData.drivers || []);
    }

    if (!settingsDirtyRef.current) {
      setSettings(settingsData.settings || null);
    }
  }, [router]);

  useEffect(() => {
    loadAll();

    // Fetch current driver identity and all drivers for ride filters
    (async () => {
      const [meRes, hoursRes] = await Promise.all([
        fetch('/api/driver/me', { cache: 'no-store' }),
        fetch('/api/driver/availability', { cache: 'no-store' }),
      ]);
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentDriverId(meData.driverId);
      }
      if (hoursRes.ok) {
        const hoursData = await hoursRes.json();
        const drvs = (hoursData.drivers || []).map(
          (d: { id: number; firstName: string }) => ({
            id: d.id,
            firstName: d.firstName,
          })
        );
        setAllDrivers(drvs);
      }
    })();
  }, [loadAll]);

  // Set default driver filters once we know the current driver
  useEffect(() => {
    if (currentDriverId !== null && allDrivers.length > 0
      && Object.keys(driverFilters).length === 0) {
      const defaults: Record<number, boolean> = {};
      for (const d of allDrivers) {
        defaults[d.id] = d.id === currentDriverId;
      }
      setDriverFilters(defaults);
    }
  }, [currentDriverId, allDrivers, driverFilters]);

  useAutoRefresh(() => loadAll());

  async function logout() {
    await fetch('/api/driver/logout', { method: 'POST' });
    router.push('/driver/login');
  }

  async function updateStatus(id: number, status: string, hours?: number) {
    const response = await fetch(`/api/driver/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, holdHours: hours }),
    });

    if (response.ok) {
      setMessage(`Booking #${id} updated.`);
      await loadAll();
    }
  }

  async function saveMoney(
    id: number,
    amountCharged: number | null,
    amountReceived: number | null
  ) {
    const response = await fetch(`/api/driver/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCharged, amountReceived }),
    });

    if (response.ok) {
      setMessage(`Payment saved for booking #${id}.`);
      await loadAll();
    }
  }

  async function saveHours(driverId: number, availability: AvailabilityRow[]) {
    await fetch('/api/driver/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, availability }),
    });
    setMessage('Hours saved.');
    await loadAll();
  }

  async function addDayOff(driverId: number, date: string) {
    await fetch('/api/driver/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, date, action: 'add_day_off' }),
    });
    setMessage('Day off added.');
    await loadAll();
  }

  async function removeDayOff(exceptionId: number) {
    await fetch('/api/driver/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', exceptionId }),
    });
    await loadAll();
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) {
      return;
    }

    const response = await fetch('/api/driver/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      setMessage('Could not save settings. Sign in again and retry.');
      return;
    }

    const data = await response.json();
    if (data.settings) {
      setSettings(data.settings);
    }

    setSettingsDirty(false);
    setMessage('Settings saved. Customer page updates on refresh or within 15 seconds.');
  }

  function switchTab(nextTab: Tab) {
    if (tab === 'settings' && settingsDirty && nextTab !== 'settings') {
      const leave = window.confirm('Leave settings? Unsaved changes will be lost.');
      if (!leave) {
        return;
      }

      setSettingsDirty(false);
      void loadAll();
    }

    setTab(nextTab);
  }

  const activeDriverIds = useMemo(
    () => Object.entries(driverFilters)
      .filter(([, on]) => on)
      .map(([id]) => Number(id)),
    [driverFilters]
  );

  const visibleBookings = useMemo(
    () =>
      filterRideBookings(
        bookings,
        showPending,
        showDone,
        showConfirmed,
        showDeclined,
        showNoShow,
        activeDriverIds
      ),
    [bookings, showPending, showDone, showConfirmed, showDeclined, showNoShow,
      activeDriverIds]
  );

  const sortedBookings = useMemo(() => {
    return [...visibleBookings].sort((left, right) =>
      compareRideBookings(left, right, sortColumn, sortDirection)
    );
  }, [visibleBookings, sortColumn, sortDirection]);

  function toggleRideSort(column: RideSortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  }

  return (
    <main className="container container--driver page-stack">
      <header className="card driver-board-header">
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>Driver board</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-muted)' }}>
            Rides, hours, and site settings
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Sign out
        </button>
      </header>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="tabs">
        {(['rides', 'fares', 'hours', 'reports', 'settings'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`tab ${tab === item ? 'active' : ''}`}
            onClick={() => switchTab(item)}
          >
            {item === 'rides'
              ? 'Rides'
              : item === 'fares'
                ? 'Fares'
                : item === 'hours'
                  ? 'Hours'
                  : item === 'reports'
                    ? 'Reports'
                    : 'Settings'}
          </button>
        ))}
      </div>

      {tab === 'rides' && (
        <section className="card">
          <h2 className="section-title">Booked rides</h2>

          <div className="rides-datagrid-toolbar">
            <div className="rides-datagrid-filters">
              <label>
                <input
                  type="checkbox"
                  checked={showPending}
                  onChange={(event) => setShowPending(event.target.checked)}
                />
                Show Pending
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showDone}
                  onChange={(event) => setShowDone(event.target.checked)}
                />
                Show Done
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showConfirmed}
                  onChange={(event) => setShowConfirmed(event.target.checked)}
                />
                Show Confirmed
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showDeclined}
                  onChange={(event) => setShowDeclined(event.target.checked)}
                />
                Show Declined
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showNoShow}
                  onChange={(event) => setShowNoShow(event.target.checked)}
                />
                Show No-Show
              </label>
              {allDrivers.map((d) => (
                <label key={d.id}>
                  <input
                    type="checkbox"
                    checked={!!driverFilters[d.id]}
                    onChange={(event) =>
                      setDriverFilters((prev) => ({
                        ...prev,
                        [d.id]: event.target.checked,
                      }))
                    }
                  />
                  {d.firstName}&apos;s Rides
                </label>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() => setAddRideOpen(true)}
              >
                Add Ride
              </button>
            </div>
          </div>

          {addRideOpen && (
            <AddRidePanel
              drivers={allDrivers}
              currentDriverId={currentDriverId}
              onClose={() => setAddRideOpen(false)}
              onCreated={async (driverId, successMessage) => {
                setDriverFilters((prev) => ({ ...prev, [driverId]: true }));
                setAddRideOpen(false);
                setMessage(successMessage);
                await loadAll();
              }}
            />
          )}

          {bookings.length === 0 && <p>No bookings yet.</p>}

          {bookings.length > 0 && sortedBookings.length === 0 && (
            <p className="rides-datagrid-empty">No rides match your filters.</p>
          )}

          {sortedBookings.length > 0 && (
            <div className="rides-datagrid-wrap">
                <div className="driver-rides-mobile">
                  {sortedBookings.map((booking) => (
                    <RideCard
                      key={booking.id}
                      booking={booking}
                      holdHours={holdHours[booking.id] ?? 1}
                      onHoldChange={(hours) =>
                        setHoldHours((current) => ({ ...current, [booking.id]: hours }))
                      }
                      onStatus={updateStatus}
                      onSaveMoney={saveMoney}
                    />
                  ))}
                </div>

                <table className="driver-table rides-datagrid">
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="rides-datagrid-sort"
                          onClick={() => toggleRideSort('when')}
                        >
                          When
                          <span
                            className={`sort-indicator ${
                              sortColumn === 'when' ? 'active' : ''
                            }`}
                          >
                            {sortIndicator(sortColumn === 'when', sortDirection)}
                          </span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="rides-datagrid-sort"
                          onClick={() => toggleRideSort('customer')}
                        >
                          Customer
                          <span
                            className={`sort-indicator ${
                              sortColumn === 'customer' ? 'active' : ''
                            }`}
                          >
                            {sortIndicator(sortColumn === 'customer', sortDirection)}
                          </span>
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="rides-datagrid-sort"
                          onClick={() => toggleRideSort('trip')}
                        >
                          Trip
                          <span
                            className={`sort-indicator ${
                              sortColumn === 'trip' ? 'active' : ''
                            }`}
                          >
                            {sortIndicator(sortColumn === 'trip', sortDirection)}
                          </span>
                        </button>
                      </th>
                      <th>Payment</th>
                      <th>
                        <button
                          type="button"
                          className="rides-datagrid-sort"
                          onClick={() => toggleRideSort('status')}
                        >
                          Status
                          <span
                            className={`sort-indicator ${
                              sortColumn === 'status' ? 'active' : ''
                            }`}
                          >
                            {sortIndicator(sortColumn === 'status', sortDirection)}
                          </span>
                        </button>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className={
                          booking.status === 'pending'
                            ? 'ride-row--pending'
                            : booking.status === 'confirmed'
                              ? 'ride-row--confirmed'
                              : ''
                        }
                      >
                        <td data-label="When">
                          {new Date(booking.startAt).toLocaleString('en-US')}
                          <br />
                          <small>{booking.driverName}</small>
                        </td>
                        <td data-label="Customer">
                          {booking.customerName}
                          {booking.customerPhone.trim() ? (
                            <>
                              <br />
                              <a href={`tel:${booking.customerPhone}`}>
                                {booking.customerPhone}
                              </a>
                            </>
                          ) : null}
                        </td>
                        <td data-label="Trip">
                          {booking.tripType} · {booking.bookingType.toUpperCase()}
                          <br />
                          {booking.pickupAddress} → {booking.dropoffAddress}
                          <RideMapsLinks
                            pickupAddress={booking.pickupAddress}
                            dropoffAddress={booking.dropoffAddress}
                          />
                        </td>
                        <td data-label="Payment">
                          <div className="ride-payment">
                            <RideMoneyFields booking={booking} onSaveMoney={saveMoney} />
                            {/* Hold hours hidden — restore HoldHoursField here if needed
                            <HoldHoursField
                              hours={holdHours[booking.id] ?? 1}
                              onChange={(hours) =>
                                setHoldHours((current) => ({
                                  ...current,
                                  [booking.id]: hours,
                                }))
                              }
                            />
                            */}
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className="status-badge">{booking.status}</span>
                        </td>
                        <td data-label="Actions">
                          <RideActions
                            booking={booking}
                            holdHours={holdHours[booking.id] ?? 1}
                            onStatus={updateStatus}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </section>
      )}

      {tab === 'hours' && (
        <section className="card">
          <h2 className="section-title">Driver availability</h2>
          {drivers.map((driver) => (
            <DriverHoursEditor
              key={driver.id}
              driver={driver}
              onSave={saveHours}
              onAddDayOff={addDayOff}
              onRemoveDayOff={removeDayOff}
            />
          ))}
        </section>
      )}

      {tab === 'reports' && (
        <section className="card">
          <h2 className="section-title">Reports</h2>
          <div className="report-menu" role="tablist" aria-label="Report views">
            <button
              type="button"
              role="tab"
              aria-selected={reportView === 'fares-by-month'}
              className={`report-menu-item ${
                reportView === 'fares-by-month' ? 'active' : ''
              }`}
              onClick={() => setReportView('fares-by-month')}
            >
              Fares by Month
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reportView === 'monthly-rides'}
              className={`report-menu-item ${
                reportView === 'monthly-rides' ? 'active' : ''
              }`}
              onClick={() => setReportView('monthly-rides')}
            >
              Monthly rides and destinations
            </button>
          </div>
          {reportView === 'fares-by-month' ? (
            <FaresByMonthReport />
          ) : (
            <MonthlyRidesDestinationsReport />
          )}
        </section>
      )}

      {tab === 'settings' && settings && (
        <section className="card">
          <h2 className="section-title">Site settings</h2>
          {settingsDirty && (
            <p className="settings-help settings-help--warn">You have unsaved changes.</p>
          )}
          <form className="form-grid" onSubmit={saveSettings}>
            <label>
              Business name
              <input
                value={settings.businessName}
                onChange={(event) => patchSettings({ businessName: event.target.value })}
              />
            </label>
            <label>
              Page subtitle
              <textarea
                rows={3}
                value={settings.bannerSubtitle}
                onChange={(event) => patchSettings({ bannerSubtitle: event.target.value })}
              />
            </label>
            <label>
              Banner color
              <input
                type="color"
                value={settings.bannerColor}
                onChange={(event) => patchSettings({ bannerColor: event.target.value })}
              />
            </label>
            <label>
              Calendar event button color
              <input
                type="color"
                value={settings.calendarEventColor}
                onChange={(event) => patchSettings({ calendarEventColor: event.target.value })}
              />
            </label>
            <label>
              Booking window (days)
              <input
                type="number"
                min={1}
                value={settings.bookingWindowDays}
                onChange={(event) =>
                  patchSettings({ bookingWindowDays: Number(event.target.value) })
                }
              />
            </label>

            <h3 className="settings-subheading">Customer messages</h3>
            <p className="settings-help">
              These notices appear on the booking page and cancel link. Pick a background color
              that stands out on your site.
            </p>
            <label>
              Message background color
              <input
                type="color"
                value={settings.messageBackgroundColor}
                onChange={(event) =>
                  patchSettings({ messageBackgroundColor: event.target.value })
                }
              />
            </label>
            {customerMessageFields.map((field) => (
              <label key={field.key}>
                {field.label}
                <textarea
                  rows={field.rows ?? 2}
                  value={settings[field.key]}
                  onChange={(event) =>
                    patchSettings({ [field.key]: event.target.value } as Partial<Settings>)
                  }
                />
              </label>
            ))}

            <button className="btn" type="submit">
              Save settings
            </button>
          </form>
        </section>
      )}

      {tab === 'fares' && (
        <section className="card">
          <h2 className="section-title">Fares</h2>

          {driverTotals.length > 0 && (
            <div className="driver-money-summary">
              {driverTotals.map((total) => (
                <div key={total.driverId} className="driver-money-card">
                  <h3>{total.driverName}&apos;s totals (completed rides)</h3>
                  <div className="driver-money-grid">
                    <span>Charged: {formatCurrency(total.totalCharged)}</span>
                    <span>Received: {formatCurrency(total.totalReceived)}</span>
                    <span>Tips: {formatCurrency(total.totalTips)}</span>
                    <span>Rides logged: {total.rideCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function RideMoneyFields({
  booking,
  onSaveMoney,
}: {
  booking: Booking;
  onSaveMoney: (
    id: number,
    amountCharged: number | null,
    amountReceived: number | null
  ) => void;
}) {
  const [charged, setCharged] = useState(formatMoney(booking.amountCharged));
  const [received, setReceived] = useState(formatMoney(booking.amountReceived));

  useEffect(() => {
    setCharged(formatMoney(booking.amountCharged));
    setReceived(formatMoney(booking.amountReceived));
  }, [booking.amountCharged, booking.amountReceived]);

  const chargedNum = charged === '' ? null : Number(charged);
  const receivedNum = received === '' ? null : Number(received);
  const tip =
    chargedNum !== null &&
    receivedNum !== null &&
    !Number.isNaN(chargedNum) &&
    !Number.isNaN(receivedNum)
      ? Math.max(0, receivedNum - chargedNum)
      : null;

  return (
    <>
      <div className="money-fields">
        <label>
          Charged
          <span className="money-input-row">
            <span className="money-prefix" aria-hidden="true">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={charged}
              onChange={(event) => setCharged(event.target.value)}
            />
          </span>
        </label>
        <label>
          Received
          <span className="money-input-row">
            <span className="money-prefix" aria-hidden="true">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={received}
              onChange={(event) => setReceived(event.target.value)}
            />
          </span>
        </label>
        <button
          type="button"
          className="btn-secondary btn money-save"
          onClick={() =>
            onSaveMoney(
              booking.id,
              charged === '' ? null : Number(charged),
              received === '' ? null : Number(received)
            )
          }
        >
          Save $
        </button>
      </div>
      {tip !== null && tip > 0 && (
        <span className="money-tip">Tip: {formatCurrency(tip)}</span>
      )}
    </>
  );
}

function HoldHoursField({
  hours,
  onChange,
}: {
  hours: number;
  onChange: (hours: number) => void;
}) {
  return (
    <label className="hold-hours">
      Hold hours
      <input
        type="number"
        min={1}
        step={0.5}
        value={hours}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function RideActions({
  booking,
  holdHours,
  onStatus,
}: {
  booking: Booking;
  holdHours: number;
  onStatus: (id: number, status: string, hours?: number) => void;
}) {
  return (
    <div className="ride-actions">
      <button
        type="button"
        className="btn-secondary btn"
        onClick={() => onStatus(booking.id, 'confirmed')}
      >
        Confirm
      </button>
      <button
        type="button"
        className="btn-secondary btn"
        onClick={() => onStatus(booking.id, 'done')}
      >
        Done
      </button>
      <button
        type="button"
        className="btn-secondary btn"
        onClick={() => onStatus(booking.id, 'no_show')}
      >
        No-show
      </button>
      <button
        type="button"
        className="btn-danger btn"
        onClick={() => onStatus(booking.id, 'declined')}
      >
        Decline
      </button>
    </div>
  );
}

function RideCard({
  booking,
  holdHours,
  onHoldChange,
  onStatus,
  onSaveMoney,
}: {
  booking: Booking;
  holdHours: number;
  onHoldChange: (hours: number) => void;
  onStatus: (id: number, status: string, hours?: number) => void;
  onSaveMoney: (
    id: number,
    amountCharged: number | null,
    amountReceived: number | null
  ) => void;
}) {
  return (
    <div
      className={`ride-card ${booking.bookingType === 'asap' ? 'urgent' : ''} ${
        booking.status === 'pending'
          ? 'pending'
          : booking.status === 'confirmed'
            ? 'confirmed'
            : ''
      }`}
    >
      <div className="ride-meta">
        <span className="status-badge">{booking.status}</span>
        <span>{booking.driverName}</span>
        <span>{new Date(booking.startAt).toLocaleString('en-US')}</span>
      </div>
      <strong>{booking.customerName}</strong>
      {booking.customerPhone.trim() ? (
        <div>
          <a href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a>
        </div>
      ) : null}
      <div>
        {booking.tripType} · {booking.pickupAddress} → {booking.dropoffAddress}
      </div>
      <RideMapsLinks
        pickupAddress={booking.pickupAddress}
        dropoffAddress={booking.dropoffAddress}
      />
      {booking.notes && <div>Notes: {booking.notes}</div>}
      <div className="ride-payment">
        <RideMoneyFields booking={booking} onSaveMoney={onSaveMoney} />
        {/* Hold hours hidden — restore HoldHoursField here if needed
        <HoldHoursField hours={holdHours} onChange={onHoldChange} />
        */}
      </div>
      <RideActions
        booking={booking}
        holdHours={holdHours}
        onStatus={onStatus}
      />
    </div>
  );
}

function DriverHoursEditor({
  driver,
  onSave,
  onAddDayOff,
  onRemoveDayOff,
}: {
  driver: DriverHours;
  onSave: (driverId: number, rows: AvailabilityRow[]) => void;
  onAddDayOff: (driverId: number, date: string) => void;
  onRemoveDayOff: (exceptionId: number) => void;
}) {
  const [rows, setRows] = useState<AvailabilityRow[]>(driver.availability);
  const [dayOff, setDayOff] = useState('');

  useEffect(() => {
    setRows(driver.availability);
  }, [driver.availability]);

  function addRow() {
    setRows([...rows, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  }

  function updateRow(index: number, field: keyof AvailabilityRow, value: string | number) {
    setRows(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3>{driver.firstName}&apos;s hours</h3>
      <div className="hours-grid">
        {rows.map((row, index) => (
          <div key={`${driver.id}-${index}`} className="hours-row">
            <select
              value={row.dayOfWeek}
              onChange={(event) =>
                updateRow(index, 'dayOfWeek', Number(event.target.value))
              }
            >
              {dayNames.map((name, dayIndex) => (
                <option key={name} value={dayIndex}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={row.startTime}
              onChange={(event) => updateRow(index, 'startTime', event.target.value)}
            />
            <input
              type="time"
              value={row.endTime}
              onChange={(event) => updateRow(index, 'endTime', event.target.value)}
            />
            <button type="button" className="btn-secondary btn" onClick={() => removeRow(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="actions-row" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn-secondary btn" onClick={addRow}>
          Add hours
        </button>
        <button type="button" className="btn" onClick={() => onSave(driver.id, rows)}>
          Save {driver.firstName}&apos;s hours
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h4>Days off</h4>
        <div className="actions-row">
          <input type="date" value={dayOff} onChange={(event) => setDayOff(event.target.value)} />
          <button
            type="button"
            className="btn-secondary btn"
            onClick={() => {
              if (dayOff) {
                onAddDayOff(driver.id, dayOff);
                setDayOff('');
              }
            }}
          >
            Add day off
          </button>
        </div>
        <ul>
          {driver.exceptions.map((item) => (
            <li key={item.id}>
              {item.date}{' '}
              <button
                type="button"
                className="btn-secondary btn"
                onClick={() => onRemoveDayOff(item.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type AddRideFieldValue = string | boolean;

function formatSlotTime(startAt: string): string {
  return new Date(startAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Driver board popout to add a phone-in ride (confirmed, open slots only).
 */
function AddRidePanel({
  drivers,
  currentDriverId,
  onClose,
  onCreated,
}: {
  drivers: { id: number; firstName: string }[];
  currentDriverId: number | null;
  onClose: () => void;
  onCreated: (driverId: number, message: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState(emptyAddRideForm);
  const [driverId, setDriverId] = useState(
    () => currentDriverId ?? drivers[0]?.id ?? 0
  );
  const [dateKey, setDateKey] = useState('');
  const [startAt, setStartAt] = useState('');
  const [slotDays, setSlotDays] = useState<SlotDay[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupNeedsConfirm, setPickupNeedsConfirm] = useState(false);
  const [dropoffNeedsConfirm, setDropoffNeedsConfirm] = useState(false);

  const loadSlots = useCallback(async () => {
    const response = await fetch('/api/slots', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (Array.isArray(data.days)) {
      setSlotDays(data.days as SlotDay[]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingSlots(true);
      await loadSlots();
      if (!cancelled) {
        setLoadingSlots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSlots]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const driverDays = useMemo(
    () =>
      slotDays
        .map((day) => ({
          dateKey: day.dateKey,
          label: day.label,
          slots: day.slots.filter((slot) => slot.driverId === driverId),
        }))
        .filter((day) => day.slots.length > 0),
    [slotDays, driverId]
  );

  const timeSlots =
    driverDays.find((day) => day.dateKey === dateKey)?.slots ?? [];

  function updateField(field: string, value: AddRideFieldValue) {
    const isPickupAddress =
      field === 'pickupStreet' ||
      field === 'pickupCity' ||
      field === 'pickupState' ||
      field === 'pickupZip';
    const isDropoffAddress =
      field === 'dropoffStreet' ||
      field === 'dropoffCity' ||
      field === 'dropoffState' ||
      field === 'dropoffZip';

    setForm((current) => {
      const next = { ...current, [field]: value };
      if (isPickupAddress) {
        next.allowUnverifiedPickup = false;
      }
      if (isDropoffAddress) {
        next.allowUnverifiedDropoff = false;
      }
      return next;
    });

    if (isPickupAddress) {
      setPickupNeedsConfirm(false);
    }
    if (isDropoffAddress) {
      setDropoffNeedsConfirm(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      driverId,
      startAt,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      pickup: {
        street: form.pickupStreet,
        city: form.pickupCity,
        state: form.pickupState,
        zip: form.pickupZip,
      },
      dropoff: {
        street: form.dropoffStreet,
        city: form.dropoffCity,
        state: form.dropoffState,
        zip: form.dropoffZip,
      },
      allowUnverifiedPickup: form.allowUnverifiedPickup,
      allowUnverifiedDropoff: form.allowUnverifiedDropoff,
    };

    const response = await fetch('/api/driver/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      if (data.error === 'address_unverified') {
        if (data.pickupUnverified) {
          setPickupNeedsConfirm(true);
        }
        if (data.dropoffUnverified) {
          setDropoffNeedsConfirm(true);
        }
      }
      if (data.error === 'slot_unavailable') {
        await loadSlots();
        setStartAt('');
      }
      setError(data.message || data.error || 'Could not add ride.');
      return;
    }

    await onCreated(driverId, data.message || 'Ride added.');
  }

  return (
    <div
      className="driver-add-ride-overlay"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="booking-panel booking-panel--open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-ride-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="booking-panel-header">
          <h3 id="add-ride-title" className="booking-panel-title">
            Add Ride
          </h3>
          <p className="booking-panel-subtitle">
            Phone-in ride — saved as confirmed
          </p>
          <button
            type="button"
            className="btn btn-secondary booking-panel-change"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Driver
            <select
              required
              value={driverId}
              onChange={(event) => {
                setDriverId(Number(event.target.value));
                setDateKey('');
                setStartAt('');
              }}
            >
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input
              required
              autoComplete="name"
              value={form.customerName}
              onChange={(event) => updateField('customerName', event.target.value)}
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              autoComplete="tel"
              value={form.customerPhone}
              onChange={(event) =>
                updateField('customerPhone', event.target.value)
              }
            />
          </label>
          <RideAddressFields
            kind="pickup"
            form={form}
            needsConfirm={pickupNeedsConfirm}
            onFieldChange={updateField}
          />
          <RideAddressFields
            kind="dropoff"
            form={form}
            needsConfirm={dropoffNeedsConfirm}
            onFieldChange={updateField}
          />
          <div className="driver-add-ride-datetime">
            <label>
              Date
              <select
                required
                value={dateKey}
                disabled={loadingSlots || driverDays.length === 0}
                onChange={(event) => {
                  setDateKey(event.target.value);
                  setStartAt('');
                }}
              >
                <option value="">
                  {loadingSlots ? 'Loading…' : 'Select a date'}
                </option>
                {driverDays.map((day) => (
                  <option key={day.dateKey} value={day.dateKey}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Time
              <select
                required
                value={startAt}
                disabled={!dateKey || timeSlots.length === 0}
                onChange={(event) => setStartAt(event.target.value)}
              >
                <option value="">Select a time</option>
                {timeSlots.map((slot) => (
                  <option key={slot.startAt} value={slot.startAt}>
                    {formatSlotTime(slot.startAt)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!loadingSlots && driverDays.length === 0 && (
            <p className="settings-help">
              No open slots for this driver in the booking window.
            </p>
          )}
          <button className="btn btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add ride'}
          </button>
        </form>
      </aside>
    </div>
  );
}

function RideAddressFields({
  kind,
  form,
  needsConfirm,
  onFieldChange,
}: {
  kind: 'pickup' | 'dropoff';
  form: AddRideForm;
  needsConfirm: boolean;
  onFieldChange: (field: string, value: AddRideFieldValue) => void;
}) {
  const isPickup = kind === 'pickup';
  const street = isPickup ? form.pickupStreet : form.dropoffStreet;
  const city = isPickup ? form.pickupCity : form.dropoffCity;
  const state = isPickup ? form.pickupState : form.dropoffState;
  const zip = isPickup ? form.pickupZip : form.dropoffZip;
  const allowAnyway = isPickup
    ? form.allowUnverifiedPickup
    : form.allowUnverifiedDropoff;
  const streetField = isPickup ? 'pickupStreet' : 'dropoffStreet';
  const cityField = isPickup ? 'pickupCity' : 'dropoffCity';
  const stateField = isPickup ? 'pickupState' : 'dropoffState';
  const zipField = isPickup ? 'pickupZip' : 'dropoffZip';
  const anywayField = isPickup
    ? 'allowUnverifiedPickup'
    : 'allowUnverifiedDropoff';
  const title = isPickup ? 'From' : 'To';

  return (
    <div className="address-block">
      <h3 className="address-block-title">{title}</h3>
      <p className="address-block-hint">
        Street, city, state, and ZIP — not just a place name.
      </p>
      <label>
        Street
        <input
          required
          autoComplete="off"
          value={street}
          onChange={(event) => onFieldChange(streetField, event.target.value)}
        />
      </label>
      <div className="address-city-row">
        <label>
          City
          <input
            required
            autoComplete="off"
            value={city}
            onChange={(event) => onFieldChange(cityField, event.target.value)}
          />
        </label>
        <label>
          State
          <select
            required
            autoComplete="off"
            value={state}
            onChange={(event) => onFieldChange(stateField, event.target.value)}
          >
            {US_STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label>
          ZIP
          <input
            required
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{5}(-\d{4})?"
            title="5-digit ZIP or ZIP+4"
            value={zip}
            onChange={(event) => onFieldChange(zipField, event.target.value)}
          />
        </label>
      </div>
      {needsConfirm ? (
        <label className="address-anyway">
          <input
            type="checkbox"
            checked={allowAnyway}
            onChange={(event) =>
              onFieldChange(anywayField, event.target.checked)
            }
          />
          Use this {isPickup ? 'From' : 'To'} address anyway
        </label>
      ) : null}
    </div>
  );
}
