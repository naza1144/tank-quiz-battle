FROM node:20-alpine
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install --include=dev --no-audit --no-fund
COPY src ./src
RUN npm run build
RUN cp -r src/public dist/public || true
EXPOSE 5000
CMD ["node", "dist/server.js"]
