# ─── Khang Backend Dockerfile ─────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source
COPY src ./src

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
