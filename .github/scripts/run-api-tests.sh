#!/usr/bin/env bash
#
# Runs the DevCard Postman collection against a freshly-booted backend.
#
# Invoked by .github/workflows/api-tests.yml. Keeping the orchestration here
# (rather than inline in the YAML) matches the repo convention of housing
# workflow logic under .github/scripts/.
#
# Expects to be run from the repository root with these env vars set:
#   DATABASE_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY, NODE_ENV, PORT
#
# Steps: apply migrations + seed -> start server -> wait for /health ->
# run Newman -> always stop the server on exit.

set -euo pipefail

PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
COLLECTION="postman/DevCard.postman_collection.json"

SERVER_PID=""

# Always stop the server, however this script exits.
cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "Stopping API server (pid ${SERVER_PID})"
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Prisma and tsx resolve paths relative to the working directory, so run
# everything from the backend package rather than the repo root.
cd apps/backend

# CI runs against an ephemeral database with no migration history, and the
# committed migrations can lag schema.prisma. `db push` syncs the database
# straight from the schema — the right tool for a throwaway test database.
echo "::group::Sync database schema and seed"
npx prisma db push --skip-generate
npm run db:seed
echo "::endgroup::"

# src/env.ts loads a repo-root .env via dotenv and throws if the file is
# absent. CI supplies config through real env vars, so materialise a .env
# from them (dotenv does not override values already set in the environment).
echo "::group::Write .env for dotenv"
cat > ../../.env <<EOF
DATABASE_URL=${DATABASE_URL:-}
REDIS_URL=${REDIS_URL:-}
JWT_SECRET=${JWT_SECRET:-}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-}
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-3000}
PUBLIC_APP_URL=${PUBLIC_APP_URL:-}
EOF
echo "::endgroup::"

echo "::group::Start API server"
npx tsx src/server.ts &
SERVER_PID=$!
echo "Server started (pid ${SERVER_PID})"
echo "::endgroup::"

echo "::group::Wait for server health"
for ((i = 1; i <= HEALTH_RETRIES; i++)); do
  if curl -sf "${BASE_URL}/health" > /dev/null; then
    echo "Server is up after ${i} attempt(s)"
    break
  fi
  if [[ "${i}" -eq "${HEALTH_RETRIES}" ]]; then
    echo "Server did not become healthy within $((HEALTH_RETRIES * HEALTH_INTERVAL))s"
    exit 1
  fi
  sleep "${HEALTH_INTERVAL}"
done
echo "::endgroup::"

echo "::group::Run Newman"
npx --yes newman run "${COLLECTION}" \
  --env-var "baseUrl=${BASE_URL}" \
  --reporters cli
echo "::endgroup::"
