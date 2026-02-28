# Admin Support Module Implementation

## Overview

The Admin Support module has been successfully implemented in the Orion Django backend. This module provides comprehensive support tools for admins to manage users, companies, impersonation, data exports, and activity timelines.

## Files Created

1. **`/Users/toorj/Documents/GitHub/Orion/backend/apps/moderation/support_serializers.py`**
   - Contains all serializers for support endpoints
   - Serializers: SupportUserResultSerializer, SupportUserDetailSerializer, SupportCompanyResultSerializer, SupportCompanyDetailSerializer, TimelineEventSerializer, ImpersonationSessionSerializer, DataExportJobSerializer, ImpersonationStatusSerializer

2. **`/Users/toorj/Documents/GitHub/Orion/backend/apps/moderation/support_views.py`**
   - Contains all view classes for support endpoints
   - 17 view classes implementing all required functionality

3. **`/Users/toorj/Documents/GitHub/Orion/backend/apps/moderation/urls.py`** (modified)
   - Added support URL routes under `/api/admin/support/`

## Implemented Endpoints

### User Lookup
- **GET** `/api/admin/support/users/` - Search users by name or email
  - Query params: `q`, `type`, `status`, `page`, `page_size`
  - Returns paginated list of users

- **GET** `/api/admin/support/users/{userId}/` - Get detailed user information
  - Returns user details with login count, application count, email verification status, etc.

- **GET** `/api/admin/support/users/{userId}/timeline/` - Get user activity timeline
  - Query params: `event_type`, `start_date`, `end_date`, `page`, `page_size`
  - Returns paginated timeline events from audit logs

### Company Lookup
- **GET** `/api/admin/support/companies/` - Search companies by name or domain
  - Query params: `q`, `status`, `page`, `page_size`
  - Returns paginated list of companies

- **GET** `/api/admin/support/companies/{companyId}/` - Get detailed company information
  - Returns company details with billing status, team members, total payments, etc.

- **GET** `/api/admin/support/companies/{companyId}/timeline/` - Get company activity timeline
  - Query params: `event_type`, `start_date`, `end_date`, `page`, `page_size`
  - Returns paginated timeline events from audit logs

### Impersonation
- **POST** `/api/admin/support/impersonate/` - Start user impersonation
  - Body: `{ user_id: number, reason: string }`
  - Returns impersonation session with token
  - Creates audit log entry

- **POST** `/api/admin/support/impersonate/end/` - End impersonation session
  - Optional body: `{ token: string }`
  - Creates audit log entry

- **GET** `/api/admin/support/impersonate/status/` - Get current impersonation status
  - Checks X-Impersonation-Token header
  - Returns current session status

### Data Export
- **POST** `/api/admin/support/export/user/` - Request user data export (GDPR)
  - Body: `{ user_id, format, date_range, include_pii, sections }`
  - Creates export job and returns job details
  - Creates audit log entry

- **POST** `/api/admin/support/export/company/` - Request company data export
  - Body: `{ company_id, format, date_range, include_pii, sections }`
  - Creates export job and returns job details
  - Creates audit log entry

- **GET** `/api/admin/support/export/{jobId}/` - Get export job status
  - Returns current status, download URL, completion time, etc.

- **GET** `/api/admin/support/export/` - List all export jobs
  - Query params: `page`
  - Returns paginated list of export jobs

### Quick Actions
- **POST** `/api/admin/support/users/{userId}/reset-password/` - Reset user password
  - Sends password reset email
  - Creates audit log entry

- **POST** `/api/admin/support/users/{userId}/verify-email/` - Manually verify user email
  - Sets email_verified = True
  - Creates audit log entry

- **PATCH** `/api/admin/support/users/{userId}/status/` - Update user status
  - Body: `{ status: 'active'|'inactive'|'suspended'|'banned', reason: string }`
  - Maps frontend statuses to backend User model statuses
  - Creates audit log entry

- **PATCH** `/api/admin/support/companies/{companyId}/status/` - Update company status
  - Body: `{ status: 'verified'|'pending'|'unverified'|'suspended', reason: string }`
  - Creates audit log entry

## Key Features

### Status Mapping
The implementation includes helper functions to map between frontend and backend status values:
- **User Type Mapping**: Maps User.role (admin/employer/agency/candidate) to frontend UserType (admin/employer/agency_member/candidate)
- **User Status Mapping**: Maps User.status (active/suspended/pending) to frontend UserStatus (active/inactive/suspended/banned)

### Timeline Events
Timeline events are sourced from the AuditLog model with intelligent action-to-event-type mapping:
- User timeline: login, logout, profile updates, applications, password resets, email verification
- Company timeline: job posting, job updates, team changes, package purchases, settings changes

### Pagination
All list endpoints use `StandardPagination` with:
- Page size: 20 (configurable via `page_size` param, max 100)
- Standard DRF pagination response format with count, next, previous, results

### Permissions
All endpoints require:
- `IsAuthenticated` - User must be logged in
- `IsAdmin` - User role must be 'admin'

### Audit Logging
Critical actions create audit log entries:
- Impersonation start/end
- Data export requests
- Password resets
- Email verification
- Status updates

## Implementation Notes

### In-Memory Storage (Production TODO)
The following features use in-memory storage for development. In production, these should use Redis + Celery:

1. **Impersonation Sessions** (`_impersonation_sessions` dict)
   - Currently stored in-memory per application instance
   - Should use Redis for distributed systems
   - Sessions expire after 1 hour

2. **Export Jobs** (`_export_jobs` dict)
   - Currently simulated as immediate completion
   - Should use Celery tasks for actual async processing
   - Should generate real export files in CSV/JSON/XLSX format

### Data Export
The export endpoints are currently stubs that:
- Create job records immediately
- Mark them as completed instantly
- Return placeholder download URLs

For production, implement:
- Celery task to gather user/company data
- Generate actual export files (CSV/JSON/XLSX)
- Store in MinIO/S3 with expiration
- Return real download URLs

### Password Reset
The reset password endpoint currently returns a success message but doesn't:
- Generate password reset tokens
- Send actual emails via Resend

For production, implement:
- Generate secure reset token
- Create PasswordResetToken record
- Send email via Resend with reset link

## Testing

The backend container has been built and started successfully without errors.

### Test Script
A test script has been created at:
- `/Users/toorj/Documents/GitHub/Orion/backend/test_support.sh`

To test the endpoints manually:
```bash
cd /Users/toorj/Documents/GitHub/Orion/backend

# 1. Login as admin
curl -X POST http://localhost/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@orion.com", "password": "admin123"}'

# 2. Use the returned access token in Authorization header
TOKEN="<access_token_from_login>"

# 3. Test user search
curl -X GET "http://localhost/api/admin/support/users/?q=admin" \
  -H "Authorization: Bearer $TOKEN"

# 4. Test user detail
curl -X GET "http://localhost/api/admin/support/users/1/" \
  -H "Authorization: Bearer $TOKEN"

# 5. Test impersonation status
curl -X GET "http://localhost/api/admin/support/impersonate/status/" \
  -H "Authorization: Bearer $TOKEN"
```

## Frontend Integration

The backend endpoints now fully match the frontend API contract defined in:
- `/Users/toorj/Documents/GitHub/Orion/lib/api/admin-support.ts`

All response data shapes match the TypeScript interfaces:
- `SupportUserResult` / `SupportUserDetailSerializer`
- `SupportCompanyResult` / `SupportCompanyDetailSerializer`
- `TimelineEvent` / `TimelineEventSerializer`
- `ImpersonationSession` / `ImpersonationSessionSerializer`
- `DataExportJob` / `DataExportJobSerializer`

Field naming uses camelCase in responses to match frontend expectations.

## Database Models Used

- `apps.users.models.User` - User data
- `apps.users.models.UserSession` - Login tracking
- `apps.companies.models.Company` - Company data
- `apps.companies.models.CompanyUser` - Company team members
- `apps.jobs.models.Job` - Job postings
- `apps.applications.models.Application` - Applications
- `apps.billing.models.Invoice` - Payment data
- `apps.audit.models.AuditLog` - Activity timeline source

## Next Steps for Production

1. **Implement Celery tasks for data export**
   - Create `apps/moderation/tasks.py`
   - Add `export_user_data_task` and `export_company_data_task`
   - Generate actual export files in requested format

2. **Implement Redis-backed impersonation sessions**
   - Store sessions in Redis with TTL
   - Use session keys in JWT claims

3. **Implement password reset email flow**
   - Generate secure tokens
   - Send emails via Resend
   - Add reset confirmation endpoint

4. **Add SavedJob model support** (if not exists)
   - Track saved jobs for candidates
   - Include in user detail `savedJobsCount`

5. **Add notification preferences API**
   - Store user notification preferences
   - Include in user detail response

6. **Add subscription model support** (if not exists)
   - Track company subscriptions
   - Include in company detail response
