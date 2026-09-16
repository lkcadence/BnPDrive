import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { getOpenSlots } from '@/lib/slots';
import { ensureDb } from '@/lib/init';

export const dynamic = 'force-dynamic';

export async function GET() {
  ensureDb();

  return NextResponse.json(
    {
      settings: getSettings(),
      days: getOpenSlots(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
