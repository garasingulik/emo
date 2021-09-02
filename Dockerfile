# build environment
FROM node:14.17.3-buster as build
WORKDIR /app

ARG APP_VERSION=latest

ENV PATH /app/node_modules/.bin:$PATH

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . ./
RUN sed -i 's/development/'$APP_VERSION'/' /app/public/version.json
RUN npm run build

# production environment
FROM node:14.17.3-buster-slim
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH
ENV NODE_ENV production

COPY package.json ./
COPY package-lock.json ./

RUN npm install --production

COPY ./public ./public
COPY --from=build /app/.next ./.next

EXPOSE 80
CMD npm run start:prod
