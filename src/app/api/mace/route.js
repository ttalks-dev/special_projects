import { NextResponse } from 'next/server';
import { accountingAtomsByBatch } from '@/lib/queries/accounting-atoms.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchId = body.batchId?.trim();
    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }
    const result = await accountingAtomsByBatch(batchId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Query failed' },
      { status: 500 }
    );
  }
}
