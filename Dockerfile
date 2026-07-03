# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# pnpm via corepack
RUN corepack enable

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/card-motion/package.json packages/card-motion/
COPY playground/package.json playground/
# The playground hosts the Lastwall demo from source, so its deps must be
# installed too (its react etc. are resolved when the playground bundles it).
COPY examples/lastwall/package.json examples/lastwall/

# Install all workspace deps (frozen to the lockfile)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build
COPY . .
RUN pnpm --filter card-motion build \
 && pnpm --filter playground build

# ---- Serve stage ----
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/playground/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
