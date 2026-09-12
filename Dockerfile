# ReadyBatch — Railway-ready
# Serves site/ + /api/* and runs Python generate_pack.py
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY site/ ./site/
COPY fulfillment/ ./fulfillment/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/server
CMD ["node", "index.js"]
