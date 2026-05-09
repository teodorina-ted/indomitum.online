#!/usr/bin/env bash
# ─── Initial SSL Certificate Setup ──────────────────────────────
# Run ONCE before first production deployment.
# Usage: DOMAIN=yourdomain.com LETSENCRYPT_EMAIL=you@email.com ./scripts/init-ssl.sh

set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN env var}"
EMAIL="${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL env var}"

echo "→ Requesting SSL certificate for $DOMAIN..."

docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot \
  certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "✓ Certificate obtained! Restarting nginx-proxy..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx-proxy

echo "Done. HTTPS is now active for $DOMAIN"
