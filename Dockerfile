# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy Backend artifacts
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy Frontend artifacts to be served by Express static
COPY --from=frontend-builder /app/dist ./public

# OpenAPI spec for Swagger UI (served from /api-docs)
COPY docs/openapi.yaml ./openapi.yaml

# Final Env setup
ENV NODE_ENV=production
ENV PORT=3000

# Metadata
EXPOSE 3000

# Start command
CMD ["node", "dist/server.js"]
