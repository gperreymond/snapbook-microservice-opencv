# Pull base image from stock node image.
FROM node:0.12.7

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Add the current working folder as a mapped folder at /app
COPY ./package.json /app/package.json
COPY ./src /app

# Set the current working directory to the new mapped folder.
WORKDIR /app

# Install application's dependencies
RUN npm install -g node-gyp
RUN npm install --production

# Expose port
EXPOSE 10101

# Running
CMD node .
