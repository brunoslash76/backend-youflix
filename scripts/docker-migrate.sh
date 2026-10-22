#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building the app image..."
docker compose build app

echo "Starting Postgres..."
docker compose up -d --wait db

echo "Running migrations..."
docker compose run --rm --no-deps app sh -c "npm run build && npm run migration:run:prod"
