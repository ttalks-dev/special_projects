import 'dotenv/config';

export const config = {
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
  output: {
    dir: process.env.OUTPUT_DIR || './output',
  },
};
