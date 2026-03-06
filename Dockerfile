# =============================================================================
# MASTER DOCKERFILE — New Canadian Careers Platform
# Single source of truth for all service images (frontend + backend)
#
# Usage (docker-compose targets specific stages):
#   frontend-deps    → dev frontend (hot reload, volumes)
#   frontend-runtime → production frontend
#   backend-deps     → dev backend (gunicorn/celery, volumes)
#   backend-runtime  → production backend
# =============================================================================

# =============================================================================
# STAGE 1: Frontend Dependencies (dev target — hot reload via volumes)
# =============================================================================
FROM node:20-alpine AS frontend-deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only (source code mounted as volume in dev)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "next", "dev", "--turbopack", "--hostname", "0.0.0.0"]

# =============================================================================
# STAGE 2: Frontend Builder (copies source + builds)
# =============================================================================
FROM frontend-deps AS frontend-builder

COPY . .
RUN pnpm run build

# =============================================================================
# STAGE 3: Frontend Runtime (production — minimal image with built artifacts)
# =============================================================================
FROM node:20-alpine AS frontend-runtime

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

COPY --from=frontend-builder --chown=appuser:appuser /app/.next .next
COPY --from=frontend-builder --chown=appuser:appuser /app/public ./public
COPY --from=frontend-builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=frontend-builder --chown=appuser:appuser /app/package.json ./

USER appuser
EXPOSE 3000
CMD ["pnpm", "start"]

# =============================================================================
# STAGE 4: Backend Dependencies (dev target — source mounted as volume)
# =============================================================================
FROM python:3.14-slim AS backend-deps

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (build + runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc g++ make libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libffi-dev libcairo2 libjpeg-dev zlib1g-dev \
    libpng-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies only (source code mounted as volume in dev)
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Create log + media directories
RUN mkdir -p /var/log/ncc /app/media /app/staticfiles

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]

# =============================================================================
# STAGE 5: Backend Runtime (production — source baked in, static files collected)
# =============================================================================
FROM python:3.14-slim AS backend-runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Install runtime-only system dependencies (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    libcairo2 libjpeg62-turbo libpng16-16 zlib1g && \
    rm -rf /var/lib/apt/lists/*

# Copy Python packages from deps stage
COPY --from=backend-deps /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=backend-deps /usr/local/bin /usr/local/bin

# Copy backend source
COPY backend/ .

# Create non-root user and directories
RUN adduser --disabled-password --gecos '' appuser && \
    mkdir -p /var/log/ncc /app/media /app/staticfiles && \
    chown -R appuser:appuser /app /var/log/ncc

# Collect static files (throwaway key — real SECRET_KEY injected at runtime)
USER appuser
RUN SECRET_KEY=build-only-collect-static python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]

LABEL maintainer="New Canadian Careers"
LABEL version="1.0"
LABEL description="NCC Platform — Production Image"
