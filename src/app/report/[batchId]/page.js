'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const batchId = params?.batchId ?? '';
  const startDate = searchParams?.get('start') ?? '';
  const endDate = searchParams?.get('end') ?? '';

  const [step, setStep] = useState('idle');
  const [steps, setSteps] = useState(null);
  const [finalRows, setFinalRows] = useState([]);
  const [error, setError] = useState(null);

  const runReport = () => {
    setStep('running');
    setError(null);
    setSteps(null);
    setFinalRows([]);
    fetch('/api/fringe-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || res.statusText); });
        return res.json();
      })
      .then((data) => {
        setSteps(data.steps ?? null);
        setFinalRows(data.finalRows ?? []);
        setStep('done');
      })
      .catch((e) => {
        setError(e.message);
        setStep('idle');
      });
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <Link href="/fringe-report" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          &larr; Back to batches
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Fringe Rate Report</h1>
        <p className="text-slate-600 font-mono text-sm mt-1">Batch: {batchId}</p>
        {startDate && endDate && (
          <p className="text-slate-500 text-sm">Period: {startDate} – {endDate}</p>
        )}
      </header>

      {step === 'idle' && (
        <button
          type="button"
          onClick={runReport}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Run report
        </button>
      )}
      {step === 'running' && (
        <p className="text-slate-600">Running report…</p>
      )}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {steps && (
        <section className="mt-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Step results</h2>

          {(steps.batchDateRange || steps.batchRecord) && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">0. Batch record (accounting atoms doc used for start/end)</h3>
              {steps.batchDateRange && (
                <p className="text-sm text-slate-600 mb-2">Date range used: <code className="bg-slate-100 px-1 rounded">{steps.batchDateRange.start}</code> → <code className="bg-slate-100 px-1 rounded">{steps.batchDateRange.end}</code></p>
              )}
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-96">
                {JSON.stringify(steps.batchRecord ?? steps.batchDateRange, null, 2)}
              </pre>
            </div>
          )}

          {steps.userIds && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">1. User IDs (all employees in org)</h3>
              <p className="text-sm text-slate-600">{steps.userIds.length} user(s)</p>
              <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(steps.userIds, null, 2)}
              </pre>
            </div>
          )}

          {steps.payrollIds && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">2. Payroll IDs</h3>
              <p className="text-sm text-slate-600">{steps.payrollIds.length} payroll ID(s)</p>
              <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(steps.payrollIds, null, 2)}
              </pre>
            </div>
          )}

          {steps.employeeIds && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">3. Employee IDs (last 6 of payroll_id)</h3>
              <p className="text-sm text-slate-600">{steps.employeeIds.length} employee(s)</p>
              <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(steps.employeeIds, null, 2)}
              </pre>
            </div>
          )}

          {steps.userDetails && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">4. User details (name, payroll_id)</h3>
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(steps.userDetails, null, 2)}
              </pre>
            </div>
          )}

          {steps.atomsSummary && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">5. ER benefit atoms by employee</h3>
              <p className="text-sm text-slate-600">{Object.keys(steps.atomsSummary).length} employee(s) with atoms</p>
              <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(steps.atomsSummary, null, 2)}
              </pre>
            </div>
          )}

          {steps.hoursQuerySentToElasticsearch && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">6a. JSON sent to Elasticsearch (hours query)</h3>
              <p className="text-sm text-slate-600 mb-2">Request body for GET prod_tsheet_timesheets/_search</p>
              <pre className="text-xs bg-amber-50 border border-amber-200 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">
                {steps.hoursQuerySentToElasticsearch}
              </pre>
            </div>
          )}

          {steps.hoursByUser && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 mb-2">6b. Total hours by user (period)</h3>
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(steps.hoursByUser, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      {finalRows.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Report output</h2>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch('/api/fringe-report/excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ finalRows }),
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fringe-rate-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
            >
              Download Excel
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee Name</th>
                  <th className="px-3 py-2 font-medium">TSheets User ID</th>
                  <th className="px-3 py-2 font-medium">ADP Employee ID (File #)</th>
                  <th className="px-3 py-2 font-medium">Pay Item Name</th>
                  <th className="px-3 py-2 font-medium">Pay Item Amount</th>
                  <th className="px-3 py-2 font-medium">Total Worked Hours</th>
                  <th className="px-3 py-2 font-medium">Fringe Hourly Rate</th>
                </tr>
              </thead>
              <tbody>
                {finalRows.map((row, i) => {
                  const isTotal = row.atomName === 'Total';
                  return (
                    <tr
                      key={i}
                      className={`border-t ${isTotal ? 'border-slate-300 bg-slate-200 font-semibold' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-2">{row.employeeName ?? '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.userId ?? '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.employeeId ?? '—'}</td>
                      <td className="px-3 py-2">{isTotal ? 'Total' : (row.atomName ?? '—')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.atomAmount != null && row.atomAmount !== '' ? `$${Number(row.atomAmount).toFixed(8)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.totalHours != null && row.totalHours !== '' ? Number(row.totalHours).toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.hourlyRate != null && row.hourlyRate !== '' ? `$${Number(row.hourlyRate).toFixed(8)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
