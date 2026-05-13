FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4200
ENV NODE_ENV=production PORT=4200

CMD ["node", "server.js"]
