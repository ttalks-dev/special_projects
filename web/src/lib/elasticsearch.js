/**
 * Use the OpenSearch client for the Elasticsearch endpoint to avoid 406 errors.
 * The official @elastic/elasticsearch client sends a Content-Type header that
 * OpenSearch and some Elasticsearch versions reject. The OpenSearch client
 * uses standard JSON and works with both.
 */
import { Client } from '@opensearch-project/opensearch';
import { getConfig } from './env.js';

let client = null;

export function getElasticsearchClient() {
  if (!client) {
    const cfg = getConfig().elasticsearch;
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

export async function searchElasticsearch(params) {
  const c = getElasticsearchClient();
  const response = await c.search(params);
  // Normalize to Elasticsearch-style response (aggregations at top level) for existing callers
  const body = response?.body ?? response;
  return body;
}