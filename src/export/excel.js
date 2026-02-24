import ExcelJS from 'exceljs';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';

/**
 * Ensure output directory exists.
 */
function ensureOutputDir() {
  const dir = path.resolve(config.output.dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Write one or more datasets to an Excel file.
 * @param {string} filename - Output filename (e.g. 'report.xlsx')
 * @param {{ name: string, rows: object[] }[]} sheets - Array of { name, rows } for each sheet
 * @returns {Promise<string>} Resolved path to the written file
 */
export async function writeExcel(filename, sheets) {
  const dir = ensureOutputDir();
  const filepath = path.join(dir, filename);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'mace';

  for (const { name, rows } of sheets) {
    const flat = (obj, prefix = '') => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          Object.assign(out, flat(v, key));
        } else {
          out[key] = v;
        }
      }
      return out;
    };

    const flatRows = (rows || []).map((r) => flat(r));
    const headers = [...new Set(flatRows.flatMap((r) => Object.keys(r)))].sort();

    const ws = wb.addWorksheet(name || 'Sheet1', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };
    for (const row of flatRows) {
      ws.addRow(headers.map((h) => row[h] ?? ''));
    }
  }

  await wb.xlsx.writeFile(filepath);
  return filepath;
}

/**
 * Process raw hits (from OpenSearch or Elasticsearch) into rows for Excel.
 * Override or extend in your queries to map/transform fields.
 * @param {object[]} hits - Array of { _id, _index, ..._source }
 * @returns {object[]}
 */
export function hitsToRows(hits) {
  return hits.map((h) => ({ id: h._id, index: h._index, ...h }));
}
