#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Back up the Khang Supabase database.
#
#   ./database/scripts/backup.sh              → local stack
#   ./database/scripts/backup.sh --linked     → linked hosted project
#
# Produces three files per run:
#   khang-<ts>-roles.sql   roles
#   khang-<ts>-schema.sql  DDL (tables, policies, functions, triggers)
#   khang-<ts>-data.sql    data only
#
# Supabase also takes automatic daily backups on paid plans — this script is
# for local snapshots, migrations between projects, and belt-and-braces.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/../.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PREFIX="$BACKUP_DIR/khang-$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ Supabase CLI not found."
  echo "   npm install -g supabase   # or: brew install supabase/tap/supabase"
  exit 1
fi

TARGET=(--local)
LABEL="local stack"
if [[ "${1:-}" == "--linked" ]]; then
  TARGET=(--linked)
  LABEL="linked hosted project"
fi

echo "💾 Backing up the $LABEL → $PREFIX-*.sql"

supabase db dump "${TARGET[@]}" --role-only -f "$PREFIX-roles.sql"
supabase db dump "${TARGET[@]}"             -f "$PREFIX-schema.sql"
supabase db dump "${TARGET[@]}" --data-only -f "$PREFIX-data.sql"

tar -czf "$PREFIX.tar.gz" -C "$BACKUP_DIR" \
  "khang-$TIMESTAMP-roles.sql" \
  "khang-$TIMESTAMP-schema.sql" \
  "khang-$TIMESTAMP-data.sql"

rm -f "$PREFIX-roles.sql" "$PREFIX-schema.sql" "$PREFIX-data.sql"

echo "✅ Backup complete: $PREFIX.tar.gz"
echo ""
echo "To restore into a fresh project:"
echo "  tar -xzf $PREFIX.tar.gz"
echo "  psql \"\$SUPABASE_DB_URL\" -f khang-$TIMESTAMP-roles.sql"
echo "  psql \"\$SUPABASE_DB_URL\" -f khang-$TIMESTAMP-schema.sql"
echo "  psql \"\$SUPABASE_DB_URL\" -f khang-$TIMESTAMP-data.sql"
