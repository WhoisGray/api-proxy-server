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

# Expose the port the application will listen on.
EXPOSE 42000

# Command to run the application when the container starts.
# Running 'node server.js' directly is often more efficient than 'npm start'
# as it bypasses the npm script runner overhead.
CMD ["node", "server.js"]
