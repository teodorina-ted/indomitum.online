#!/usr/bin/env bash
# ─── Indomitum Database Backup Script ────────────────────────────
# Usage: ./scripts/backup.sh
# Backs up PostgreSQL and MongoDB to ./backups/ with timestamps.
# Schedule with cron:  0 2 * * * /path/to/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting backups..."

# ── PostgreSQL ──
PG_FILE="$BACKUP_DIR/pg_${TIMESTAMP}.sql.gz"
echo "  → PostgreSQL dump..."
docker compose exec -T db pg_dump -U indomitum indomitum | gzip > "$PG_FILE"
echo "  ✓ Saved to $PG_FILE ($(du -h "$PG_FILE" | cut -f1))"

# ── MongoDB ──
MONGO_FILE="$BACKUP_DIR/mongo_${TIMESTAMP}.gz"
echo "  → MongoDB dump..."
docker compose exec -T mongo mongodump \
  --username=indomitum \
  --password="${MONGO_PASSWORD:-changeme}" \
  --authenticationDatabase=admin \
  --db=indomitum \
  --archive --gzip | cat > "$MONGO_FILE"
echo "  ✓ Saved to $MONGO_FILE ($(du -h "$MONGO_FILE" | cut -f1))"

# ── Cleanup old backups ──
echo "  → Removing backups older than ${RETAIN_DAYS} days..."
find "$BACKUP_DIR" -name "pg_*.sql.gz" -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "mongo_*.gz" -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true

echo "[$(date +%Y%m%d_%H%M%S)] Backups complete."
