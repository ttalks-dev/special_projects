import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getDatabase } from '@/lib/mongodb';

const DB = 'dapt_raw_fwk';
const COLL = 'dev_RawData';

function sanitizeSheetName(name) {
  return String(name).replace(/[\\/*?:\[\]]/g, '_').slice(0, 31);
}

function formatCellValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/** Flatten doc for Excel row: top-level keys + one level of rawPayload */
function docToRow(doc) {
  const row = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === 'rawPayload') continue;
    if (k === 'transactionDate') {
      row[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
      continue;
    }
    row[k] = v;
  }
  const payload = doc.rawPayload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) continue;
      row[`payload_${k}`] = v;
    }
  }
  return row;
}

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
      if (startDate) filter.transactionDate.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) filter.transactionDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const docs = await coll.find(filter).sort({ transactionDate: 1 }).toArray();
    const byDate = new Map();
    for (const doc of docs) {
      const d = doc.transactionDate;
      const key = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      const [y, m, d2] = key.split('-');
      const label = `${m}-${d2}-${y}`;
      if (!byDate.has(label)) byDate.set(label, []);
      byDate.get(label).push(docToRow(doc));
    }

    const wb = new ExcelJS.Workbook();
    const dateStr = new Date().toISOString().slice(0, 10);

    for (const [label, rows] of [...byDate.entries()].sort()) {
      const sheetName = sanitizeSheetName(label);
      const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

      const allKeys = new Set();
      for (const r of rows) {
        for (const k of Object.keys(r)) allKeys.add(k);
      }
      const headers = Array.from(allKeys).sort();
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };

      for (const r of rows) {
        ws.addRow(headers.map((h) => formatCellValue(r[h])));
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sea-pointe-report-${dateStr}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('sea-pointe excel error:', err);
    return NextResponse.json(
      { error: err.message || 'Excel export failed' },
      { status: 500 }
    );
  }
}
