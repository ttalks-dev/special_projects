import { searchOpenSearch } from '@/lib/opensearch';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await searchOpenSearch({
      index: 'staging_batches',
      body: {
        sort: [{ 'pay_date.keyword': { order: 'desc' } }],
        size: 200,
        query: {
          bool: {
            must: [{ match: { 'paygroup.keyword': 'W0R' } }],
          },
        },
      },
    });

    const hits = response?.body?.hits?.hits ?? response?.hits?.hits ?? [];
    const batches = hits.map((h) => {
      const s = h._source ?? h.fields ?? {};
      return {
        id: h._id,
        batchID: s.batchID ?? s.batch_id ?? h._id,
        paygroup: s.paygroup ?? '',
        pay_date: s.pay_date ?? '',
        start_date: s.start_date ?? s.period_start ?? s.pay_date ?? '',
        end_date: s.end_date ?? s.period_end ?? s.pay_date ?? '',
      };
    });

    return NextResponse.json(batches);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}
