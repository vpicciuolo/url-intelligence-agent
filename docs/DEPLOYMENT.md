# URL Intelligence Agent — Deployment Guide

This guide covers local deployment, Docker, Docker Compose, a persistent Linux service and a reverse-proxied HTTP API.

Repository: https://github.com/vpicciuolo/url-intelligence-agent  
HORNO: https://horno.net

---

# 1. Local Node deployment

Requirements:

- Node.js 18+
- npm

```bash
git clone https://github.com/vpicciuolo/url-intelligence-agent.git
cd url-intelligence-agent
npm install
cp .env.example .env
npm run build
```

Test:

```bash
node dist/src/cli.js investigate https://example.com
```

Start the API locally:

```bash
node dist/src/cli.js serve --host 127.0.0.1 --port 8787
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

---

# 2. Production API configuration

For any API exposed outside localhost, configure a bearer token:

```env
URL_AGENT_API_TOKEN=replace-with-a-long-random-token
URL_AGENT_API_RATE_LIMIT=60
URL_AGENT_CORS_ORIGIN=https://your-frontend.example
```

Start on all interfaces only when you have a firewall/reverse proxy strategy:

```bash
node dist/src/cli.js serve --host 0.0.0.0 --port 8787
```

Authenticated request:

```bash
curl \
  -H "Authorization: Bearer replace-with-a-long-random-token" \
  "http://127.0.0.1:8787/investigate?url=https://example.com"
```

Recommended production controls:

- TLS termination at a trusted reverse proxy/load balancer
- `URL_AGENT_API_TOKEN`
- conservative rate limits
- firewall rules
- process/container restart policy
- bounded page/depth/concurrency settings
- monitored disk usage for `.url-agent`
- never expose Redis/PostgreSQL directly to the public Internet

---

# 3. Docker — CLI

Build:

```bash
docker build -t url-intelligence-agent:1.0.0 .
```

Run an investigation:

```bash
docker run --rm \
  url-intelligence-agent:1.0.0 \
  investigate https://example.com
```

Pass environment variables:

```bash
docker run --rm \
  --env-file .env \
  url-intelligence-agent:1.0.0 \
  investigate https://example.com
```

Persist `.url-agent` data:

```bash
docker volume create url_agent_data

docker run --rm \
  --env-file .env \
  -v url_agent_data:/app/.url-agent \
  url-intelligence-agent:1.0.0 \
  snapshot https://example.com
```

---

# 4. Docker — HTTP API

```bash
docker run -d \
  --name url-intelligence-agent \
  --restart unless-stopped \
  --env-file .env \
  -p 8787:8787 \
  -v url_agent_data:/app/.url-agent \
  url-intelligence-agent:1.0.0 \
  serve --host 0.0.0.0 --port 8787
```

Check logs:

```bash
docker logs -f url-intelligence-agent
```

Health:

```bash
curl http://127.0.0.1:8787/health
```

---

# 5. Docker Compose

The repository ships with `docker-compose.yml`.

Create `.env` first:

```bash
cp .env.example .env
```

At minimum, set an API token if the API will be reachable by other machines:

```env
URL_AGENT_API_TOKEN=replace-with-a-long-random-token
```

Start the core API:

```bash
docker compose up -d --build
```

Inspect:

```bash
docker compose ps
docker compose logs -f url-agent
```

Stop:

```bash
docker compose down
```

The included stack also defines optional Redis and PostgreSQL services using Compose profiles.

Redis profile:

```bash
docker compose --profile redis up -d --build
```

PostgreSQL profile:

```bash
docker compose --profile postgres up -d --build
```

Both:

```bash
docker compose --profile redis --profile postgres up -d --build
```

When enabling adapters, configure the corresponding URLs and ensure the required optional Node peer packages are available in your runtime image/environment.

---

# 6. Systemd service on Linux

Example deployment path:

```text
/opt/url-intelligence-agent
```

Clone/build:

```bash
sudo mkdir -p /opt/url-intelligence-agent
sudo chown "$USER":"$USER" /opt/url-intelligence-agent
git clone https://github.com/vpicciuolo/url-intelligence-agent.git /opt/url-intelligence-agent
cd /opt/url-intelligence-agent
npm install
cp .env.example .env
npm run build
```

Example `/etc/systemd/system/url-intelligence-agent.service`:

```ini
[Unit]
Description=URL Intelligence Agent API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/url-intelligence-agent
EnvironmentFile=/opt/url-intelligence-agent/.env
ExecStart=/usr/bin/node /opt/url-intelligence-agent/dist/src/cli.js serve --host 127.0.0.1 --port 8787
Restart=always
RestartSec=5
User=urlagent
Group=urlagent
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Create a dedicated service account in production and ensure it owns only the directories it requires.

Activate:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now url-intelligence-agent
sudo systemctl status url-intelligence-agent
```

Logs:

```bash
sudo journalctl -u url-intelligence-agent -f
```

---

# 7. Nginx reverse proxy

Keep the Node service on `127.0.0.1:8787` and expose it through HTTPS.

Example server block:

```nginx
server {
    listen 443 ssl http2;
    server_name intelligence.example.com;

    # Configure your normal TLS certificate directives here.

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 15s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

Keep application authentication enabled even when the reverse proxy is protected.

---

# 8. Environment configuration

Recommended baseline:

```env
URL_AGENT_USER_AGENT="url-intelligence-agent/1.0.0 (+https://github.com/vpicciuolo/url-intelligence-agent; https://horno.net)"
URL_AGENT_TIMEOUT_MS=10000
URL_AGENT_MAX_BYTES=3000000
URL_AGENT_MAX_REDIRECTS=6
URL_AGENT_MAX_PAGES=30
URL_AGENT_MAX_DEPTH=3
URL_AGENT_CONCURRENCY=4
URL_AGENT_PROFILE=full-intelligence
URL_AGENT_SAME_ORIGIN=true
URL_AGENT_OBEY_ROBOTS=true
URL_AGENT_DENY_PATTERNS=logout,signout,delete,unsubscribe,cart,checkout
URL_AGENT_CACHE=memory
URL_AGENT_CACHE_TTL_MS=300000
URL_AGENT_CACHE_DIR=.url-agent/cache
URL_AGENT_DATA_DIR=.url-agent/data
URL_AGENT_WORKER_CONCURRENCY=4
URL_AGENT_RENDER_MODE=off
URL_AGENT_API_TOKEN=replace-with-a-long-random-token
URL_AGENT_API_RATE_LIMIT=60
URL_AGENT_AI_AUTO=false
```

Do not blindly maximize crawl limits in production. Larger crawls increase latency, outbound traffic and memory usage.

---

# 9. Rendering in production

## Playwright on a server

Install:

```bash
npm install playwright
npx playwright install --with-deps chromium
```

Then:

```env
URL_AGENT_RENDER_MODE=auto
URL_AGENT_RENDER_TIMEOUT_MS=30000
```

Browser automation adds significant runtime weight. If you do not need JavaScript rendering, keep rendering off.

## Remote rendering service

```env
URL_AGENT_RENDER_MODE=auto
URL_AGENT_RENDER_ENDPOINT=https://renderer.example.com/render
URL_AGENT_RENDER_API_KEY=your-key
URL_AGENT_RENDER_TIMEOUT_MS=30000
```

---

# 10. Redis/Valkey and PostgreSQL

These integrations are optional.

Install adapters when your deployment needs them:

```bash
npm install redis pg
```

Example environment:

```env
REDIS_URL=redis://redis:6379
VALKEY_URL=
DATABASE_URL=postgres://urlagent:strong-password@postgres:5432/urlagent
```

Use private Docker networks/VPC networking and strong credentials. Do not publish database/cache ports unless you have a specific secured reason.

---

# 11. Monitoring deployment

The watch command is a long-running process:

```bash
url-agent watch https://example.com --interval 300000
```

Configure webhook delivery:

```env
URL_AGENT_WEBHOOK_URL=https://your-app.example/hooks/url-intelligence
URL_AGENT_WEBHOOK_SECRET=replace-with-a-secret
```

For reliable production monitoring, run each watcher under a supervisor, container orchestrator, scheduler or queue system appropriate to your infrastructure.

---

# 12. Deployment verification checklist

After deployment:

```bash
curl http://127.0.0.1:8787/health
```

Then verify actions:

```bash
curl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:8787/actions
```

Run a controlled public test URL:

```bash
curl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://127.0.0.1:8787/investigate?url=https://example.com"
```

Verify:

- health endpoint succeeds
- authentication rejects incorrect tokens
- rate limiting works for your expected traffic
- logs do not expose secrets
- `.url-agent` storage persists if required
- outbound DNS/HTTPS works
- renderer works only if intentionally enabled
- firewall exposes only intended ports
- TLS is enabled at the edge

---

# Updating an existing deployment

```bash
cd /opt/url-intelligence-agent
git pull
npm install
npm run build
sudo systemctl restart url-intelligence-agent
```

For Docker Compose:

```bash
git pull
docker compose up -d --build
```

---

## Support the open-source project

Support continued development through the Stripe-enabled support page:

https://hrn.ae/githubsupport

---

Created by **Vincenzo Picciuolo**  
**HRN Innovation Technologies Ltd**  
HORNO ecosystem: https://horno.net
