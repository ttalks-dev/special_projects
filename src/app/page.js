import Link from 'next/link';

const reports = [
  {
    title: 'MACE — Accounting Atoms',
    description:
      'Query OpenSearch for accounting atoms by batch. Pay item name, union name, item type, and sum. Export to Excel.',
    href: '/mace',
    color: 'amber',
  },
  {
    title: 'Fringe Rate Report',
    description:
      'Calculate hourly fringe benefit rates for employees on certified payroll batches. Select a payroll batch, run the report, and export to Excel.',
    href: '/fringe-report',
    color: 'blue',
  },
  {
    title: 'Union Benefits Rate Report',
    description:
      'View union benefit rates by union and labor classification. Includes all benefit types with per-union breakdowns and Excel export.',
    href: '/union-report',
    color: 'emerald',
  },
  {
    title: 'Sea Pointe Report',
    description:
      'Time data from MongoDB. Query by date range, view TimeBill records from NetSuite, export to Excel.',
    href: '/sea-pointe-report',
    color: 'teal',
  },
  {
    title: 'Prevailing Wage — Company Analysis',
    description:
      'View certified payroll organizations with active user counts from Elasticsearch.',
    href: '/pw-orgs',
    color: 'violet',
  },
];

const colorClasses = {
  amber: {
    bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    badge: 'bg-amber-600',
    text: 'text-amber-900',
    desc: 'text-amber-700',
    arrow: 'text-amber-400 group-hover:text-amber-600',
  },
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    badge: 'bg-blue-600',
    text: 'text-blue-900',
    desc: 'text-blue-700',
    arrow: 'text-blue-400 group-hover:text-blue-600',
  },
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    badge: 'bg-emerald-600',
    text: 'text-emerald-900',
    desc: 'text-emerald-700',
    arrow: 'text-emerald-400 group-hover:text-emerald-600',
  },
  teal: {
    bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    badge: 'bg-teal-600',
    text: 'text-teal-900',
    desc: 'text-teal-700',
    arrow: 'text-teal-400 group-hover:text-teal-600',
  },
  violet: {
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
    badge: 'bg-violet-600',
    text: 'text-violet-900',
    desc: 'text-violet-700',
    arrow: 'text-violet-400 group-hover:text-violet-600',
  },
};

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-slate-800">
          Special Projects — Epic Industrial Certified Payroll
        </h1>
        <p className="text-slate-600 mt-1">
          Select a report to get started.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => {
          const c = colorClasses[r.color];
          return (
            <Link
              key={r.href}
              href={r.href}
              className={`group block rounded-lg border p-6 transition-colors ${c.bg}`}
            >
              <h2 className={`text-lg font-semibold ${c.text}`}>{r.title}</h2>
              <p className={`mt-2 text-sm leading-relaxed ${c.desc}`}>
                {r.description}
              </p>
              <span
                className={`mt-4 inline-block text-sm font-medium transition-colors ${c.arrow}`}
              >
                Open &rarr;
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
