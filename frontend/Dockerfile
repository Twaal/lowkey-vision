### Multi-stage production build for frontend (Vite + React)
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source (including public/media assets)
COPY . .

# Build static assets
RUN npm run build

# Stage 2: Runtime (static file server)
FROM nginx:1.27-alpine AS runner

LABEL org.opencontainers.image.source="https://github.com/Twaal/lowkey-vision" \
      org.opencontainers.image.description="Lowkey Vision Frontend" \
      org.opencontainers.image.licenses="agpl-3.0"

# Copy custom nginx config (optional override)
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default server config with custom one including caching rules (location blocks must be inside server {})
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
