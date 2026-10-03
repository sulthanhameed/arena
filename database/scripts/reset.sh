#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Rebuild the local Khang database from migrations + seed data.
#
#   ./database/scripts/reset.sh            → local stack (supabase start)
#   ./database/scripts/reset.sh --linked   → the linked hosted project
#
# ⚠ This destroys all local data. On a hosted project it only pushes
#   migrations (it never drops your tables).
# ─────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/../.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ Supabase CLI not found."
  echo "   npm install -g supabase   # or: brew install supabase/tap/supabase"
  exit 1
fi

if [[ "${1:-}" == "--linked" ]]; then
  echo "🚀 Pushing migrations to the linked project…"
  supabase db push

  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    echo "🌱 Seeding…"
    psql "$SUPABASE_DB_URL" -f supabase/seed.sql
  else
    echo "ℹ  Set SUPABASE_DB_URL to also run supabase/seed.sql"
    echo "   (Dashboard → Project Settings → Database → Connection string)"
  fi
else
  if ! supabase status >/dev/null 2>&1; then
    echo "▶  Starting the local stack…"
    supabase start
  fi
  echo "🔄 Resetting the local database (migrations + seed)…"
  supabase db reset
fi

echo ""
echo "✅ Done!"
echo "   Admin login: admin@khang.com / admin123"
echo "   Studio:      http://127.0.0.1:54323"
