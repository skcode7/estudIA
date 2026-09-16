# syntax=docker/dockerfile:1
FROM node:22-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.3.4

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm run db:generate
RUN pnpm --filter @estudia/api build

RUN pnpm --filter @estudia/api deploy --prod ./deploy/api
RUN cd deploy/api \
  && ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/deploy/api ./

EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma && node dist/main"]