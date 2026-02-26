import { Client } from '@opensearch-project/opensearch';
import { getConfig } from './env.js';

let client = null;

export function getOpenSearchClient() {
  if (!client) {
    const cfg = getConfig().opensearch;
    client = new Client({
      node: cfg.node,
      auth: cfg.auth,
      ssl: cfg.ssl,
    });
  }
  return client;
}

export async function searchOpenSearch(params) {
  const c = getOpenSearchClient();
  return c.search(params);
}

export function getOpenSearchHits(response) {
  const hits = response?.body?.hits?.hits ?? response?.hits?.hits ?? [];
  return hits.map((h) => ({ _id: h._id, _index: h._index, ...(h._source || {}) }));
}
