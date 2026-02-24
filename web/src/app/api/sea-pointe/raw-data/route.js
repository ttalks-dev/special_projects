import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

const DB = 'dapt_raw_fwk';
const COLL = 'dev_RawData';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const db = await getDatabase(DB);
    const coll = db.collection(COLL);

    const filter = {
      type: 'TimeBill',
      externalOrgType: 'NetSuiteOrganization',
      externalOrgId: '8103283-sb1',
    };

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        filter.transactionDate.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const docs = await coll.find(filter).sort({ transactionDate: 1 }).toArray();
    return NextResponse.json({ records: docs });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch raw data' },
      { status: 500 }
    );
  }
}
