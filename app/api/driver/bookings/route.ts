import { NextResponse } from 'next/server';
import { getAllBookings, getDriverById, getDriverMoneyTotals } from '@/lib/db';
import { ensureDb } from '@/lib/init';

export async function GET() {
  ensureDb();

  const bookings = getAllBookings().map((booking) => {
    const driver = getDriverById(booking.driverId);
    return {
      ...booking,
      driverName: driver?.firstName ?? 'Driver',
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
