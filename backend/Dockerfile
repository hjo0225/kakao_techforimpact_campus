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
COPY package.json package-lock.json tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build

# ============ runtime ============
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma query engine가 openssl을 필요로 함
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# Generated Prisma client + query engine (output of `prisma generate`)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# Schema + migration SQL needed by `prisma migrate deploy`
COPY prisma ./prisma

EXPOSE 8080
USER node
# Prisma migrate deploy uses an advisory lock so concurrent container starts are safe.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
