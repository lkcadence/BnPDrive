import { NextResponse } from 'next/server';
import { getFaresByMonth } from '@/lib/db';
import { ensureDb } from '@/lib/init';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/driver/reports/fares-by-month?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request: Request) {
  ensureDb();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: 'from and to must be YYYY-MM-DD' },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json(
      { error: 'from must be on or before to' },
      { status: 400 }
    );
  }

  const rows = getFaresByMonth(from, to);

  return NextResponse.json(
    { from, to, rows },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
