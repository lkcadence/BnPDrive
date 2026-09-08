import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DEFAULT_CUSTOMER_MESSAGES } from '@/lib/customer-messages';

const defaultPath = path.join(process.cwd(), 'data', 'bnp-drive.db');

function getDbPath(): string {
  return process.env.SQLITE_PATH || defaultPath;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

const DEFAULT_SUBTITLE =
  'Friendly rides across South Carolina — mostly airport runs, plus medical, ' +
  'school, and local trips. Schedule ahead or book same-day.';

export const DEFAULT_CALENDAR_EVENT_COLOR = '#1a73e8';

function columnExists(database: Database.Database, table: string, column: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function addSettingsTextColumn(
  database: Database.Database,
  column: string,
  defaultValue: string
): void {
  if (columnExists(database, 'settings', column)) {
    return;
  }

  database.exec(`ALTER TABLE settings ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
  database
    .prepare(`UPDATE settings SET ${column} = @value WHERE ${column} = ''`)
    .run({ value: defaultValue });
}

function migrateSchema(database: Database.Database): void {
  if (!columnExists(database, 'settings', 'banner_subtitle')) {
    database.exec(
      `ALTER TABLE settings ADD COLUMN banner_subtitle TEXT NOT NULL DEFAULT ''`
    );
    database
      .prepare(
        `UPDATE settings SET banner_subtitle = @subtitle WHERE banner_subtitle = ''`
      )
      .run({ subtitle: DEFAULT_SUBTITLE });
  }

  addSettingsTextColumn(
    database,
    'message_background_color',
    DEFAULT_CUSTOMER_MESSAGES.messageBackgroundColor
  );
  addSettingsTextColumn(
    database,
    'message_booking_success',
    DEFAULT_CUSTOMER_MESSAGES.messageBookingSuccess
  );
  addSettingsTextColumn(database, 'message_asap_info', DEFAULT_CUSTOMER_MESSAGES.messageAsapInfo);
  addSettingsTextColumn(
    database,
    'message_booking_hint',
    DEFAULT_CUSTOMER_MESSAGES.messageBookingHint
  );
  addSettingsTextColumn(
    database,
    'message_footer_note',
    DEFAULT_CUSTOMER_MESSAGES.messageFooterNote
  );
  addSettingsTextColumn(
    database,
    'message_slot_unavailable',
    DEFAULT_CUSTOMER_MESSAGES.messageSlotUnavailable
  );
  addSettingsTextColumn(
    database,
    'message_select_slot',
    DEFAULT_CUSTOMER_MESSAGES.messageSelectSlot
  );
  addSettingsTextColumn(
    database,
    'message_asap_no_driver',
    DEFAULT_CUSTOMER_MESSAGES.messageAsapNoDriver
  );
  addSettingsTextColumn(
    database,
    'message_asap_no_slot',
    DEFAULT_CUSTOMER_MESSAGES.messageAsapNoSlot
  );
  addSettingsTextColumn(
    database,
    'message_cancel_success',
    DEFAULT_CUSTOMER_MESSAGES.messageCancelSuccess
  );
  addSettingsTextColumn(
    database,
    'message_change_by_phone',
    DEFAULT_CUSTOMER_MESSAGES.messageChangeByPhone
  );
  addSettingsTextColumn(
    database,
    'calendar_event_color',
    DEFAULT_CALENDAR_EVENT_COLOR
  );

  if (!columnExists(database, 'bookings', 'amount_charged')) {
    database.exec('ALTER TABLE bookings ADD COLUMN amount_charged REAL');
  }

  if (!columnExists(database, 'bookings', 'amount_received')) {
    database.exec('ALTER TABLE bookings ADD COLUMN amount_received REAL');
  }
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availability_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL REFERENCES drivers(id),
      status TEXT NOT NULL CHECK (status IN (
        'pending', 'confirmed', 'done', 'no_show', 'cancelled', 'declined'
      )),
      booking_type TEXT NOT NULL CHECK (booking_type IN ('slot', 'asap')),
      trip_type TEXT NOT NULL CHECK (trip_type IN ('airport', 'medical', 'school', 'other')),
      start_at TEXT NOT NULL,
      hold_end_at TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      dropoff_address TEXT NOT NULL,
      passenger_count INTEGER NOT NULL,
      notes TEXT,
      cancel_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT NOT NULL,
      banner_color TEXT NOT NULL,
      booking_window_days INTEGER NOT NULL DEFAULT 14
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_driver_status
      ON bookings(driver_id, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_hold
      ON bookings(start_at, hold_end_at);
    CREATE INDEX IF NOT EXISTS idx_availability_driver
      ON availability(driver_id, day_of_week);
  `);
  migrateSchema(database);
}

export type Driver = {
  id: number;
  firstName: string;
  phone: string | null;
};

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'done'
  | 'no_show'
  | 'cancelled'
  | 'declined';

export type BookingType = 'slot' | 'asap';
export type TripType = 'airport' | 'medical' | 'school' | 'other';

export type Booking = {
  id: number;
  driverId: number;
  status: BookingStatus;
  bookingType: BookingType;
  tripType: TripType;
  startAt: string;
  holdEndAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupAddress: string;
  dropoffAddress: string;
  passengerCount: number;
  notes: string | null;
  amountCharged: number | null;
  amountReceived: number | null;
  cancelToken: string;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  businessName: string;
  bannerSubtitle: string;
  bannerColor: string;
  bookingWindowDays: number;
  calendarEventColor: string;
  messageBackgroundColor: string;
  messageBookingSuccess: string;
  messageAsapInfo: string;
  messageBookingHint: string;
  messageFooterNote: string;
  messageSlotUnavailable: string;
  messageSelectSlot: string;
  messageAsapNoDriver: string;
  messageAsapNoSlot: string;
  messageCancelSuccess: string;
  messageChangeByPhone: string;
};

export type DriverMoneyTotal = {
  driverId: number;
  driverName: string;
  rideCount: number;
  totalCharged: number;
  totalReceived: number;
  totalTips: number;
};

export type FaresByMonthRow = {
  monthKey: string;
  monthLabel: string;
  driverId: number;
  driverName: string;
  rideCount: number;
  totalCharged: number;
  totalReceived: number;
  totalTips: number;
};

export type MonthlyRideDestinationRow = {
  id: number;
  monthKey: string;
  monthLabel: string;
  startAt: string;
  driverId: number;
  driverName: string;
  customerName: string;
  tripType: TripType;
  pickupAddress: string;
  dropoffAddress: string;
  status: BookingStatus;
  passengerCount: number;
};

export type AvailabilityRow = {
  id: number;
  driverId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type AvailabilityException = {
  id: number;
  driverId: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
};

function mapDriver(row: Record<string, unknown>): Driver {
  return {
    id: row.id as number,
    firstName: row.first_name as string,
    phone: (row.phone as string | null) ?? null,
  };
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as number,
    driverId: row.driver_id as number,
    status: row.status as BookingStatus,
    bookingType: row.booking_type as BookingType,
    tripType: row.trip_type as TripType,
    startAt: row.start_at as string,
    holdEndAt: row.hold_end_at as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: row.customer_email as string,
    pickupAddress: row.pickup_address as string,
    dropoffAddress: row.dropoff_address as string,
    passengerCount: row.passenger_count as number,
    notes: (row.notes as string | null) ?? null,
    amountCharged: (row.amount_charged as number | null) ?? null,
    amountReceived: (row.amount_received as number | null) ?? null,
    cancelToken: row.cancel_token as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function getSettings(): Settings {
  const database = getDb();
  const row = database.prepare('SELECT * FROM settings WHERE id = 1').get() as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    return {
      businessName: 'Bob-n-Pam Drive',
      bannerSubtitle: DEFAULT_SUBTITLE,
      bannerColor: '#87CEEB',
      bookingWindowDays: 14,
      calendarEventColor: DEFAULT_CALENDAR_EVENT_COLOR,
      ...DEFAULT_CUSTOMER_MESSAGES,
    };
  }

  return {
    businessName: row.business_name as string,
    bannerSubtitle: (row.banner_subtitle as string) || DEFAULT_SUBTITLE,
    bannerColor: row.banner_color as string,
    bookingWindowDays: row.booking_window_days as number,
    calendarEventColor:
      (row.calendar_event_color as string) || DEFAULT_CALENDAR_EVENT_COLOR,
    messageBackgroundColor:
      (row.message_background_color as string) ||
      DEFAULT_CUSTOMER_MESSAGES.messageBackgroundColor,
    messageBookingSuccess:
      (row.message_booking_success as string) ||
      DEFAULT_CUSTOMER_MESSAGES.messageBookingSuccess,
    messageAsapInfo:
      (row.message_asap_info as string) || DEFAULT_CUSTOMER_MESSAGES.messageAsapInfo,
    messageBookingHint:
      (row.message_booking_hint as string) || DEFAULT_CUSTOMER_MESSAGES.messageBookingHint,
    messageFooterNote:
      (row.message_footer_note as string) || DEFAULT_CUSTOMER_MESSAGES.messageFooterNote,
    messageSlotUnavailable:
      (row.message_slot_unavailable as string) ||
      DEFAULT_CUSTOMER_MESSAGES.messageSlotUnavailable,
    messageSelectSlot:
      (row.message_select_slot as string) || DEFAULT_CUSTOMER_MESSAGES.messageSelectSlot,
    messageAsapNoDriver:
      (row.message_asap_no_driver as string) || DEFAULT_CUSTOMER_MESSAGES.messageAsapNoDriver,
    messageAsapNoSlot:
      (row.message_asap_no_slot as string) || DEFAULT_CUSTOMER_MESSAGES.messageAsapNoSlot,
    messageCancelSuccess:
      (row.message_cancel_success as string) || DEFAULT_CUSTOMER_MESSAGES.messageCancelSuccess,
    messageChangeByPhone:
      (row.message_change_by_phone as string) ||
      DEFAULT_CUSTOMER_MESSAGES.messageChangeByPhone,
  };
}

export function updateSettings(settings: Partial<Settings>): Settings {
  const database = getDb();
  const current = getSettings();
  const patches = Object.fromEntries(
    Object.entries(settings).filter(([, value]) => value !== undefined)
  ) as Partial<Settings>;
  const next = { ...current, ...patches };

  database
    .prepare(
      `INSERT INTO settings (
        id, business_name, banner_subtitle, banner_color, booking_window_days,
        calendar_event_color, message_background_color, message_booking_success,
        message_asap_info, message_booking_hint, message_footer_note,
        message_slot_unavailable, message_select_slot, message_asap_no_driver,
        message_asap_no_slot, message_cancel_success, message_change_by_phone
      ) VALUES (
        1, @businessName, @bannerSubtitle, @bannerColor, @bookingWindowDays,
        @calendarEventColor, @messageBackgroundColor, @messageBookingSuccess,
        @messageAsapInfo, @messageBookingHint, @messageFooterNote,
        @messageSlotUnavailable, @messageSelectSlot, @messageAsapNoDriver,
        @messageAsapNoSlot, @messageCancelSuccess, @messageChangeByPhone
      )
       ON CONFLICT(id) DO UPDATE SET
         business_name = excluded.business_name,
         banner_subtitle = excluded.banner_subtitle,
         banner_color = excluded.banner_color,
         booking_window_days = excluded.booking_window_days,
         calendar_event_color = excluded.calendar_event_color,
         message_background_color = excluded.message_background_color,
         message_booking_success = excluded.message_booking_success,
         message_asap_info = excluded.message_asap_info,
         message_booking_hint = excluded.message_booking_hint,
         message_footer_note = excluded.message_footer_note,
         message_slot_unavailable = excluded.message_slot_unavailable,
         message_select_slot = excluded.message_select_slot,
         message_asap_no_driver = excluded.message_asap_no_driver,
         message_asap_no_slot = excluded.message_asap_no_slot,
         message_cancel_success = excluded.message_cancel_success,
         message_change_by_phone = excluded.message_change_by_phone`
    )
    .run({
      businessName: next.businessName,
      bannerSubtitle: next.bannerSubtitle,
      bannerColor: next.bannerColor,
      bookingWindowDays: next.bookingWindowDays,
      calendarEventColor: next.calendarEventColor,
      messageBackgroundColor: next.messageBackgroundColor,
      messageBookingSuccess: next.messageBookingSuccess,
      messageAsapInfo: next.messageAsapInfo,
      messageBookingHint: next.messageBookingHint,
      messageFooterNote: next.messageFooterNote,
      messageSlotUnavailable: next.messageSlotUnavailable,
      messageSelectSlot: next.messageSelectSlot,
      messageAsapNoDriver: next.messageAsapNoDriver,
      messageAsapNoSlot: next.messageAsapNoSlot,
      messageCancelSuccess: next.messageCancelSuccess,
      messageChangeByPhone: next.messageChangeByPhone,
    });

  return next;
}

export function getDrivers(): Driver[] {
  const database = getDb();
  const rows = database
    .prepare('SELECT * FROM drivers ORDER BY id')
    .all() as Record<string, unknown>[];

  return rows.map(mapDriver);
}

export function getDriverById(id: number): Driver | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? mapDriver(row) : null;
}

export function getAvailabilityForDriver(driverId: number): AvailabilityRow[] {
  const database = getDb();
  const rows = database
    .prepare(
      'SELECT * FROM availability WHERE driver_id = ? ORDER BY day_of_week, start_time'
    )
    .all(driverId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    driverId: row.driver_id as number,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
  }));
}

export function setAvailabilityForDriver(
  driverId: number,
  rows: Omit<AvailabilityRow, 'id' | 'driverId'>[]
): void {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare('DELETE FROM availability WHERE driver_id = ?').run(driverId);

    const insert = database.prepare(
      `INSERT INTO availability (driver_id, day_of_week, start_time, end_time)
       VALUES (@driverId, @dayOfWeek, @startTime, @endTime)`
    );

    for (const row of rows) {
      insert.run({
        driverId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
      });
    }
  });

  tx();
}

export function getExceptionsForDriver(driverId: number): AvailabilityException[] {
  const database = getDb();
  const rows = database
    .prepare(
      'SELECT * FROM availability_exceptions WHERE driver_id = ? ORDER BY date'
    )
    .all(driverId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    driverId: row.driver_id as number,
    date: row.date as string,
    startTime: (row.start_time as string | null) ?? null,
    endTime: (row.end_time as string | null) ?? null,
  }));
}

export function addException(
  driverId: number,
  date: string,
  startTime: string | null,
  endTime: string | null
): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO availability_exceptions (driver_id, date, start_time, end_time)
       VALUES (?, ?, ?, ?)`
    )
    .run(driverId, date, startTime, endTime);
}

export function removeException(id: number): void {
  getDb().prepare('DELETE FROM availability_exceptions WHERE id = ?').run(id);
}

export function getActiveBookings(): Booking[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT * FROM bookings
       WHERE status IN ('pending', 'confirmed')
       ORDER BY start_at ASC`
    )
    .all() as Record<string, unknown>[];

  return rows.map(mapBooking);
}

export function getAllBookings(): Booking[] {
  const database = getDb();
  const rows = database
    .prepare('SELECT * FROM bookings ORDER BY start_at DESC')
    .all() as Record<string, unknown>[];

  return rows.map(mapBooking);
}

export function getBookingByToken(token: string): Booking | null {
  const database = getDb();
  const row = database
    .prepare('SELECT * FROM bookings WHERE cancel_token = ?')
    .get(token) as Record<string, unknown> | undefined;

  return row ? mapBooking(row) : null;
}

export function getBookingById(id: number): Booking | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? mapBooking(row) : null;
}

export function insertBooking(
  booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
): Booking {
  const database = getDb();
  const now = new Date().toISOString();

  const result = database
    .prepare(
      `INSERT INTO bookings (
        driver_id, status, booking_type, trip_type, start_at, hold_end_at,
        customer_name, customer_phone, customer_email, pickup_address,
        dropoff_address, passenger_count, notes, cancel_token, created_at, updated_at
      ) VALUES (
        @driverId, @status, @bookingType, @tripType, @startAt, @holdEndAt,
        @customerName, @customerPhone, @customerEmail, @pickupAddress,
        @dropoffAddress, @passengerCount, @notes, @cancelToken, @createdAt, @updatedAt
      )`
    )
    .run({
      ...booking,
      notes: booking.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

  const created = getBookingById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create booking');
  }

  return created;
}

export function updateBooking(
  id: number,
  fields: Partial<
    Pick<
      Booking,
      | 'status'
      | 'holdEndAt'
      | 'startAt'
      | 'tripType'
      | 'notes'
      | 'amountCharged'
      | 'amountReceived'
    >
  >
): Booking | null {
  const database = getDb();
  const existing = getBookingById(id);
  if (!existing) {
    return null;
  }

  const next = {
    status: fields.status ?? existing.status,
    holdEndAt: fields.holdEndAt ?? existing.holdEndAt,
    startAt: fields.startAt ?? existing.startAt,
    tripType: fields.tripType ?? existing.tripType,
    notes: fields.notes !== undefined ? fields.notes : existing.notes,
    amountCharged:
      fields.amountCharged !== undefined ? fields.amountCharged : existing.amountCharged,
    amountReceived:
      fields.amountReceived !== undefined ? fields.amountReceived : existing.amountReceived,
    updatedAt: new Date().toISOString(),
  };

  database
    .prepare(
      `UPDATE bookings SET
        status = @status,
        hold_end_at = @holdEndAt,
        start_at = @startAt,
        trip_type = @tripType,
        notes = @notes,
        amount_charged = @amountCharged,
        amount_received = @amountReceived,
        updated_at = @updatedAt
       WHERE id = @id`
    )
    .run({ ...next, id });

  return getBookingById(id);
}

export function getDriverMoneyTotals(): DriverMoneyTotal[] {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT
        d.id AS driver_id,
        d.first_name AS driver_name,
        COUNT(b.id) AS ride_count,
        COALESCE(SUM(b.amount_charged), 0) AS total_charged,
        COALESCE(SUM(b.amount_received), 0) AS total_received
       FROM drivers d
       LEFT JOIN bookings b ON b.driver_id = d.id
         AND b.status = 'done'
         AND (b.amount_charged IS NOT NULL OR b.amount_received IS NOT NULL)
       GROUP BY d.id, d.first_name
       ORDER BY d.id`
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => {
    const totalCharged = Number(row.total_charged) || 0;
    const totalReceived = Number(row.total_received) || 0;

    return {
      driverId: row.driver_id as number,
      driverName: row.driver_name as string,
      rideCount: Number(row.ride_count) || 0,
      totalCharged,
      totalReceived,
      totalTips: Math.max(0, totalReceived - totalCharged),
    };
  });
}

/**
 * Aggregate completed rides with money by calendar month and driver.
 * @param fromDate - Inclusive start date (YYYY-MM-DD)
 * @param toDate - Inclusive end date (YYYY-MM-DD)
 */
export function getFaresByMonth(fromDate: string, toDate: string): FaresByMonthRow[] {
  const database = getDb();
  const fromIso = `${fromDate}T00:00:00.000`;
  const toIso = `${toDate}T23:59:59.999`;

  const rows = database
    .prepare(
      `SELECT
        strftime('%Y-%m', b.start_at) AS month_key,
        d.id AS driver_id,
        d.first_name AS driver_name,
        COUNT(b.id) AS ride_count,
        COALESCE(SUM(b.amount_charged), 0) AS total_charged,
        COALESCE(SUM(b.amount_received), 0) AS total_received
       FROM bookings b
       INNER JOIN drivers d ON d.id = b.driver_id
       WHERE b.status = 'done'
         AND (b.amount_charged IS NOT NULL OR b.amount_received IS NOT NULL)
         AND b.start_at >= ?
         AND b.start_at <= ?
       GROUP BY month_key, d.id, d.first_name
       ORDER BY month_key ASC, d.id ASC`
    )
    .all(fromIso, toIso) as Record<string, unknown>[];

  return rows.map((row) => {
    const monthKey = row.month_key as string;
    const totalCharged = Number(row.total_charged) || 0;
    const totalReceived = Number(row.total_received) || 0;
    const monthDate = new Date(`${monthKey}-01T12:00:00`);

    return {
      monthKey,
      monthLabel: monthDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      driverId: row.driver_id as number,
      driverName: row.driver_name as string,
      rideCount: Number(row.ride_count) || 0,
      totalCharged,
      totalReceived,
      totalTips: Math.max(0, totalReceived - totalCharged),
    };
  });
}

/**
 * List rides with destinations in a date range for the monthly rides report.
 * Includes done, confirmed, and no_show (excludes cancelled/declined/pending).
 * @param fromDate - Inclusive start date (YYYY-MM-DD)
 * @param toDate - Inclusive end date (YYYY-MM-DD)
 */
export function getMonthlyRidesAndDestinations(
  fromDate: string,
  toDate: string
): MonthlyRideDestinationRow[] {
  const database = getDb();
  const fromIso = `${fromDate}T00:00:00.000`;
  const toIso = `${toDate}T23:59:59.999`;

  const rows = database
    .prepare(
      `SELECT
        b.id,
        b.start_at,
        b.trip_type,
        b.pickup_address,
        b.dropoff_address,
        b.status,
        b.passenger_count,
        b.customer_name,
        d.id AS driver_id,
        d.first_name AS driver_name,
        strftime('%Y-%m', b.start_at) AS month_key
       FROM bookings b
       INNER JOIN drivers d ON d.id = b.driver_id
       WHERE b.status IN ('done', 'confirmed', 'no_show')
         AND b.start_at >= ?
         AND b.start_at <= ?
       ORDER BY b.start_at ASC, d.id ASC`
    )
    .all(fromIso, toIso) as Record<string, unknown>[];

  return rows.map((row) => {
    const monthKey = row.month_key as string;
    const monthDate = new Date(`${monthKey}-01T12:00:00`);

    return {
      id: row.id as number,
      monthKey,
      monthLabel: monthDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      startAt: row.start_at as string,
      driverId: row.driver_id as number,
      driverName: row.driver_name as string,
      customerName: row.customer_name as string,
      tripType: row.trip_type as TripType,
      pickupAddress: row.pickup_address as string,
      dropoffAddress: row.dropoff_address as string,
      status: row.status as BookingStatus,
      passengerCount: row.passenger_count as number,
    };
  });
}

export function seedIfEmpty(): void {
  const database = getDb();
  const driverCount = database
    .prepare('SELECT COUNT(*) as count FROM drivers')
    .get() as { count: number };

  if (driverCount.count > 0) {
    return;
  }

  const tx = database.transaction(() => {
    const insertDriver = database.prepare(
      'INSERT INTO drivers (first_name, phone) VALUES (?, ?)'
    );
    const bob = insertDriver.run('Bob', null);
    const pam = insertDriver.run('Pam', null);

    const insertAvail = database.prepare(
      `INSERT INTO availability (driver_id, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?)`
    );

    for (let day = 1; day <= 5; day++) {
      insertAvail.run(bob.lastInsertRowid, day, '06:00', '14:00');
      insertAvail.run(pam.lastInsertRowid, day, '12:00', '22:00');
    }

    insertAvail.run(bob.lastInsertRowid, 6, '07:00', '15:00');
    insertAvail.run(pam.lastInsertRowid, 6, '10:00', '18:00');

    database
      .prepare(
        `INSERT INTO settings (
          id, business_name, banner_subtitle, banner_color, booking_window_days
        ) VALUES (1, 'Bob-n-Pam Drive', @subtitle, '#87CEEB', 14)`
      )
      .run({ subtitle: DEFAULT_SUBTITLE });
  });

  tx();
}
