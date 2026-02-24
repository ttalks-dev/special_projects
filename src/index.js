/**
 * Main entry: run configured queries and export results to Excel.
 * Edit src/queries/index.js to add your endpoints and queries.
 */

import { writeExcel, hitsToRows } from './export/excel.js';
import * as queries from './queries/index.js';

// Define which query functions to run and under what sheet names.
// Add or remove entries as you add queries in src/queries/index.js.
const QUERY_JOBS = [
  { name: 'Accounting Atoms by Batch', fn: queries.accountingAtomsByBatch },
];

async function main() {
  const sheets = [];

  for (const { name, fn } of QUERY_JOBS) {
    try {
      console.log(`Running: ${name}...`);
      const result = await fn();
      const multi = result && typeof result === 'object' && Array.isArray(result.sheets);
      if (multi) {
        for (const { name: sheetName, rows: sheetRows } of result.sheets) {
          const rows = Array.isArray(sheetRows) ? sheetRows : hitsToRows(sheetRows || []);
          sheets.push({ name: String(sheetName).replace(/\s+/g, '_').slice(0, 31), rows });
          console.log(`  → ${sheetName}: ${rows.length} rows`);
        }
      } else {
        const rows = Array.isArray(result) ? result : hitsToRows(result || []);
        sheets.push({ name: name.replace(/\s+/g, '_').slice(0, 31), rows });
        console.log(`  → ${rows.length} rows`);
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      sheets.push({ name: name.replace(/\s+/g, '_').slice(0, 31), rows: [{ error: err.message }] });
    }
  }

  if (sheets.length === 0) {
    console.log('No sheets to write.');
    return;
  }

  const filename = `export_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.xlsx`;
  const filepath = await writeExcel(filename, sheets);
  console.log(`Wrote: ${filepath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
