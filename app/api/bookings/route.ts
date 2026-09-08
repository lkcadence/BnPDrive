import { NextResponse } from 'next/server';
import {
  computeHoldEnd,
  findSoonestOpenSlot,
  getOnDutyDriverIds,
} from '@/lib/slots';
import {
  getBookingByToken,
  getSettings,
  insertBooking,
  updateBooking,
  type TripType,
} from '@/lib/db';
import { resolveBookingAddress } from '@/lib/address';
import { createCancelToken, validateBookingInput } from '@/lib/bookings/validation';
import { sendAsapAlert, sendBookingConfirmation } from '@/lib/email';
import { ensureDb } from '@/lib/init';

export async function POST(request: Request) {
  ensureDb();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = validateBookingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }
  const form = parsed.form;

  const [pickupResolved, dropoffResolved] = await Promise.all([
    resolveBookingAddress(form.pickupParts, form.allowUnverifiedPickup),
    resolveBookingAddress(form.dropoffParts, form.allowUnverifiedDropoff),
  ]);

  if (!pickupResolved.ok || !dropoffResolved.ok) {
    const parts: string[] = [];
    if (!pickupResolved.ok) {
      parts.push(
        'We couldn\'t verify the pickup address. Check street, city, state, and ZIP.'
      );
    }
    if (!dropoffResolved.ok) {
      parts.push(
        'We couldn\'t verify the drop-off address. Check street, city, state, and ZIP.'
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

  const pickupAddress = pickupResolved.formatted;
  const dropoffAddress = dropoffResolved.formatted;

  const siteSettings = getSettings();
  const payload = body as Record<string, unknown>;
  const bookingType = payload.bookingType;

  if (bookingType === 'asap') {
    const onDuty = getOnDutyDriverIds();

    if (onDuty.length === 0) {
      return NextResponse.json(
        {
          error: 'no_driver_on_duty',
          message: siteSettings.messageAsapNoDriver,
        },
        { status: 409 }
      );
    }

    const soonest = findSoonestOpenSlot(onDuty);
    if (!soonest) {
      return NextResponse.json(
        {
          error: 'no_open_slot',
          message: siteSettings.messageAsapNoSlot,
        },
        { status: 409 }
      );
    }

    const startAt = new Date();
    const holdEndAt = computeHoldEnd(startAt, form.tripType);

    const booking = insertBooking({
      driverId: soonest.driverId,
      status: 'pending',
      bookingType: 'asap',
      tripType: form.tripType,
      startAt: startAt.toISOString(),
      holdEndAt: holdEndAt.toISOString(),
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      pickupAddress,
      dropoffAddress,
      passengerCount: form.passengerCount,
      notes: form.notes || null,
      amountCharged: null,
      amountReceived: null,
      cancelToken: createCancelToken(),
    });

    await sendBookingConfirmation(booking);
    await sendAsapAlert(booking);

    return NextResponse.json({
      booking,
      message: siteSettings.messageBookingSuccess,
    });
  }

  if (bookingType !== 'slot') {
    return NextResponse.json({ error: 'Invalid booking type' }, { status: 400 });
  }

  const driverId = Number(payload.driverId);
  const startAtRaw = payload.startAt;

  if (!driverId || typeof startAtRaw !== 'string') {
    return NextResponse.json({ error: 'Missing slot selection' }, { status: 400 });
  }

  const startAt = new Date(startAtRaw);
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
  }

  const holdEndAt = computeHoldEnd(startAt, form.tripType as TripType);

  const booking = insertBooking({
    driverId,
    status: 'pending',
    bookingType: 'slot',
    tripType: form.tripType,
    startAt: startAt.toISOString(),
    holdEndAt: holdEndAt.toISOString(),
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    customerEmail: form.customerEmail,
    pickupAddress,
    dropoffAddress,
    passengerCount: form.passengerCount,
    notes: form.notes || null,
    amountCharged: null,
    amountReceived: null,
    cancelToken: createCancelToken(),
  });

  await sendBookingConfirmation(booking);

  return NextResponse.json({
    booking,
    message: siteSettings.messageBookingSuccess,
  });
}

export async function PATCH(request: Request) {
  ensureDb();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const token = data.cancelToken;
  const action = data.action;

  if (typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const existing = getBookingByToken(token);
  if (!existing) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (action === 'cancel') {
    const updated = updateBooking(existing.id, { status: 'cancelled' });
    return NextResponse.json({ booking: updated });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
