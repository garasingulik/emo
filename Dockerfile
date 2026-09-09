# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app

ARG APP_VERSION=latest
ENV NEXT_TELEMETRY_DISABLED=1

# `face-api.js` is installed from a git URL, so git must be present.
RUN apt-get update && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN sed -i 's/development/'"$APP_VERSION"'/' /app/public/version.json
RUN npm run build

# ---------- production stage ----------
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs

EXPOSE 80
CMD ["npm", "run", "start:prod"]
