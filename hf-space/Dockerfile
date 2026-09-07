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

RUN node /app/patch-ui.mjs

# Build the public brand assets entirely from text-safe embedded sources.
# This removes the previous runtime/build dependency on external image hosts and
# guarantees that the header logo, favicon, PDF branding and Open Graph preview
# are available before any user signs in.
RUN node - <<'NODE'
const fs = require('fs');
const path = require('path');
const dir = '/app/assets';

function cleanBase64(value) {
  return String(value || '').replace(/\s+/g, '');
}

const logoSource = cleanBase64(fs.readFileSync(path.join(dir, 'logo.base64.txt'), 'utf8'));
const logo = Buffer.from(logoSource, 'base64');
if (logo.length < 5000 || logo[0] !== 0xff || logo[1] !== 0xd8) {
  throw new Error('Embedded logo asset is invalid');
}
fs.writeFileSync(path.join(dir, 'logo.jpg'), logo);

const parts = fs.readdirSync(dir)
  .filter((name) => /^og\.\d+\.b64$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!parts.length) throw new Error('Embedded Open Graph asset chunks are missing');
const ogSource = cleanBase64(parts.map((name) => fs.readFileSync(path.join(dir, name), 'utf8')).join(''));
const og = Buffer.from(ogSource, 'base64');
if (og.length < 15000 || og[0] !== 0xff || og[1] !== 0xd8) {
  throw new Error('Embedded Open Graph asset is invalid');
}
fs.writeFileSync(path.join(dir, 'og.jpg'), og);
console.log(`Brand assets ready: logo=${logo.length}B, og=${og.length}B`);
NODE

EXPOSE 7860
CMD ["node", "dist/src/cli.js", "serve", "--host", "0.0.0.0", "--port", "7860"]
