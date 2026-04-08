FROM node:20.20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY src ./src
RUN npm run build

FROM node:20.20-alpine

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/index.js"]
