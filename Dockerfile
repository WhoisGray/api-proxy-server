# syntax=docker/dockerfile:1.6
################################################################################
# API Proxy Server - Production Dockerfile (Multi-stage, Small, Secure)
#
# ✅ Small image (alpine) + multi-stage
# ✅ Uses Corepack (no global pnpm install needed)
# ✅ Production-only deps
# ✅ BuildKit cache for fast CI builds
# ✅ Runs as non-root user
################################################################################

############################
# Stage 1: deps (install only prod deps)
############################

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps

# Set production by default (affects some packages + reduces noise)
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Enable pnpm via corepack (built into Node 16+)
# This avoids "npm i -g pnpm" and keeps images cleaner.
RUN corepack enable

# Copy only dependency manifests first to maximize layer caching
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only.
# Using BuildKit cache makes installs much faster in CI.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --prod --frozen-lockfile

############################
# Stage 2: runner (final runtime image)
############################
FROM node:${NODE_VERSION}-alpine AS runner

# tini (optional but recommended) handles PID 1 properly (signals, zombie reaping)
# Keeps container behavior clean in production.
RUN apk add --no-cache tini

ENV NODE_ENV=production
WORKDIR /app

# Copy only production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only the runtime source files you actually need.
# (Avoid copying dev files / docs / workflow files into the final image.)
# If your repo only has server.js and a few files, keep it minimal like below:
COPY server.js package.json ./

# If you have additional runtime files (e.g. config, src, etc.), add them explicitly:
# COPY src ./src

# Security: run as the built-in non-root "node" user
USER node

# Default port (you can override with -e PORT=xxxx)
EXPOSE 42000

# Optional healthcheck (very useful for orchestration)
# Note: relies on your server responding on "/" with 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||42000,path:'/'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Use tini as entrypoint (PID 1)
ENTRYPOINT ["tini", "--"]

# Start the server
CMD ["node", "server.js"]