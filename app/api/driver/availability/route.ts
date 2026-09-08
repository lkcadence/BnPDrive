import { NextResponse } from 'next/server';
import {
  addException,
  getAvailabilityForDriver,
  getDrivers,
  getExceptionsForDriver,
  removeException,
  setAvailabilityForDriver,
} from '@/lib/db';
import { ensureDb } from '@/lib/init';

export async function GET() {
  ensureDb();

  const drivers = getDrivers().map((driver) => ({
    ...driver,
    availability: getAvailabilityForDriver(driver.id),
    exceptions: getExceptionsForDriver(driver.id),
  }));

  return NextResponse.json({ drivers });
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
  const driverId = Number(data.driverId);
  const availability = data.availability;

  if (!driverId || !Array.isArray(availability)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const rows = availability
    .map((row) => row as Record<string, unknown>)
    .filter(
      (row) =>
        typeof row.dayOfWeek === 'number' &&
        typeof row.startTime === 'string' &&
        typeof row.endTime === 'string'
    )
    .map((row) => ({
      dayOfWeek: row.dayOfWeek as number,
      startTime: row.startTime as string,
      endTime: row.endTime as string,
    }));

  setAvailabilityForDriver(driverId, rows);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  ensureDb();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const driverId = Number(data.driverId);
  const date = data.date;
  const action = data.action;

  if (action === 'remove') {
    removeException(Number(data.exceptionId));
    return NextResponse.json({ ok: true });
  }

  if (!driverId || typeof date !== 'string') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  addException(driverId, date, null, null);
  return NextResponse.json({ ok: true });
}
