FROM node:9.11

RUN mkdir /app
WORKDIR /app

RUN npm install

COPY . /app/

EXPOSE 3000
CMD ["npm", "start"]
