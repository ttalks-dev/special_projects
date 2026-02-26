import path from 'path';
import dotenv from 'dotenv';

// Load .env from repo root
const rootEnv = path.resolve(process.cwd(), '.env');
dotenv.config({ path: rootEnv });

export function getConfig() {
  const mongoUser = process.env.MONGODB_USERNAME || '';
  const mongoPass = process.env.MONGODB_PASSWORD || '';
  const mongoHost = process.env.MONGODB_HOST || 'dapt-staging.wt22x.mongodb.net';
  const mongoUri = mongoUser && mongoPass
    ? `mongodb+srv://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPass)}@${mongoHost}/?retryWrites=true&w=majority`
    : null;
  return {
    mongodb: {
      uri: mongoUri,
      username: mongoUser,
      password: mongoPass,
      host: mongoHost,
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE || 'https://localhost:9200',
      auth: process.env.OPENSEARCH_USER
        ? {
            username: process.env.OPENSEARCH_USER,
            password: process.env.OPENSEARCH_PASSWORD || '',
          }
        : undefined,
      ssl: {
        rejectUnauthorized: process.env.OPENSEARCH_INSECURE !== 'true',
      },
    },
    elasticsearch: {
      node: process.env.ELASTICSEARCH_NODE || 'https://localhost:9200',
      auth: process.env.ELASTICSEARCH_API_KEY
        ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
        : process.env.ELASTICSEARCH_USER
          ? {
              username: process.env.ELASTICSEARCH_USER,
              password: process.env.ELASTICSEARCH_PASSWORD || '',
            }
          : undefined,
      tls: {
        rejectUnauthorized: process.env.ELASTICSEARCH_INSECURE !== 'true',
      },
    },
  };
}
