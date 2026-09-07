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

# Reconstruct public brand assets from text-safe embedded sources.
# og.*.b64 files are sequential pieces of ONE base64 JPEG stream.
# Some imported JPEG sources omit the optional terminal EOI bytes; repair them
# deterministically instead of failing the entire Hugging Face Space build.
RUN node - <<'NODE'
const fs = require('fs');
const path = require('path');
const dir = '/app/assets';

function cleanBase64(value) {
  return String(value || '').replace(/\s+/g, '');
}

function repairJpeg(data, name, minimum) {
  if (data.length < minimum || data.length > 800000 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error(`${name} invalid: ${data.length} bytes`);
  }

  let end = -1;
  for (let i = data.length - 2; i >= 2; i -= 1) {
    if (data[i] === 0xff && data[i + 1] === 0xd9) {
      end = i + 2;
      break;
    }
  }

  if (end >= 0) {
    const normalized = data.subarray(0, end);
    console.log(`${name}: ${data.length}B -> ${normalized.length}B; trimmed=${data.length - normalized.length}B`);
    return normalized;
  }

  const repaired = Buffer.concat([data, Buffer.from([0xff, 0xd9])]);
  console.log(`${name}: terminal JPEG EOI missing; appended 2 bytes (${data.length}B -> ${repaired.length}B)`);
  return repaired;
}

const logoSource = cleanBase64(fs.readFileSync(path.join(dir, 'logo.base64.txt'), 'utf8'));
if (!logoSource) throw new Error('Embedded logo source is empty');
const logo = repairJpeg(Buffer.from(logoSource, 'base64'), 'logo.jpg', 5000);
fs.writeFileSync(path.join(dir, 'logo.jpg'), logo);

const parts = fs.readdirSync(dir)
  .filter((name) => /^og\.\d+\.b64$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!parts.length) throw new Error('Embedded Open Graph asset chunks are missing');

const ogSource = parts
  .map((name) => cleanBase64(fs.readFileSync(path.join(dir, name), 'utf8')))
  .join('');
if (!ogSource) throw new Error('Embedded Open Graph source is empty');

const og = repairJpeg(Buffer.from(ogSource, 'base64'), 'og.jpg', 15000);
fs.writeFileSync(path.join(dir, 'og.jpg'), og);
console.log(`Brand assets ready: logo=${logo.length}B, og=${og.length}B, chunks=${parts.length}`);
NODE

EXPOSE 7860
CMD ["node", "dist/src/cli.js", "serve", "--host", "0.0.0.0", "--port", "7860"]
