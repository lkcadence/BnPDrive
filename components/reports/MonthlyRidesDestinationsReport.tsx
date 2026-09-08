'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportToolbar from '@/components/reports/ReportToolbar';

type MonthlyRideRow = {
  id: number;
  monthKey: string;
  monthLabel: string;
  startAt: string;
  driverId: number;
  driverName: string;
  customerName: string;
  tripType: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  passengerCount: number;
};

type DisplayRow = {
  key: string;
  monthLabel: string;
  whenLabel: string;
  driverName: string;
  customerName: string;
  tripType: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  passengerCount: string;
  kind: 'ride' | 'month-total' | 'grand-total';
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Default range: first day of the month 11 months ago through today. */
function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function buildDisplayRows(rows: MonthlyRideRow[]): DisplayRow[] {
  const display: DisplayRow[] = [];
  let monthKey = '';
  let monthLabel = '';
  let monthCount = 0;
  let grandCount = 0;

  function flushMonth() {
    if (!monthKey) {
      return;
    }

    display.push({
      key: `${monthKey}-total`,
      monthLabel,
      whenLabel: '',
      driverName: '',
      customerName: '',
      tripType: '',
      pickupAddress: `Month total: ${monthCount} ride${monthCount === 1 ? '' : 's'}`,
      dropoffAddress: '',
      status: '',
      passengerCount: '',
      kind: 'month-total',
    });
  }

  for (const row of rows) {
    if (row.monthKey !== monthKey) {
      flushMonth();
      monthKey = row.monthKey;
      monthLabel = row.monthLabel;
      monthCount = 0;
    }

    display.push({
      key: `ride-${row.id}`,
      monthLabel: row.monthLabel,
      whenLabel: formatWhen(row.startAt),
      driverName: row.driverName,
      customerName: row.customerName,
      tripType: row.tripType,
      pickupAddress: row.pickupAddress,
      dropoffAddress: row.dropoffAddress,
      status: formatStatus(row.status),
      passengerCount: String(row.passengerCount),
      kind: 'ride',
    });

    monthCount += 1;
    grandCount += 1;
  }

  flushMonth();

  if (rows.length > 0) {
    display.push({
      key: 'grand-total',
      monthLabel: 'Grand total',
      whenLabel: '',
      driverName: '',
      customerName: '',
      tripType: '',
      pickupAddress: `${grandCount} ride${grandCount === 1 ? '' : 's'}`,
      dropoffAddress: '',
      status: '',
      passengerCount: '',
      kind: 'grand-total',
    });
  }

  return display;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function rowsToCsv(displayRows: DisplayRow[]): string {
  const header = [
    'Month',
    'When',
    'Driver',
    'Customer',
    'Trip type',
    'Pickup',
    'Drop-off',
    'Status',
    'Passengers',
  ];
  const lines = [header.join(',')];

  for (const row of displayRows) {
    lines.push(
      [
        escapeCsv(row.monthLabel),
        escapeCsv(row.whenLabel),
        escapeCsv(row.driverName),
        escapeCsv(row.customerName),
        escapeCsv(row.tripType),
        escapeCsv(row.pickupAddress),
        escapeCsv(row.dropoffAddress),
        escapeCsv(row.status),
        escapeCsv(row.passengerCount),
      ].join(',')
    );
  }

  return lines.join('\n');
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Monthly rides and destinations report: trip log with print and CSV export.
 */
export default function MonthlyRidesDestinationsReport() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [rows, setRows] = useState<MonthlyRideRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (fromDate: string, toDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/driver/reports/monthly-rides?from=${encodeURIComponent(fromDate)}` +
          `&to=${encodeURIComponent(toDate)}`,
        { cache: 'no-store' }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not load report.');
        setRows([]);
        return;
      }

      setRows(data.rows || []);
    } catch {
      setError('Could not load report.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(defaults.from, defaults.to);
  }, [defaults.from, defaults.to, loadReport]);

  const displayRows = useMemo(() => buildDisplayRows(rows), [rows]);

  function handleChange(field: 'from' | 'to', value: string) {
    if (field === 'from') {
      setFrom(value);
    } else {
      setTo(value);
    }
  }

  function handleExport() {
    const csv = rowsToCsv(displayRows);
    downloadCsv('Bob-n-Pam-Drive-Monthly-Rides-and-Destinations.csv', csv);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="report-panel report-panel--monthly-rides">
      <h3 className="report-title">
        Bob-n-Pam Drive - Monthly rides and destinations
      </h3>
      <ReportToolbar
        from={from}
        to={to}
        onChange={handleChange}
        onApply={() => loadReport(from, to)}
        onExport={handleExport}
        onPrint={handlePrint}
        disabled={loading}
      />
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="report-status">Loading report…</p>}
      {!loading && !error && displayRows.length === 0 && (
        <p className="report-status">No rides in this date range.</p>
      )}
      {!loading && displayRows.length > 0 && (
        <div className="report-table-wrap">
          <table className="report-table report-table--rides">
            <thead>
              <tr>
                <th>Month</th>
                <th>When</th>
                <th>Driver</th>
                <th>Customer</th>
                <th>Trip</th>
                <th>Pickup</th>
                <th>Drop-off</th>
                <th>Status</th>
                <th>Pax</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <tr
                  key={row.key}
                  className={
                    row.kind === 'month-total'
                      ? 'report-row--month-total'
                      : row.kind === 'grand-total'
                        ? 'report-row--grand-total'
                        : undefined
                  }
                >
                  <td>{row.monthLabel}</td>
                  <td>{row.whenLabel}</td>
                  <td>{row.driverName}</td>
                  <td>{row.customerName}</td>
                  <td>{row.tripType}</td>
                  <td>{row.pickupAddress}</td>
                  <td>{row.dropoffAddress}</td>
                  <td>{row.status}</td>
                  <td>{row.passengerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
