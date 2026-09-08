import { NextResponse } from 'next/server';
import { getDriverIdFromSession } from '@/lib/auth/session';
import { getDriverById } from '@/lib/db';
import { ensureDb } from '@/lib/init';

/** Return the currently logged-in driver's id and name. */
export async function GET() {
  ensureDb();

  const driverId = await getDriverIdFromSession();
  if (!driverId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const driver = getDriverById(driverId);
  if (!driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  return NextResponse.json({
    driverId: driver.id,
    firstName: driver.firstName,
  });
}
