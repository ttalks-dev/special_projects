# Mace

Query **OpenSearch** and **Elasticsearch**, process the data, and export results to **Excel** (.xlsx).

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your OpenSearch and/or Elasticsearch endpoints and credentials.
```

## Configuration

Copy `.env.example` to `.env` and set:

- **OpenSearch**: `OPENSEARCH_NODE`, optional `OPENSEARCH_USER` / `OPENSEARCH_PASSWORD`, and `OPENSEARCH_INSECURE` for self-signed certs.
- **Elasticsearch**: `ELASTICSEARCH_NODE`, and either `ELASTICSEARCH_API_KEY` or `ELASTICSEARCH_USER` / `ELASTICSEARCH_PASSWORD`, plus `ELASTICSEARCH_INSECURE` if needed.
- **Output**: optional `OUTPUT_DIR` (default `./output`).

## Adding queries and endpoints

1. **Queries**: In `src/queries/index.js`, add async functions that call `searchOpenSearch()` or `searchElasticsearch()` and return an array of row objects.
2. **Runner**: In `src/index.js`, add each function to the `QUERY_JOBS` array with a sheet name.

Example query:

```js
export async function myReport() {
  const response = await searchOpenSearch({
    index: 'my-index',
    body: { size: 5000, query: { match: { status: 'active' } } },
  });
  return getOpenSearchHits(response);
}
```

Then in `src/index.js`:

```js
const QUERY_JOBS = [
  { name: 'My Report', fn: queries.myReport },
  // ...
];
```

## Run

```bash
npm start
```

Excel files are written to `./output` (or `OUTPUT_DIR`) with one sheet per query job.

---

## Fringe Rate Report (Epic Industrial Certified Payroll)

A **Next.js + React** web app to run the Fringe Rate Report: ER-provided benefits as hourly rates for employees who worked certified payroll jobs.

### Run the web app

From the repo root, ensure `.env` has `OPENSEARCH_NODE` and `ELASTICSEARCH_NODE` (and auth if required). Then:

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Flow

1. **Batches list** — Recent payroll batches (OpenSearch `staging_batches`, paygroup W0R) with Batch ID, paygroup, start/end dates and a **Run report** button per row.
2. **Run report** — For the chosen batch:
   - **Step 1**: User IDs who booked time on certified job codes (Elasticsearch `prod_tsheet_timesheets`, jobcode_ids 44447908, 44447906, 44756324).
   - **Step 2**: Payroll IDs and user details (Elasticsearch `prod_tsheet_users`).
   - **Step 3**: Employee IDs = last 6 characters of payroll_id, parsed as integer then back to string.
   - **Step 4**: ER benefit atoms for the batch and those employees (OpenSearch `conn_prod_test_accounting_atoms`: Memo ER EMPLO LIFADD, Memo ER SPOUS LIFADD, Memo ER CHILD LIFADD, ER 401K ER MATCH).
   - **Step 5**: Total hours per user in the batch date range (Elasticsearch timesheets, excluding PTO/unpaid break/unpaid time off).
3. **Output** — Table and **Download Excel** with columns: Employee Name, User ID, Employee ID, atomName, Atom amount, Total Hours, Hourly Rate (Atom amount ÷ Total Hours).

The report page shows each step’s result (user IDs, payroll IDs, employee IDs, atoms summary, hours by user) and the final spreadsheet table.
