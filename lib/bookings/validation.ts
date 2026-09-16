import { randomBytes } from 'crypto';
import {
  formatAddress,
  parseAddressParts,
  type AddressParts,
} from '@/lib/address';

export function createCancelToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Trim a string field; missing or non-string values become empty.
 */
function optionalTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export type BookingFormInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  airlineName: string;
  flightNumberFrom: string;
  flightNumberTo: string;
  pickupParts: AddressParts;
  dropoffParts: AddressParts;
  pickupAddress: string;
  dropoffAddress: string;
  passengerCount: number;
  tripType: 'airport' | 'medical' | 'school' | 'other';
  notes?: string;
  allowUnverifiedPickup: boolean;
  allowUnverifiedDropoff: boolean;
};

export type ValidateBookingResult =
  | { ok: true; form: BookingFormInput }
  | { ok: false; message: string };

export type DriverBookingFormInput = {
  customerName: string;
  customerPhone: string;
  pickupParts: AddressParts;
  dropoffParts: AddressParts;
  pickupAddress: string;
  dropoffAddress: string;
  allowUnverifiedPickup: boolean;
  allowUnverifiedDropoff: boolean;
};

export type ValidateDriverBookingResult =
  | { ok: true; form: DriverBookingFormInput }
  | { ok: false; message: string };

export type DriverRideEditInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  airlineName: string;
  flightNumberFrom: string;
  flightNumberTo: string;
  pickupParts: AddressParts;
  dropoffParts: AddressParts;
  passengerCount: number;
  tripType: 'airport' | 'medical' | 'school' | 'other';
  notes: string;
  allowUnverifiedPickup: boolean;
  allowUnverifiedDropoff: boolean;
  driverId: number | null;
  startAt: string | null;
};

export type ValidateDriverRideEditResult =
  | { ok: true; form: DriverRideEditInput }
  | { ok: false; message: string };

/**
 * Parse booking JSON: contact fields plus nested pickup/drop-off parts.
 */
export function validateBookingInput(body: unknown): ValidateBookingResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid booking fields' };
  }

  const data = body as Record<string, unknown>;
  const tripType = data.tripType;
  const pickupParts = parseAddressParts(data.pickup);
  const dropoffParts = parseAddressParts(data.dropoff);

  if (
    typeof data.customerName !== 'string' ||
    typeof data.customerPhone !== 'string' ||
    typeof data.customerEmail !== 'string' ||
    typeof data.passengerCount !== 'number' ||
    !['airport', 'medical', 'school', 'other'].includes(String(tripType))
  ) {
    return { ok: false, message: 'Invalid booking fields' };
  }

  if (
    !data.customerName.trim() ||
    !data.customerPhone.trim() ||
    !data.customerEmail.trim() ||
    data.passengerCount < 1
  ) {
    return { ok: false, message: 'Invalid booking fields' };
  }

  if (!pickupParts && !dropoffParts) {
    return {
      ok: false,
      message: 'Pickup and drop-off need a street, city, state, and ZIP.',
    };
  }
  if (!pickupParts) {
    return {
      ok: false,
      message: 'Pickup needs a street, city, state, and ZIP.',
    };
  }
  if (!dropoffParts) {
    return {
      ok: false,
      message: 'Drop-off needs a street, city, state, and ZIP.',
    };
  }

  return {
    ok: true,
    form: {
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail.trim(),
      airlineName: optionalTrimmed(data.airlineName),
      flightNumberFrom: optionalTrimmed(data.flightNumberFrom),
      flightNumberTo: optionalTrimmed(data.flightNumberTo),
      pickupParts,
      dropoffParts,
      pickupAddress: formatAddress(pickupParts),
      dropoffAddress: formatAddress(dropoffParts),
      passengerCount: Math.floor(data.passengerCount),
      tripType: tripType as BookingFormInput['tripType'],
      notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
      allowUnverifiedPickup: data.allowUnverifiedPickup === true,
      allowUnverifiedDropoff: data.allowUnverifiedDropoff === true,
    },
  };
}

/**
 * Parse a driver-created ride: name and full From/To addresses.
 * Phone is optional; email, passengers, and trip type are not collected.
 */
export function validateDriverBookingInput(
  body: unknown
): ValidateDriverBookingResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid booking fields' };
  }

  const data = body as Record<string, unknown>;
  const pickupParts = parseAddressParts(data.pickup);
  const dropoffParts = parseAddressParts(data.dropoff);
  const phone =
    typeof data.customerPhone === 'string' ? data.customerPhone.trim() : '';

  if (typeof data.customerName !== 'string' || !data.customerName.trim()) {
    return { ok: false, message: 'Name is required.' };
  }

  if (!pickupParts && !dropoffParts) {
    return {
      ok: false,
      message: 'From and To need a street, city, state, and ZIP.',
    };
  }
  if (!pickupParts) {
    return {
      ok: false,
      message: 'From needs a street, city, state, and ZIP.',
    };
  }
  if (!dropoffParts) {
    return {
      ok: false,
      message: 'To needs a street, city, state, and ZIP.',
    };
  }

  return {
    ok: true,
    form: {
      customerName: data.customerName.trim(),
      customerPhone: phone,
      pickupParts,
      dropoffParts,
      pickupAddress: formatAddress(pickupParts),
      dropoffAddress: formatAddress(dropoffParts),
      allowUnverifiedPickup: data.allowUnverifiedPickup === true,
      allowUnverifiedDropoff: data.allowUnverifiedDropoff === true,
    },
  };
}

/**
 * Parse a driver ride edit: contact, flight, addresses, and trip details.
 * Phone and email are optional (phone-in rides may have neither).
 */
export function validateDriverRideEdit(
  body: unknown
): ValidateDriverRideEditResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid booking fields' };
  }

  const data = body as Record<string, unknown>;
  const pickupParts = parseAddressParts(data.pickup);
  const dropoffParts = parseAddressParts(data.dropoff);
  const tripType = data.tripType;
  const passengerCount = Number(data.passengerCount);

  if (typeof data.customerName !== 'string' || !data.customerName.trim()) {
    return { ok: false, message: 'Name is required.' };
  }

  if (!['airport', 'medical', 'school', 'other'].includes(String(tripType))) {
    return { ok: false, message: 'Pick a trip type.' };
  }

  if (!Number.isFinite(passengerCount) || passengerCount < 1) {
    return { ok: false, message: 'Passengers must be at least 1.' };
  }

  if (!pickupParts) {
    return {
      ok: false,
      message: 'From needs a street, city, state, and ZIP.',
    };
  }
  if (!dropoffParts) {
    return {
      ok: false,
      message: 'To needs a street, city, state, and ZIP.',
    };
  }

  let startAt: string | null = null;
  if (typeof data.startAt === 'string' && data.startAt.trim()) {
    const parsed = new Date(data.startAt);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, message: 'Invalid date and time.' };
    }
    startAt = parsed.toISOString();
  }

  const driverIdRaw = data.driverId;
  const driverId =
    typeof driverIdRaw === 'number' && driverIdRaw > 0
      ? Math.floor(driverIdRaw)
      : null;

  return {
    ok: true,
    form: {
      customerName: data.customerName.trim(),
      customerPhone: optionalTrimmed(data.customerPhone),
      customerEmail: optionalTrimmed(data.customerEmail),
      airlineName: optionalTrimmed(data.airlineName),
      flightNumberFrom: optionalTrimmed(data.flightNumberFrom),
      flightNumberTo: optionalTrimmed(data.flightNumberTo),
      pickupParts,
      dropoffParts,
      passengerCount: Math.floor(passengerCount),
      tripType: tripType as DriverRideEditInput['tripType'],
      notes: optionalTrimmed(data.notes),
      allowUnverifiedPickup: data.allowUnverifiedPickup === true,
      allowUnverifiedDropoff: data.allowUnverifiedDropoff === true,
      driverId,
      startAt,
    },
  };
}
