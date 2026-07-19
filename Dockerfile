FROM oven/bun:1

# Non-root user for security
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app

# Dependencies first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# The landing and web demo need no secrets: src/config/env.ts ships
# zero-config defaults and the bot is only loaded lazily by its webhook.
ENV NEXT_PUBLIC_NODE_ENV=production
RUN bun run build

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# next start serves on port 3000 by default
CMD ["bun", "run", "start"]
