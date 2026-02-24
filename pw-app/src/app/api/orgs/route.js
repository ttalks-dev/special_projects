import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';
import { searchElasticsearch } from '@/lib/elasticsearch';

const DATA_FILE = path.join(process.cwd(), '..', 'data', 'Certified Payroll Orgs.xlsx');

/** Parse fitterweb_org_ids: "41" -> [41], "284|279|293" -> [284, 279, 293] */
function parseOrgIds(val) {
  if (val == null || val === '') return [];
  const s = String(val).trim();
  if (!s) return [];
  return s.split('|').map((x) => parseInt(x.trim(), 10)).filter((n) => !Number.isNaN(n));
}

/** Fetch active user count for given org IDs from prod_tsheet_users */
async function getActiveUserCount(orgIds) {
  if (orgIds.length === 0) return 0;
  try {
    const result = await searchElasticsearch({
      index: 'prod_tsheet_users',
      body: {
        size: 0,
        query: {
          bool: {
            filter: { terms: { fitterweb_org_id: orgIds } },
            must: [{ match: { active: true } }],
          },
        },
        aggs: {
          id_count: { cardinality: { field: 'id' } },
        },
      },
    });
    return result?.aggregations?.id_count?.value ?? 0;
  } catch (err) {
    console.error('ES query error for orgIds', orgIds, err);
    return null;
  }
}

export async function GET() {
  try {
    const buffer = await readFile(DATA_FILE);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const ws = wb.worksheets[0];
    if (!ws) {
      return NextResponse.json({ error: 'No worksheet found' }, { status: 500 });
    }

    const rows = [];
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const cells = [];
      row.eachCell((cell, colNum) => { cells[colNum] = cell.value; });
      rows.push(cells);
    });

    // Columns: A=empty, B=org_doc_id, C=companyName, D=fitterweb_org_ids, E=cpr_report_count
    const orgs = rows
      .filter((cells) => cells[3]) // companyName (col C)
      .map((cells) => ({
        org_doc_id: cells[2] ?? '',
        companyName: cells[3] ?? '',
        fitterweb_org_ids: cells[4] ?? '',
        cpr_report_count: cells[5] ?? 0,
      }));

    const results = [];
    for (const org of orgs) {
      const orgIds = parseOrgIds(org.fitterweb_org_ids);
      const active_user_count = await getActiveUserCount(orgIds);
      results.push({
        org_doc_id: org.org_doc_id,
        companyName: org.companyName,
        fitterweb_org_ids: org.fitterweb_org_ids,
        cpr_report_count: org.cpr_report_count,
        active_user_count,
      });
    }

    return NextResponse.json({ orgs: results });
  } catch (err) {
    console.error('Orgs API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load orgs' },
      { status: 500 }
    );
  }
}
