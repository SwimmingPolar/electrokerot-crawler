FROM node:18-alpine3.15 AS builder
WORKDIR /app
COPY ./package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine3.15
WORKDIR /app

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# set environment variables
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/build ./build
COPY ./package*.json .
RUN npm ci --only=production

ARG HOST=127.0.0.1
ARG SERVICE_PORT=20000
HEALTHCHECK --interval=15s --timeout=15s --start-period=5s --retries=5 CMD wget --no-verbose --tries=3 --spider http://${HOST}:${SERVICE_PORT}/ || exit 1

CMD ["node", "/app/build/index.js"]