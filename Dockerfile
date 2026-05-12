# Build context: repository root (see README for v1 / v2 build commands).
FROM node:20-alpine
WORKDIR /app

COPY backend/package.json backend/
COPY backend/server.js backend/
RUN cd backend && npm install --omit=dev

COPY frontend ./frontend

ARG APP_VERSION=1
ENV APP_VERSION=${APP_VERSION}
ENV PORT=8080

WORKDIR /app/backend
EXPOSE 8080
CMD ["node", "server.js"]
