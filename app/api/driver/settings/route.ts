import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';
import { ensureDb } from '@/lib/init';

function logSettingsWrite(payload: unknown, written: unknown): void {
  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'data', 'settings-last-write.json'),
      JSON.stringify({ at: new Date().toISOString(), payload, written }, null, 2)
    );
  } catch (error) {
    console.error('settings write log failed', error);
  }
}

function readString(
  data: Record<string, unknown>,
  key: string
): string | undefined {
  return typeof data[key] === 'string' ? (data[key] as string) : undefined;
}

function readBookingWindowDays(data: Record<string, unknown>): number | undefined {
  const value = data.bookingWindowDays;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.floor(parsed));
    }
  }
  return undefined;
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  ensureDb();
  return NextResponse.json(
    { settings: getSettings() },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST() {
  ensureDb();
  return NextResponse.json(
    { settings: getSettings() },
    { headers: NO_STORE_HEADERS }
  );
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

  try {
    updateSettings({
      businessName: readString(data, 'businessName'),
      bannerSubtitle: readString(data, 'bannerSubtitle'),
      bannerColor: readString(data, 'bannerColor'),
      bookingWindowDays: readBookingWindowDays(data),
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
  } catch (error) {
    console.error('updateSettings failed', error);
    return NextResponse.json(
      { error: 'Could not save settings' },
      { status: 500 }
    );
  }

  const written = getSettings();
  logSettingsWrite(data, written);
  return NextResponse.json(
    { settings: written },
    { headers: NO_STORE_HEADERS }
  );
}
