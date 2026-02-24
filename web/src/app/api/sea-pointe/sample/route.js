import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

const DB = 'dapt_raw_fwk';
const COLL = 'dev_RawData';

export async function GET() {
  try {
    const db = await getDatabase(DB);
    const coll = db.collection(COLL);
    const doc = await coll.findOne({
      type: 'TimeBill',
      externalOrgType: 'NetSuiteOrganization',
      externalOrgId: '8103283-sb1',
    });
    return NextResponse.json(doc || { message: 'No sample document found' });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch sample' },
      { status: 500 }
    );
  }
}
