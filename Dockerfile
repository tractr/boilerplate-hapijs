FROM node:9.11

RUN mkdir /app
WORKDIR /app

RUN npm install

COPY api /app/

EXPOSE 3000
CMD ["npm", "start"]
