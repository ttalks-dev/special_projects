/**
 * Use the OpenSearch client for the Elasticsearch endpoint to avoid 406 errors.
 * The official @elastic/elasticsearch client sends a Content-Type header
 * (application/vnd.elasticsearch+json; compatible-with=8) that OpenSearch
 * and some Elasticsearch versions reject. The OpenSearch client uses
 * standard JSON and works with both.
 */
import { Client } from '@opensearch-project/opensearch';
import { config } from '../config.js';

let client = null;

/**
 * Get or create the client for the Elasticsearch URL (OpenSearch client instance).
 */
export function getElasticsearchClient() {
  if (!client) {
    const cfg = config.elasticsearch;
    const auth = cfg.auth?.apiKey
      ? undefined
      : cfg.auth?.username
        ? { username: cfg.auth.username, password: cfg.auth.password || '' }
        : undefined;
    const headers = cfg.auth?.apiKey
      ? { Authorization: `ApiKey ${cfg.auth.apiKey}` }
      : undefined;
    client = new Client({
      node: cfg.node,
      auth,
      ssl: { rejectUnauthorized: cfg.tls?.rejectUnauthorized !== false },
      ...(headers && { headers }),
    });
  }
  return client;
}

/**
 * Run a search query against the Elasticsearch endpoint.
 * @param {object} params - { index, body } or full search params
 * @returns {Promise<object>} Search response (body)
 */
export async function searchElasticsearch(params) {
  const c = getElasticsearchClient();
  const response = await c.search(params);
  return response?.body ?? response;
}

/**
 * Extract hits from search response into a flat array of _source objects.
 */
export function getElasticsearchHits(response) {
  const hits = response?.hits?.hits ?? [];
  return hits.map((h) => ({ _id: h._id, _index: h._index, ...(h._source || {}) }));
}
