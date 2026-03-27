FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 8000

# Run migrations then start dev server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
