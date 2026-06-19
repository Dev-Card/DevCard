# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN --mount=type=cache,target=/root/.npm \
    npm ci --cache /root/.npm
RUN npm run build

# Install and build backend
WORKDIR /app/apps/backend
RUN --mount=type=cache,target=/root/.npm \
    npm ci --cache /root/.npm

COPY apps/backend ./

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy shared package (compiled dist + package.json only)
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

WORKDIR /app/apps/backend

CMD ["node", "dist/server.js"]