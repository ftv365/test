#!/usr/bin/env bash
# Makes a fresh session (web, container, new clone) able to run tests, lint,
# and the app without manual setup. Safe to re-run: every step is a no-op when
# the work is already done.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env

if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1
fi

npx prisma generate >/dev/null 2>&1

if [ ! -f prisma/staging.db ]; then
  npx prisma db push --skip-generate >/dev/null 2>&1
  npm run db:seed >/dev/null 2>&1
fi

echo "Myrtle365 staging ready: npm run dev | npm test | npm run lint"
