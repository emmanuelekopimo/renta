#!/usr/bin/env bash
# Deploys Renta + a managed PostgreSQL database to the Railway project
# "school-projects".
#
# Prereqs: Railway CLI (npm i -g @railway/cli) and either `railway login`
# or a RAILWAY_API_TOKEN / RAILWAY_TOKEN environment variable.
set -euo pipefail

PROJECT="${RAILWAY_PROJECT:-school-projects}"
SERVICE="${RAILWAY_SERVICE:-renta}"

echo "→ Linking to Railway project '$PROJECT'"
railway link --project "$PROJECT"

echo "→ Ensuring a PostgreSQL database exists"
if ! railway variables --service Postgres --kv >/dev/null 2>&1; then
  railway add --database postgres
fi

echo "→ Ensuring the '$SERVICE' app service exists"
railway add --service "$SERVICE" >/dev/null 2>&1 || true

echo "→ Configuring variables"
railway variables --service "$SERVICE" \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set "SESSION_SECRET=$(openssl rand -hex 32)" \
  --set 'NODE_ENV=production'

echo "→ Deploying (build → migrate → seed demo data if empty → start)"
railway up --service "$SERVICE" --detach

echo "→ Generating a public URL"
railway domain --service "$SERVICE" || true
echo "✔ Done. Sign in with demo@renta.app / renta123"
