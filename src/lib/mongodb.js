import { MongoClient } from 'mongodb';
import { getConfig } from './env.js';

let clientPromise = null;

/**
 * Get a MongoDB client. Uses connection pooling - call once, reuse.
 * Set MONGODB_USERNAME, MONGODB_PASSWORD, and optionally MONGODB_HOST in .env.
 */
export function getMongoClient() {
  if (!clientPromise) {
    const uri = getConfig().mongodb.uri;
    if (!uri) {
      throw new Error('MONGODB_USERNAME and MONGODB_PASSWORD must be set in .env.');
    }
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

/**
 * Get a database. Lazy-connect on first use.
 * @param {string} dbName - Database name
 */
export async function getDatabase(dbName) {
  const c = await getMongoClient();
  return c.db(dbName);
}
