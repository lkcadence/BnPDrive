import { NextResponse } from 'next/server';
import {
  getAllBookings,
  getDriverById,
  getDriverMoneyTotals,
  insertBooking,
} from '@/lib/db';
import { resolveBookingAddress } from '@/lib/address';
import { createCancelToken, validateDriverBookingInput } from '@/lib/bookings/validation';
import { computeHoldEnd, isOpenSlot } from '@/lib/slots';
import { ensureDb } from '@/lib/init';

export async function GET() {
  ensureDb();

  const bookings = getAllBookings().map((booking) => {
    const driver =
      booking.driverId !== null ? getDriverById(booking.driverId) : null;
    return {
      ...booking,
      driverName: driver?.firstName ?? 'Unassigned',
    };
  });

  return NextResponse.json(
    {
      bookings,
      driverTotals: getDriverMoneyTotals(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Create a phone-in ride from the driver board (confirmed; open slots only).
 */
export async function POST(request: Request) {
  ensureDb();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = validateDriverBookingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }
  const form = parsed.form;
  const data = body as Record<string, unknown>;

  const driverId = Number(data.driverId);
  const startAtRaw = data.startAt;
  if (!driverId || typeof startAtRaw !== 'string') {
    return NextResponse.json({ error: 'Pick a driver and time.' }, { status: 400 });
  }

  const driver = getDriverById(driverId);
  if (!driver) {
    return NextResponse.json({ error: 'Invalid driver' }, { status: 400 });
  }

  const startAt = new Date(startAtRaw);
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
  }

  if (!isOpenSlot(driverId, startAtRaw)) {
    return NextResponse.json(
      {
        error: 'slot_unavailable',
        message: 'That time is no longer open. Pick another slot.',
      },
      { status: 409 }
    );
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

  const holdEndAt = computeHoldEnd(startAt, 'other');

  const booking = insertBooking({
    driverId,
    status: 'confirmed',
    bookingType: 'slot',
    tripType: 'other',
    startAt: startAt.toISOString(),
    holdEndAt: holdEndAt.toISOString(),
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    customerEmail: '',
    airlineName: '',
    flightNumberFrom: '',
    flightNumberTo: '',
    pickupAddress: pickupResolved.formatted,
    dropoffAddress: dropoffResolved.formatted,
    passengerCount: 1,
    notes: null,
    amountCharged: null,
    amountReceived: null,
    cancelToken: createCancelToken(),
  });

  return NextResponse.json({
    booking,
    message: `Ride added for ${driver.firstName}.`,
  });
}
