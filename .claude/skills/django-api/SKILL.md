---
name: django-api
description: Build Django REST Framework API endpoints for Orion backend. Use when creating models, serializers, views, URLs, migrations, Celery tasks, or any backend Python/Django work.
user-invocable: true
---

# Django API Development Skill

Build backend features for Orion's Django + DRF API. The backend runs on Docker with Traefik.

## Environment

- **Start backend**: `cd backend && docker-compose up`
- **Django runs at**: port 8000 (internal), accessed via Traefik at **port 80**
- **Run management commands**: `cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py <command>`
- **Run migrations**: `cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py makemigrations && cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py migrate`
- **Shell**: `cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py shell_plus`
- **Logs**: `cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose logs -f web`
- **Test**: `cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web pytest`

## Backend File Structure

```
backend/
  config/
    settings/base.py       # Django settings (INSTALLED_APPS, middleware, JWT, etc.)
    urls.py                # Root URL config — ALL app URLs registered here
  apps/
    users/                 # Custom User model (email-based, no username)
    companies/             # Company + Agency + CompanyUser + AgencyUser + AgencyClient
    jobs/                  # Job + JobReport + JobView
    applications/          # Application tracking
    billing/               # Stripe packages, entitlements, checkout
    notifications/         # Notification system
    moderation/            # Admin moderation, PlatformSetting
    social/                # Social media posting (FB, IG, LinkedIn, X)
    search/                # Search endpoints
    audit/                 # Audit log middleware
  core/
    permissions.py         # IsAdmin, IsEmployer, IsAgency, IsCompanyMember
  docker-compose.yml       # All services (Traefik, Django, PostgreSQL, Redis, Celery, MinIO)
  requirements.txt         # Python dependencies
```

## Standard Django App Structure

Every app follows this pattern:
```
apps/<app_name>/
  __init__.py
  admin.py          # Django admin registration
  apps.py           # App config
  models.py         # Data models
  serializers.py    # DRF serializers
  views.py          # DRF views/viewsets
  urls.py           # URL patterns with DefaultRouter
  tasks.py          # Celery tasks (if needed)
  migrations/       # Database migrations
```

## How to Create a New API Endpoint

### Step 1: Model (if needed)
```python
# apps/<app>/models.py
from django.db import models
from apps.users.models import User

class MyModel(models.Model):
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

### Step 2: Serializer
```python
# apps/<app>/serializers.py
from rest_framework import serializers
from .models import MyModel

class MyModelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = ['id', 'name', 'created_at']

class MyModelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = '__all__'

class MyModelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = ['name']
```

### Step 3: View
```python
# apps/<app>/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from core.permissions import IsEmployer
from .models import MyModel
from .serializers import MyModelListSerializer, MyModelDetailSerializer, MyModelCreateSerializer

class MyModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsEmployer]
    filterset_fields = ['status']
    search_fields = ['name']
    ordering = ['-created_at']

    def get_queryset(self):
        return MyModel.objects.filter(created_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return MyModelCreateSerializer
        if self.action == 'retrieve':
            return MyModelDetailSerializer
        return MyModelListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
```

### Step 4: URLs
```python
# apps/<app>/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.MyModelViewSet, basename='mymodel')

urlpatterns = [
    path('', include(router.urls)),
]
```

### Step 5: Register in config/urls.py
```python
path('api/mymodels/', include('apps.<app>.urls')),
```

### Step 6: Run migrations
```bash
cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py makemigrations
cd /Users/toorj/Documents/GitHub/Orion/backend && docker-compose exec web python manage.py migrate
```

## Existing Permission Classes

From `core/permissions.py`:
- `IsAdmin` — user.role == 'admin'
- `IsEmployer` — user.role == 'employer'
- `IsAgency` — user.role == 'agency'
- `IsCompanyMember` — user belongs to the company

## Key Conventions

- **User model**: `apps.users.models.User` — email-based, roles: admin/employer/agency/candidate
- **Serializer pattern**: List, Detail, Create, Update variants per model
- **ViewSet actions**: Use `@action(detail=True/False)` for custom endpoints (publish, pause, approve, etc.)
- **Permissions**: Stack with `[IsAuthenticated, IsRolePermission]`
- **Filtering**: Use `filterset_fields`, `search_fields`, `ordering_fields` on ViewSets
- **Relationships**: Use `select_related()` and `prefetch_related()` in querysets
- **Responses**: Return `Response(serializer.data)` for objects, `Response({'message': '...'})` for actions

## Checklist

After creating backend features:
- [ ] Model created with proper fields, Meta, __str__
- [ ] Serializers for list/detail/create/update
- [ ] ViewSet with correct permissions, queryset, serializer_class
- [ ] URLs registered with DefaultRouter
- [ ] Root urls.py updated with new app path
- [ ] Migrations created and applied
- [ ] Admin registered in admin.py

For detailed model schemas, see [resources/models-reference.md](resources/models-reference.md)
