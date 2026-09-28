FROM node:24-alpine3.24 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM node:24-alpine3.24

WORKDIR /app
ENV NODE_ENV=production
ENV MAGICK_CONFIGURE_PATH=/app/magick
RUN apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-heic libheif-libde265

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server/photos/policy.xml ./magick/policy.xml

USER node
EXPOSE 3001

CMD ["node", "dist/server/index.js"]
