#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Seed the Khang database
# Usage:  ./database/scripts/seed.sh [mongo-uri]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

MONGO_URI="${1:-mongodb://localhost:27017/khang}"

echo "🌱 Seeding database at $MONGO_URI"
echo ""

# Use the Node-based seed in backend (handles bcrypt for admin password)
cd "$(dirname "$0")/../../backend"

if [ ! -d node_modules ]; then
  echo "→ Installing backend dependencies..."
  npm install
fi

MONGO_URI="$MONGO_URI" npm run seed

echo ""
echo "✅ Done!"
echo "   Admin login: admin@khang.com / admin123"
