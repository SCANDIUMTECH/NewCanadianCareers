# Orion Backend

Django REST Framework backend for the Orion hiring platform.

## Tech Stack

- **Framework**: Django 5.x + Django REST Framework
- **Database**: PostgreSQL 15+
- **Cache/Sessions**: Redis 7+
- **Task Queue**: Celery + Redis
- **Payments**: Stripe
- **Email**: Resend
- **Storage**: MinIO (S3-compatible)
- **Deployment**: Docker + Docker Compose

## Quick Start (Development)

### 1. Clone and setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run migrations

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 4. Start development server

```bash
python manage.py runserver
```

## Docker Development

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# View logs
docker-compose logs -f web
```

## Production Deployment

### 1. Setup VPS

- Ubuntu 22.04+ recommended
- Install Docker and Docker Compose
- Configure firewall (allow 80, 443)

### 2. Configure

```bash
cp .env.example .env
# Edit .env with production values
# Generate a new SECRET_KEY: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. SSL Certificates

Place SSL certificates in `nginx/ssl/`:
- `fullchain.pem`
- `privkey.pem`

Or use Let's Encrypt with Certbot.

### 4. Deploy

```bash
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Collect static files
docker-compose exec web python manage.py collectstatic --noinput
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/me/` - Get current user
- `POST /api/auth/password/reset/` - Request password reset
- `POST /api/auth/email/verify/` - Verify email

### Jobs
- `GET /api/jobs/` - List published jobs
- `GET /api/jobs/{slug}/` - Job detail
- `POST /api/jobs/company/` - Create job (employer)
- `POST /api/jobs/{id}/report/` - Report a job

### Applications
- `POST /api/applications/apply/` - Apply to job
- `GET /api/applications/my/` - Candidate's applications
- `GET /api/applications/company/` - Company's received applications

### Billing
- `GET /api/billing/packages/` - List packages
- `POST /api/billing/checkout/session/` - Create Stripe checkout
- `GET /api/billing/entitlements/` - View credits

### Search
- `GET /api/search/jobs/` - Advanced job search
- `GET /api/search/companies/` - Company search
- `GET /api/search/filters/` - Get filter options

## Project Structure

```
backend/
├── config/                 # Django settings
│   ├── settings/
│   │   ├── base.py        # Base settings
│   │   ├── development.py # Dev settings
│   │   └── production.py  # Production settings
│   ├── urls.py            # Root URL config
│   └── celery.py          # Celery config
├── apps/
│   ├── users/             # User management
│   ├── companies/         # Companies & Agencies
│   ├── jobs/              # Job postings
│   ├── applications/      # Job applications
│   ├── billing/           # Stripe, entitlements
│   ├── notifications/     # Email & in-app
│   ├── moderation/        # Admin tools
│   ├── social/            # Social distribution
│   ├── search/            # Search endpoints
│   └── audit/             # Audit logging
├── core/                  # Shared utilities
│   ├── permissions.py
│   ├── pagination.py
│   └── mixins.py
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Environment Variables

See `.env.example` for all required variables.

## License

Proprietary - All rights reserved.
