FROM node:20-alpine

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package*.json ./

RUN pnpm install

COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]