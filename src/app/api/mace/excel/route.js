import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { accountingAtomsByBatch } from '@/lib/queries/accounting-atoms.js';

function sanitizeSheetName(name) {
  return String(name).replace(/[\\/*?:\[\]]/g, '_').slice(0, 31);
}

function formatCellValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return val;
  return String(val);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchId = body.batchId?.trim();
    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    const result = await accountingAtomsByBatch(batchId);
    const wb = new ExcelJS.Workbook();
    const dateStr = new Date().toISOString().slice(0, 10);

    for (const sheet of result.sheets ?? []) {
      const rows = sheet.rows ?? [];
      const headers = rows.length > 0
        ? [...new Set(rows.flatMap((r) => Object.keys(r)))].sort()
        : [];
      const sheetName = sanitizeSheetName(sheet.name || 'Sheet1');
      const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };
      for (const row of rows) {
        ws.addRow(headers.map((h) => formatCellValue(row[h])));
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="mace-accounting-atoms-${dateStr}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('mace excel error:', err);
    return NextResponse.json(
      { error: err.message || 'Excel export failed' },
      { status: 500 }
    );
  }
}
