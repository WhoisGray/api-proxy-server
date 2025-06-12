# Stage 1: Build dependencies
# We use node:18-alpine for a lightweight base image for both stages.
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy pnpm lock file and package.json to leverage Docker's build cache.
# This step is critical: if only source code changes, this layer (and subsequent pnpm install)
# can be reused, making builds much faster.
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally within this stage
RUN npm install -g pnpm

# Install production dependencies using pnpm.
# 'pnpm fetch --prod' fetches packages into pnpm's content-addressable store.
# 'pnpm install --prod --offline' links these fetched packages into node_modules,
# ensuring dependencies are installed efficiently and without re-downloading.
RUN pnpm fetch --prod && \
    pnpm install --prod --offline

# Stage 2: Create the final production image
# Use the same lightweight base image for consistency and minimal size.
FROM node:18-alpine AS runner

# Set the working directory for the application in the final image
WORKDIR /app

# Copy only the node_modules directory from the 'builder' stage.
# This ensures that only necessary runtime dependencies are included,
# significantly reducing the final image size by excluding build tools and dev dependencies.
COPY --from=builder /app/node_modules ./node_modules/

# Copy the rest of the application source code into the container.
COPY . .

# Security Best Practice: Create a non-root user and set appropriate permissions.
# This reduces the attack surface of the container.
# 'addgroup -g 1001 -S nodejs': Creates a 'nodejs' group with GID 1001.
# 'adduser -S proxyuser -u 1001 -G nodejs': Creates a 'proxyuser' with UID 1001,
#                                         and adds them to the 'nodejs' group.
# 'chown -R proxyuser:nodejs /app': Changes ownership of the application directory
#                                 to the 'proxyuser' and 'nodejs' group.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proxyuser -u 1001 -G nodejs && \
    chown -R proxyuser:nodejs /app

# Switch to the non-root user for running the application.
USER proxyuser

# Expose the port the application will listen on.
EXPOSE 42000

# Health check to verify the application is running and responsive.
# This uses Node.js's built-in http module for the check, making it self-contained.
# The .on('error', ...) ensures that connection errors also cause the health check to fail.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:42000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1));"

# Command to run the application when the container starts.
# Running 'node server.js' directly is often more efficient than 'npm start'
# as it bypasses the npm script runner overhead.
CMD ["node", "server.js"]
