/** US state and DC codes for the booking form. */
export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY',
] as const;

export type UsStateCode = (typeof US_STATE_CODES)[number];

export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type AddressVerifyStatus = 'matched' | 'unmatched' | 'unavailable';

export type AddressVerifyResult = {
  status: AddressVerifyStatus;
  formatted: string;
};

const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;
const STATE_SET = new Set<string>(US_STATE_CODES);
const CENSUS_GEOCODER =
  'https://geocoding.geo.census.gov/geocoder/locations/address';
const VERIFY_TIMEOUT_MS = 15000;

type CensusAddressComponents = {
  zip?: string;
  city?: string;
  state?: string;
};

type CensusMatch = {
  matchedAddress?: string;
  addressComponents?: CensusAddressComponents;
};

type CensusResponse = {
  result?: {
    addressMatches?: CensusMatch[];
  };
};

/**
 * Normalize and validate street, city, 2-letter state, and ZIP.
 */
export function parseAddressParts(raw: unknown): AddressParts | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  if (
    typeof data.street !== 'string' ||
    typeof data.city !== 'string' ||
    typeof data.state !== 'string' ||
    typeof data.zip !== 'string'
  ) {
    return null;
  }

  const street = data.street.trim();
  const city = data.city.trim();
  const state = data.state.trim().toUpperCase();
  const zip = data.zip.trim().replace(/\s+/g, '');

  if (!street || !city || !STATE_SET.has(state) || !ZIP_PATTERN.test(zip)) {
    return null;
  }

  return { street, city, state, zip };
}

/**
 * Single-line address for storage, email, and Apple Maps.
 */
export function formatAddress(parts: AddressParts): string {
  return `${parts.street}, ${parts.city}, ${parts.state} ${parts.zip}`;
}

/**
 * Split a stored `street, City, ST ZIP` line back into form fields.
 * If the line does not match, the whole value goes in street.
 */
export function splitStoredAddress(line: string): AddressParts {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^(.*),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
  );
  if (!match) {
    return { street: trimmed, city: '', state: 'SC', zip: '' };
  }

  const state = match[3].toUpperCase();
  return {
    street: match[1].trim(),
    city: match[2].trim(),
    state: STATE_SET.has(state) ? state : 'SC',
    zip: match[4],
  };
}

function titleCaseCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function formatMatchedAddress(
  parts: AddressParts,
  match: CensusMatch
): string {
  const components = match.addressComponents;
  const city = components?.city
    ? titleCaseCity(components.city)
    : parts.city;
  const state = components?.state
    ? components.state.toUpperCase()
    : parts.state;
  const zip5 = components?.zip?.replace(/\D/g, '').slice(0, 5);
  let zip = parts.zip;
  if (zip5 && !parts.zip.startsWith(zip5)) {
    zip = zip5;
  }

  return `${parts.street}, ${city}, ${state} ${zip}`;
}

/**
 * Verify unless the customer chose Use this address anyway.
 * Census outages pass through the typed-in full address.
 */
export async function resolveBookingAddress(
  parts: AddressParts,
  allowUnverified: boolean
): Promise<{ ok: true; formatted: string } | { ok: false; formatted: string }> {
  if (allowUnverified) {
    return { ok: true, formatted: formatAddress(parts) };
  }

  const result = await verifyUsAddress(parts);
  if (result.status === 'unmatched') {
    return { ok: false, formatted: result.formatted };
  }

  return { ok: true, formatted: result.formatted };
}

/**
 * Confirm a US address via the Census Bureau geocoder (no API key).
 * On timeout or HTTP failure, status is `unavailable` so booking can continue.
 */
export async function verifyUsAddress(
  parts: AddressParts
): Promise<AddressVerifyResult> {
  const formatted = formatAddress(parts);
  const params = new URLSearchParams({
    street: parts.street,
    city: parts.city,
    state: parts.state,
    zip: parts.zip.slice(0, 5),
    benchmark: 'Public_AR_Current',
    format: 'json',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(`${CENSUS_GEOCODER}?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Bob-n-Pam-Drive/0.1 (address verification)',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { status: 'unavailable', formatted };
    }

    const body = (await response.json()) as CensusResponse;
    const match = body.result?.addressMatches?.[0];
    if (!match) {
      return { status: 'unmatched', formatted };
    }

    return {
      status: 'matched',
      formatted: formatMatchedAddress(parts, match),
    };
  } catch {
    return { status: 'unavailable', formatted };
  } finally {
    clearTimeout(timer);
  }
}
