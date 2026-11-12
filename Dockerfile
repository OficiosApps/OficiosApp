# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund --cache /tmp/npm-cache && rm -rf /tmp/npm-cache
COPY . .
RUN npm run build:railway \
    && mkdir -p /runtime/dist/server /runtime/node_modules \
    && cp package.json /runtime/ \
    && cp dist/server/index.js /runtime/dist/server/ \
    && cp -R node_modules/jose /runtime/node_modules/ \
    && cp -R worker drizzle railway /runtime/ \
    && rm -rf node_modules .output dist

FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
COPY --from=build /runtime/ ./
EXPOSE 3000
CMD ["node", "railway/server.mjs"]
