# Web container for the Shopping List Tracker (V7, task T2.6).
# Built in the cloud by ACR Tasks:
#   az acr build -r slasqlcondvacrukw001 -t web:<buildId>-<sha> \
#     --build-arg GIT_SHA=<sha> app/shopping-list
#
# Two stages: "build" compiles the SPA with the full dev toolchain; "runtime" contains only
# the Node server, its production dependencies and the compiled dist/.

# Node major version. Pin to a minor (e.g. 24.11) once you have built and tested an image,
# so base-image updates are deliberate rather than arriving with every build.
ARG NODE_VERSION=24

# ---------------------------------------------------------------- build
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Vite inlines VITE_* variables at build time, so the image is built for the API backend.
ARG VITE_USE_API=true
ARG VITE_API_BASE_URL=/api
ENV VITE_USE_API=${VITE_USE_API} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Dependencies first, so this layer is reused while package*.json are unchanged.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------------------------------------------------------------- runtime
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

# Production dependencies only: express, compression, http-proxy-middleware and the
# Azure Monitor OpenTelemetry distro (see package.json "dependencies").
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY app.js server.js telemetry.js ./

# Traceability: link the image back to its commit (set by the pipeline).
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="shopping-list-web" \
      org.opencontainers.image.description="Shopping List Tracker V7 web tier (SPA + /api proxy)" \
      org.opencontainers.image.source="https://dev.azure.com/<Organisation>/Shopping%20List%20App/_git/07-container-app-sql" \
      org.opencontainers.image.revision="${GIT_SHA}"

# The official image ships a non-root "node" user; nothing in /app needs to be writable.
USER node
EXPOSE 8080

# node is PID 1 (no npm wrapper), so SIGTERM from Container Apps reaches server.js.
# --import loads telemetry.js first so OpenTelemetry can instrument http/express.
CMD ["node", "--import", "./telemetry.js", "server.js"]
