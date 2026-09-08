'use client';

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 22;
const SLOT_MINUTES = 30;

export type WeekCalendarSlot = {
  driverId: number;
  driverName: string;
  startAt: string;
  endAt: string;
  dateKey: string;
};

export type WeekCalendarDay = {
  dateKey: string;
  label: string;
  slots: WeekCalendarSlot[];
};

const ROW_COUNT = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMonthYearLabel(weekDays: WeekCalendarDay[]): string {
  if (weekDays.length === 0) {
    return '';
  }

  const first = new Date(`${weekDays[0].dateKey}T12:00:00`);
  const last = new Date(`${weekDays[weekDays.length - 1].dateKey}T12:00:00`);
  const monthYear = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return monthYear(first);
  }

  return `${monthYear(first)} – ${monthYear(last)}`;
}

function formatDayHeader(dateKey: string): { weekday: string; dayNum: string; isToday: boolean } {
  const date = new Date(`${dateKey}T12:00:00`);
  const todayKey = new Date().toISOString().slice(0, 10);

  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    dayNum: String(date.getDate()),
    isToday: dateKey === todayKey,
  };
}

function slotRowIndex(iso: string): number {
  const date = new Date(iso);
  const minutes = date.getHours() * 60 + date.getMinutes() - GRID_START_HOUR * 60;
  if (minutes < 0 || minutes >= ROW_COUNT * SLOT_MINUTES) {
    return -1;
  }

  return Math.floor(minutes / SLOT_MINUTES);
}

function hourLabelForRow(rowIndex: number): string {
  const hour = GRID_START_HOUR + Math.floor((rowIndex * SLOT_MINUTES) / 60);
  const date = new Date(`2000-01-01T${String(hour).padStart(2, '0')}:00:00`);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function groupSlotsByRow(slots: WeekCalendarSlot[]): Map<number, WeekCalendarSlot[]> {
  const map = new Map<number, WeekCalendarSlot[]>();

  for (const slot of slots) {
    const row = slotRowIndex(slot.startAt);
    if (row < 0) {
      continue;
    }

    const list = map.get(row) ?? [];
    list.push(slot);
    map.set(row, list);
  }

  for (const [row, list] of map) {
    map.set(
      row,
      list.sort((a, b) => a.driverName.localeCompare(b.driverName))
    );
  }

  return map;
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

type WeekCalendarProps = {
  weekDays: WeekCalendarDay[];
  loading: boolean;
  selectedSlot: WeekCalendarSlot | null;
  onSelectSlot: (slot: WeekCalendarSlot) => void;
  eventColor?: string;
};

export default function WeekCalendar({
  weekDays,
  loading,
  selectedSlot,
  onSelectSlot,
  eventColor = '#1a73e8',
}: WeekCalendarProps) {
  const rowTemplate = `repeat(${ROW_COUNT}, minmax(52px, 1fr))`;

  if (loading) {
    return <p className="gcal-loading">Loading open slots…</p>;
  }

  const monthYearLabel = formatMonthYearLabel(weekDays);
  const selectedEventColor = darkenHex(eventColor);
  const calendarStyle = {
    ['--gcal-rows' as string]: ROW_COUNT,
    ['--gcal-event-color' as string]: eventColor,
    ['--gcal-event-color-selected' as string]: selectedEventColor,
  };

  return (
    <div className="gcal-wrap" style={calendarStyle}>
      {monthYearLabel && (
        <div className="gcal-month-year" aria-live="polite">
          {monthYearLabel}
        </div>
      )}
      <div className="gcal-header">
        <div className="gcal-corner" aria-hidden="true" />
        {weekDays.map((day) => {
          const header = formatDayHeader(day.dateKey);
          return (
            <div
              key={day.dateKey}
              className={`gcal-day-header ${header.isToday ? 'gcal-day-header--today' : ''}`}
            >
              <span className="gcal-weekday">{header.weekday}</span>
              <span className={`gcal-day-num ${header.isToday ? 'gcal-day-num--today' : ''}`}>
                {header.dayNum}
              </span>
            </div>
          );
        })}
      </div>

      <div className="gcal-body">
        <div className="gcal-time-axis" style={{ gridTemplateRows: rowTemplate }}>
          {Array.from({ length: ROW_COUNT }, (_, rowIndex) => (
            <div key={`time-${rowIndex}`} className="gcal-time-label">
              {rowIndex % 2 === 0 ? hourLabelForRow(rowIndex) : ''}
            </div>
          ))}
        </div>

        <div className="gcal-grid">
          {weekDays.map((day) => {
            const slotsByRow = groupSlotsByRow(day.slots);

            return (
              <div
                key={day.dateKey}
                className="gcal-day-col"
                style={{ gridTemplateRows: rowTemplate }}
              >
                {Array.from({ length: ROW_COUNT }, (_, rowIndex) => {
                  const group = slotsByRow.get(rowIndex);

                  if (!group || group.length === 0) {
                    return <div key={`${day.dateKey}-${rowIndex}`} className="gcal-slot-cell" />;
                  }

                  return (
                    <div key={`${day.dateKey}-${rowIndex}`} className="gcal-event-group">
                      <span className="gcal-event-time">{formatTime(group[0].startAt)}</span>
                      <div className="gcal-event-drivers">
                        {group.map((slot) => {
                          const selected =
                            selectedSlot?.startAt === slot.startAt &&
                            selectedSlot.driverId === slot.driverId;

                          return (
                            <button
                              key={`${slot.driverId}-${slot.startAt}`}
                              type="button"
                              className={`gcal-event ${selected ? 'gcal-event--selected' : ''}`}
                              onClick={() => onSelectSlot(slot)}
                              aria-pressed={selected}
                              title={`${slot.driverName} · ${formatTime(slot.startAt)}`}
                            >
                              {slot.driverName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
