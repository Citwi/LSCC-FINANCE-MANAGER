FROM node:20-alpine
WORKDIR /app
COPY index.html server.js package.json ./
EXPOSE 4785
CMD ["node","server.js"]
