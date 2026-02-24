import { Client } from '@opensearch-project/opensearch';
import { config } from '../config.js';

let client = null;

/**
 * Get or create the OpenSearch client.
 * @returns {import('@opensearch-project/opensearch').Client}
 */
export function getOpenSearchClient() {
  if (!client) {
    client = new Client({
      node: config.opensearch.node,
      auth: config.opensearch.auth,
      ssl: config.opensearch.ssl,
    });
  }
  return client;
}

/**
 * Run a search query against OpenSearch.
 * @param {object} params - { index, body } or full search params
 * @returns {Promise<object>} Search response
 */
export async function searchOpenSearch(params) {
  const c = getOpenSearchClient();
  return c.search(params);
}

/**
 * Extract hits from OpenSearch search response into a flat array of _source objects.
 * @param {object} response - OpenSearch search response
 * @returns {object[]}
 */
export function getOpenSearchHits(response) {
  const hits = response?.body?.hits?.hits ?? response?.hits?.hits ?? [];
  return hits.map((h) => ({ _id: h._id, _index: h._index, ...(h._source || {}) }));
}
