import path from 'path';
import dotenv from 'dotenv';

const rootEnv = path.resolve(process.cwd(), '..', '.env');
dotenv.config({ path: rootEnv });

export function getConfig() {
  return {
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
