import type { Booking } from '@/lib/db';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendViaResend(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  return response.ok;
}

async function deliver(payload: EmailPayload): Promise<void> {
  const sent = await sendViaResend(payload);

  if (!sent) {
    console.log('[email]', payload.subject);
    console.log('[email] to:', payload.to);
    console.log('[email] text:', payload.text);
  }
}

function appUrl(): string {
  return process.env.APP_URL || 'http://localhost:3001';
}

export async function sendBookingConfirmation(booking: Booking): Promise<void> {
  if (!booking.customerEmail.trim()) {
    return;
  }

  const cancelUrl = `${appUrl()}/book/cancel/${booking.cancelToken}`;
  const subject = 'Bob-n-Pam Drive — booking received';
  const text = [
    `Hi ${booking.customerName},`,
    '',
    'We received your ride request. We will call to confirm.',
    '',
    `Pickup: ${booking.pickupAddress}`,
    `Drop-off: ${booking.dropoffAddress}`,
    `Start: ${new Date(booking.startAt).toLocaleString('en-US')}`,
    '',
    `Change or cancel: ${cancelUrl}`,
  ].join('\n');

  await deliver({
    to: booking.customerEmail,
    subject,
    html: text.replace(/\n/g, '<br>'),
    text,
  });
}

/**
 * Sent to the customer when a driver confirms their ride.
 */
export async function sendRideConfirmed(
  booking: Booking,
  driverName: string
): Promise<void> {
  if (!booking.customerEmail.trim()) {
    return;
  }

  const cancelUrl = `${appUrl()}/book/cancel/${booking.cancelToken}`;
  const subject = 'Bob-n-Pam Drive — your ride is confirmed!';
  const text = [
    `Hi ${booking.customerName},`,
    '',
    `Great news — ${driverName} has confirmed your ride!`,
    '',
    `When: ${new Date(booking.startAt).toLocaleString('en-US')}`,
    `Pickup: ${booking.pickupAddress}`,
    `Drop-off: ${booking.dropoffAddress}`,
    '',
    `${driverName} will be your driver. If anything changes, ` +
      'please call us or use the link below.',
    '',
    `Change or cancel: ${cancelUrl}`,
    '',
    'See you soon!',
    'Bob-n-Pam Drive',
  ].join('\n');

  await deliver({
    to: booking.customerEmail,
    subject,
    html: text.replace(/\n/g, '<br>'),
    text,
  });
}

/**
 * Sent to the customer when a driver declines their ride.
 */
export async function sendRideDeclined(booking: Booking): Promise<void> {
  if (!booking.customerEmail.trim()) {
    return;
  }

  const bookingUrl = appUrl();
  const subject = 'Bob-n-Pam Drive — ride update';
  const text = [
    `Hi ${booking.customerName},`,
    '',
    'Unfortunately, we are unable to take this ride at the requested time.',
    '',
    `Original time: ${new Date(booking.startAt).toLocaleString('en-US')}`,
    `Pickup: ${booking.pickupAddress}`,
    `Drop-off: ${booking.dropoffAddress}`,
    '',
    'We apologize for the inconvenience. Please book another time or call us ' +
      'and we will do our best to help.',
    '',
    `Book again: ${bookingUrl}`,
    '',
    'Thank you,',
    'Bob-n-Pam Drive',
  ].join('\n');

  await deliver({
    to: booking.customerEmail,
    subject,
    html: text.replace(/\n/g, '<br>'),
    text,
  });
}

export async function sendAsapAlert(booking: Booking): Promise<void> {
  const alertEmail = process.env.DRIVER_ALERT_EMAIL;
  if (!alertEmail) {
    return;
  }

  const subject = 'URGENT: ASAP ride request';
  const text = [
    'ASAP ride request',
    '',
    `${booking.customerName} — ${booking.customerPhone}`,
    `Pickup: ${booking.pickupAddress}`,
    `Drop-off: ${booking.dropoffAddress}`,
    `Notes: ${booking.notes || 'None'}`,
  ].join('\n');

  await deliver({
    to: alertEmail,
    subject,
    html: text.replace(/\n/g, '<br>'),
    text,
  });
}
