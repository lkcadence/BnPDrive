import { NextResponse } from 'next/server';
import { clearDriverSession } from '@/lib/auth/session';

export async function POST() {
  await clearDriverSession();
  return NextResponse.json({ ok: true });
}
