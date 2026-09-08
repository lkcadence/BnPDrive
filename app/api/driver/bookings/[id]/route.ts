import { NextResponse } from 'next/server';
import { getBookingById, getDriverById, updateBooking } from '@/lib/db';
import { sendRideConfirmed, sendRideDeclined } from '@/lib/email';
import { ensureDb } from '@/lib/init';

function parseMoney(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    return undefined;
  }

  return Math.round(amount * 100) / 100;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  ensureDb();

  const { id } = await context.params;
  const bookingId = Number(id);
  const existing = getBookingById(bookingId);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const status = data.status;
  const holdHours = data.holdHours;
  const amountCharged = parseMoney(data.amountCharged);
  const amountReceived = parseMoney(data.amountReceived);

  const allowed = ['pending', 'confirmed', 'done', 'no_show', 'declined'];
  if (typeof status === 'string' && !allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (amountCharged === undefined && data.amountCharged !== undefined) {
    return NextResponse.json({ error: 'Invalid amount charged' }, { status: 400 });
  }

  if (amountReceived === undefined && data.amountReceived !== undefined) {
    return NextResponse.json({ error: 'Invalid amount received' }, { status: 400 });
  }

  let holdEndAt = existing.holdEndAt;
  if (typeof holdHours === 'number' && holdHours > 0) {
    const start = new Date(existing.startAt);
    holdEndAt = new Date(start.getTime() + holdHours * 60 * 60 * 1000).toISOString();
  }

  const newStatus = typeof status === 'string' ? status : undefined;
  const statusChanged = newStatus && newStatus !== existing.status;

  const updated = updateBooking(bookingId, {
    status: newStatus as typeof existing.status | undefined,
    holdEndAt,
    amountCharged,
    amountReceived,
  });

  // Send customer email on confirm or decline (only on actual status transition)
  if (statusChanged && updated) {
    if (newStatus === 'confirmed') {
      const driver = getDriverById(updated.driverId);
      const driverName = driver?.firstName ?? 'Your driver';
      await sendRideConfirmed(updated, driverName);
    } else if (newStatus === 'declined') {
      await sendRideDeclined(updated);
    }
  }

  return NextResponse.json({ booking: updated });
}
