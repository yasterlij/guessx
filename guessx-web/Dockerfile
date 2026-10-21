FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/guessx-api ./packages/guessx-api
COPY guessx-web/package*.json ./guessx-web/
WORKDIR /app/guessx-web
RUN npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY guessx-web ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/guessx-web/dist /usr/share/nginx/html
COPY guessx-web/nginx.conf /etc/nginx/conf.d/default.conf
LABEL org.opencontainers.image.source="https://github.com/yasterlij/takelow"
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
