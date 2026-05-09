#!/usr/bin/env bash
# ─── Indomitum Database Restore Script ───────────────────────────
# Usage: ./scripts/restore.sh <pg_backup.sql.gz> <mongo_backup.gz>

set -euo pipefail

PG_FILE="${1:-}"
MONGO_FILE="${2:-}"

if [ -z "$PG_FILE" ] && [ -z "$MONGO_FILE" ]; then
  echo "Usage: $0 [pg_backup.sql.gz] [mongo_backup.gz]"
  echo "  Provide at least one backup file to restore."
  exit 1
fi

if [ -n "$PG_FILE" ]; then
  echo "→ Restoring PostgreSQL from $PG_FILE..."
  gunzip -c "$PG_FILE" | docker compose exec -T db psql -U indomitum -d indomitum
  echo "✓ PostgreSQL restored."
fi

if [ -n "$MONGO_FILE" ]; then
  echo "→ Restoring MongoDB from $MONGO_FILE..."
  cat "$MONGO_FILE" | docker compose exec -T mongo mongorestore \
    --username=indomitum \
    --password="${MONGO_PASSWORD:-changeme}" \
    --authenticationDatabase=admin \
    --db=indomitum \
    --archive --gzip --drop
  echo "✓ MongoDB restored."
fi

echo "Restore complete."
