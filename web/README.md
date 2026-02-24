# Fringe Rate Report — Epic Industrial Certified Payroll

Next.js + React front end for running the Fringe Rate Report.

## Setup

From the **repo root**, copy `.env` (or ensure parent has OpenSearch/Elasticsearch env vars). The app loads `../.env` when running from `web/`.

```bash
cd web
npm install
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Home**: List of payroll batches (OpenSearch). Click **Run report** for a batch.
- **Report page**: Run report, view step-by-step results, then the final table and **Download Excel**.

## Build

```bash
npm run build
npm start
```
