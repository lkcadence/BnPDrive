'use client';

type ReportToolbarProps = {
  from: string;
  to: string;
  onChange: (field: 'from' | 'to', value: string) => void;
  onApply: () => void;
  onExport: () => void;
  onPrint: () => void;
  disabled?: boolean;
};

/**
 * Shared date range + export/print controls for driver reports.
 */
export default function ReportToolbar({
  from,
  to,
  onChange,
  onApply,
  onExport,
  onPrint,
  disabled = false,
}: ReportToolbarProps) {
  return (
    <div className="report-toolbar">
      <div className="report-toolbar-dates">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(event) => onChange('from', event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(event) => onChange('to', event.target.value)}
            disabled={disabled}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onApply}
          disabled={disabled}
        >
          Apply
        </button>
      </div>
      <div className="report-toolbar-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExport}
          disabled={disabled}
        >
          Export Excel
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onPrint}
          disabled={disabled}
        >
          Print
        </button>
      </div>
    </div>
  );
}
