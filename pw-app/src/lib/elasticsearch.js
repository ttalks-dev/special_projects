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
  return response?.body ?? response;
}
