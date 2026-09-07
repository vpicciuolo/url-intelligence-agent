FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=7860 \
    URL_AGENT_UI_FILE=/app/index.html \
    URL_AGENT_ASSET_DIR=/app/assets \
    URL_AGENT_OWNER_USERNAME=vpicciuolo \
    URL_AGENT_SEARCH_PROVIDER=google-cse \
    URL_AGENT_EXTERNAL_RESEARCH=true \
    URL_AGENT_EXTERNAL_MAX_SOURCES=24 \
    URL_AGENT_EXTERNAL_DIRECT_MAX_SOURCES=60 \
    URL_AGENT_EXTERNAL_SEARCH_MAX_SOURCES=24 \
    URL_AGENT_EXTERNAL_CONCURRENCY=6 \
    URL_AGENT_SEARCH_QUERIES=4 \
    URL_AGENT_SEARCH_RESULTS_PER_QUERY=10

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY README.md LICENSE SECURITY.md ./
COPY index.html ui-v2.css ui-v2.js ./
COPY patch-ui.mjs ./patch-ui.mjs
COPY assets ./assets

# Validate that the exact production logo and social preview supplied to the
# deploy workflow are present and are real JPEG files before the image builds.
RUN node - <<'NODE'
const fs = require('fs');
for (const [name, min] of [['logo.jpg', 5000], ['og.jpg', 15000]]) {
  const file = `/app/assets/${name}`;
  const data = fs.readFileSync(file);
  if (data.length < min || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error(`${name} is invalid (${data.length} bytes)`);
  }
  console.log(`${name} OK (${data.length} bytes)`);
}
NODE

RUN node /app/patch-ui.mjs

EXPOSE 7860
CMD ["node", "dist/src/cli.js", "serve", "--host", "0.0.0.0", "--port", "7860"]
