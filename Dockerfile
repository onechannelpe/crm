FROM oven/bun:1.3.14 AS production-deps

WORKDIR /app

COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/extension/package.json ./apps/extension/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/email-composer/package.json ./packages/email-composer/package.json
COPY packages/fetch-refs/package.json ./packages/fetch-refs/package.json
COPY packages/images/package.json ./packages/images/package.json
COPY packages/message-channels/package.json ./packages/message-channels/package.json
COPY packages/solid-motion/package.json ./packages/solid-motion/package.json
COPY tools/codegen/package.json ./tools/codegen/package.json

RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile
RUN bun run generate:templates
RUN bun run --cwd apps/web build:container

FROM oven/bun:1.3.14 AS runtime

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

WORKDIR /app

COPY --from=production-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=production-deps --chown=bun:bun /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build --chown=bun:bun /app/apps/web/.output ./apps/web/.output
COPY --from=build --chown=bun:bun /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=bun:bun /app/apps/web/src ./apps/web/src
COPY --from=build --chown=bun:bun /app/apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY --from=build --chown=bun:bun /app/packages ./packages

WORKDIR /app/apps/web
USER bun

EXPOSE 3000

CMD ["bun", "run", "start"]
