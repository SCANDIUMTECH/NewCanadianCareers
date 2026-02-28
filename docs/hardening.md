All 14 services up and running with enterprise security hardening complete. Here's the summary of everything that was implemented:

---

## Enterprise Security Hardening — Complete

### 1. Network Segmentation (3-tier isolation)
- **`frontend_net`** — Traefik ↔ Django, Nginx, Grafana, Cloudflared (public-facing)
- **`backend_net`** (internal, no internet) — Django ↔ Redis, Kafka, ZooKeeper, OTel, MinIO
- **`data_net`** (internal, no internet) — Django ↔ PostgreSQL, ClickHouse

Data stores are **never** on the frontend network. Backend and data networks are `internal: true` — no outbound internet access.

### 2. Port Restrictions
| Service | Before | After |
|---------|--------|-------|
| Traefik Dashboard | `0.0.0.0:8080` | `127.0.0.1:8080` (localhost only) |
| Kafka | `0.0.0.0:9092` | `expose` only (no host binding) |
| ClickHouse | `0.0.0.0:8123 + 9009` | `expose` only (no host binding) |
| OTel Collector | `0.0.0.0:4317 + 4318` | `expose` only (no host binding) |
| MinIO S3 API | `0.0.0.0:9000` | `expose` only (no host binding) |
| MinIO Console | `0.0.0.0:9001` | Fully internal (backend_net only) |

### 3. Authentication Hardened
- **Redis**: `--requirepass` with `REDIS_PASSWORD` env var, dangerous commands disabled (`FLUSHDB`, `FLUSHALL`, `DEBUG`, `CONFIG` all renamed to `""`)
- **ClickHouse**: Password-authenticated user `orion` (no more `default` user without password)
- **PostgreSQL**: `DB_PASSWORD` now uses `${DB_PASSWORD:?...}` — docker-compose **fails** if not set
- **Grafana**: `${GRAFANA_ADMIN_PASSWORD:?...}` — fails if not set, anonymous access disabled, sign-up disabled, org creation disabled, gravatar disabled, external snapshots disabled

### 4. Traefik Hardened
- Security headers: HSTS, X-Content-Type-Options, X-Download-Options, Permissions-Policy, X-Permitted-Cross-Domain-Policies
- Rate limiting middleware applied to Django routes
- Access logging enabled
- Response timeouts configured (30s read/write, 120s idle)

### 5. Kafka Hardened
- Auto topic creation disabled (`KAFKA_AUTO_CREATE_TOPICS_ENABLE: false`)
- 7-day log retention, 1 GB per partition limit, 1 MB max message size

### 6. Files Modified
- `backend/docker-compose.yml` — Complete rewrite with network segmentation, auth, port restrictions
- `backend/traefik/traefik.yml` — Access logging, timeouts, network change
- `backend/traefik/dynamic/middlewares.yml` — Enhanced security headers
- `backend/config/settings/base.py` — ClickHouse auth settings, Redis URL comment
- `backend/apps/rum/clickhouse_client.py` — Uses authenticated credentials
- `backend/grafana/provisioning/datasources/datasources.yml` — Auth for Redis + ClickHouse datasources
- `backend/.env` — Dev credentials (no more `changeme`/`minioadmin`)
- `backend/.env.example` — Complete template with all required vars documented

### Access URLs (Dev)
| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Next.js dev server |
| Backend API | http://localhost | Traefik → Django |
| Django Admin | http://localhost/admin | + security headers |
| Traefik Dashboard | http://127.0.0.1:8080 | Localhost only |
| Grafana | http://grafana.localhost or http://localhost/grafana | Behind Traefik |
| MinIO Console | Internal only | Access via `docker-compose exec` |
| ClickHouse | Internal only | Access via `docker-compose exec` |
| Kafka | Internal only | Access via `docker-compose exec` |


All done. Here's what was secured:

**Created: `core/encryption.py`** — Reusable encryption infrastructure
- `EncryptedTextField` — Drop-in Django field that auto-encrypts on save, auto-decrypts on read
- Uses Fernet (AES-128-CBC + HMAC-SHA256), key derived from `SECRET_KEY` via PBKDF2 (480K iterations)
- Legacy unencrypted values pass through transparently (backward compat)
- `deconstruct()` reports as `TextField` so migrations don't depend on the encryption module

**Encrypted fields (4 models, 5 fields):**

| Model | Field | Before | After |
|---|---|---|---|
| `SlackInstallation` | `bot_token` | Plaintext TextField | `EncryptedTextField` |
| `AIProviderConfig` | `api_key` | Plaintext TextField (labeled "encrypted" but wasn't) | `EncryptedTextField` |
| `EmailProvider` | `api_key` | Plaintext CharField(255) | `EncryptedTextField` |
| `SocialAccount` | `access_token` | Plaintext TextField | `EncryptedTextField` |
| `SocialAccount` | `refresh_token` | Plaintext TextField | `EncryptedTextField` |

**Migrations applied:**
- `notifications/0005_slackinstallation` — Create table
- `notifications/0006_alter_emailprovider_api_key` — CharField→TextField
- `social/0004_alter_socialaccount_refresh_token` — Add default

**Verified:** All values stored as Fernet ciphertext in PostgreSQL, decrypted transparently in Python. Frontend and backend builds pass clean.