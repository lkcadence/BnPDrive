export const DEFAULT_MESSAGE_BACKGROUND = '#FFF4CC';

export const DEFAULT_CUSTOMER_MESSAGES = {
  messageBackgroundColor: DEFAULT_MESSAGE_BACKGROUND,
  messageBookingSuccess:
    'We\u2019ll call to confirm. Check your email for a change/cancel link.',
  messageAsapInfo:
    'ASAP sends an urgent request to whoever is on duty. If no one is available, ' +
    'we\u2019ll ask you to pick a later slot or call us.',
  messageBookingHint: 'Tap an open time \u2014 your form appears right here.',
  messageFooterNote: 'No online payments \u2014 we\u2019ll call to confirm your ride.',
  messageSlotUnavailable:
    'That time slot is no longer available. Please pick another.',
  messageSelectSlot: 'Please select an open time slot.',
  messageAsapNoDriver:
    'No driver is on duty right now. Please pick a later slot or call us.',
  messageAsapNoSlot:
    'No open slots are available soon. Please pick a later time or call us.',
  messageCancelSuccess: 'Your booking has been cancelled.',
  messageChangeByPhone:
    'Need to change details? Please call us \u2014 we\u2019ll confirm by phone.',
} as const;

export type CustomerMessageSettings = typeof DEFAULT_CUSTOMER_MESSAGES;
