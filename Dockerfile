FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --cache /tmp/npm-cache && rm -rf /tmp/npm-cache
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
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
COPY --from=build /runtime/ ./
EXPOSE 8080
CMD ["node", "railway/server.mjs"]
