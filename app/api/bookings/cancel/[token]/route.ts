import { NextResponse } from 'next/server';
import { getBookingByToken, getSettings } from '@/lib/db';
import { ensureDb } from '@/lib/init';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  ensureDb();

  const { token } = await context.params;
  const booking = getBookingByToken(token);

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    booking,
    settings: getSettings(),
  });
}
