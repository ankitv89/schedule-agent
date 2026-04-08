FROM node:20-slim AS build

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install
RUN DATABASE_URL="file:./dev.db" npx prisma generate
RUN DATABASE_URL="file:./dev.db" npx prisma db push

COPY src ./src
COPY public ./public
COPY swagger.json ./swagger.json
RUN npm run build

FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY --from=build /app/swagger.json ./swagger.json
 
EXPOSE 8080

CMD ["node", "dist/index.js"]
