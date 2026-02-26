'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6">
      <h1 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h1>
      <pre className="bg-white p-4 rounded mb-4 overflow-auto max-w-2xl text-sm text-red-700">
        {error?.message || String(error)}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
      >
        Try again
      </button>
    </div>
  );
}
