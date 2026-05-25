# ─── Builder ─────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true

# Install ghostscript for PDF rendering + openssl for Prisma
RUN apk add --no-cache ghostscript openssl openssl-dev

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN npm install -g pnpm@10 && \
    pnpm config set minimum-release-age 0 && \
    pnpm install --frozen-lockfile

COPY . .

RUN ./node_modules/.bin/prisma generate && \
    node -e "try { require('./node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node'); console.log('OK') } catch(e) { console.error('FAIL:', e.message) }" && \
    pnpm build

# ─── Runner ──────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache ghostscript curl openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
