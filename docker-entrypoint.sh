#!/bin/sh
set -e

# /data is the persistent volume: database + uploaded media.
mkdir -p /data/public-uploads

# First boot: initialise the database from the bundled seed copy
# (22 products, 10 categories, 6 blog posts, admin user, site settings).
if [ ! -f /data/custom.db ]; then
  echo "[entrypoint] First boot — initialising database from bundled seed…"
  cp /app/db/custom.db /data/custom.db
fi

echo "[entrypoint] Starting Artistic by Khushi on port ${PORT:-3000}…"
exec bunx next start -p "${PORT:-3000}"
