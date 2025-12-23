// GatewayDocsManualOnly_FULL.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Manual-only React Docs UI (NO OpenAPI)
 * - FULL SYSTEM DOCS for Gateway Slash
 * - Includes: Architecture, Auth/RBAC, Tenant/Secrets, Slash/Vault, Domain, Transactions,
 *            Filters/Cursor, Sync, Exports, Observability, Security, Full Deploy Commands,
 *            Runbook, Rollback, Backup, Hardening, Incident checklist.
 *
 * Usage:
 *   export default function App(){ return <GatewayDocsManualOnly_FULL/> }
 */

const APP_NAME = "Gateway Slash";
const DOC_VERSION = "v2.0";
const LAST_UPDATED = "2025-12-23";

/* ============================= Types ============================= */

type DocSection = { id: string; title: string; items: DocItem[] };
type DocItem = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  content: React.ReactNode;
};

/* ============================= Docs Content ============================= */

const DOCS: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      {
        id: "overview-intro",
        title: "System Overview",
        description: "Purpose, responsibilities, architecture, domains",
        tags: ["overview", "architecture", "multi-tenant"],
        content: (
          <DocArticle
            title="Gateway Slash System – Developer Documentation"
            meta={[
              { k: "Product", v: APP_NAME },
              { k: "Docs", v: DOC_VERSION },
              { k: "Last updated", v: LAST_UPDATED },
              { k: "Frontend", v: "card.nittagateway.com (static React)" },
              { k: "Backend", v: "api.nittagateway.com (Spring Boot)" },
              { k: "OS", v: "Ubuntu 24.04" },
            ]}
          >
            <p>
              <b>{APP_NAME}</b> is a production gateway integrating internal applications with <b>Slash</b>. It provides a stable
              internal API, enforces authentication and tenant isolation, protects Vault operations, and supports high-volume
              transaction workflows (cursor scan, exports).
            </p>

            <H2>Core responsibilities</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authentication (JWT) and authorization (RBAC).</li>
              <li>Tenant isolation: all reads/writes scoped by <code>accountId</code>.</li>
              <li>Slash API adapter: API + Vault endpoints with safe logging.</li>
              <li>Sync pipelines: Virtual Accounts → Card Groups → Cards → Transactions.</li>
              <li>Exports: CSV/XLSX/JSONL + async jobs for very large datasets.</li>
              <li>Operations: logs, health checks, rollback, incident response.</li>
            </ul>

            <H2>High-level architecture</H2>
            <CodeBlock
              language="text"
              code={`Browser
  -> https://card.nittagateway.com (Nginx static FE)
  -> FE calls https://api.nittagateway.com/api/*
  -> https://api.nittagateway.com (Nginx reverse proxy)
  -> Spring Boot Gateway (127.0.0.1:8080)
  -> Slash API / Vault
  -> Optional DB (sync cache, logs, users, metadata)`}
            />

            <H2>Domains</H2>
            <Table
              columns={["Domain", "Purpose"]}
              rows={[
                ["card.nittagateway.com", "Frontend UI (static build)"],
                ["api.nittagateway.com", "Backend API (Spring Boot Gateway)"],
              ]}
            />

            <Callout tone="info" title="Non-negotiables">
              <ul className="list-disc pl-5 space-y-1">
                <li>Never expose secrets (Slash apiKey, JWT secret, Vault data).</li>
                <li>Enforce tenant scoping server-side on every endpoint using accountId.</li>
                <li>Use cursor scan / async export for large transaction ranges; avoid monolithic 50k sync reads.</li>
              </ul>
            </Callout>
          </DocArticle>
        ),
      },

      {
        id: "overview-terminology",
        title: "Terminology",
        description: "Glossary of core concepts",
        tags: ["glossary"],
        content: (
          <DocArticle title="Terminology">
            <Table
              columns={["Term", "Meaning"]}
              rows={[
                ["Account (Tenant)", "A tenant context in Gateway. Holds Slash credentials and config."],
                ["Active Account", "Selected tenant in the user session; used for UI scoping."],
                ["Virtual Account (VA)", "Slash virtual account/subaccount tied to a tenant."],
                ["Card Group", "A grouping/program under which cards are issued."],
                ["Card", "A payment card (virtual/physical). Only masked data stored."],
                ["Transaction", "Ledger line item. High volume; requires paging/cursor/exports."],
                ["Vault", "Slash domain for sensitive operations (e.g., CVV) — never persist data."],
                ["Sync Job", "Scheduled/manual import of Slash entities into Gateway DB."],
                ["Cursor Scan", "Safe pagination pattern for large transaction date ranges."],
              ]}
            />
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "frontend",
    title: "Frontend (Static React)",
    items: [
      {
        id: "fe-runtime",
        title: "Runtime & API Base URL",
        description: "Static serving and API addressing rules",
        tags: ["frontend", "nginx", "base-url"],
        content: (
          <DocArticle title="Frontend Runtime & API Base URL">
            <H2>Deployment model</H2>
            <p>Frontend is deployed as static assets served by Nginx.</p>
            <CodeBlock language="text" code={`/var/www/app/current_fe -> /var/www/app/releases/fe_<timestamp>`} />

            <H2>Client-side routing</H2>
            <p>React routes are resolved via Nginx fallback:</p>
            <CodeBlock
              language="nginx"
              code={`location / {
  try_files $uri /index.html;
}`}
            />

            <H2>API base URL rule</H2>
            <Table
              columns={["Example", "Allowed"]}
              rows={[
                ["https://api.nittagateway.com/api/transactions?accountId=2", "✅ Yes"],
                ["http://localhost:8080/api/transactions?accountId=2", "❌ No"],
              ]}
            />
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "backend",
    title: "Backend (Spring Boot Gateway)",
    items: [
      {
        id: "be-service",
        title: "Service & Health",
        description: "systemd, port, health checks, logs",
        tags: ["backend", "systemd", "ops"],
        content: (
          <DocArticle title="Backend Service & Health">
            <H2>Runtime</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Runs as a fat JAR (e.g., <code>/var/www/app/app.jar</code>)</li>
              <li>Binds to <code>127.0.0.1:8080</code> (proxied by Nginx)</li>
              <li>Managed by <code>systemd</code></li>
            </ul>

            <H2>systemd unit</H2>
            <CodeBlock
              language="ini"
              code={`# /etc/systemd/system/gateway.service
[Unit]
Description=Gateway Backend
After=network.target

[Service]
WorkingDirectory=/var/www/app
User=www-data
Group=www-data

EnvironmentFile=/var/www/app/shared/config/.env

ExecStart=/usr/bin/java -jar /var/www/app/app.jar --spring.profiles.active=\${SPRING_PROFILES_ACTIVE}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target`}
            />

            <H2>Commands</H2>
            <CodeBlock
              language="bash"
              code={`sudo systemctl daemon-reload
sudo systemctl enable gateway
sudo systemctl restart gateway
sudo systemctl status gateway -l`}
            />

            <H2>Health checks</H2>
            <CodeBlock
              language="bash"
              code={`curl -sS http://127.0.0.1:8080/actuator/health || true
curl -sS https://api.nittagateway.com/actuator/health || true`}
            />

            <H2>Logs</H2>
            <CodeBlock
              language="bash"
              code={`# Backend logs via journald
sudo journalctl -u gateway -n 200 --no-pager

# Nginx logs
sudo tail -n 200 /var/log/nginx/error.log
sudo tail -n 200 /var/log/nginx/access.log`}
            />
          </DocArticle>
        ),
      },

      {
        id: "nginx",
        title: "Nginx Configuration",
        description: "Two domains, static + proxy, timeouts",
        tags: ["nginx", "proxy", "static"],
        content: (
          <DocArticle title="Nginx Configuration">
            <H2>card.nittagateway.com (static)</H2>
            <CodeBlock
              language="nginx"
              code={`server {
  listen 80;
  server_name card.nittagateway.com;

  root /var/www/app/current_fe;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /assets/ {
    expires 30d;
    access_log off;
  }
}`}
            />

            <H2>api.nittagateway.com (reverse proxy)</H2>
            <CodeBlock
              language="nginx"
              code={`server {
  listen 80;
  server_name api.nittagateway.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 30s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
  }
}`}
            />

            <H2>Permissions (must)</H2>
            <CodeBlock
              language="bash"
              code={`sudo chmod 644 /etc/nginx/sites-available/api.nittagateway.com
sudo chmod 644 /etc/nginx/sites-available/card.nittagateway.com
sudo chmod 644 /etc/nginx/sites-enabled/api.nittagateway.com
sudo chmod 644 /etc/nginx/sites-enabled/card.nittagateway.com`}
            />

            <H2>Validate & reload</H2>
            <CodeBlock language="bash" code={`sudo nginx -t && sudo systemctl reload nginx`} />
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "security-auth",
    title: "Auth, RBAC & Security",
    items: [
      {
        id: "jwt-rbac",
        title: "JWT & RBAC",
        description: "Token usage, roles, scoping rules",
        tags: ["auth", "jwt", "rbac", "security"],
        content: (
          <DocArticle title="JWT & RBAC">
            <H2>Authentication</H2>
            <p>All protected endpoints require:</p>
            <CodeBlock language="http" code={`Authorization: Bearer <JWT>`} />

            <H2>Roles</H2>
            <Table
              columns={["Role", "Typical capabilities"]}
              rows={[
                ["ROLE_ADMIN", "Manage tenants, trigger sync/export jobs, broader access by policy"],
                ["ROLE_USER", "Read-only access limited to assigned accounts"],
              ]}
            />

            <H2>Tenant scoping (mandatory)</H2>
            <CodeBlock
              language="text"
              code={`Every endpoint that accepts accountId must verify:
- if ADMIN: allow (or allow by policy)
- else: accountId must be assigned to user
If violation: 403 Forbidden`}
            />

            <H2>Secret handling</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not return apiKey in any JSON payload.</li>
              <li>Do not log bearer tokens, api keys, or Vault payloads.</li>
              <li>Store secrets encrypted at rest (DB) or in server env (preferred).</li>
            </ul>

            <Callout tone="warning" title="Common security failure">
              Missing server-side scoping checks results in cross-tenant data leaks. Client-side checks do not count.
            </Callout>
          </DocArticle>
        ),
      },

      {
        id: "cors",
        title: "CORS Policy",
        description: "Allow only card.nittagateway.com",
        tags: ["cors", "security"],
        content: (
          <DocArticle title="CORS Policy (Production)">
            <H2>Allowed origin</H2>
            <CodeBlock language="text" code={`https://card.nittagateway.com`} />

            <H2>Rules</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>No wildcard origins in production.</li>
              <li>Whitelist only required methods and headers.</li>
              <li>Prefer app-layer enforcement; Nginx can reinforce.</li>
            </ul>
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "tenants",
    title: "Tenants & Configuration",
    items: [
      {
        id: "account-model",
        title: "Account (Tenant) Model",
        description: "Fields and safe responses",
        tags: ["tenant", "account", "secrets"],
        content: (
          <DocArticle title="Account (Tenant) Model">
            <H2>Fields</H2>
            <Table
              columns={["Field", "Description", "Security"]}
              rows={[
                ["id", "Internal account identifier", "Non-secret"],
                ["name", "Tenant display name", "Non-secret"],
                ["slashAccountId", "Slash tenant identifier", "Non-secret"],
                ["apiKey", "Slash API key", "Secret — never returned"],
                ["baseUrl", "Slash API base override", "Non-secret"],
                ["vaultUrl", "Slash Vault base override", "Non-secret"],
              ]}
            />

            <H2>Safe API response pattern</H2>
            <CodeBlock
              language="json"
              code={`{
  "id": 2,
  "name": "HHMEGA LLC",
  "slashAccountId": "sa_xxx",
  "hasApiKey": true
}`}
            />

            <Callout tone="warning" title="Do not expose apiKey">
              Do not include apiKey in JSON, logs, exports, or frontend state.
            </Callout>
          </DocArticle>
        ),
      },

      {
        id: "env-config",
        title: "Environment Configuration (.env)",
        description: "Recommended keys and structure",
        tags: ["env", "config", "ops"],
        content: (
          <DocArticle title="Environment Configuration (.env)">
            <H2>Shared env file</H2>
            <CodeBlock language="text" code={`/var/www/app/shared/config/.env`} />

            <H2>Example keys</H2>
            <CodeBlock
              language="dotenv"
              code={`SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

SLASH_API_BASE_URL=https://api.joinslash.com
SLASH_VAULT_BASE_URL=https://vault.joinslash.com

JWT_SECRET=__CHANGE_ME__

# DB (if used)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=gateway
DB_USER=gateway
DB_PASS=__CHANGE_ME__`}
            />

            <H2>Permissions</H2>
            <CodeBlock
              language="bash"
              code={`sudo chown www-data:www-data /var/www/app/shared/config/.env
sudo chmod 600 /var/www/app/shared/config/.env`}
            />
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "slash",
    title: "Slash Integration",
    items: [
      {
        id: "slash-client",
        title: "Slash API & Vault Rules",
        description: "Base URLs, retries, timeouts, vault constraints",
        tags: ["slash", "vault", "http"],
        content: (
          <DocArticle title="Slash API & Vault Rules">
            <H2>Default base URLs</H2>
            <Table
              columns={["Type", "Default URL"]}
              rows={[
                ["Slash API", "https://api.joinslash.com"],
                ["Slash Vault", "https://vault.joinslash.com"],
              ]}
            />

            <H2>Client requirements</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Inject apiKey server-side only.</li>
              <li>Do not log sensitive headers.</li>
              <li>Handle 429 and transient 5xx with limited retries + backoff.</li>
              <li>Use timeouts to avoid thread starvation.</li>
              <li>Ensure proper URL encoding for keys like <code>filter:from_date</code>.</li>
            </ul>

            <H2>Vault constraints</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>CVV/PAN is vault-only; never persist to DB.</li>
              <li>Return on-demand only and only to authorized roles.</li>
              <li>Scrub logs and traces; do not include in exceptions.</li>
            </ul>
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "domain",
    title: "Domain & Data Flows",
    items: [
      {
        id: "entities",
        title: "Core Entities",
        description: "VA, CardGroup, Card, Transaction",
        tags: ["domain", "entities"],
        content: (
          <DocArticle title="Core Entities">
            <H2>Virtual Accounts</H2>
            <Table
              columns={["Field", "Notes"]}
              rows={[
                ["slashVirtualAccountId", "External key"],
                ["accountId", "Tenant scoping"],
                ["name", "Display name"],
                ["currency", "ISO code"],
                ["status", "active/closed/etc."],
              ]}
            />

            <H2>Card Groups</H2>
            <Table
              columns={["Field", "Notes"]}
              rows={[
                ["slashCardGroupId", "External key"],
                ["accountId", "Tenant scoping"],
                ["virtualAccountId", "Mapping to VA"],
                ["status", "active/etc."],
              ]}
            />

            <H2>Cards</H2>
            <Table
              columns={["Field", "Notes"]}
              rows={[
                ["slashCardId", "External key"],
                ["accountId", "Tenant scoping"],
                ["last4", "Masked only"],
                ["brand", "VISA/MC/etc."],
                ["status", "active/frozen/etc."],
              ]}
            />

            <H2>Transactions</H2>
            <Callout tone="warning" title="High-volume data">
              Transactions may be extremely large. Use cursor scan or async exports for long date ranges.
            </Callout>

            <Table
              columns={["Field", "Notes"]}
              rows={[
                ["id", "Slash transaction id"],
                ["date", "ISO datetime"],
                ["amountCents", "Signed integer cents"],
                ["status", "posted/pending/etc."],
                ["detailedStatus", "settled/declined/refund/returned/dispute/etc."],
                ["country", "Optional (used for filters)"],
              ]}
            />
          </DocArticle>
        ),
      },

      {
        id: "sync",
        title: "Sync Jobs",
        description: "Scheduling, ordering, logs, manual trigger",
        tags: ["sync", "jobs"],
        content: (
          <DocArticle title="Sync Jobs">
            <H2>Recommended ordering</H2>
            <CodeBlock
              language="text"
              code={`1) Virtual Accounts
2) Card Groups
3) Cards
4) Transactions`}
            />

            <H2>Baseline cadence</H2>
            <Table
              columns={["Job", "Frequency", "Notes"]}
              rows={[
                ["Sync Virtual Accounts", "Hourly", "Upsert by external key"],
                ["Sync Card Groups", "Hourly", "Depends on VA mapping"],
                ["Sync Cards", "Hourly", "Depends on card groups"],
                ["Sync Transactions", "Incremental", "Keep cursor, avoid full history every run"],
              ]}
            />

            <H2>Sync logging fields</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>jobName, startedAt, finishedAt, status</li>
              <li>fetchedCount, upsertedCount, errorCount</li>
              <li>error summary (no secrets)</li>
            </ul>

            <H2>Operational rule</H2>
            <Callout tone="info" title="Incremental transactions">
              Always use incremental windows or persisted cursors to avoid re-reading full history.
            </Callout>
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "api-patterns",
    title: "API Patterns",
    items: [
      {
        id: "filters-cursor",
        title: "Filters & Cursor Scan",
        description: "filter:* params, totals, safe pagination",
        tags: ["api", "filters", "cursor"],
        content: (
          <DocArticle title="Filters & Cursor Scan">
            <H2>Filter format</H2>
            <CodeBlock
              language="text"
              code={`GET /api/transactions?accountId=2&filter:from_date=1735664400000&filter:to_date=1767200399999&filter:detailed_status=settled&total=5000`}
            />

            <H2>Common filters (examples)</H2>
            <Table
              columns={["Key", "Example", "Meaning"]}
              rows={[
                ["filter:from_date", "1735664400000", "Start timestamp (ms)"],
                ["filter:to_date", "1767200399999", "End timestamp (ms)"],
                ["filter:detailed_status", "settled", "Detailed status filter"],
                ["filter:country", "US", "Country filter (optional)"],
                ["total", "5000", "Limit/cap for results"],
              ]}
            />

            <H2>Cursor scan pattern</H2>
            <CodeBlock
              language="http"
              code={`POST /api/transactions/cursor-scan
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "accountId": 2,
  "fromDate": 1735664400000,
  "toDate": 1767200399999,
  "pageSize": 500,
  "cursor": null
}`}
            />

            <H2>Why cursor scan</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prevents 504 gateway timeouts for large date ranges.</li>
              <li>Allows streaming/processing without loading everything into memory.</li>
              <li>Supports stable resumption if a page fails.</li>
            </ul>
          </DocArticle>
        ),
      },

      {
        id: "exports",
        title: "Exports (CSV/XLSX/JSONL/Async)",
        description: "Export strategies and operational limits",
        tags: ["export", "jsonl", "async"],
        content: (
          <DocArticle title="Exports (CSV/XLSX/JSONL/Async)">
            <H2>Export modes</H2>
            <Table
              columns={["Mode", "Use case", "Notes"]}
              rows={[
                ["CSV", "Small datasets", "Simple and portable"],
                ["XLSX", "Small datasets", "Excel-friendly, memory heavier"],
                ["JSONL", "Large datasets", "Stream-friendly; best for long ranges"],
                ["Async export jobs", "Very large datasets", "Queue + status + download artifact"],
              ]}
            />

            <H2>JSONL example</H2>
            <CodeBlock
              language="text"
              code={`{"id":"tx_1","amountCents":123,"detailedStatus":"settled"}
{"id":"tx_2","amountCents":-50,"detailedStatus":"declined"}`}
            />

            <H2>Operational guardrails</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Rate limit exports per tenant.</li>
              <li>Cap concurrent export jobs.</li>
              <li>Prefer server-side streaming and avoid building huge arrays in memory.</li>
            </ul>
          </DocArticle>
        ),
      },
    ],
  },

  {
    id: "deploy-runbook",
    title: "Deploy & Runbook",
    items: [
      {
        id: "deploy-commands",
        title: "Full Deploy Commands (Everything)",
        description: "Fresh setup + release deploy + rollback + cleanup + debugging",
        tags: ["deploy", "runbook", "rollback", "ssl"],
        content: (
          <DocArticle title="Full Deploy Commands (Everything)">
            <H2>One-time setup</H2>
            <CodeBlock
              language="bash"
              code={`# Update
sudo apt update -y && sudo apt upgrade -y

# Install packages
sudo apt install -y nginx certbot python3-certbot-nginx openjdk-21-jre-headless unzip curl jq ufw

# Firewall (recommended)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status`}
            />

            <H2>Directory layout (recommended)</H2>
            <CodeBlock
              language="bash"
              code={`# Create directories
sudo mkdir -p /var/www/app/releases
sudo mkdir -p /var/www/app/shared/logs
sudo mkdir -p /var/www/app/shared/config

# Ownership
sudo chown -R www-data:www-data /var/www/app
sudo chmod -R 755 /var/www/app`}
            />

            <H2>Deploy Frontend (static)</H2>
            <CodeBlock
              language="bash"
              code={`# Create release folder
RELEASE_FE=/var/www/app/releases/fe_$(date +%Y%m%d_%H%M%S)
sudo -u www-data mkdir -p "$RELEASE_FE"

# Upload your dist/ into $RELEASE_FE (scp/rsync)
# Example (from your local machine):
# rsync -avz dist/ root@SERVER_IP:$RELEASE_FE/

# Switch current symlink
sudo -u www-data ln -sfn "$RELEASE_FE" /var/www/app/current_fe

# Verify
ls -la /var/www/app/current_fe
test -f /var/www/app/current_fe/index.html && echo "FE OK"`}
            />

            <H2>Deploy Backend (JAR)</H2>
            <CodeBlock
              language="bash"
              code={`# Create release folder
RELEASE_BE=/var/www/app/releases/be_$(date +%Y%m%d_%H%M%S)
sudo -u www-data mkdir -p "$RELEASE_BE"

# Upload app.jar into $RELEASE_BE/app.jar (scp/rsync)
# Example (from your local machine):
# scp app.jar root@SERVER_IP:$RELEASE_BE/app.jar

# Switch symlink
sudo -u www-data ln -sfn "$RELEASE_BE" /var/www/app/current_be
sudo -u www-data ln -sfn /var/www/app/current_be/app.jar /var/www/app/app.jar

# Verify
ls -la /var/www/app/app.jar`}
            />

            <H2>Environment file (.env)</H2>
            <CodeBlock language="bash" code={`sudo -u www-data nano /var/www/app/shared/config/.env`} />
            <CodeBlock
              language="dotenv"
              code={`SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
SLASH_API_BASE_URL=https://api.joinslash.com
SLASH_VAULT_BASE_URL=https://vault.joinslash.com
JWT_SECRET=__CHANGE_ME__`}
            />
            <CodeBlock
              language="bash"
              code={`sudo chown www-data:www-data /var/www/app/shared/config/.env
sudo chmod 600 /var/www/app/shared/config/.env`}
            />

            <H2>systemd</H2>
            <CodeBlock language="bash" code={`sudo nano /etc/systemd/system/gateway.service`} />
            <CodeBlock
              language="ini"
              code={`[Unit]
Description=Gateway Backend
After=network.target

[Service]
WorkingDirectory=/var/www/app
User=www-data
Group=www-data
EnvironmentFile=/var/www/app/shared/config/.env
ExecStart=/usr/bin/java -jar /var/www/app/app.jar --spring.profiles.active=\${SPRING_PROFILES_ACTIVE}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target`}
            />
            <CodeBlock
              language="bash"
              code={`sudo systemctl daemon-reload
sudo systemctl enable gateway
sudo systemctl restart gateway
sudo systemctl status gateway -l`}
            />

            <H2>Nginx sites</H2>
            <CodeBlock language="bash" code={`sudo nano /etc/nginx/sites-available/card.nittagateway.com`} />
            <CodeBlock
              language="nginx"
              code={`server {
  listen 80;
  server_name card.nittagateway.com;

  root /var/www/app/current_fe;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /assets/ {
    expires 30d;
    access_log off;
  }
}`}
            />

            <CodeBlock language="bash" code={`sudo nano /etc/nginx/sites-available/api.nittagateway.com`} />
            <CodeBlock
              language="nginx"
              code={`server {
  listen 80;
  server_name api.nittagateway.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 30s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
  }
}`}
            />

            <CodeBlock
              language="bash"
              code={`sudo ln -sfn /etc/nginx/sites-available/card.nittagateway.com /etc/nginx/sites-enabled/card.nittagateway.com
sudo ln -sfn /etc/nginx/sites-available/api.nittagateway.com /etc/nginx/sites-enabled/api.nittagateway.com
sudo rm -f /etc/nginx/sites-enabled/default

# Permissions (no 777)
sudo chmod 644 /etc/nginx/sites-available/*.nittagateway.com
sudo chmod 644 /etc/nginx/sites-enabled/*.nittagateway.com

sudo nginx -t && sudo systemctl reload nginx`}
            />

            <H2>SSL (Let's Encrypt)</H2>
            <CodeBlock
              language="bash"
              code={`sudo certbot --nginx -d api.nittagateway.com -d card.nittagateway.com
sudo systemctl status certbot.timer -l
sudo certbot renew --dry-run`}
            />

            <H2>Verification</H2>
            <CodeBlock
              language="bash"
              code={`curl -I https://card.nittagateway.com
curl -sS https://api.nittagateway.com/actuator/health || true
ss -lntp | egrep '(:80|:443|:8080)' || true`}
            />

            <H2>Rollback</H2>
            <CodeBlock
              language="bash"
              code={`# List releases
ls -la /var/www/app/releases | egrep '^(d|l).* (fe_|be_)' || true

# Rollback BE
PREV_BE=/var/www/app/releases/be_YYYYMMDD_HHMMSS
sudo -u www-data ln -sfn "$PREV_BE" /var/www/app/current_be
sudo -u www-data ln -sfn /var/www/app/current_be/app.jar /var/www/app/app.jar
sudo systemctl restart gateway

# Rollback FE
PREV_FE=/var/www/app/releases/fe_YYYYMMDD_HHMMSS
sudo -u www-data ln -sfn "$PREV_FE" /var/www/app/current_fe
sudo nginx -t && sudo systemctl reload nginx`}
            />

            <H2>Cleanup old releases</H2>
            <CodeBlock
              language="bash"
              code={`du -sh /var/www/app/releases/* | sort -h | tail -n 20
# Remove carefully:
sudo rm -rf /var/www/app/releases/be_YYYYMMDD_HHMMSS`}
            />

            <H2>Debug quick commands</H2>
            <CodeBlock
              language="bash"
              code={`sudo journalctl -u gateway -n 200 --no-pager
sudo tail -n 200 /var/log/nginx/error.log
sudo tail -n 200 /var/log/nginx/access.log
curl -Iv https://api.nittagateway.com
curl -Iv https://card.nittagateway.com`}
            />

            <Callout tone="success" title="Outcome">
              This runbook provides end-to-end reproducible deploys (releases + symlinks), safe rollback, SSL automation, and operational verification.
            </Callout>
          </DocArticle>
        ),
      },

      {
        id: "incident-checklist",
        title: "Incident Checklist (504 / Latency / Errors)",
        description: "What to check first during outages",
        tags: ["incident", "runbook"],
        content: (
          <DocArticle title="Incident Checklist (504 / Latency / Errors)">
            <H2>Fast triage</H2>
            <CodeBlock
              language="bash"
              code={`# 1) Is backend up?
sudo systemctl status gateway -l
ss -lntp | grep 8080 || true

# 2) Is nginx ok?
sudo nginx -t
sudo systemctl status nginx -l

# 3) What errors?
sudo tail -n 200 /var/log/nginx/error.log
sudo journalctl -u gateway -n 200 --no-pager`}
            />

            <H2>If 504</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identify request pattern (long date range, very high totals).</li>
              <li>Switch client to cursor scan / async export.</li>
              <li>Check upstream Slash latency/rate limiting (429/5xx).</li>
            </ul>

            <H2>If auth errors</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Validate JWT expiry, clock skew, and secret rotation.</li>
              <li>Confirm CORS and origin rules for FE domain.</li>
            </ul>

            <H2>If data mismatch</H2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirm filter logic parity (detailedStatus vs status).</li>
              <li>Confirm country logic (US vs null-US classification rules).</li>
              <li>Confirm amount sign rules and aggregation boundaries.</li>
            </ul>
          </DocArticle>
        ),
      },
    ],
  },
];

/* ============================= App UI ============================= */

export default function GatewayDocsManualOnly_FULL() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeItemId, setActiveItemId] = useState<string>(() => DOCS[0]?.items?.[0]?.id ?? "overview-intro");
  const [activeSectionId, setActiveSectionId] = useState<string>(() => DOCS[0]?.id ?? "overview");
  const contentRef = useRef<HTMLDivElement | null>(null);

  const flatItems = useMemo(() => {
    const arr: Array<{ sectionId: string; sectionTitle: string; item: DocItem }> = [];
    for (const s of DOCS) for (const it of s.items) arr.push({ sectionId: s.id, sectionTitle: s.title, item: it });
    return arr;
  }, []);

  const active = useMemo(() => flatItems.find((x) => x.item.id === activeItemId) ?? flatItems[0], [flatItems, activeItemId]);

  useEffect(() => {
    const found = flatItems.find((x) => x.item.id === activeItemId);
    if (found) setActiveSectionId(found.sectionId);
  }, [activeItemId, flatItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCS;
    return DOCS.map((s) => ({
      ...s,
      items: s.items.filter((it) => {
        const hay = [s.title, it.title, it.description ?? "", (it.tags ?? []).join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      }),
    })).filter((s) => s.items.length > 0);
  }, [query]);

  const toc = useMemo(() => {
    const root = contentRef.current;
    if (!root) return [];
    const headings = Array.from(root.querySelectorAll("h2, h3")) as HTMLElement[];
    return headings
      .map((h) => ({ id: h.id, text: h.innerText, level: h.tagName.toLowerCase() === "h2" ? 2 : 3 }))
      .filter((x) => x.id);
  }, [activeItemId]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeItemId]);

  const Sidebar = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">{APP_NAME} Docs</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {DOC_VERSION} · updated {LAST_UPDATED}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Chip label="Full" />
            <Chip label="Manual" />
          </div>
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {filtered.map((section) => {
          const expanded = section.id === activeSectionId;
          return (
            <div key={section.id} className="mb-2">
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-900"
                onClick={() => setActiveSectionId(section.id)}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{section.title}</span>
                <span className="text-slate-400">{expanded ? "–" : "+"}</span>
              </button>

              {expanded && (
                <div className="mt-1 space-y-1">
                  {section.items.map((it) => {
                    const activeNow = it.id === activeItemId;
                    return (
                      <button
                        key={it.id}
                        onClick={() => {
                          setActiveItemId(it.id);
                          setMobileOpen(false);
                        }}
                        className={[
                          "w-full px-3 py-2 rounded-lg text-left",
                          activeNow
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-900 dark:text-slate-100",
                        ].join(" ")}
                      >
                        <div className="text-sm font-medium">{it.title}</div>
                        {it.description && (
                          <div className={["text-xs mt-0.5", activeNow ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"].join(" ")}>
                            {it.description}
                          </div>
                        )}
                        {!!it.tags?.length && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {it.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className={[
                                  "text-[10px] px-2 py-0.5 rounded-full",
                                  activeNow
                                    ? "bg-white/15 text-white dark:bg-slate-200 dark:text-slate-800"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
                                ].join(" ")}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No results.</div>}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        Manual docs only. Edit content in <code>DOCS</code>.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="font-semibold">{active?.item.title ?? "Docs"}</div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Chip label={DOC_VERSION} />
            <Chip label="Internal" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr_280px] gap-0">
        <aside className="hidden lg:block h-[calc(100vh-56px)] sticky top-14 border-r border-slate-200 dark:border-slate-800">
          {Sidebar}
        </aside>

        <main className="min-h-[calc(100vh-56px)]">
          <div className="px-4 py-8 lg:px-8">
            <div className="mb-6">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {active?.sectionTitle} / <span className="text-slate-700 dark:text-slate-200">{active?.item.title}</span>
              </div>
            </div>

            <div ref={contentRef} className="prose prose-slate dark:prose-invert max-w-none">
              {active?.item.content}
            </div>
          </div>
        </main>

        <aside className="hidden lg:block h-[calc(100vh-56px)] sticky top-14 border-l border-slate-200 dark:border-slate-800">
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">On this page</div>
            <div className="mt-3 space-y-2">
              {toc.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">No headings.</div>}
              {toc.map((x) => (
                <button
                  key={x.id}
                  className={[
                    "block w-full text-left text-sm hover:underline",
                    x.level === 3 ? "pl-4 text-slate-600 dark:text-slate-300" : "text-slate-800 dark:text-slate-100",
                  ].join(" ")}
                  onClick={() => document.getElementById(x.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  {x.text}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[86%] max-w-[360px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="font-semibold">Docs</div>
              <button className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900" onClick={() => setMobileOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="h-[calc(100%-56px)]">{Sidebar}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= Shared UI Components ============================= */

function DocArticle({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: Array<{ k: string; v: string }>;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {meta?.length ? (
          <div className="flex flex-wrap gap-2">
            {meta.map((m) => (
              <span
                key={m.k}
                className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <b>{m.k}:</b> {m.v}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </article>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  const id = toId(children);
  return (
    <h2 id={id} className="scroll-mt-20">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  const id = toId(children);
  return (
    <h3 id={id} className="scroll-mt-20">
      {children}
    </h3>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  return (
    <div className="not-prose">
      <div className="flex items-center justify-between px-3 py-2 rounded-t-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <span className="text-xs text-slate-600 dark:text-slate-300">{language ?? "code"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 overflow-auto rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <code className="text-sm leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-950"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 900);
        } catch {}
      }}
    >
      {ok ? "Copied" : "Copy"}
    </button>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: Array<string[]> }) {
  return (
    <div className="not-prose overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            {columns.map((c) => (
              <th key={c} className="text-left px-3 py-2 font-semibold border-b border-slate-200 dark:border-slate-800">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-950 dark:even:bg-slate-900">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "success";
  title?: string;
  children: React.ReactNode;
}) {
  const cls =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
      : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100";

  return (
    <div className={["not-prose border rounded-lg p-4", cls].join(" ")}>
      {title ? <div className="font-semibold mb-1">{title}</div> : null}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
      {label}
    </span>
  );
}

function toId(children: React.ReactNode): string {
  const text =
    typeof children === "string" ? children : Array.isArray(children) ? children.join(" ") : String(children);
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}
