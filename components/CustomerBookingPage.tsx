'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import WeekCalendar from '@/components/WeekCalendar';
import MobileSlotAgenda from '@/components/MobileSlotAgenda';
import CustomerNotice from '@/components/CustomerNotice';
import { US_STATE_CODES } from '@/lib/address';
import { DEFAULT_MESSAGE_BACKGROUND } from '@/lib/customer-messages';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';

export type CustomerSettings = {
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

type BookingMode = 'slot' | 'asap';

type FormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  airlineName: string;
  flightNumberFrom: string;
  flightNumberTo: string;
  pickupStreet: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  dropoffStreet: string;
  dropoffCity: string;
  dropoffState: string;
  dropoffZip: string;
  passengerCount: number;
  tripType: string;
  notes: string;
  allowUnverifiedPickup: boolean;
  allowUnverifiedDropoff: boolean;
};

const emptyForm: FormState = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  airlineName: '',
  flightNumberFrom: '',
  flightNumberTo: '',
  pickupStreet: '',
  pickupCity: '',
  pickupState: 'SC',
  pickupZip: '',
  dropoffStreet: '',
  dropoffCity: '',
  dropoffState: 'SC',
  dropoffZip: '',
  passengerCount: 1,
  tripType: 'airport',
  notes: '',
  allowUnverifiedPickup: false,
  allowUnverifiedDropoff: false,
};

/**
 * Temporary: hide the slot calendar and mode buttons so elderly customers
 * land on the ASAP form. Set to true to restore Pick a time slot.
 */
const SHOW_CUSTOMER_SLOT_BOOKING = false;

type FormFieldValue = string | number | boolean;

function formatSlotSummary(slot: OpenSlot): string {
  return `${slot.driverName} · ${new Date(slot.startAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/**
 * Optional airline and flight numbers between Email and Pickup.
 */
function FlightInformationFields({
  form,
  onFieldChange,
}: {
  form: FormState;
  onFieldChange: (field: string, value: FormFieldValue) => void;
}) {
  return (
    <div className="address-block">
      <h3 className="address-block-title">Flight Information</h3>
      <label>
        Airline Name
        <input
          autoComplete="off"
          value={form.airlineName}
          onChange={(event) => onFieldChange('airlineName', event.target.value)}
        />
      </label>
      <div className="flight-number-row">
        <label>
          Flight Number From
          <input
            autoComplete="off"
            value={form.flightNumberFrom}
            onChange={(event) =>
              onFieldChange('flightNumberFrom', event.target.value)
            }
          />
        </label>
        <label>
          Flight Number To
          <input
            autoComplete="off"
            value={form.flightNumberTo}
            onChange={(event) =>
              onFieldChange('flightNumberTo', event.target.value)
            }
          />
        </label>
      </div>
    </div>
  );
}

function AddressFields({
  kind,
  form,
  autoComplete,
  needsConfirm,
  onFieldChange,
}: {
  kind: 'pickup' | 'dropoff';
  form: FormState;
  autoComplete: boolean;
  needsConfirm: boolean;
  onFieldChange: (field: string, value: FormFieldValue) => void;
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
  const title = isPickup ? 'Pickup' : 'Drop-off';

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
          autoComplete={autoComplete ? 'address-line1' : 'off'}
          value={street}
          onChange={(event) => onFieldChange(streetField, event.target.value)}
        />
      </label>
      <div className="address-city-row">
        <label>
          City
          <input
            required
            autoComplete={autoComplete ? 'address-level2' : 'off'}
            value={city}
            onChange={(event) => onFieldChange(cityField, event.target.value)}
          />
        </label>
        <label>
          State
          <select
            required
            autoComplete={autoComplete ? 'address-level1' : 'off'}
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
            autoComplete={autoComplete ? 'postal-code' : 'off'}
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
          Use this {isPickup ? 'pickup' : 'drop-off'} address anyway
        </label>
      ) : null}
    </div>
  );
}

function BookingForm({
  form,
  submitting,
  submitLabel,
  pickupNeedsConfirm,
  dropoffNeedsConfirm,
  onFieldChange,
  onSubmit,
}: {
  form: FormState;
  submitting: boolean;
  submitLabel: string;
  pickupNeedsConfirm: boolean;
  dropoffNeedsConfirm: boolean;
  onFieldChange: (field: string, value: FormFieldValue) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Name
        <input
          required
          autoComplete="name"
          value={form.customerName}
          onChange={(event) => onFieldChange('customerName', event.target.value)}
        />
      </label>
      <label>
        Phone
        <input
          required
          type="tel"
          autoComplete="tel"
          value={form.customerPhone}
          onChange={(event) => onFieldChange('customerPhone', event.target.value)}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          autoComplete="email"
          value={form.customerEmail}
          onChange={(event) => onFieldChange('customerEmail', event.target.value)}
        />
      </label>
      <FlightInformationFields form={form} onFieldChange={onFieldChange} />
      <AddressFields
        kind="pickup"
        form={form}
        autoComplete
        needsConfirm={pickupNeedsConfirm}
        onFieldChange={onFieldChange}
      />
      <AddressFields
        kind="dropoff"
        form={form}
        autoComplete={false}
        needsConfirm={dropoffNeedsConfirm}
        onFieldChange={onFieldChange}
      />
      <label>
        Passengers
        <input
          required
          type="number"
          min={1}
          value={form.passengerCount}
          onChange={(event) => onFieldChange('passengerCount', event.target.value)}
        />
      </label>
      <label>
        Trip type
        <select
          value={form.tripType}
          onChange={(event) => onFieldChange('tripType', event.target.value)}
        >
          <option value="airport">Airport</option>
          <option value="medical">Medical</option>
          <option value="school">School</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Notes (wheelchair, car seat, bags, etc.)
        <textarea
          value={form.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
        />
      </label>
      <button className="btn btn-block" type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : submitLabel}
      </button>
    </form>
  );
}

type CustomerBookingPageProps = {
  initialSettings: CustomerSettings;
  initialDays: SlotDay[];
};

export default function CustomerBookingPage({
  initialSettings,
  initialDays,
}: CustomerBookingPageProps) {
  const [settings, setSettings] = useState<CustomerSettings>(initialSettings);
  const [days, setDays] = useState<SlotDay[]>(initialDays);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<BookingMode>(
    SHOW_CUSTOMER_SLOT_BOOKING ? 'slot' : 'asap'
  );
  const [selectedSlot, setSelectedSlot] = useState<OpenSlot | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickupNeedsConfirm, setPickupNeedsConfirm] = useState(false);
  const [dropoffNeedsConfirm, setDropoffNeedsConfirm] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  async function loadSlots(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/slots', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
      if (Array.isArray(data.days)) {
        setDays(data.days);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useAutoRefresh(() => loadSlots({ silent: true }));

  useEffect(() => {
    if (!selectedSlot || mode !== 'slot') {
      return;
    }

    const stillAvailable = days.some((day) =>
      day.slots.some(
        (slot) =>
          slot.driverId === selectedSlot.driverId &&
          slot.startAt === selectedSlot.startAt
      )
    );

    if (!stillAvailable) {
      setSelectedSlot(null);
      setError(settings.messageSlotUnavailable);
    }
  }, [days, selectedSlot, mode, settings.messageSlotUnavailable]);

  useEffect(() => {
    if (!selectedSlot || mode !== 'slot') {
      return;
    }

    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedSlot, mode]);

  const [weekOffset, setWeekOffset] = useState(0);
  const totalWeeks = Math.max(1, Math.ceil(days.length / 7));

  const weekDays = useMemo(
    () => days.slice(weekOffset * 7, weekOffset * 7 + 7),
    [days, weekOffset]
  );

  const showSlotForm = mode === 'slot' && selectedSlot !== null;

  function updateField(field: string, value: FormFieldValue) {
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

  function selectSlot(slot: OpenSlot) {
    setSelectedSlot(slot);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    if (mode === 'slot' && !selectedSlot) {
      setError(settings.messageSelectSlot);
      setSubmitting(false);
      return;
    }

    const payload = {
      bookingType: mode,
      driverId: selectedSlot?.driverId,
      startAt: selectedSlot?.startAt,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      airlineName: form.airlineName,
      flightNumberFrom: form.flightNumberFrom,
      flightNumberTo: form.flightNumberTo,
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
      passengerCount: Number(form.passengerCount),
      tripType: form.tripType,
      notes: form.notes,
      allowUnverifiedPickup: form.allowUnverifiedPickup,
      allowUnverifiedDropoff: form.allowUnverifiedDropoff,
    };

    const response = await fetch('/api/bookings', {
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
      setError(data.message || data.error || 'Could not submit booking.');
      return;
    }

    setMessage(data.message || settings.messageBookingSuccess);
    setForm(emptyForm);
    setPickupNeedsConfirm(false);
    setDropoffNeedsConfirm(false);
    setSelectedSlot(null);
    setMode(SHOW_CUSTOMER_SLOT_BOOKING ? 'slot' : 'asap');
    await loadSlots({ silent: true });
  }

  const noticeBackground = settings.messageBackgroundColor || DEFAULT_MESSAGE_BACKGROUND;
  const asapInfo = settings.messageAsapInfo.trim();
  const bookingHint = settings.messageBookingHint.trim();
  const footerNote = settings.messageFooterNote.trim();

  return (
    <>
      <header className="banner" style={{ backgroundColor: settings.bannerColor }}>
        <div className="container">
          <h1>{settings.businessName}</h1>
          {settings.bannerSubtitle.trim() ? (
            <p>{settings.bannerSubtitle}</p>
          ) : null}
        </div>
      </header>

      <main className="container container--booking page-stack">
        {message && (
          <CustomerNotice
            backgroundColor={noticeBackground}
            className="customer-notice--success"
          >
            {message}
          </CustomerNotice>
        )}
        {error && (
          <CustomerNotice backgroundColor={noticeBackground} className="customer-notice--error">
            {error}
          </CustomerNotice>
        )}

        <section className="card booking-section">
          <h2 className="section-title">Book a ride</h2>
          {SHOW_CUSTOMER_SLOT_BOOKING && (
            <div className="actions-row booking-mode-toggle">
              <button
                type="button"
                className={`btn ${mode === 'slot' ? '' : 'btn-secondary'}`}
                onClick={() => {
                  setMode('slot');
                  setError(null);
                }}
              >
                Pick a time slot
              </button>
              <button
                type="button"
                className={`btn ${mode === 'asap' ? '' : 'btn-secondary'}`}
                onClick={() => {
                  setMode('asap');
                  setSelectedSlot(null);
                  setError(null);
                }}
              >
                Need a ride ASAP
              </button>
            </div>
          )}

          {mode === 'asap' && (
            <>
              {asapInfo ? (
                <CustomerNotice backgroundColor={noticeBackground}>
                  {asapInfo}
                </CustomerNotice>
              ) : null}
              <aside className="booking-panel booking-panel--open">
                <div className="booking-panel-header">
                  <h3 className="booking-panel-title">Please enter your ride details</h3>
                  {/* ASAP subtitle hidden while the calendar is off. */}
                  {/* <p className="booking-panel-subtitle">ASAP — we’ll call as soon as we can</p> */}
                </div>
                <BookingForm
                  form={form}
                  submitting={submitting}
                  submitLabel="Click here to request your ride"
                  pickupNeedsConfirm={pickupNeedsConfirm}
                  dropoffNeedsConfirm={dropoffNeedsConfirm}
                  onFieldChange={updateField}
                  onSubmit={handleSubmit}
                />
              </aside>
            </>
          )}

          {SHOW_CUSTOMER_SLOT_BOOKING && mode === 'slot' && (
            <div
              className={`booking-layout ${showSlotForm ? 'booking-layout--open' : ''}`}
            >
              {showSlotForm && (
                <aside
                  ref={panelRef}
                  className="booking-panel booking-panel--open"
                  aria-live="polite"
                >
                  <div className="booking-panel-header">
                    <h3 className="booking-panel-title">Complete your booking</h3>
                    <p className="booking-panel-subtitle">
                      {formatSlotSummary(selectedSlot!)}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary booking-panel-change"
                      onClick={() => setSelectedSlot(null)}
                    >
                      Change time
                    </button>
                  </div>
                  <BookingForm
                    form={form}
                    submitting={submitting}
                    submitLabel="Request ride"
                    pickupNeedsConfirm={pickupNeedsConfirm}
                    dropoffNeedsConfirm={dropoffNeedsConfirm}
                    onFieldChange={updateField}
                    onSubmit={handleSubmit}
                  />
                </aside>
              )}

              <div className="booking-calendar">
                {!showSlotForm && bookingHint ? (
                  <CustomerNotice
                    backgroundColor={noticeBackground}
                    className="booking-hint"
                  >
                    {bookingHint}
                  </CustomerNotice>
                ) : null}

                {totalWeeks > 1 && (
                  <div className="week-nav">
                    <button
                      type="button"
                      className="btn btn-secondary week-nav-btn"
                      disabled={weekOffset === 0}
                      onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                      aria-label="Previous week"
                    >
                      ◀
                    </button>
                    <span className="week-nav-label">
                      Week {weekOffset + 1} of {totalWeeks}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary week-nav-btn"
                      disabled={weekOffset >= totalWeeks - 1}
                      onClick={() => setWeekOffset((o) => Math.min(totalWeeks - 1, o + 1))}
                      aria-label="Next week"
                    >
                      ▶
                    </button>
                  </div>
                )}

                <div className="booking-calendar__mobile">
                  <MobileSlotAgenda
                    days={weekDays}
                    loading={loading}
                    selectedSlot={selectedSlot}
                    onSelectSlot={selectSlot}
                    eventColor={settings.calendarEventColor}
                  />
                </div>
                <div className="booking-calendar__week">
                  <WeekCalendar
                    weekDays={weekDays}
                    loading={loading}
                    selectedSlot={selectedSlot}
                    onSelectSlot={selectSlot}
                    eventColor={settings.calendarEventColor}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {footerNote ? (
        <footer className="site-footer">
          <CustomerNotice
            backgroundColor={noticeBackground}
            className="site-footer-notice"
          >
            {footerNote}
          </CustomerNotice>
        </footer>
      ) : null}
    </>
  );
}
