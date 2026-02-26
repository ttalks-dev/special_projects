import { searchOpenSearch } from '@/lib/opensearch';
import { searchElasticsearch } from '@/lib/elasticsearch';
import { NextResponse } from 'next/server';
import BigNumber from 'bignumber.js';
import ER_ATOM_NAMES from '@/data/er-atom-names.json';
import { loadEnrollments, getEnrollmentBenefitsForEmployee } from '@/lib/enrollments';

const DP = 8; // decimal places for amounts and rates

const FITTERWEB_ORG_ID = 430;

/** Last 6 chars of payroll_id as integer then back to string (employee id) */
function payrollIdToEmployeeId(payrollId) {
  if (payrollId == null || payrollId === '') return '';
  const s = String(payrollId).trim();
  const last6 = s.length >= 6 ? s.slice(-6) : s;
  const n = parseInt(last6, 10);
  return Number.isNaN(n) ? last6 : String(n);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchId = body.batchId;
    const startDate = body.startDate || '';
    const endDate = body.endDate || '';

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    const steps = {};

    // Batch date range: use the "start" and "end" properties from any accounting-atom doc for this batch
    // (e.g. "start": "2026-01-19", "end": "2026-02-01") for the hours query range
    let batchStartDate = startDate;
    let batchEndDate = endDate;
    try {
      const batchDocResponse = await searchOpenSearch({
        index: 'conn_prod_test_accounting_atoms',
        body: {
          size: 1,
          query: {
            bool: {
              must: [{ match: { 'meta.batch.batchID.keyword': batchId } }],
            },
          },
          _source: ['start', 'end'],
        },
      });
      const hits = batchDocResponse?.body?.hits?.hits ?? batchDocResponse?.hits?.hits ?? [];
      const hit = hits[0];
      const doc = hit?._source;
      if (doc?.start != null && doc?.end != null) {
        batchStartDate = String(doc.start);
        batchEndDate = String(doc.end);
        steps.batchDateRange = { start: batchStartDate, end: batchEndDate };
      }
      if (hit) {
        steps.batchRecord = {
          _index: hit._index,
          _id: hit._id,
          _source: hit._source,
        };
      }
    } catch (e) {
      // keep request startDate/endDate if fetch fails
    }

    // Step 1: All employees in org (prod_tsheet_users) — user IDs, payroll IDs, names
    const usersSearch = await searchElasticsearch({
      index: 'prod_tsheet_users',
      body: {
        size: 10000,
        query: {
          bool: {
            filter: { term: { fitterweb_org_id: FITTERWEB_ORG_ID } },
          },
        },
        _source: ['id', 'payroll_id', 'name', 'display_name', 'first_name', 'last_name'],
      },
    });
    const userHits = usersSearch?.hits?.hits ?? usersSearch?.body?.hits?.hits ?? [];
    const userIds = [];
    const payrollIds = [];
    const userDetails = {};
    for (const h of userHits) {
      const s = h._source ?? {};
      const uid = String(s.id ?? h._id);
      userIds.push(uid);
      const payrollId = s.payroll_id ?? s.payrollId;
      if (payrollId != null) payrollIds.push(String(payrollId));
      userDetails[uid] = {
        id: uid,
        payroll_id: payrollId,
        name: s.name ?? s.display_name ?? ([s.first_name, s.last_name].filter(Boolean).join(' ') || '—'),
      };
    }
    steps.userIds = userIds;
    steps.payrollIds = [...new Set(payrollIds)];
    steps.userDetails = userDetails;

    if (userIds.length === 0) {
      return NextResponse.json({
        steps,
        finalRows: [],
        error: 'No users found for this organization',
      });
    }

    // Step 2: Employee IDs (last 6 of payroll_id)
    const employeeIds = [...new Set(steps.payrollIds.map(payrollIdToEmployeeId).filter(Boolean))];
    steps.employeeIds = employeeIds;

    if (employeeIds.length === 0) {
      return NextResponse.json({
        steps,
        finalRows: [],
        error: 'No employee IDs derived from payroll IDs',
      });
    }

    // Step 4: Atoms from OpenSearch (ER benefits by employee for this batch)
    const atomsResponse = await searchOpenSearch({
      index: 'conn_prod_test_accounting_atoms',
      body: {
        size: 0,
        query: {
          bool: {
            must: [
              { match: { 'meta.batch.batchID.keyword': batchId } },
              { terms: { 'atomName.keyword': ER_ATOM_NAMES } },
              { terms: { 'person.payrollID.keyword': employeeIds } },
            ],
          },
        },
        aggs: {
          byPayrollId: {
            terms: { field: 'person.payrollID.keyword', size: 1000 },
            aggs: {
              atomType: {
                terms: { field: 'atomName.keyword', size: 1000 },
                aggs: {
                  atomType: {
                    terms: { field: 'type.keyword', size: 10000 },
                    aggs: {
                      atomSum: {
                        sum: { field: 'amount' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const aggs = atomsResponse?.body?.aggregations ?? atomsResponse?.aggregations ?? {};
    const byPayrollIdBuckets = aggs.byPayrollId?.buckets ?? [];
    const atomsByEmployee = {};
    for (const payrollBucket of byPayrollIdBuckets) {
      const payrollIdKey = payrollBucket.key;
      const empId = payrollIdToEmployeeId(payrollIdKey);
      atomsByEmployee[empId] = atomsByEmployee[empId] ?? { payrollIdKey, atoms: [] };
      const atomTypeBuckets = payrollBucket.atomType?.buckets ?? [];
      for (const atomBucket of atomTypeBuckets) {
        const atomName = atomBucket.key;
        const innerBuckets = atomBucket.atomType?.buckets ?? [];
        for (const typeBucket of innerBuckets) {
          const amount = typeBucket.atomSum?.value ?? 0;
          atomsByEmployee[empId].atoms.push({ atomName, type: typeBucket.key, amount });
        }
      }
    }
    steps.atomsSummary = atomsByEmployee;

    // Step 5: Total hours per user in batch date range (Elasticsearch)
    const timesheetsHoursBody = {
      size: 0,
      query: {
        bool: {
          must: [
            { match: { active: true } },
            { term: { on_the_clock: { value: false } } },
            { terms: { user_id: userIds.map(Number) } },
            { match: { fitterweb_org_id: FITTERWEB_ORG_ID } },
          ],
          must_not: [
            { match: { 'jobcode_type.keyword': 'pto' } },
            { match: { 'jobcode_type.keyword': 'unpaid_break' } },
            { match: { 'jobcode_type.keyword': 'unpaid_time_off' } },
          ],
        },
      },
      aggs: {
        byUser: {
          terms: { field: 'user_id', size: 1000 },
          aggs: {
            duration: {
              sum: { field: 'duration' },
            },
          },
        },
      },
    };
    if (batchStartDate && batchEndDate) {
      timesheetsHoursBody.query.bool.must.push({
        range: {
          date: {
            gte: String(batchStartDate),
            lte: String(batchEndDate),
          },
        },
      });
    }

    // Expose exact JSON sent to Elasticsearch for debugging
    steps.hoursQuerySentToElasticsearch = JSON.stringify(
      { index: 'prod_tsheet_timesheets', body: timesheetsHoursBody },
      null,
      2
    );

    const timesheetsHours = await searchElasticsearch({
      index: 'prod_tsheet_timesheets',
      body: timesheetsHoursBody,
    });

    const hoursAgg = timesheetsHours?.aggregations?.byUser ?? timesheetsHours?.body?.aggregations?.byUser;
    const hoursBuckets = hoursAgg?.buckets ?? [];
    const hoursByUser = {};
    for (const b of hoursBuckets) {
      const uid = String(b.key);
      const durationSec = b.duration?.value ?? 0;
      hoursByUser[uid] = durationSec / 3600;
    }
    steps.hoursByUser = hoursByUser;

    // Map employee id (last 6 of payroll_id) -> user_id for name/hours
    const empIdToUserId = {};
    for (const [uid, detail] of Object.entries(userDetails)) {
      const eid = payrollIdToEmployeeId(detail.payroll_id);
      if (eid) empIdToUserId[eid] = uid;
    }

    // Load enrollment benefits from spreadsheet (employee name -> benefits)
    let enrollmentsByEmployee = new Map();
    try {
      enrollmentsByEmployee = await loadEnrollments();
      steps.enrollmentRowCount = Array.from(enrollmentsByEmployee.values()).reduce((s, m) => s + m.size, 0);
    } catch (e) {
      steps.enrollmentError = e.message ?? 'Failed to load enrollment spreadsheet';
    }

    // Build set of employees to include: those with atoms OR those with enrollments
    const employeesToReport = new Map();
    for (const [empId, data] of Object.entries(atomsByEmployee)) {
      const userId = empIdToUserId[data.payrollIdKey] ?? empIdToUserId[empId];
      const detail = userDetails[userId] ?? {};
      employeesToReport.set(empId, { userId, detail, atoms: data.atoms });
    }
    for (const [uid, detail] of Object.entries(userDetails)) {
      const empId = payrollIdToEmployeeId(detail.payroll_id);
      if (!empId || employeesToReport.has(empId)) continue;
      const enrollmentBenefits = getEnrollmentBenefitsForEmployee(enrollmentsByEmployee, detail.name);
      if (enrollmentBenefits.length > 0) {
        employeesToReport.set(empId, { userId: uid, detail, atoms: [] });
      }
    }

    // Build final rows using BigNumber for accuracy
    const toBN = (n) => (n != null && !Number.isNaN(Number(n)) ? new BigNumber(n) : new BigNumber(0));
    const round8 = (bn) => (bn.isZero() ? bn : bn.decimalPlaces(DP, BigNumber.ROUND_HALF_UP));

    const finalRows = [];
    for (const [empId, { userId, detail, atoms }] of employeesToReport) {
      const totalHours = userId ? (hoursByUser[userId] ?? 0) : 0;
      const totalHoursBN = toBN(totalHours);
      const employeeName = detail.name ?? '—';

      let sumHourlyRate = new BigNumber(0);
      let sumAtomAmount = new BigNumber(0);

      // OpenSearch atoms
      for (const a of atoms) {
        const amount = round8(toBN(a.amount));
        const hourlyRate = totalHoursBN.gt(0)
          ? round8(amount.dividedBy(totalHoursBN))
          : amount;
        sumHourlyRate = sumHourlyRate.plus(hourlyRate);
        sumAtomAmount = sumAtomAmount.plus(amount);
        finalRows.push({
          employeeName,
          userId: userId ?? '—',
          employeeId: empId,
          atomName: a.atomName,
          atomAmount: amount.toFixed(DP),
          totalHours: totalHours > 0 ? Math.round(totalHours * 100) / 100 : totalHours,
          hourlyRate: hourlyRate.toFixed(DP),
        });
      }

      // Enrollment benefits from spreadsheet (PLAN CATEGORY, employer cost adjusted to biweekly)
      const enrollmentBenefits = getEnrollmentBenefitsForEmployee(enrollmentsByEmployee, employeeName);
      for (const { benefitName, biweeklyAmount } of enrollmentBenefits) {
        const amount = round8(toBN(biweeklyAmount));
        const hourlyRate = totalHoursBN.gt(0)
          ? round8(amount.dividedBy(totalHoursBN))
          : amount;
        sumHourlyRate = sumHourlyRate.plus(hourlyRate);
        sumAtomAmount = sumAtomAmount.plus(amount);
        finalRows.push({
          employeeName,
          userId: userId ?? '—',
          employeeId: empId,
          atomName: benefitName,
          atomAmount: amount.toFixed(DP),
          totalHours: totalHours > 0 ? Math.round(totalHours * 100) / 100 : totalHours,
          hourlyRate: hourlyRate.toFixed(DP),
        });
      }

      // Total row
      finalRows.push({
        employeeName,
        userId: userId ?? '—',
        employeeId: empId,
        atomName: 'Total',
        atomAmount: round8(sumAtomAmount).toFixed(DP),
        totalHours: totalHours > 0 ? Math.round(totalHours * 100) / 100 : totalHours,
        hourlyRate: round8(sumHourlyRate).toFixed(DP),
      });
    }

    return NextResponse.json({
      steps,
      finalRows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Report failed' },
      { status: 500 }
    );
  }
}
