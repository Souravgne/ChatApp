# ---- build stage ----
FROM node:18-alpine AS build
WORKDIR /app

# install dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# copy app code
COPY . .

# ---- runtime stage ----
FROM node:18-alpine AS runtime
WORKDIR /app

# copy from build stage
COPY --from=build /app /app

# install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=4600

USER node
EXPOSE 4600

# healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:4600/health || exit 1

CMD ["node", "server.js"]
