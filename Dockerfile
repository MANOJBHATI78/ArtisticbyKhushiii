# Artistic by Khushi — production image
# Runs `next start` (not the standalone server) so node_modules, sharp and the
# Prisma query engine all stay together on one runtime. Data (SQLite + uploads)
# lives on a persistent volume mounted at /data.
FROM oven/bun:1
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# ---- Dependencies (cached layer) ----
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Application + seed data ----
# db/custom.db ships inside the image and is copied to /data on FIRST boot only.
COPY . .

# Generate the Prisma client and build Next.js.
# (Next compiles with NODE_ENV=production; .env's DATABASE_URL is not used at build time.)
RUN bunx prisma generate
RUN bun run build

# Runtime data location — mount a volume at /data in your host platform.
ENV DATABASE_URL=file:/data/custom.db \
    ABK_UPLOAD_DIR=/data/public-uploads

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
