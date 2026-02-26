'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ padding: 24, fontFamily: 'system-ui', background: '#fef2f2' }}>
        <h1 style={{ color: '#b91c1c', marginBottom: 16 }}>Something went wrong</h1>
        <pre style={{ background: '#fff', padding: 16, overflow: 'auto', marginBottom: 16 }}>
          {error?.message || String(error)}
        </pre>
        <button
          onClick={reset}
          style={{ padding: '8px 16px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: 4 }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
