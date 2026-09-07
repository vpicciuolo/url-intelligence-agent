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
    URL_AGENT_EXTERNAL_CONCURRENCY=4 \
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
RUN node -e "const fs=require('fs'); const primary='https://storage.mlcdn.com/account_image/2365654/SBclntVJrYefyxse6bLdZKk0T9ORWjRmMxH0KVCM.jpg'; fetch(primary).then(async r=>{if(!r.ok) throw new Error('logo download '+r.status); fs.writeFileSync('/app/assets/logo.jpg',Buffer.from(await r.arrayBuffer()));}).catch(e=>{console.error(e); const s=fs.readFileSync('/app/assets/logo.base64.txt','utf8').trim(); fs.writeFileSync('/app/assets/logo.jpg',Buffer.from(s,'base64'));});" \
 && node -e "const fs=require('fs'); const urls=['https://storage.mlcdn.com/account_image/2365654/ceTJNoztKxv1AW3dpdSaf5XSHWNMbhlKAzyFdUJN.jpg','https://storage.mlcdn.com/account_image/2365654/725Q0AzeY15nwDK3JocgKXq5AhxRoNC53LUBchc7.png']; (async()=>{for(const u of urls){try{const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);fs.writeFileSync('/app/assets/og.jpg',Buffer.from(await r.arrayBuffer()));return;}catch(e){console.error('asset fallback',u,e.message)}}throw new Error('Unable to download OG image');})().catch(e=>{console.error(e);process.exit(1)});"
EXPOSE 7860
CMD ["node", "dist/src/cli.js", "serve", "--host", "0.0.0.0", "--port", "7860"]
