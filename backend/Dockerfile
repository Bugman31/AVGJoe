FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY scripts ./scripts
RUN npm run db:check-schemas && npm run db:generate:postgres

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 8000

CMD ["sh", "-c", "npm run db:migrate:deploy:postgres && npm run db:seed && node dist/server.js"]
