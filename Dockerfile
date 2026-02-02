# --- deps ---
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- build ---
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- runtime ---
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ENV NODE_ENV=production

# Standalone Next.js output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Drizzle for DB schema push on startup
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/lib/db/schema.ts ./lib/db/schema.ts
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["sh", "-c", "npx drizzle-kit push --force && node server.js"]
