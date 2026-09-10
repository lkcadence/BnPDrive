import { randomBytes } from 'crypto';
import {
  formatAddress,
  parseAddressParts,
  type AddressParts,
} from '@/lib/address';

export function createCancelToken(): string {
  return randomBytes(24).toString('hex');
}

export type BookingFormInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
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
