'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function FringeReportBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/batches')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to load batches');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setBatches(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm mb-4 inline-block">
          &larr; Back to reports
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          Fringe Rate Report — Epic Industrial Certified Payroll
        </h1>
        <p className="text-slate-600 mt-1">
          Select a payroll batch to run the report.
        </p>
      </header>

      {loading && (
        <p className="text-slate-500">Loading batches…</p>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}
      {!loading && !error && batches.length === 0 && (
        <p className="text-slate-500">No batches found.</p>
      )}
      {!loading && !error && batches.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Batch ID</th>
                <th className="px-4 py-3 font-medium">Paygroup</th>
                <th className="px-4 py-3 font-medium">Start date</th>
                <th className="px-4 py-3 font-medium">End date</th>
                <th className="px-4 py-3 font-medium w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id ?? b.batchID} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm">{b.batchID}</td>
                  <td className="px-4 py-3">{b.paygroup}</td>
                  <td className="px-4 py-3">{b.start_date || b.pay_date || '—'}</td>
                  <td className="px-4 py-3">{b.end_date || b.pay_date || '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/report/${encodeURIComponent(b.batchID)}?start=${encodeURIComponent(b.start_date || b.pay_date || '')}&end=${encodeURIComponent(b.end_date || b.pay_date || '')}`}
                      className="inline-block px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                    >
                      Run report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
