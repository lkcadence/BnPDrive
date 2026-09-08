import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getDrivers } from '@/lib/db';

const COOKIE_NAME = 'bnp_driver_session';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

/**
 * Verify password and return the matching driver ID, or null on failure.
 * Checks per-driver passwords first (BOB_PASSWORD, PAM_PASSWORD),
 * then falls back to the shared DRIVER_PASSWORD for backwards compat.
 */
export async function verifyDriverPassword(
  password: string
): Promise<number | null> {
  const drivers = getDrivers();

  for (const driver of drivers) {
    const envKey = `${driver.firstName.toUpperCase()}_PASSWORD`;
    const envVal = process.env[envKey];
    if (envVal && password === envVal) {
      return driver.id;
    }
  }

  // Fallback: shared password (returns first driver — legacy compat)
  const hash = process.env.DRIVER_PASSWORD_HASH;
  if (hash) {
    const ok = await bcrypt.compare(password, hash);
    if (ok) return drivers[0]?.id ?? null;
  }

  const plain = process.env.DRIVER_PASSWORD || 'changeme';
  if (password === plain) {
    return drivers[0]?.id ?? null;
  }

  return null;
}

/**
 * Create a session cookie that stores the authenticated driver's ID.
 */
export async function createDriverSession(driverId: number): Promise<void> {
  const token = await new SignJWT({ role: 'driver', driverId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearDriverSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isDriverAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the logged-in driver's ID from the session, or null.
 */
export async function getDriverIdFromSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = (payload as Record<string, unknown>).driverId;
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}

export async function requireDriverAuth(): Promise<boolean> {
  return isDriverAuthenticated();
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
