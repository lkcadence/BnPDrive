import { NextResponse } from 'next/server';
import {
  createDriverSession,
  verifyDriverPassword,
} from '@/lib/auth/session';
import { ensureDb } from '@/lib/init';

export async function POST(request: Request) {
  ensureDb();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const password = (body as Record<string, unknown>).password;
  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  const driverId = await verifyDriverPassword(password);
  if (driverId === null) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  await createDriverSession(driverId);
  return NextResponse.json({ ok: true });
}
