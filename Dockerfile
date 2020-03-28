FROM node:13.8

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "src/app.js" ]
