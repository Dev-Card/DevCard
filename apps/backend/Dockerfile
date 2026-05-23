FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @devcard/backend exec prisma generate
RUN pnpm --filter @devcard/shared build
RUN pnpm --filter @devcard/backend build

FROM base AS runner
# We copy the whole workspace for simplicity in a self-hosted mono-repo setup
# In a true enterprise setup, we'd prune the workspace, but this is sufficient.
COPY --from=builder /app /app
WORKDIR /app/apps/backend

EXPOSE 3001

# Apply migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
