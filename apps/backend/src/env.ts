import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  // Keep failing fast but avoid leaking via console in production code paths.
  // This file runs before the Fastify logger is available; throw so the process exits.
  throw result.error;
} else {
  // .env loaded successfully
}
