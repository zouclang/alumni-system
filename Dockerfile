# Stage 1: Dependencies
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Optimize: Use Aliyun mirror for Debian
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# Optimize: Use Aliyun mirror for NPM
RUN npm config set registry https://registry.npmmirror.com && npm ci

# Stage 2: Builder
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application (standalone output must be enabled in next.config.ts)
RUN npm run build

# Stage 3: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Optional: Add non-root user for security
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R node:node /app/data

# Copy standalone output and necessary public files
# The standalone build includes minimal node_modules and server files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# We need to install production dependencies (specifically better-sqlite3)
# because the standalone trace might not perfectly capture native bindings across OS boundaries.
# However, Next.js standalone usually bundles deps. If better-sqlite3 fails to load,
# it's usually because the binding wasn't copied correctly. 
# In this setup, we rely on the standalone output copying the compiled better-sqlite3 .node file from the builder.

USER node

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "server.js"]
