FROM node:22-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose HTTP port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Persistent volume for SQLite DB and WhatsApp sessions
VOLUME ["/app/data"]

# Run server
CMD ["node", "server.js"]
