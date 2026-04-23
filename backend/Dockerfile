FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
# Schema uses sqlite for local dev; swap to postgresql for production build
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
