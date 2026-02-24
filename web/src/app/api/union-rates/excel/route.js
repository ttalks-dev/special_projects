import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';

const DATA_DIR = path.join(process.cwd(), '..', 'data');

const SKIP_KEYS = new Set(['Union', 'Classification', 'Rate', 'Special', 'Force Rate']);

function hasValue(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  if (typeof val === 'object' && !Array.isArray(val)) return false;
  return true;
}

function sanitizeSheetName(name) {
  return String(name).replace(/[\\/*?:\[\]]/g, '_').slice(0, 31);
}

function formatCellValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return val;
  return String(val);
}

export async function GET() {
  try {
    const ratesRaw = await readFile(path.join(DATA_DIR, 'unionRates.json'), 'utf-8');
    const rates = JSON.parse(ratesRaw);

    if (!Array.isArray(rates)) {
      return NextResponse.json({ error: 'Invalid unionRates.json format' }, { status: 500 });
    }

    const allBenefitKeysSet = new Set();
    for (const row of rates) {
      for (const k of Object.keys(row)) {
        if (SKIP_KEYS.has(k)) continue;
        const val = row[k];
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) continue;
        allBenefitKeysSet.add(k);
      }
    }
    const allBenefitKeys = Array.from(allBenefitKeysSet);

    const unionMap = new Map();
    for (const row of rates) {
      const union = row.Union;
      const classification = row.Classification;
      if (!union || !classification) continue;

      let entry = unionMap.get(union);
      if (!entry) {
        entry = { union, benefitKeys: new Set(), rows: [] };
        unionMap.set(union, entry);
      }

      const benefitValues = {};
      for (const key of allBenefitKeys) {
        const val = row[key];
        if (hasValue(val)) {
          entry.benefitKeys.add(key);
          benefitValues[key] = val;
        } else {
          benefitValues[key] = null;
        }
      }
      entry.rows.push({
        union,
        classification,
        rate: row.Rate,
        benefits: benefitValues,
      });
    }

    const report = Array.from(unionMap.values())
      .sort((a, b) => a.union.localeCompare(b.union))
      .map((u) => ({
        union: u.union,
        benefitColumns: Array.from(u.benefitKeys).sort(),
        rows: u.rows,
      }));

    const wb = new ExcelJS.Workbook();
    const dateStr = new Date().toISOString().slice(0, 10);

    for (const section of report) {
      const sheetName = sanitizeSheetName(section.union);
      const ws = wb.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      const headers = ['Union', 'Classification', 'Rate', ...section.benefitColumns];
      ws.addRow(headers);
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };

      for (const row of section.rows) {
        const rowData = [
          row.union,
          row.classification,
          row.rate != null ? row.rate : '',
          ...section.benefitColumns.map((col) => formatCellValue(row.benefits[col])),
        ];
        ws.addRow(rowData);
      }

      // Format rate column (column C) as number
      const lastRow = section.rows.length + 1;
      for (let r = 2; r <= lastRow; r++) {
        const rateCell = ws.getCell(r, 3);
        if (rateCell.value !== '' && rateCell.value != null) {
          rateCell.numFmt = '#,##0.00';
        }
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="union-benefits-report-${dateStr}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('union-rates excel error:', err);
    return NextResponse.json(
      { error: err.message || 'Excel export failed' },
      { status: 500 }
    );
  }
}
