# ---- build stage ----
FROM node:18-alpine AS build
WORKDIR /app

# install deps
COPY package.json package-lock.json ./
RUN npm install --production

# copy app
COPY . .

# ---- runtime stage ----
FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app /app

# set env
ENV NODE_ENV=production
ENV PORT=4600

RUN chown -R node:node /app
USER node

EXPOSE 4600

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4600/health || exit 1

CMD ["node", "server.js"]
