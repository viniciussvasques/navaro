FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache tzdata && npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=/api

RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache tzdata && npm install -g pnpm

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["pnpm", "start"]
