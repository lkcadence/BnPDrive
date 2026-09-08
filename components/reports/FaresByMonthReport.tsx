'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportToolbar from '@/components/reports/ReportToolbar';

type FaresByMonthRow = {
  monthKey: string;
  monthLabel: string;
  driverId: number;
  driverName: string;
  rideCount: number;
  totalCharged: number;
  totalReceived: number;
  totalTips: number;
};

type DisplayRow = {
  key: string;
  monthLabel: string;
  driverLabel: string;
  rideCount: number;
  totalCharged: number;
  totalReceived: number;
  totalTips: number;
  kind: 'driver' | 'month-total' | 'grand-total';
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

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

function buildDisplayRows(rows: FaresByMonthRow[]): DisplayRow[] {
  const display: DisplayRow[] = [];
  let monthKey = '';
  let monthLabel = '';
  let monthRides = 0;
  let monthCharged = 0;
  let monthReceived = 0;
  let monthTips = 0;
  let grandRides = 0;
  let grandCharged = 0;
  let grandReceived = 0;
  let grandTips = 0;

  function flushMonth() {
    if (!monthKey) {
      return;
    }

    display.push({
      key: `${monthKey}-total`,
      monthLabel,
      driverLabel: 'Month total',
      rideCount: monthRides,
      totalCharged: monthCharged,
      totalReceived: monthReceived,
      totalTips: monthTips,
      kind: 'month-total',
    });
  }

  for (const row of rows) {
    if (row.monthKey !== monthKey) {
      flushMonth();
      monthKey = row.monthKey;
      monthLabel = row.monthLabel;
      monthRides = 0;
      monthCharged = 0;
      monthReceived = 0;
      monthTips = 0;
    }

    display.push({
      key: `${row.monthKey}-${row.driverId}`,
      monthLabel: row.monthLabel,
      driverLabel: row.driverName,
      rideCount: row.rideCount,
      totalCharged: row.totalCharged,
      totalReceived: row.totalReceived,
      totalTips: row.totalTips,
      kind: 'driver',
    });

    monthRides += row.rideCount;
    monthCharged += row.totalCharged;
    monthReceived += row.totalReceived;
    monthTips += row.totalTips;
    grandRides += row.rideCount;
    grandCharged += row.totalCharged;
    grandReceived += row.totalReceived;
    grandTips += row.totalTips;
  }

  flushMonth();

  if (rows.length > 0) {
    display.push({
      key: 'grand-total',
      monthLabel: 'Grand total',
      driverLabel: '',
      rideCount: grandRides,
      totalCharged: grandCharged,
      totalReceived: grandReceived,
      totalTips: grandTips,
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
  const header = ['Month', 'Driver', 'Rides', 'Charged', 'Received', 'Tips'];
  const lines = [header.join(',')];

  for (const row of displayRows) {
    lines.push(
      [
        escapeCsv(row.monthLabel),
        escapeCsv(row.driverLabel),
        String(row.rideCount),
        row.totalCharged.toFixed(2),
        row.totalReceived.toFixed(2),
        row.totalTips.toFixed(2),
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
 * Fares by Month report: date range, table, CSV export, and print.
 */
export default function FaresByMonthReport() {
  const defaults = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [rows, setRows] = useState<FaresByMonthRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (fromDate: string, toDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/driver/reports/fares-by-month?from=${encodeURIComponent(fromDate)}` +
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
    downloadCsv('Bob-n-Pam-Drive-Fares-by-Month.csv', csv);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="report-panel report-panel--fares-by-month">
      <h3 className="report-title">Bob-n-Pam Drive - Fare by Month</h3>
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
        <p className="report-status">No completed fare data in this date range.</p>
      )}
      {!loading && displayRows.length > 0 && (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Driver</th>
                <th>Rides</th>
                <th>Charged</th>
                <th>Received</th>
                <th>Tips</th>
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
                  <td>{row.driverLabel}</td>
                  <td>{row.rideCount}</td>
                  <td>{formatCurrency(row.totalCharged)}</td>
                  <td>{formatCurrency(row.totalReceived)}</td>
                  <td>{formatCurrency(row.totalTips)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
