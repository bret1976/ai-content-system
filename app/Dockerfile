FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Layout mirrors repo: /workspace/money-machine/{app,site,fulfillment}
WORKDIR /workspace/money-machine/app

COPY app/package.json ./
RUN npm install --omit=dev

COPY app/ ./
COPY site/ /workspace/money-machine/site/
COPY fulfillment/ /workspace/money-machine/fulfillment/

RUN mkdir -p /workspace/money-machine/app/data/orders \
             /workspace/money-machine/app/data/packs

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
