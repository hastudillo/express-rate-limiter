# Stage
FROM node:20-alpine as builder

WORKDIR /app

ENV NODE_ENV development

COPY package.json /app/

RUN npm install

COPY . .

RUN npm run build

# Final production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV production

COPY package.json /app/

RUN npm install

COPY --from=builder /app/dist /app/dist

ARG PORT=3000

ENV PORT $PORT
ENV AUTH_TOKEN am9obkBleGFtcGxlLmNvbTphYmMxMjM=
ENV REDIS_URL redis://host.docker.internal:6379
ENV RATE_LIMIT_BY_TOKEN 200
ENV RATE_LIMIT_BY_IP 100
ENV WINDOW_SIZE_IN_SECONDS 3600

EXPOSE $PORT

ENTRYPOINT [ "node", "dist/index" ]