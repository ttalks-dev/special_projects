'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/orgs')
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'Failed to load');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrgs(data.orgs ?? []);
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
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Prevailing Wage — Company Analysis
        </h1>
        <p className="text-slate-600 mt-1">
          Certified payroll organizations and active user counts.
        </p>
      </header>

      {loading && <p className="text-slate-500 py-8">Loading…</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {!loading && !error && orgs.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Org ID(s)</th>
                <th className="px-4 py-3 font-medium text-right">CPR Reports</th>
                <th className="px-4 py-3 font-medium text-right">Active Users</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => (
                <tr
                  key={org.org_doc_id || i}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium">{org.companyName}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{org.fitterweb_org_ids}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{org.cpr_report_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {org.active_user_count != null ? org.active_user_count : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && orgs.length === 0 && (
        <p className="text-slate-500 py-8">No organizations found.</p>
      )}
    </main>
  );
}
