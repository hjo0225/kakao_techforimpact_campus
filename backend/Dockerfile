# syntax=docker/dockerfile:1.7
# ============ deps ============
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============ build ============
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============ runtime ============
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# install only production deps to keep image small
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Cloud Run은 PORT 환경변수를 자동 주입(기본 8080)
EXPOSE 8080
USER node
CMD ["node", "dist/main.js"]
