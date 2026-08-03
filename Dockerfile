# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder
WORKDIR /app

# better-sqlite3 compiles a native addon for this exact platform/arch --
# node_modules must be installed here, never copied in from the host (e.g.
# Windows) or from a different base image.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Persistent SQLite file lives outside the app directory so it survives
# image rebuilds when /app/data is mounted as a volume (see docker-compose.yml).
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app && chmod +x ./docker-entrypoint.sh
USER nextjs

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
