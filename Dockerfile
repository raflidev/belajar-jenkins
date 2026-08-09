FROM node:20-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY server.js ./
COPY test ./test
RUN npm test

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
