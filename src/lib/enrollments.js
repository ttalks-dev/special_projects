/**
 * Load employee benefit enrollments from the spreadsheet.
 * Sheet: "Employee and Dependent_Benefici"
 * Col B: employee name, Col AE (31): PLAN TYPE, Col AF (32): PROVIDER, Col AS (45): employer cost, Col 46: employer cost period
 * Benefit name = "planType:Provider"
 */
import path from 'path';
import ExcelJS from 'exceljs';

const SHEET_NAME = 'Employee and Dependent_Benefici';
const COL_EMPLOYEE_NAME = 2;
const COL_PLAN_TYPE = 31;
const COL_PROVIDER = 32;
const COL_EMPLOYER_COST = 45;
const COL_EMPLOYER_COST_PERIOD = 46;

const PAY_PERIODS_PER_YEAR = 26;

/**
 * Normalize a name for matching. Handles "Last, First" and "First Last" formats.
 * Returns lowercase string with only letters (no spaces, punctuation).
 */
export function normalizeNameForMatching(name) {
  if (!name || typeof name !== 'string') return '';
  const s = String(name).trim();
  // "Last, First" -> "firstlast"
  if (s.includes(',')) {
    const parts = s.split(',').map((p) => p.trim());
    const last = (parts[0] ?? '').replace(/\W/g, '').toLowerCase();
    const first = (parts[1] ?? '').replace(/\W/g, '').toLowerCase();
    return first + last;
  }
  // "First Last" -> "firstlast"
  return s.replace(/\W/g, '').toLowerCase();
}

/**
 * Convert employer cost to biweekly amount based on period.
 * - Monthly: amount * 12 / 26
 * - Biweekly/other: assume already per pay period (return as-is)
 */
function toBiweeklyAmount(amount, period) {
  const num = parseFloat(amount) || 0;
  if (num <= 0) return 0;
  const p = String(period || '').trim().toLowerCase();
  if (p === 'monthly') {
    return (num * 12) / PAY_PERIODS_PER_YEAR;
  }
  // Biweekly, Weekly, etc. - assume already per pay period
  return num;
}

function getCellNumber(cell) {
  if (cell.result != null && typeof cell.result === 'number') return cell.result;
  const v = cell.value;
  if (typeof v === 'number') return v;
  return parseFloat(String(v || '')) || 0;
}

/**
 * Load enrollment data from the spreadsheet.
 * Returns: Map<normalizedName, Map<benefitName, biweeklyAmount>>
 * (benefits are summed per employee if same benefit appears multiple times)
 */
export async function loadEnrollments() {
  const filePath = path.join(process.cwd(), 'data', 'Employee and Dependent_Beneficiary Enrollments.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }

  /** @type {Map<string, Map<string, number>>} - normalizedName -> benefitName -> biweeklyAmount (summed) */
  const byEmployee = new Map();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const empCost = getCellNumber(row.getCell(COL_EMPLOYER_COST));
    if (empCost <= 0) continue;

    const empName = row.getCell(COL_EMPLOYEE_NAME).value;
    const planType = row.getCell(COL_PLAN_TYPE).value;
    const provider = row.getCell(COL_PROVIDER).value;
    const period = row.getCell(COL_EMPLOYER_COST_PERIOD).value;

    const empNameStr = empName != null ? String(empName).trim() : '';
    const benefitStr = [planType, provider].map((v) => (v != null ? String(v).trim() : '')).filter(Boolean).join(':') || 'Unknown';
    if (!empNameStr) continue;

    const biweeklyAmount = toBiweeklyAmount(empCost, period);
    const key = normalizeNameForMatching(empNameStr);

    if (!byEmployee.has(key)) {
      byEmployee.set(key, new Map());
    }
    const benefits = byEmployee.get(key);
    const current = benefits.get(benefitStr) ?? 0;
    benefits.set(benefitStr, current + biweeklyAmount);
  }

  return byEmployee;
}

/**
 * Get enrollment benefits for an employee by name.
 * @param {Map<string, Map<string, number>>} enrollmentsByEmployee - from loadEnrollments()
 * @param {string} employeeName - e.g. "Zachary Austin" or "Austin, Zachary"
 * @returns {Array<{ benefitName: string, biweeklyAmount: number }>}
 */
export function getEnrollmentBenefitsForEmployee(enrollmentsByEmployee, employeeName) {
  const key = normalizeNameForMatching(employeeName);
  const benefits = enrollmentsByEmployee.get(key);
  if (!benefits) return [];
  return Array.from(benefits.entries()).map(([benefitName, biweeklyAmount]) => ({
    benefitName,
    biweeklyAmount,
  }));
}
