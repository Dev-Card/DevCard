/**
 * Push the local Postman collection to your Postman workspace via the Postman API.
 *
 * Usage:
 *   POSTMAN_API_KEY=PMAK-xxxx npm run postman:push
 *
 * Env vars:
 *   POSTMAN_API_KEY         (required) Postman API key — https://go.postman.co/settings/me/api-keys
 *   POSTMAN_COLLECTION_UID  (optional) Existing collection UID to update in place.
 *                           If omitted, a new collection is created and its UID printed.
 *   POSTMAN_WORKSPACE_ID    (optional) Workspace to create the collection in (only used on create).
 *
 * The collection file is the single source of truth and lives in the repo. This
 * script just mirrors it into Postman so the team workspace never drifts.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.POSTMAN_COLLECTION_UID;
const WORKSPACE_ID = process.env.POSTMAN_WORKSPACE_ID;

if (!API_KEY) {
  console.error('Error: POSTMAN_API_KEY is not set. Create one at https://go.postman.co/settings/me/api-keys');
  process.exit(1);
}

const collectionPath = path.join(__dirname, 'DevCard.postman_collection.json');
const collection = JSON.parse(await readFile(collectionPath, 'utf8'));
const body = JSON.stringify({ collection });

const headers = { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' };

async function run() {
  let url;
  let method;
  if (COLLECTION_UID) {
    url = `https://api.getpostman.com/collections/${COLLECTION_UID}`;
    method = 'PUT';
  } else {
    url = 'https://api.getpostman.com/collections';
    if (WORKSPACE_ID) url += `?workspace=${WORKSPACE_ID}`;
    method = 'POST';
  }

  const res = await fetch(url, { method, headers, body });
  const json = await res.json();

  if (!res.ok) {
    console.error(`Postman API error (${res.status}):`, JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const uid = json.collection?.uid;
  if (COLLECTION_UID) {
    console.log(`Updated collection ${uid}`);
  } else {
    console.log(`Created collection ${uid}`);
    console.log('Set POSTMAN_COLLECTION_UID to this UID to update it in place next time.');
  }
}

await run();
