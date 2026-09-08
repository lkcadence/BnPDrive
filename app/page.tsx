import CustomerBookingPage from '@/components/CustomerBookingPage';
import { getSettings } from '@/lib/db';
import { ensureDb } from '@/lib/init';
import { getOpenSlots } from '@/lib/slots';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  ensureDb();

  return (
    <CustomerBookingPage
      initialSettings={getSettings()}
      initialDays={getOpenSlots()}
    />
  );
}
