FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @devcard/shared build
RUN pnpm --filter @devcard/web build

FROM base AS runner
COPY --from=builder /app /app
WORKDIR /app/apps/web

EXPOSE 5173
ENV NODE_ENV=production
ENV PORT=5173

CMD ["node", "build/index.js"]
