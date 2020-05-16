FROM node:13.8.0-alpine

RUN apk add ffmpeg

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "src/app.js" ]
