FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copies the package.json and pnpm-lock.yaml (if exists) from root to install turbo
# But since this is a mono-repo slice, we might need a specific approach.
# For simplicity and dev-volumes, we will assume we build from the package context.

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
