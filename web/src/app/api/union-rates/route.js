import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '..', 'data');

const SKIP_KEYS = new Set(['Union', 'Classification', 'Rate', 'Special', 'Force Rate']);

function hasValue(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  if (typeof val === 'object' && !Array.isArray(val)) return false; // skip Special, etc.
  return true;
}

export async function GET() {
  try {
    const [ratesRaw, codesRaw] = await Promise.all([
      readFile(path.join(DATA_DIR, 'unionRates.json'), 'utf-8'),
      readFile(path.join(DATA_DIR, 'unionCodes.json'), 'utf-8'),
    ]);

    const rates = JSON.parse(ratesRaw);
    const codes = JSON.parse(codesRaw);

    if (!Array.isArray(rates)) {
      return NextResponse.json({ error: 'Invalid unionRates.json format' }, { status: 500 });
    }

    // Collect all benefit keys from all records (skip Union, Classification, Rate, Special, Force Rate, and object values)
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

    // Build report: grouped by union, with classifications and benefit values
    const unionMap = new Map(); // union -> { classifications: [], benefitKeys: Set, rows: [] }

    for (const row of rates) {
      const union = row.Union;
      const classification = row.Classification;
      if (!union || !classification) continue;

      let entry = unionMap.get(union);
      if (!entry) {
        entry = {
          union,
          classifications: [],
          benefitKeys: new Set(),
          rows: [],
        };
        unionMap.set(union, entry);
      }

      // Track which benefits have values for this union
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

      const rowEntry = {
        union,
        classification,
        rate: row.Rate,
        benefits: benefitValues,
      };

      if (!entry.classifications.includes(classification)) {
        entry.classifications.push(classification);
      }
      entry.rows.push(rowEntry);
    }

    // Convert to array, sort unions by name
    const unions = Array.from(unionMap.values()).sort((a, b) =>
      a.union.localeCompare(b.union)
    );

    // For each union, only include benefit columns that have at least one value
    const report = unions.map((u) => ({
      union: u.union,
      classifications: [...new Set(u.rows.map((r) => r.classification))],
      benefitColumns: Array.from(u.benefitKeys).sort(),
      rows: u.rows,
    }));

    // Also pass all unique benefits across report (for combined view option)
    const allBenefitsUsed = new Set();
    report.forEach((r) => r.benefitColumns.forEach((b) => allBenefitsUsed.add(b)));

    return NextResponse.json({
      report,
      unions: report.map((r) => r.union),
      allBenefitColumns: Array.from(allBenefitsUsed).sort(),
      codes: Array.isArray(codes) ? codes : [],
    });
  } catch (err) {
    console.error('union-rates API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load union rates' },
      { status: 500 }
    );
  }
}
