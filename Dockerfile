# Production image: builds the React frontend and the TypeScript backend,
# then serves both from a single Express process on port 5000.

# ---- Frontend build ----
FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend build ----
FROM node:22-bookworm-slim AS backend
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

# ---- Runtime ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=5000 \
    DB_DATABASE_PATH=/app/data/isiqalo.sqlite \
    FRONTEND_DIST_PATH=/app/public
WORKDIR /app
COPY --from=backend /build/backend/node_modules ./node_modules
COPY --from=backend /build/backend/dist ./dist
COPY --from=frontend /build/frontend/dist ./public
RUN mkdir -p data logs temp && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "dist/app.js"]
