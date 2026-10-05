# syntax=docker/dockerfile:1.7
# Public entry point image: Caddy + the built React site. Build context = repository root.
#   docker build -f infra/caddy/Dockerfile --build-arg VITE_API_BASE_URL=https://api-... .
# Contains no secrets: VITE_* values are public and end up in the JS bundle anyway.

# The bundle is platform independent, so build it natively instead of under QEMU.
FROM --platform=$BUILDPLATFORM node:22.23.3-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
ARG VITE_API_BASE_URL
RUN test -n "$VITE_API_BASE_URL" && npm run build && rm -f dist/_headers

FROM caddy:2.11.4-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b
LABEL org.opencontainers.image.source="https://github.com/peopleflowvn/TWings-Academy" \
      org.opencontainers.image.description="TWings Academy web entry point (Caddy + React site)"
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv/web
