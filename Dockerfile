FROM node:11.10

# Copy sources
RUN mkdir /app
COPY . /app/

# Install packages
RUN cd /app && npm install

WORKDIR /app
EXPOSE 3000
CMD ["npm", "start"]
