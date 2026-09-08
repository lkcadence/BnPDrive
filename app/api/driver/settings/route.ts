import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';
import { ensureDb } from '@/lib/init';

function readString(data: Record<string, unknown>, key: string): string | undefined {
  return typeof data[key] === 'string' ? (data[key] as string) : undefined;
}

export async function GET() {
  ensureDb();
  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(request: Request) {
  ensureDb();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const settings = updateSettings({
    businessName: readString(data, 'businessName'),
    bannerSubtitle: readString(data, 'bannerSubtitle'),
    bannerColor: readString(data, 'bannerColor'),
    bookingWindowDays:
      typeof data.bookingWindowDays === 'number'
        ? Math.max(1, Math.floor(data.bookingWindowDays))
        : undefined,
    calendarEventColor: readString(data, 'calendarEventColor'),
    messageBackgroundColor: readString(data, 'messageBackgroundColor'),
    messageBookingSuccess: readString(data, 'messageBookingSuccess'),
    messageAsapInfo: readString(data, 'messageAsapInfo'),
    messageBookingHint: readString(data, 'messageBookingHint'),
    messageFooterNote: readString(data, 'messageFooterNote'),
    messageSlotUnavailable: readString(data, 'messageSlotUnavailable'),
    messageSelectSlot: readString(data, 'messageSelectSlot'),
    messageAsapNoDriver: readString(data, 'messageAsapNoDriver'),
    messageAsapNoSlot: readString(data, 'messageAsapNoSlot'),
    messageCancelSuccess: readString(data, 'messageCancelSuccess'),
    messageChangeByPhone: readString(data, 'messageChangeByPhone'),
  });

  return NextResponse.json({ settings });
}
