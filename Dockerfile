# Single-service image: builds client + server and serves the whole game from
# one Node process on one port. Works on Fly.io, Railway, Koyeb, Render, etc.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# npm workspaces hoist runtime deps to the root node_modules, so that plus the
# two build outputs is all the server needs at runtime.
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
