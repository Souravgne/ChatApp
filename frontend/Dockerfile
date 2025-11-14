# ---- build stage ----
FROM node:18-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ---- runtime (nginx) ----
FROM nginx:stable-alpine AS runtime
# remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

# copy custom nginx config (optional, see below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
