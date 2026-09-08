import { getDb, seedIfEmpty } from '@/lib/db';

let initialized = false;

export function ensureDb(): void {
  if (initialized) {
    return;
  }

  getDb();
  seedIfEmpty();
  initialized = true;
}
