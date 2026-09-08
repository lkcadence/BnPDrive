'use client';

import type { CSSProperties } from 'react';
import type { WeekCalendarDay, WeekCalendarSlot } from '@/components/WeekCalendar';

type MobileSlotAgendaProps = {
  days: WeekCalendarDay[];
  loading: boolean;
  selectedSlot: WeekCalendarSlot | null;
  onSelectSlot: (slot: WeekCalendarSlot) => void;
  eventColor?: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function darkenHex(hex: string, amount = 0.18): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const scale = 1 - amount;
  const channels = normalized.match(/.{2}/g);
  if (!channels) {
    return hex;
  }

  return `#${channels
    .map((part) => {
      const value = Math.max(0, Math.floor(parseInt(part, 16) * scale));
      return value.toString(16).padStart(2, '0');
    })
    .join('')}`;
}

function groupSlotsByStart(slots: WeekCalendarSlot[]): WeekCalendarSlot[][] {
  const map = new Map<string, WeekCalendarSlot[]>();

  for (const slot of slots) {
    const list = map.get(slot.startAt) ?? [];
    list.push(slot);
    map.set(slot.startAt, list);
  }

  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => group.sort((a, b) => a.driverName.localeCompare(b.driverName)));
}

/**
 * Phone-friendly day-by-day slot list for the customer booking page.
 */
export default function MobileSlotAgenda({
  days,
  loading,
  selectedSlot,
  onSelectSlot,
  eventColor = '#1a73e8',
}: MobileSlotAgendaProps) {
  const selectedColor = darkenHex(eventColor);
  const agendaStyle = {
    ['--slot-event-color' as string]: eventColor,
    ['--slot-event-color-selected' as string]: selectedColor,
  } as CSSProperties;

  if (loading) {
    return <p className="gcal-loading">Loading open slots…</p>;
  }

  return (
    <div className="mobile-slot-agenda" style={agendaStyle}>
      {days.map((day) => (
        <section key={day.dateKey} className="slot-day">
          <h3>{day.label}</h3>
          {day.slots.length === 0 ? (
            <p className="slot-empty">No open slots this day.</p>
          ) : (
            <div className="slot-time-list">
              {groupSlotsByStart(day.slots).map((group) => (
                <div
                  key={`${day.dateKey}-${group[0].startAt}`}
                  className={`slot-time-group ${group.length > 1 ? 'slot-time-group--multi' : ''}`}
                >
                  <div className="slot-time-label">
                    <strong>{formatTime(group[0].startAt)}</strong>
                    {group.length > 1 && (
                      <span className="slot-time-badge">{group.length} drivers</span>
                    )}
                  </div>
                  <div className="slot-driver-options">
                    {group.map((slot) => {
                      const selected =
                        selectedSlot?.startAt === slot.startAt &&
                        selectedSlot.driverId === slot.driverId;

                      return (
                        <button
                          key={`${slot.driverId}-${slot.startAt}`}
                          type="button"
                          className={`slot-btn slot-driver-btn ${selected ? 'selected' : ''}`}
                          onClick={() => onSelectSlot(slot)}
                          aria-pressed={selected}
                        >
                          {slot.driverName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
