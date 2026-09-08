import type { TripType } from '@/lib/db';

export type TimeInterval = {
  start: Date;
  end: Date;
};

export type OpenSlot = {
  driverId: number;
  driverName: string;
  startAt: string;
  endAt: string;
  dateKey: string;
};

const SLOT_MINUTES = 30;

export function parseTimeOnDate(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00`);
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

export function defaultHoldEnd(startAt: Date, tripType: TripType): Date {
  if (tripType === 'airport') {
    return addHours(startAt, 3);
  }

  return addHours(startAt, 1);
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function subtractInterval(
  available: TimeInterval[],
  blocked: TimeInterval
): TimeInterval[] {
  const result: TimeInterval[] = [];

  for (const interval of available) {
    if (!intervalsOverlap(interval, blocked)) {
      result.push(interval);
      continue;
    }

    if (blocked.start > interval.start) {
      result.push({ start: interval.start, end: blocked.start });
    }

    if (blocked.end < interval.end) {
      result.push({ start: blocked.end, end: interval.end });
    }
  }

  return result;
}

export function subtractMany(
  available: TimeInterval[],
  blockedList: TimeInterval[]
): TimeInterval[] {
  let current = available;

  for (const blocked of blockedList) {
    current = current.flatMap((interval) => subtractInterval([interval], blocked));
  }

  return current;
}

export function generateSlotStarts(
  interval: TimeInterval,
  slotMinutes: number = SLOT_MINUTES
): Date[] {
  const slots: Date[] = [];
  let cursor = new Date(interval.start);

  while (cursor < interval.end) {
    slots.push(new Date(cursor));
    cursor = addMinutes(cursor, slotMinutes);
  }

  return slots;
}

export function roundUpToSlot(date: Date, slotMinutes: number = SLOT_MINUTES): Date {
  const ms = slotMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function isOnDutyNow(
  now: Date,
  weekly: { dayOfWeek: number; startTime: string; endTime: string }[],
  exceptions: { date: string; startTime: string | null; endTime: string | null }[],
  dateKey: string
): boolean {
  const exception = exceptions.find((item) => item.date === dateKey);

  if (exception && !exception.startTime && !exception.endTime) {
    return false;
  }

  if (exception?.startTime && exception.endTime) {
    const start = parseTimeOnDate(dateKey, exception.startTime);
    const end = parseTimeOnDate(dateKey, exception.endTime);
    return now >= start && now < end;
  }

  const dayOfWeek = now.getDay();
  const windows = weekly.filter((row) => row.dayOfWeek === dayOfWeek);

  for (const window of windows) {
    const start = parseTimeOnDate(dateKey, window.startTime);
    const end = parseTimeOnDate(dateKey, window.endTime);
    if (now >= start && now < end) {
      return true;
    }
  }

  return false;
}

export function getAvailabilityWindowsForDate(
  dateKey: string,
  dayOfWeek: number,
  weekly: { dayOfWeek: number; startTime: string; endTime: string }[],
  exceptions: { date: string; startTime: string | null; endTime: string | null }[]
): TimeInterval[] {
  const exception = exceptions.find((item) => item.date === dateKey);

  if (exception && !exception.startTime && !exception.endTime) {
    return [];
  }

  if (exception?.startTime && exception.endTime) {
    return [
      {
        start: parseTimeOnDate(dateKey, exception.startTime),
        end: parseTimeOnDate(dateKey, exception.endTime),
      },
    ];
  }

  return weekly
    .filter((row) => row.dayOfWeek === dayOfWeek)
    .map((row) => ({
      start: parseTimeOnDate(dateKey, row.startTime),
      end: parseTimeOnDate(dateKey, row.endTime),
    }));
}
