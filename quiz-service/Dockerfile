FROM node:20-alpine
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
RUN npm run build
EXPOSE 4001
CMD ["node", "dist/server.js"]
