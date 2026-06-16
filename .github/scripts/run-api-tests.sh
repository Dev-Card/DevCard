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
COLLECTION="apps/backend/postman/DevCard.postman_collection.json"

SERVER_PID=""

# Always stop the server, however this script exits.
cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "Stopping API server (pid ${SERVER_PID})"
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "::group::Apply migrations and seed"
npm --prefix apps/backend exec prisma migrate deploy
npm --prefix apps/backend run db:seed
echo "::endgroup::"

echo "::group::Start API server"
npm --prefix apps/backend exec tsx src/server.ts &
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
