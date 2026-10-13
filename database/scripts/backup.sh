#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Daily backup of the Khang database
# Usage:  ./database/scripts/backup.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/khang}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/khang-$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "💾 Backing up Khang database → $OUT"
mongodump --uri="$MONGO_URI" --out="$OUT" --gzip

echo "🗜  Compressing..."
tar -czf "$OUT.tar.gz" -C "$BACKUP_DIR" "khang-$TIMESTAMP"
rm -rf "$OUT"

echo "✅ Backup complete: $OUT.tar.gz"
echo ""
echo "To restore:"
echo "  tar -xzf $OUT.tar.gz"
echo "  mongorestore --uri=\"\$MONGO_URI\" --gzip --drop khang-$TIMESTAMP/khang"
