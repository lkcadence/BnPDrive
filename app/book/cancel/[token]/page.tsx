'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CustomerNotice from '@/components/CustomerNotice';
import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_MESSAGE_BACKGROUND,
} from '@/lib/customer-messages';

type Booking = {
  id: number;
  status: string;
  startAt: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  tripType: string;
  cancelToken: string;
};

type PageSettings = {
  messageBackgroundColor: string;
  messageCancelSuccess: string;
  messageChangeByPhone: string;
};

export default function CancelBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function loadBooking() {
      const response = await fetch(`/api/bookings/cancel/${token}`);
      if (!response.ok) {
        setError('Booking not found.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setBooking(data.booking);
      setPageSettings({
        messageBackgroundColor:
          data.settings?.messageBackgroundColor ||
          DEFAULT_MESSAGE_BACKGROUND,
        messageCancelSuccess:
          data.settings?.messageCancelSuccess ||
          DEFAULT_CUSTOMER_MESSAGES.messageCancelSuccess,
        messageChangeByPhone:
          data.settings?.messageChangeByPhone ||
          DEFAULT_CUSTOMER_MESSAGES.messageChangeByPhone,
      });
      setLoading(false);
    }

    loadBooking();
  }, [token]);

  async function cancelBooking() {
    if (!booking || !pageSettings) {
      return;
    }

    const response = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelToken: booking.cancelToken, action: 'cancel' }),
    });

    if (!response.ok) {
      setError('Could not cancel booking.');
      return;
    }

    setMessage(pageSettings.messageCancelSuccess);
    setBooking({ ...booking, status: 'cancelled' });
  }

  const noticeBackground =
    pageSettings?.messageBackgroundColor || DEFAULT_MESSAGE_BACKGROUND;

  if (loading) {
    return (
      <main className="container page-stack">
        <p>Loading booking…</p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="container page-stack">
        <CustomerNotice backgroundColor={noticeBackground} className="customer-notice--error">
          {error || 'Booking not found.'}
        </CustomerNotice>
      </main>
    );
  }

  return (
    <main className="container page-stack">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Your booking</h1>
        {message && (
          <CustomerNotice
            backgroundColor={noticeBackground}
            className="customer-notice--success"
          >
            {message}
          </CustomerNotice>
        )}

        <p>
          <strong>{booking.customerName}</strong>
          <br />
          {new Date(booking.startAt).toLocaleString('en-US')}
          <br />
          {booking.pickupAddress} → {booking.dropoffAddress}
          <br />
          Status: {booking.status}
        </p>

        {booking.status !== 'cancelled' && (
          <button type="button" className="btn btn-danger" onClick={cancelBooking}>
            Cancel booking
          </button>
        )}

        <CustomerNotice
          backgroundColor={noticeBackground}
          className="site-footer-notice customer-notice--spaced"
        >
          {pageSettings?.messageChangeByPhone ||
            DEFAULT_CUSTOMER_MESSAGES.messageChangeByPhone}
        </CustomerNotice>
      </section>
    </main>
  );
}
