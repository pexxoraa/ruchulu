# --- Stage 1: install dependencies & generate Prisma client ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev && npx prisma generate

# --- Stage 2: runtime image ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl curl \
  && addgroup -S nodejs && adduser -S ruchulu -G nodejs

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY src ./src

RUN mkdir -p logs && chown -R ruchulu:nodejs /app

USER ruchulu

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
