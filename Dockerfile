FROM node:24.19.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=vl_ca if [ -f /run/secrets/vl_ca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/vl_ca npm ci; else npm ci; fi

FROM dependencies AS build
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 DB_PATH=/var/lib/vl-moveis/store.sqlite CATALOG_UPLOAD_DIR=/var/lib/vl-moveis/photos
WORKDIR /app
RUN mkdir -p /var/lib/vl-moveis/photos && chown -R node:node /var/lib/vl-moveis /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts ./scripts
USER node
EXPOSE 3000
CMD ["node", "scripts/start-production.mjs"]
