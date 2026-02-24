/**
 * Add your OpenSearch and Elasticsearch queries and endpoints here.
 * Each exported async function can run a query and return rows for Excel.
 */

import { searchOpenSearch, getOpenSearchHits } from '../clients/opensearch.js';
import { searchElasticsearch, getElasticsearchHits } from '../clients/elasticsearch.js';

const FITTERWEB_ORG_ID = 274;
const HASH_INDEX = 'prod_hashes';
/** Field in hash document that holds the base64-encoded JSON (change if your mapping differs) */
const HASH_CONTENT_FIELD = 'content';

/** Extract alphanumeric hash from byPacketId key (string after the last '.') */
function hashFromPacketKey(key) {
  if (key == null || key === '') return '';
  const afterDot = key.includes('.') ? key.split('.').pop() : key;
  return String(afterDot).replace(/[^A-Za-z0-9]/g, '') || key;
}

/** Fetch hash document from prod_hashes, decode base64 content to JSON array of properties. Cached per hash. */
const hashCache = new Map();
async function getHashProperties(hash) {
  if (!hash) return [];
  if (hashCache.has(hash)) return hashCache.get(hash);
  try {
    const response = await searchOpenSearch({
      index: HASH_INDEX,
      body: {
        size: 10000,
        query: {
          bool: {
            filter: {
              term: { fitterweb_org_id: FITTERWEB_ORG_ID },
            },
            must: [{ match: { hash } }],
          },
        },
      },
    });
    const hits = getOpenSearchHits(response);
    const first = hits[0];
    const raw = first?.[HASH_CONTENT_FIELD] ?? first?.content ?? first?.data;
    if (raw == null) {
      hashCache.set(hash, []);
      return [];
    }
    const decoded = Buffer.from(String(raw), 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const props = Array.isArray(parsed) ? parsed : [parsed];
    hashCache.set(hash, props);
    return props;
  } catch (e) {
    hashCache.set(hash, []);
    return [];
  }
}

/** Get Union Name from hash content array (entry with key "Unions"). */
function getUnionNameFromProps(props) {
  if (!Array.isArray(props)) return '';
  const unionsEntry = props.find(
    (p) => p && typeof p === 'object' && (p.key === 'Unions' || p.Unions !== undefined)
  );
  if (!unionsEntry) return '';
  return unionsEntry.value ?? unionsEntry.Unions ?? '';
}

// ---------------------------------------------------------------------------
// OpenSearch: accounting atoms by batch + hash lookups
// Output: Pay Item Name, Union Name (from hash content "Unions"), Item Type, Sum
// ---------------------------------------------------------------------------

export async function accountingAtomsByBatch() {
  const response = await searchOpenSearch({
    index: 'conn_prod_test_accounting_atoms',
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            {
              match: {
                'meta.batch.batchID.keyword': 'KZH_1792_40_1_2025-10-01',
              },
            },
          ],
        },
      },
      aggs: {
        byAtomName: {
          terms: {
            field: 'atomName.keyword',
            size: 10000,
            missing: 'N/A',
          },
          aggs: {
            byPacketId: {
              terms: {
                field: 'packetID.keyword',
                size: 1000,
              },
              aggs: {
                atomType: {
                  terms: {
                    field: 'type.keyword',
                    size: 1000,
                  },
                  aggs: {
                    atomSum: {
                      sum: {
                        field: 'amount',
                      },
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

  const aggs = response?.body?.aggregations ?? response?.aggregations ?? {};
  const byAtomNameBuckets = aggs.byAtomName?.buckets ?? [];
  const rawRows = [];

  for (const atomBucket of byAtomNameBuckets) {
    const payItemName = atomBucket.key ?? 'N/A';
    const byPacketIdBuckets = atomBucket.byPacketId?.buckets ?? [];
    for (const packetBucket of byPacketIdBuckets) {
      const packetKey = packetBucket.key ?? 'N/A';
      const hash = hashFromPacketKey(packetKey);
      const atomTypeBuckets = packetBucket.atomType?.buckets ?? [];
      for (const typeBucket of atomTypeBuckets) {
        const type = typeBucket.key ?? 'N/A';
        const amount = typeBucket.atomSum?.value ?? 0;
        rawRows.push({
          payItemName,
          packetKey,
          hash,
          type,
          amount,
        });
      }
    }
  }

  // Unique hashes to look up (avoid duplicate queries)
  const uniqueHashes = [...new Set(rawRows.map((r) => r.hash).filter(Boolean))];
  await Promise.all(uniqueHashes.map((h) => getHashProperties(h)));

  const rows = rawRows.map((r) => {
    const props = hashCache.get(r.hash) ?? [];
    const unionName = getUnionNameFromProps(props);
    return {
      'Pay Item Name': r.payItemName,
      'Union Name': unionName,
      'Item Type': r.type,
      Sum: r.amount,
    };
  });

  // Summary: one row per unique (Pay Item Name, Union Name, Item Type) with Sum totaled
  const summaryKey = (r) => `${r['Pay Item Name']}\t${r['Union Name']}\t${r['Item Type']}`;
  const sumByKey = new Map();
  for (const r of rows) {
    const k = summaryKey(r);
    const existing = sumByKey.get(k);
    if (!existing) {
      sumByKey.set(k, { 'Pay Item Name': r['Pay Item Name'], 'Union Name': r['Union Name'], 'Item Type': r['Item Type'], Sum: r.Sum });
    } else {
      existing.Sum += r.Sum;
    }
  }
  const summaryRows = [...sumByKey.values()];

  return {
    sheets: [
      { name: 'Accounting_Atoms_Detail', rows },
      { name: 'Accounting_Atoms_Summary', rows: summaryRows },
    ],
  };
}

// ---------------------------------------------------------------------------
// Example: OpenSearch query (replace index and body with your endpoint/query)
// ---------------------------------------------------------------------------

export async function opensearchExample() {
  const response = await searchOpenSearch({
    index: 'your-opensearch-index',
    body: {
      size: 1000,
      query: {
        match_all: {},
      },
    },
  });
  const hits = getOpenSearchHits(response);
  return hits.map((h) => ({ ...h }));
}

// ---------------------------------------------------------------------------
// Example: Elasticsearch query (replace index and body with your endpoint/query)
// ---------------------------------------------------------------------------

export async function elasticsearchExample() {
  const response = await searchElasticsearch({
    index: 'your-elasticsearch-index',
    body: {
      size: 1000,
      query: {
        match_all: {},
      },
    },
  });
  const hits = getElasticsearchHits(response);
  return hits.map((h) => ({ ...h }));
}

// ---------------------------------------------------------------------------
// Add more query functions as needed, e.g.:
// export async function myOpenSearchReport() { ... }
// export async function myElasticsearchReport() { ... }
// ---------------------------------------------------------------------------
