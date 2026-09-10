import {
  getActiveBookings,
  getAvailabilityForDriver,
  getDrivers,
  getExceptionsForDriver,
  getSettings,
  type TripType,
} from '@/lib/db';
import {
  formatDateKey,
  generateSlotStarts,
  getAvailabilityWindowsForDate,
  isOnDutyNow,
  roundUpToSlot,
  subtractMany,
  type OpenSlot,
  type TimeInterval,
} from '@/lib/slots/time';

export type SlotDay = {
  dateKey: string;
  label: string;
  slots: OpenSlot[];
};

function formatDayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getBlockedIntervals(
  driverId: number,
  bookings: ReturnType<typeof getActiveBookings>
): TimeInterval[] {
  return bookings
    .filter((booking) => booking.driverId === driverId)
    .map((booking) => ({
      start: new Date(booking.startAt),
      end: new Date(booking.holdEndAt),
    }));
}

export function getOpenSlots(now: Date = new Date()): SlotDay[] {
  const settings = getSettings();
  const drivers = getDrivers();
  const bookings = getActiveBookings();
  const days: SlotDay[] = [];

  for (let offset = 0; offset <= settings.bookingWindowDays; offset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);

    const dateKey = formatDateKey(day);
    const dayOfWeek = day.getDay();
    const slots: OpenSlot[] = [];

    for (const driver of drivers) {
      const weekly = getAvailabilityForDriver(driver.id);
      const exceptions = getExceptionsForDriver(driver.id);
      let windows = getAvailabilityWindowsForDate(
        dateKey,
        dayOfWeek,
        weekly,
        exceptions
      );

      if (offset === 0) {
        const minStart = roundUpToSlot(now);
        windows = windows
          .map((window) => ({
            start: window.start < minStart ? minStart : window.start,
            end: window.end,
          }))
          .filter((window) => window.start < window.end);
      }

      const blocked = getBlockedIntervals(driver.id, bookings);
      const freeWindows = subtractMany(windows, blocked);

      for (const window of freeWindows) {
        for (const start of generateSlotStarts(window)) {
          slots.push({
            driverId: driver.id,
            driverName: driver.firstName,
            startAt: start.toISOString(),
            endAt: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
            dateKey,
          });
        }
      }
    }

    slots.sort((a, b) => {
      const byTime = a.startAt.localeCompare(b.startAt);
      if (byTime !== 0) {
        return byTime;
      }

      return a.driverName.localeCompare(b.driverName);
    });

    days.push({
      dateKey,
      label: formatDayLabel(dateKey),
      slots,
    });
  }

  return days;
}

/**
 * True when this driver still has an open slot at the given start time.
 */
export function isOpenSlot(
  driverId: number,
  startAt: string,
  now: Date = new Date()
): boolean {
  return getOpenSlots(now).some((day) =>
    day.slots.some(
      (slot) => slot.driverId === driverId && slot.startAt === startAt
    )
  );
}

export function findSoonestOpenSlot(
  driverIds: number[],
  now: Date = new Date()
): OpenSlot | null {
  const days = getOpenSlots(now);

  for (const day of days) {
    const match = day.slots.find((slot) => driverIds.includes(slot.driverId));
    if (match) {
      return match;
    }
  }

  return null;
}

export function getOnDutyDriverIds(now: Date = new Date()): number[] {
  const dateKey = formatDateKey(now);
  const drivers = getDrivers();
  const onDuty: number[] = [];

  for (const driver of drivers) {
    const weekly = getAvailabilityForDriver(driver.id);
    const exceptions = getExceptionsForDriver(driver.id);

    if (isOnDutyNow(now, weekly, exceptions, dateKey)) {
      onDuty.push(driver.id);
    }
  }

  return onDuty;
}

export function computeHoldEnd(startAt: Date, tripType: TripType): Date {
  const hours = tripType === 'airport' ? 3 : 1;
  return new Date(startAt.getTime() + hours * 60 * 60 * 1000);
}

export type SlotTimeGroup = {
  startAt: string;
  slots: OpenSlot[];
};

export function groupSlotsByTime(slots: OpenSlot[]): SlotTimeGroup[] {
  const map = new Map<string, OpenSlot[]>();

  for (const slot of slots) {
    const existing = map.get(slot.startAt) ?? [];
    existing.push(slot);
    map.set(slot.startAt, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startAt, grouped]) => ({
      startAt,
      slots: grouped.sort((a, b) => a.driverName.localeCompare(b.driverName)),
    }));
}

export { formatDateKey };
