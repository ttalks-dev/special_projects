'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

export default function MacePage() {
  const [batchId, setBatchId] = useState('KZH_1792_40_1_2025-10-01');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const runQuery = useCallback(async () => {
    if (!batchId?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batchId.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Query failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  const handleExcel = useCallback(async () => {
    if (!batchId?.trim()) return;
    setExcelLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mace/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batchId.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Excel export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mace-accounting-atoms-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExcelLoading(false);
    }
  }, [batchId]);

  const detailRows = result?.sheets?.find((s) => s.name === 'Accounting_Atoms_Detail')?.rows ?? [];
  const summaryRows = result?.sheets?.find((s) => s.name === 'Accounting_Atoms_Summary')?.rows ?? [];

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm mb-4 inline-block">
          ← Back to reports
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">MACE — Accounting Atoms by Batch</h1>
        <p className="text-slate-600 mt-1">
          Query OpenSearch for accounting atoms by batch ID. Export to Excel with detail and summary sheets.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Batch ID</label>
          <input
            type="text"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="e.g. KZH_1792_40_1_2025-10-01"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          onClick={runQuery}
          disabled={loading || !batchId?.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Loading…' : 'Run query'}
        </button>
        <button
          onClick={handleExcel}
          disabled={excelLoading || !batchId?.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500 disabled:opacity-50 text-sm font-medium"
        >
          {excelLoading ? 'Generating…' : 'Export Excel'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="space-y-6">
          <p className="text-slate-600 text-sm">
            Detail: {detailRows.length} rows · Summary: {summaryRows.length} rows
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Detail</h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pay Item Name</th>
                      <th className="px-3 py-2 font-medium">Union Name</th>
                      <th className="px-3 py-2 font-medium">Item Type</th>
                      <th className="px-3 py-2 font-medium text-right">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">{r['Pay Item Name']}</td>
                        <td className="px-3 py-2">{r['Union Name']}</td>
                        <td className="px-3 py-2">{r['Item Type']}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.Sum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detailRows.length > 100 && (
                  <p className="px-3 py-2 text-slate-500 text-xs border-t">
                    Showing first 100 of {detailRows.length} rows. Export to Excel for full data.
                  </p>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Summary</h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pay Item Name</th>
                      <th className="px-3 py-2 font-medium">Union Name</th>
                      <th className="px-3 py-2 font-medium">Item Type</th>
                      <th className="px-3 py-2 font-medium text-right">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">{r['Pay Item Name']}</td>
                        <td className="px-3 py-2">{r['Union Name']}</td>
                        <td className="px-3 py-2">{r['Item Type']}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.Sum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !result && !error && (
        <p className="text-slate-500 py-8">
          Enter a batch ID and click &quot;Run query&quot; to load accounting atoms.
        </p>
      )}
    </main>
  );
}
