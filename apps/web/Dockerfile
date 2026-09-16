# syntax=docker/dockerfile:1
FROM node:22-slim AS build

WORKDIR /app

RUN npm install -g pnpm@12.3.4

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @estudia/web build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]