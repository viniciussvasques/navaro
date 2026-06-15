FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tzdata
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY . .
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["pnpm", "next", "dev", "-p", "3000"]
