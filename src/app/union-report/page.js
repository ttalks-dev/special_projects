'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const BUILD_STEPS = [
  { id: 'fetch', label: 'Loading union data...' },
  { id: 'parse', label: 'Processing union rates and benefit codes...' },
  { id: 'group', label: 'Grouping by union and classification...' },
  { id: 'columns', label: 'Identifying benefit columns per union...' },
  { id: 'ready', label: 'Report built. Rendering table...' },
];

function formatRate(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return val % 1 === 0 ? val.toString() : val.toFixed(2);
  return String(val);
}

export default function UnionReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buildStep, setBuildStep] = useState(0);
  const [visibleUnions, setVisibleUnions] = useState(0);
  const [buildLog, setBuildLog] = useState([]);

  const addLog = useCallback((msg) => {
    setBuildLog((prev) => [...prev, { ts: Date.now(), msg }]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setBuildStep(0);
      addLog('Starting report build...');

      // Simulate build steps with small delays
      const advanceStep = (step) => {
        if (cancelled) return;
        setBuildStep(step);
        addLog(BUILD_STEPS[step]?.label || '');
      };

      advanceStep(0);
      await new Promise((r) => setTimeout(r, 300));

      advanceStep(1);
      const res = await fetch('/api/union-rates');
      if (cancelled) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || res.statusText || 'Failed to load data');
        setLoading(false);
        return;
      }

      advanceStep(2);
      await new Promise((r) => setTimeout(r, 200));

      const data = await res.json();
      if (cancelled) return;

      advanceStep(3);
      addLog(`Found ${data.report?.length || 0} unions.`);
      await new Promise((r) => setTimeout(r, 250));

      advanceStep(4);
      addLog(`Identified ${data.allBenefitColumns?.length || 0} unique benefit types.`);
      await new Promise((r) => setTimeout(r, 200));

      setReport(data);
      setLoading(false);
      addLog('Report ready.');
    };

    run();
    return () => { cancelled = true; };
  }, [addLog]);

  // Progressive reveal of union sections
  useEffect(() => {
    if (!report?.report || report.report.length === 0) return;
    const total = report.report.length;
    if (visibleUnions >= total) return;

    const t = setTimeout(() => {
      setVisibleUnions((v) => Math.min(v + 1, total));
    }, 120);
    return () => clearTimeout(t);
  }, [report, visibleUnions]);

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <header className="mb-6">
          <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm mb-4 inline-block">&larr; Back to reports</Link>
          <h1 className="text-2xl font-bold text-slate-800">Union Benefits Rate Report</h1>
        </header>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">{error}</div>
      </main>
    );
  }

  return (
    <main className="max-w-[98vw] mx-auto p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm mb-4 inline-block">&larr; Back to reports</Link>
          <h1 className="text-2xl font-bold text-slate-800">Union Benefits Rate Report</h1>
          <p className="text-slate-600 mt-1">Rates for benefits by union and labor classification</p>
        </div>
        {!loading && report && (
          <a
            href="/api/union-rates/excel"
            download="union-benefits-report.xlsx"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            Generate Excel
          </a>
        )}
      </header>

      {/* Build progress panel */}
      <section className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Report build progress</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {BUILD_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`px-2 py-1 rounded text-xs font-medium ${
                i < buildStep ? 'bg-emerald-200 text-emerald-800' : i === buildStep ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>
        <div className="text-xs text-slate-600 space-y-1 max-h-24 overflow-y-auto font-mono">
          {buildLog.map((l, i) => (
            <div key={i}>{l.msg}</div>
          ))}
        </div>
      </section>

      {loading && (
        <div className="text-slate-500 py-8">Loading and building report…</div>
      )}

      {!loading && report && (
        <div className="space-y-8">
          {report.report.slice(0, visibleUnions).map((section, idx) => (
            <section
              key={section.union}
              className="transition-all duration-300 ease-out"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
                {section.union}
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">Union</th>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">Classification</th>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">Rate</th>
                      {section.benefitColumns.map((col) => (
                        <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, ri) => (
                      <tr
                        key={`${row.union}-${row.classification}-${ri}`}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2">{row.union}</td>
                        <td className="px-3 py-2 font-medium">{row.classification}</td>
                        <td className="px-3 py-2 tabular-nums">{formatRate(row.rate)}</td>
                        {section.benefitColumns.map((col) => (
                          <td key={col} className="px-3 py-2 tabular-nums">
                            {formatRate(row.benefits[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {visibleUnions < (report.report?.length || 0) && (
            <div className="text-slate-500 text-center py-4">
              Loading more unions… ({visibleUnions} of {report.report.length})
            </div>
          )}
        </div>
      )}
    </main>
  );
}
