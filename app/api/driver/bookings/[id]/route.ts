import { NextResponse } from 'next/server';
import { getBookingById, getDriverById, updateBooking } from '@/lib/db';
import { resolveBookingAddress } from '@/lib/address';
import { validateDriverRideEdit } from '@/lib/bookings/validation';
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

  if (data.pickup && typeof data.pickup === 'object') {
    return patchRideDetails(bookingId, existing, data);
  }

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

  if (statusChanged && updated) {
    if (newStatus === 'confirmed') {
      const driver =
        updated.driverId !== null ? getDriverById(updated.driverId) : null;
      const driverName = driver?.firstName ?? 'Your driver';
      await sendRideConfirmed(updated, driverName);
    } else if (newStatus === 'declined') {
      await sendRideDeclined(updated);
    }
  }

  return NextResponse.json({ booking: updated });
}

/**
 * Save contact, flight, address, and trip fields from the driver Edit popout.
 */
async function patchRideDetails(
  bookingId: number,
  existing: NonNullable<ReturnType<typeof getBookingById>>,
  data: Record<string, unknown>
) {
  const parsed = validateDriverRideEdit(data);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const form = parsed.form;
  if (form.driverId !== null && !getDriverById(form.driverId)) {
    return NextResponse.json({ error: 'Invalid driver' }, { status: 400 });
  }

  const [pickupResolved, dropoffResolved] = await Promise.all([
    resolveBookingAddress(form.pickupParts, form.allowUnverifiedPickup),
    resolveBookingAddress(form.dropoffParts, form.allowUnverifiedDropoff),
  ]);

  if (!pickupResolved.ok || !dropoffResolved.ok) {
    const parts: string[] = [];
    if (!pickupResolved.ok) {
      parts.push(
        'We couldn\'t verify the From address. Check street, city, state, and ZIP.'
      );
    }
    if (!dropoffResolved.ok) {
      parts.push(
        'We couldn\'t verify the To address. Check street, city, state, and ZIP.'
      );
    }
    return NextResponse.json(
      {
        error: 'address_unverified',
        message: parts.join(' '),
        pickupUnverified: !pickupResolved.ok,
        dropoffUnverified: !dropoffResolved.ok,
      },
      { status: 400 }
    );
  }

  let startAt = existing.startAt;
  let holdEndAt = existing.holdEndAt;
  if (form.startAt) {
    const oldHoldMs =
      new Date(existing.holdEndAt).getTime() - new Date(existing.startAt).getTime();
    startAt = form.startAt;
    const duration = oldHoldMs > 0 ? oldHoldMs : 60 * 60 * 1000;
    holdEndAt = new Date(new Date(startAt).getTime() + duration).toISOString();
  }

  const updated = updateBooking(bookingId, {
    driverId: form.driverId,
    startAt,
    holdEndAt,
    tripType: form.tripType,
    notes: form.notes,
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    customerEmail: form.customerEmail,
    airlineName: form.airlineName,
    flightNumberFrom: form.flightNumberFrom,
    flightNumberTo: form.flightNumberTo,
    pickupAddress: pickupResolved.formatted,
    dropoffAddress: dropoffResolved.formatted,
    passengerCount: form.passengerCount,
  });

  return NextResponse.json({ booking: updated });
}
