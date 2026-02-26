'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { JsonView, allExpanded } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

export default function SeaPointeReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const runQuery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const res = await fetch(`/api/sea-pointe/raw-data?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Failed to load');
      }
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch (e) {
      setError(e.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const handleExcel = useCallback(async () => {
    setExcelLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const res = await fetch(`/api/sea-pointe/excel?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Excel export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sea-pointe-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExcelLoading(false);
    }
  }, [startDate, endDate]);

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm mb-4 inline-block">
          ← Back to reports
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Sea Pointe Report</h1>
        <p className="text-slate-600 mt-1">
          TimeBill data from NetSuite (MongoDB). Filter by transaction date.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={runQuery}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Loading…' : 'Run query'}
        </button>
        <button
          onClick={handleExcel}
          disabled={excelLoading || records.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
        >
          {excelLoading ? 'Generating…' : 'Generate Excel'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {records.length > 0 && (
        <div className="space-y-6">
          <p className="text-slate-600 text-sm">
            {records.length} record{records.length !== 1 ? 's' : ''} found.
          </p>
          <div className="border border-slate-200 rounded-lg overflow-auto max-h-[600px] bg-white">
            {records.map((doc, i) => (
              <details key={doc._id || i} className="border-b border-slate-100 last:border-b-0">
                <summary className="px-4 py-3 cursor-pointer hover:bg-slate-50 font-mono text-sm text-slate-600">
                  {doc.transactionDate
                    ? new Date(doc.transactionDate).toISOString().slice(0, 10)
                    : '—'}{' '}
                  · {doc.type || '—'} (click to expand)
                </summary>
                <div className="px-4 pb-4 text-sm">
                  <JsonView data={doc} shouldExpandNode={allExpanded} />
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <p className="text-slate-500 py-8">
          Set date range and click &quot;Run query&quot; to load TimeBill data.
        </p>
      )}
    </main>
  );
}
