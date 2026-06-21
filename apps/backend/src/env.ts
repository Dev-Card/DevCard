import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  if (process.env.NODE_ENV === 'production') {
    // In production, env vars come from Kubernetes secrets — .env file is not expected.
  } else {
    // In development, .env is required. Fail fast.
    throw result.error;
  }
}
