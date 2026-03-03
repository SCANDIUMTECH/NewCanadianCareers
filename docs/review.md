Plan to implement                                                                                                                                                │
│                                                                                                                                                                  │
│ Orion Full Project Review Checklist                                                                                                                              │
│                                                                                                                                                                  │
│ Context                                                                                                                                                          │
│                                                                                                                                                                  │
│ Systematic review of the entire Orion codebase — frontend (Next.js 16), backend (Django 5 + DRF), infrastructure, and documentation. Each section should be      │
│ reviewed for code quality, correctness, consistency, security, and alignment with product specs.                                                                 │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ How to Use                                                                                                                                                       │
│                                                                                                                                                                  │
│ - Review each section top-to-bottom                                                                                                                              │
│ - Mark items [x] as reviewed                                                                                                                                     │
│ - Add notes/issues inline as > ISSUE: or > NOTE:                                                                                                                 │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 1. Root Configuration & Infrastructure                                                                                                                           │
│                                                                                                                                                                  │
│ 1.1 Root Config Files                                                                                                                                            │
│                                                                                                                                                                  │
│ - package.json — dependencies, scripts, versions                                                                                                                 │
│ - pnpm-lock.yaml — lock file integrity                                                                                                                           │
│ - next.config.mjs — Next.js configuration                                                                                                                        │
│ - tsconfig.json — TypeScript config                                                                                                                              │
│ - postcss.config.mjs — PostCSS config                                                                                                                            │
│ - components.json — shadcn/ui registry                                                                                                                           │
│ - Dockerfile.dev — Dev Docker image                                                                                                                              │
│ - .dockerignore — Docker ignore rules                                                                                                                            │
│                                                                                                                                                                  │
│ 1.2 Entry Points & Middleware                                                                                                                                    │
│                                                                                                                                                                  │
│ - server.js — Custom server entry                                                                                                                                │
│ - proxy.ts — Route protection middleware (JWT cookie check)                                                                                                      │
│                                                                                                                                                                  │
│ 1.3 Data Files                                                                                                                                                   │
│                                                                                                                                                                  │
│ - categories.json — Job categories                                                                                                                               │
│ - industries.json — Industry options                                                                                                                             │
│ - job-import-template-agency.json — Import template                                                                                                              │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 2. Global Styles & Design System                                                                                                                                 │
│                                                                                                                                                                  │
│ - app/globals.css — CSS custom properties, design tokens, base styles                                                                                            │
│ - app/layout.tsx — Root layout, font loading, providers                                                                                                          │
│ - lib/constants/colors.ts — JS color constants (BRAND, CHART, STATUS, SOCIAL)                                                                                    │
│ - lib/constants/industries.ts — Industry dropdown data                                                                                                           │
│ - lib/constants/company-sizes.ts — Company size options                                                                                                          │
│ - lib/utils.ts — cn() utility                                                                                                                                    │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 3. Authentication & Authorization                                                                                                                                │
│                                                                                                                                                                  │
│ 3.1 Auth Library                                                                                                                                                 │
│                                                                                                                                                                  │
│ - lib/auth/types.ts — User, role, session types                                                                                                                  │
│ - lib/auth/context.tsx — Auth context provider                                                                                                                   │
│ - lib/auth/require-role.tsx — Role-based access control                                                                                                          │
│                                                                                                                                                                  │
│ 3.2 Auth API                                                                                                                                                     │
│                                                                                                                                                                  │
│ - lib/api/client.ts — Base API client (JWT inject, auto-refresh, error handling)                                                                                 │
│ - lib/api/auth.ts — Login, register, password reset endpoints                                                                                                    │
│                                                                                                                                                                  │
│ 3.3 Auth Pages                                                                                                                                                   │
│                                                                                                                                                                  │
│ - app/login/page.tsx                                                                                                                                             │
│ - app/signup/page.tsx                                                                                                                                            │
│ - app/forgot-password/page.tsx                                                                                                                                   │
│ - app/reset-password/page.tsx                                                                                                                                    │
│ - app/verify-email/page.tsx                                                                                                                                      │
│ - app/verify-email/prompt/page.tsx                                                                                                                               │
│                                                                                                                                                                  │
│ 3.4 Auth Hooks                                                                                                                                                   │
│                                                                                                                                                                  │
│ - hooks/use-auth.ts — Auth context hook                                                                                                                          │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 4. Public Pages                                                                                                                                                  │
│                                                                                                                                                                  │
│ 4.1 Landing / Marketing                                                                                                                                          │
│                                                                                                                                                                  │
│ - app/page.tsx — Home page                                                                                                                                       │
│ - components/hero-section.tsx                                                                                                                                    │
│ - components/platform-section.tsx                                                                                                                                │
│ - components/candidates-section.tsx                                                                                                                              │
│ - components/companies-section.tsx                                                                                                                               │
│ - components/why-orion-section.tsx                                                                                                                               │
│ - components/final-cta-section.tsx                                                                                                                               │
│ - components/constellation-canvas.tsx                                                                                                                            │
│ - components/header.tsx — Public header                                                                                                                          │
│ - components/footer.tsx                                                                                                                                          │
│                                                                                                                                                                  │
│ 4.2 Job Search                                                                                                                                                   │
│                                                                                                                                                                  │
│ - app/jobs/page.tsx — Job listing / search                                                                                                                       │
│ - app/jobs/[id]/page.tsx — Job detail                                                                                                                            │
│ - app/jobs/[id]/job-detail-client.tsx — Client component                                                                                                         │
│ - components/jobs/job-card.tsx                                                                                                                                   │
│ - components/jobs/empty-state.tsx                                                                                                                                │
│ - components/jobs/job-filters-sheet.tsx                                                                                                                          │
│ - components/jobs/job-filters-sidebar.tsx                                                                                                                        │
│                                                                                                                                                                  │
│ 4.3 Company Directory                                                                                                                                            │
│                                                                                                                                                                  │
│ - app/companies/page.tsx — Company listing                                                                                                                       │
│ - app/companies/loading.tsx                                                                                                                                      │
│ - app/companies/[id]/page.tsx — Company profile                                                                                                                  │
│ - app/companies/[id]/loading.tsx                                                                                                                                 │
│                                                                                                                                                                  │
│ 4.4 SEO & Metadata                                                                                                                                               │
│                                                                                                                                                                  │
│ - app/robots.ts — Robots.txt                                                                                                                                     │
│ - app/sitemap.ts — Sitemap                                                                                                                                       │
│ - app/llms.txt/route.ts — LLMs.txt endpoint                                                                                                                      │
│ - components/seo/breadcrumb-schema.tsx                                                                                                                           │
│ - components/seo/faq-schema.tsx                                                                                                                                  │
│ - components/seo/job-posting-schema.tsx                                                                                                                          │
│ - components/seo/organization-schema.tsx                                                                                                                         │
│ - lib/seo-types.ts                                                                                                                                               │
│                                                                                                                                                                  │
│ 4.5 Legal & Misc                                                                                                                                                 │
│                                                                                                                                                                  │
│ - app/privacy/page.tsx                                                                                                                                           │
│ - app/terms/page.tsx                                                                                                                                             │
│ - app/preferences/[token]/page.tsx                                                                                                                               │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 5. Candidate Dashboard                                                                                                                                           │
│                                                                                                                                                                  │
│ 5.1 Layout & Dashboard                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/candidate/layout.tsx                                                                                                                                       │
│ - app/candidate/page.tsx — Dashboard home                                                                                                                        │
│ - app/candidate/loading.tsx                                                                                                                                      │
│                                                                                                                                                                  │
│ 5.2 Candidate Pages                                                                                                                                              │
│                                                                                                                                                                  │
│ - app/candidate/profile/page.tsx                                                                                                                                 │
│ - app/candidate/applications/page.tsx                                                                                                                            │
│ - app/candidate/saved/page.tsx                                                                                                                                   │
│ - app/candidate/alerts/page.tsx                                                                                                                                  │
│ - app/candidate/settings/page.tsx                                                                                                                                │
│ - app/candidate/notifications/page.tsx                                                                                                                           │
│                                                                                                                                                                  │
│ 5.3 Candidate Lib                                                                                                                                                │
│                                                                                                                                                                  │
│ - lib/candidate/types.ts                                                                                                                                         │
│ - lib/candidate/context.tsx                                                                                                                                      │
│ - lib/api/candidates.ts                                                                                                                                          │
│ - hooks/use-candidate.ts                                                                                                                                         │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 6. Company (Employer) Dashboard                                                                                                                                  │
│                                                                                                                                                                  │
│ 6.1 Layout & Dashboard                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/company/layout.tsx                                                                                                                                         │
│ - app/company/page.tsx — Dashboard home                                                                                                                          │
│ - app/company/loading.tsx                                                                                                                                        │
│ - app/company/error.tsx                                                                                                                                          │
│                                                                                                                                                                  │
│ 6.2 Company Profile & Settings                                                                                                                                   │
│                                                                                                                                                                  │
│ - app/company/profile/page.tsx                                                                                                                                   │
│ - app/company/settings/page.tsx                                                                                                                                  │
│ - app/company/settings/loading.tsx                                                                                                                               │
│ - app/company/team/page.tsx                                                                                                                                      │
│ - components/company-onboarding.tsx                                                                                                                              │
│ - components/company-team-management.tsx                                                                                                                         │
│ - components/account-security.tsx                                                                                                                                │
│                                                                                                                                                                  │
│ 6.3 Job Management                                                                                                                                               │
│                                                                                                                                                                  │
│ - app/company/jobs/page.tsx — Job listing                                                                                                                        │
│ - app/company/jobs/loading.tsx                                                                                                                                   │
│ - app/company/jobs/error.tsx                                                                                                                                     │
│ - app/company/jobs/[id]/page.tsx — Job detail                                                                                                                    │
│ - app/company/jobs/[id]/edit/page.tsx — Edit job                                                                                                                 │
│ - app/company/jobs/new/page.tsx — New job (wizard)                                                                                                               │
│                                                                                                                                                                  │
│ 6.4 Job Wizard                                                                                                                                                   │
│                                                                                                                                                                  │
│ - components/job-wizard/job-wizard.tsx                                                                                                                           │
│ - components/job-wizard/wizard-navigation.tsx                                                                                                                    │
│ - components/job-wizard/wizard-progress.tsx                                                                                                                      │
│ - components/job-wizard/steps/step-basics.tsx                                                                                                                    │
│ - components/job-wizard/steps/step-role-details.tsx                                                                                                              │
│ - components/job-wizard/steps/step-location.tsx                                                                                                                  │
│ - components/job-wizard/steps/step-compensation.tsx                                                                                                              │
│ - components/job-wizard/steps/step-apply-method.tsx                                                                                                              │
│ - components/job-wizard/steps/step-distribution.tsx                                                                                                              │
│ - components/job-wizard/steps/step-preview.tsx                                                                                                                   │
│ - components/job-wizard/steps/step-publish.tsx                                                                                                                   │
│ - lib/job-wizard-schema.ts — Zod validation                                                                                                                      │
│ - hooks/use-job-wizard.ts                                                                                                                                        │
│                                                                                                                                                                  │
│ 6.5 Billing & Packages                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/company/billing/page.tsx                                                                                                                                   │
│ - app/company/billing/loading.tsx                                                                                                                                │
│ - app/company/billing/error.tsx                                                                                                                                  │
│ - app/company/billing/add-card/page.tsx                                                                                                                          │
│ - app/company/billing/invoices/page.tsx                                                                                                                          │
│ - app/company/packages/page.tsx                                                                                                                                  │
│ - app/company/cart/page.tsx                                                                                                                                      │
│ - app/company/checkout/page.tsx                                                                                                                                  │
│ - app/company/checkout/success/page.tsx                                                                                                                          │
│ - hooks/use-cart.ts                                                                                                                                              │
│                                                                                                                                                                  │
│ 6.6 Other Company Pages                                                                                                                                          │
│                                                                                                                                                                  │
│ - app/company/analytics/page.tsx                                                                                                                                 │
│ - app/company/applications/page.tsx                                                                                                                              │
│ - app/company/notifications/page.tsx                                                                                                                             │
│                                                                                                                                                                  │
│ 6.7 Company Lib                                                                                                                                                  │
│                                                                                                                                                                  │
│ - lib/company/types.ts                                                                                                                                           │
│ - lib/company/context.tsx                                                                                                                                        │
│ - lib/api/companies.ts                                                                                                                                           │
│ - lib/api/jobs.ts                                                                                                                                                │
│ - lib/api/applications.ts                                                                                                                                        │
│ - lib/api/billing.ts                                                                                                                                             │
│ - lib/api/settings.ts                                                                                                                                            │
│ - hooks/use-company.ts                                                                                                                                           │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 7. Agency Dashboard                                                                                                                                              │
│                                                                                                                                                                  │
│ 7.1 Layout & Dashboard                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/agency/layout.tsx                                                                                                                                          │
│ - app/agency/page.tsx — Dashboard home                                                                                                                           │
│ - app/agency/loading.tsx                                                                                                                                         │
│                                                                                                                                                                  │
│ 7.2 Agency Pages                                                                                                                                                 │
│                                                                                                                                                                  │
│ - app/agency/companies/page.tsx — Client companies                                                                                                               │
│ - app/agency/companies/[id]/page.tsx                                                                                                                             │
│ - app/agency/jobs/page.tsx — Job listing                                                                                                                         │
│ - app/agency/jobs/[id]/page.tsx                                                                                                                                  │
│ - app/agency/jobs/[id]/edit/page.tsx                                                                                                                             │
│ - app/agency/jobs/new/page.tsx — New job                                                                                                                         │
│ - app/agency/team/page.tsx                                                                                                                                       │
│ - app/agency/billing/page.tsx                                                                                                                                    │
│ - app/agency/analytics/page.tsx                                                                                                                                  │
│ - app/agency/packages/page.tsx                                                                                                                                   │
│                                                                                                                                                                  │
│ 7.3 Agency Settings                                                                                                                                              │
│                                                                                                                                                                  │
│ - app/agency/settings/page.tsx                                                                                                                                   │
│ - app/agency/settings/job-posting/page.tsx                                                                                                                       │
│ - app/agency/settings/notifications/page.tsx                                                                                                                     │
│ - app/agency/settings/security/page.tsx                                                                                                                          │
│                                                                                                                                                                  │
│ 7.4 Quick Job Post Variants                                                                                                                                      │
│                                                                                                                                                                  │
│ - app/agency/jobs/new/quick/page.tsx — v1                                                                                                                        │
│ - app/agency/jobs/new/quick-v2/page.tsx — v2                                                                                                                     │
│ - app/agency/jobs/new/quick-v3/page.tsx — v3                                                                                                                     │
│ - components/quick-job-post/ (6 files)                                                                                                                           │
│ - components/quick-job-post-v2/ (3 files)                                                                                                                        │
│ - components/quick-job-post-v3/ (5 files)                                                                                                                        │
│ - lib/quick-job-schema.ts                                                                                                                                        │
│ - hooks/use-quick-job-post.ts                                                                                                                                    │
│                                                                                                                                                                  │
│ 7.5 Agency Lib                                                                                                                                                   │
│                                                                                                                                                                  │
│ - lib/agency/types.ts                                                                                                                                            │
│ - lib/agency/context.tsx                                                                                                                                         │
│ - lib/api/agencies.ts                                                                                                                                            │
│ - hooks/use-agency.ts                                                                                                                                            │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 8. Admin Dashboard                                                                                                                                               │
│                                                                                                                                                                  │
│ 8.1 Layout & Core                                                                                                                                                │
│                                                                                                                                                                  │
│ - app/admin/layout.tsx — Admin sidebar layout                                                                                                                    │
│ - app/admin/page.tsx — Dashboard home                                                                                                                            │
│ - app/admin/loading.tsx                                                                                                                                          │
│ - app/admin/error.tsx                                                                                                                                            │
│ - components/admin/command-palette.tsx                                                                                                                           │
│                                                                                                                                                                  │
│ 8.2 User Management                                                                                                                                              │
│                                                                                                                                                                  │
│ - app/admin/users/page.tsx — User listing                                                                                                                        │
│ - app/admin/users/[id]/page.tsx — User detail                                                                                                                    │
│ - lib/api/admin-users.ts                                                                                                                                         │
│                                                                                                                                                                  │
│ 8.3 Company Management                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/admin/companies/page.tsx — Company listing                                                                                                                 │
│ - app/admin/companies/[id]/page.tsx — Company detail                                                                                                             │
│ - lib/api/admin-companies.ts                                                                                                                                     │
│                                                                                                                                                                  │
│ 8.4 Agency Management                                                                                                                                            │
│                                                                                                                                                                  │
│ - app/admin/agencies/page.tsx — Agency listing                                                                                                                   │
│ - app/admin/agencies/[id]/page.tsx — Agency detail                                                                                                               │
│ - lib/api/admin-agencies.ts                                                                                                                                      │
│                                                                                                                                                                  │
│ 8.5 Job Management                                                                                                                                               │
│                                                                                                                                                                  │
│ - app/admin/jobs/page.tsx — Job listing                                                                                                                          │
│ - app/admin/jobs/[id]/page.tsx — Job detail                                                                                                                      │
│ - lib/api/admin-jobs.ts                                                                                                                                          │
│                                                                                                                                                                  │
│ 8.6 Billing & Packages                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/admin/payments/page.tsx                                                                                                                                    │
│ - app/admin/packages/page.tsx                                                                                                                                    │
│ - app/admin/entitlements/page.tsx                                                                                                                                │
│ - lib/api/admin-billing.ts                                                                                                                                       │
│ - lib/api/admin-packages.ts                                                                                                                                      │
│ - lib/api/admin-payments.ts                                                                                                                                      │
│ - lib/api/admin-entitlements.ts                                                                                                                                  │
│ - components/admin/add-credits-dialog.tsx                                                                                                                        │
│ - components/admin/change-plan-dialog.tsx                                                                                                                        │
│                                                                                                                                                                  │
│ 8.7 Content Moderation                                                                                                                                           │
│                                                                                                                                                                  │
│ - app/admin/moderation/page.tsx                                                                                                                                  │
│ - app/admin/fraud/page.tsx                                                                                                                                       │
│ - app/admin/compliance/page.tsx                                                                                                                                  │
│ - lib/api/admin-moderation.ts                                                                                                                                    │
│ - lib/api/admin-fraud.ts                                                                                                                                         │
│ - lib/api/admin-compliance.ts                                                                                                                                    │
│                                                                                                                                                                  │
│ 8.8 Communication                                                                                                                                                │
│                                                                                                                                                                  │
│ - app/admin/email/page.tsx — Email config                                                                                                                        │
│ - app/admin/email/templates/page.tsx — Template listing                                                                                                          │
│ - app/admin/email/templates/[id]/page.tsx — Template editor                                                                                                      │
│ - app/admin/support/page.tsx — Support tickets                                                                                                                   │
│ - lib/api/admin-email.ts                                                                                                                                         │
│ - lib/api/admin-support.ts                                                                                                                                       │
│                                                                                                                                                                  │
│ 8.9 Marketing                                                                                                                                                    │
│                                                                                                                                                                  │
│ - app/admin/marketing/page.tsx — Marketing home                                                                                                                  │
│ - app/admin/marketing/campaigns/page.tsx                                                                                                                         │
│ - app/admin/marketing/campaigns/new/page.tsx                                                                                                                     │
│ - app/admin/marketing/campaigns/[id]/page.tsx                                                                                                                    │
│ - app/admin/marketing/audiences/page.tsx                                                                                                                         │
│ - app/admin/marketing/journeys/page.tsx                                                                                                                          │
│ - app/admin/marketing/journeys/new/page.tsx                                                                                                                      │
│ - app/admin/marketing/journeys/[id]/page.tsx                                                                                                                     │
│ - app/admin/marketing/coupons/page.tsx                                                                                                                           │
│ - app/admin/marketing/coupons/new/page.tsx                                                                                                                       │
│ - app/admin/marketing/coupons/[id]/page.tsx                                                                                                                      │
│ - app/admin/marketing/coupons/wallets/[id]/page.tsx                                                                                                              │
│ - app/admin/marketing/compliance/page.tsx                                                                                                                        │
│ - app/admin/marketing/reports/page.tsx                                                                                                                           │
│ - lib/api/admin-marketing.ts                                                                                                                                     │
│ - components/admin/segment-rule-builder.tsx                                                                                                                      │
│                                                                                                                                                                  │
│ 8.10 Social & Banners                                                                                                                                            │
│                                                                                                                                                                  │
│ - app/admin/social/page.tsx                                                                                                                                      │
│ - app/admin/banners/page.tsx                                                                                                                                     │
│ - lib/api/admin-social.ts                                                                                                                                        │
│ - lib/api/admin-banners.ts                                                                                                                                       │
│                                                                                                                                                                  │
│ 8.11 Search & SEO                                                                                                                                                │
│                                                                                                                                                                  │
│ - app/admin/search/page.tsx                                                                                                                                      │
│ - app/admin/search/components/widgets/bot-access-card.tsx                                                                                                        │
│ - app/admin/search/components/widgets/core-web-vitals-gauge.tsx                                                                                                  │
│ - app/admin/search/components/widgets/seo-health-score-card.tsx                                                                                                  │
│ - lib/api/admin-search.ts                                                                                                                                        │
│                                                                                                                                                                  │
│ 8.12 Platform Config                                                                                                                                             │
│                                                                                                                                                                  │
│ - app/admin/settings/page.tsx — Platform settings                                                                                                                │
│ - app/admin/features/page.tsx — Feature flags                                                                                                                    │
│ - app/admin/taxonomies/page.tsx — Taxonomy management                                                                                                            │
│ - app/admin/audit/page.tsx — Audit log                                                                                                                           │
│ - app/admin/ai/page.tsx — AI config                                                                                                                              │
│ - app/admin/affiliates/page.tsx — Affiliate program                                                                                                              │
│ - lib/api/admin-settings.ts                                                                                                                                      │
│ - lib/api/admin-features.ts                                                                                                                                      │
│ - lib/api/admin-taxonomies.ts                                                                                                                                    │
│ - lib/api/admin-audit.ts                                                                                                                                         │
│ - lib/api/admin-affiliates.ts                                                                                                                                    │
│ - lib/api/admin-dashboard.ts                                                                                                                                     │
│                                                                                                                                                                  │
│ 8.13 Admin Lib & Types                                                                                                                                           │
│                                                                                                                                                                  │
│ - lib/admin/types.ts                                                                                                                                             │
│ - lib/admin/all-types.ts                                                                                                                                         │
│ - lib/admin/context.tsx                                                                                                                                          │
│ - lib/admin/import-job-schema.ts                                                                                                                                 │
│ - hooks/use-admin.ts                                                                                                                                             │
│ - components/admin/import-jobs-dialog.tsx                                                                                                                        │
│ - components/admin/industry-combobox.tsx                                                                                                                         │
│ - components/admin/job-policy-settings-dialog.tsx                                                                                                                │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 9. Shared UI Components (/components/ui/)                                                                                                                        │
│                                                                                                                                                                  │
│ 9.1 Form Controls                                                                                                                                                │
│                                                                                                                                                                  │
│ - button.tsx                                                                                                                                                     │
│ - input.tsx                                                                                                                                                      │
│ - input-group.tsx                                                                                                                                                │
│ - textarea.tsx                                                                                                                                                   │
│ - select.tsx                                                                                                                                                     │
│ - checkbox.tsx                                                                                                                                                   │
│ - radio-group.tsx                                                                                                                                                │
│ - switch.tsx                                                                                                                                                     │
│ - combobox.tsx                                                                                                                                                   │
│ - label.tsx                                                                                                                                                      │
│                                                                                                                                                                  │
│ 9.2 Date & Time                                                                                                                                                  │
│                                                                                                                                                                  │
│ - calendar.tsx                                                                                                                                                   │
│ - date-picker.tsx                                                                                                                                                │
│                                                                                                                                                                  │
│ 9.3 Overlays & Dialogs                                                                                                                                           │
│                                                                                                                                                                  │
│ - dialog.tsx                                                                                                                                                     │
│ - alert-dialog.tsx                                                                                                                                               │
│ - sheet.tsx                                                                                                                                                      │
│ - popover.tsx                                                                                                                                                    │
│ - dropdown-menu.tsx                                                                                                                                              │
│ - tooltip.tsx                                                                                                                                                    │
│ - command.tsx                                                                                                                                                    │
│                                                                                                                                                                  │
│ 9.4 Layout & Navigation                                                                                                                                          │
│                                                                                                                                                                  │
│ - card.tsx                                                                                                                                                       │
│ - tabs.tsx                                                                                                                                                       │
│ - accordion.tsx                                                                                                                                                  │
│ - collapsible.tsx                                                                                                                                                │
│ - sidebar.tsx                                                                                                                                                    │
│ - breadcrumb.tsx                                                                                                                                                 │
│ - separator.tsx                                                                                                                                                  │
│ - scroll-area.tsx                                                                                                                                                │
│ - pagination.tsx                                                                                                                                                 │
│                                                                                                                                                                  │
│ 9.5 Data Display                                                                                                                                                 │
│                                                                                                                                                                  │
│ - table.tsx                                                                                                                                                      │
│ - badge.tsx                                                                                                                                                      │
│ - avatar.tsx                                                                                                                                                     │
│ - progress.tsx                                                                                                                                                   │
│ - skeleton.tsx                                                                                                                                                   │
│                                                                                                                                                                  │
│ 9.6 Rich Content                                                                                                                                                 │
│                                                                                                                                                                  │
│ - tiptap-editor.tsx                                                                                                                                              │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 10. Shared Components (Non-UI)                                                                                                                                   │
│                                                                                                                                                                  │
│ - components/dashboard-header.tsx                                                                                                                                │
│ - components/ui-frame.tsx                                                                                                                                        │
│ - components/company-avatar.tsx                                                                                                                                  │
│ - components/user-avatar.tsx                                                                                                                                     │
│ - components/notification-center.tsx                                                                                                                             │
│ - components/error-boundary-view.tsx                                                                                                                             │
│ - components/turnstile.tsx                                                                                                                                       │
│ - components/rum-provider.tsx                                                                                                                                    │
│ - components/theme-provider.tsx                                                                                                                                  │
│ - components/auth-input.tsx                                                                                                                                      │
│ - components/form-field.tsx                                                                                                                                      │
│ - components/magnetic-button.tsx                                                                                                                                 │
│ - components/motion-wrapper.tsx                                                                                                                                  │
│ - components/text-reveal.tsx                                                                                                                                     │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 11. AI Features                                                                                                                                                  │
│                                                                                                                                                                  │
│ - components/ai/ai-generate-button.tsx                                                                                                                           │
│ - components/ai/seo-fields.tsx                                                                                                                                   │
│ - components/ai/social-content-generator.tsx                                                                                                                     │
│ - lib/api/ai.ts                                                                                                                                                  │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 12. API Client & Endpoint Modules                                                                                                                                │
│                                                                                                                                                                  │
│ 12.1 Core Client                                                                                                                                                 │
│                                                                                                                                                                  │
│ - lib/api/client.ts — Base client, JWT, refresh, errors                                                                                                          │
│                                                                                                                                                                  │
│ 12.2 Public & Auth API                                                                                                                                           │
│                                                                                                                                                                  │
│ - lib/api/auth.ts                                                                                                                                                │
│ - lib/api/public.ts                                                                                                                                              │
│                                                                                                                                                                  │
│ 12.3 Domain API Modules                                                                                                                                          │
│                                                                                                                                                                  │
│ - lib/api/jobs.ts                                                                                                                                                │
│ - lib/api/companies.ts                                                                                                                                           │
│ - lib/api/applications.ts                                                                                                                                        │
│ - lib/api/billing.ts                                                                                                                                             │
│ - lib/api/candidates.ts                                                                                                                                          │
│ - lib/api/agencies.ts                                                                                                                                            │
│ - lib/api/social.ts                                                                                                                                              │
│ - lib/api/notifications.ts                                                                                                                                       │
│ - lib/api/settings.ts                                                                                                                                            │
│ - lib/api/ai.ts                                                                                                                                                  │
│                                                                                                                                                                  │
│ 12.4 Admin API Modules (20+)                                                                                                                                     │
│                                                                                                                                                                  │
│ - lib/api/admin-dashboard.ts                                                                                                                                     │
│ - lib/api/admin-users.ts                                                                                                                                         │
│ - lib/api/admin-companies.ts                                                                                                                                     │
│ - lib/api/admin-jobs.ts                                                                                                                                          │
│ - lib/api/admin-agencies.ts                                                                                                                                      │
│ - lib/api/admin-banners.ts                                                                                                                                       │
│ - lib/api/admin-audit.ts                                                                                                                                         │
│ - lib/api/admin-billing.ts                                                                                                                                       │
│ - lib/api/admin-compliance.ts                                                                                                                                    │
│ - lib/api/admin-fraud.ts                                                                                                                                         │
│ - lib/api/admin-moderation.ts                                                                                                                                    │
│ - lib/api/admin-settings.ts                                                                                                                                      │
│ - lib/api/admin-support.ts                                                                                                                                       │
│ - lib/api/admin-affiliates.ts                                                                                                                                    │
│ - lib/api/admin-taxonomies.ts                                                                                                                                    │
│ - lib/api/admin-features.ts                                                                                                                                      │
│ - lib/api/admin-packages.ts                                                                                                                                      │
│ - lib/api/admin-payments.ts                                                                                                                                      │
│ - lib/api/admin-social.ts                                                                                                                                        │
│ - lib/api/admin-entitlements.ts                                                                                                                                  │
│ - lib/api/admin-email.ts                                                                                                                                         │
│ - lib/api/admin-marketing.ts                                                                                                                                     │
│ - lib/api/admin-search.ts                                                                                                                                        │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 13. RUM (Real User Monitoring)                                                                                                                                   │
│                                                                                                                                                                  │
│ - lib/rum/config.ts                                                                                                                                              │
│ - lib/rum/session.ts                                                                                                                                             │
│ - lib/rum/hmac.ts                                                                                                                                                │
│ - lib/rum/web-vitals.ts                                                                                                                                          │
│ - lib/rum/reporter.ts                                                                                                                                            │
│ - components/rum-provider.tsx                                                                                                                                    │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 14. Backend — Django + DRF                                                                                                                                       │
│                                                                                                                                                                  │
│ 14.1 Config & Infrastructure                                                                                                                                     │
│                                                                                                                                                                  │
│ - backend/docker-compose.yml — Docker services                                                                                                                   │
│ - backend/docker-compose.dev.yml                                                                                                                                 │
│ - backend/docker-compose.override.yml                                                                                                                            │
│ - backend/Dockerfile — Production image                                                                                                                          │
│ - backend/requirements.txt — Python deps                                                                                                                         │
│ - backend/config/settings/base.py — Django settings                                                                                                              │
│ - backend/config/urls.py — URL routing                                                                                                                           │
│ - backend/config/celery.py — Celery config                                                                                                                       │
│ - backend/config/wsgi.py                                                                                                                                         │
│ - backend/traefik/ — Reverse proxy config                                                                                                                        │
│ - backend/nginx/ — Static file serving                                                                                                                           │
│                                                                                                                                                                  │
│ 14.2 Core Utilities                                                                                                                                              │
│                                                                                                                                                                  │
│ - backend/core/utils.py                                                                                                                                          │
│ - backend/core/decorators.py                                                                                                                                     │
│ - backend/core/pagination.py                                                                                                                                     │
│ - backend/core/filters.py                                                                                                                                        │
│ - backend/core/permissions.py                                                                                                                                    │
│ - backend/core/exceptions.py                                                                                                                                     │
│ - backend/core/serializers.py                                                                                                                                    │
│ - backend/core/fields.py                                                                                                                                         │
│ - backend/core/validators.py                                                                                                                                     │
│ - backend/core/middleware.py                                                                                                                                     │
│                                                                                                                                                                  │
│ 14.3 Django Apps                                                                                                                                                 │
│                                                                                                                                                                  │
│ Users App                                                                                                                                                        │
│                                                                                                                                                                  │
│ - backend/apps/users/models.py                                                                                                                                   │
│ - backend/apps/users/serializers.py                                                                                                                              │
│ - backend/apps/users/views.py                                                                                                                                    │
│ - backend/apps/users/urls.py                                                                                                                                     │
│ - backend/apps/users/admin.py                                                                                                                                    │
│                                                                                                                                                                  │
│ Companies App                                                                                                                                                    │
│                                                                                                                                                                  │
│ - backend/apps/companies/models.py                                                                                                                               │
│ - backend/apps/companies/serializers.py                                                                                                                          │
│ - backend/apps/companies/views.py                                                                                                                                │
│ - backend/apps/companies/urls.py                                                                                                                                 │
│ - backend/apps/companies/admin.py                                                                                                                                │
│                                                                                                                                                                  │
│ Jobs App                                                                                                                                                         │
│                                                                                                                                                                  │
│ - backend/apps/jobs/models.py                                                                                                                                    │
│ - backend/apps/jobs/serializers.py                                                                                                                               │
│ - backend/apps/jobs/views.py                                                                                                                                     │
│ - backend/apps/jobs/urls.py                                                                                                                                      │
│ - backend/apps/jobs/admin.py                                                                                                                                     │
│                                                                                                                                                                  │
│ Applications App                                                                                                                                                 │
│                                                                                                                                                                  │
│ - backend/apps/applications/models.py                                                                                                                            │
│ - backend/apps/applications/serializers.py                                                                                                                       │
│ - backend/apps/applications/views.py                                                                                                                             │
│ - backend/apps/applications/urls.py                                                                                                                              │
│                                                                                                                                                                  │
│ Billing App                                                                                                                                                      │
│                                                                                                                                                                  │
│ - backend/apps/billing/models.py                                                                                                                                 │
│ - backend/apps/billing/serializers.py                                                                                                                            │
│ - backend/apps/billing/views.py                                                                                                                                  │
│ - backend/apps/billing/urls.py                                                                                                                                   │
│ - backend/apps/billing/admin.py                                                                                                                                  │
│ - backend/apps/billing/admin_credits.py                                                                                                                          │
│                                                                                                                                                                  │
│ Candidates App                                                                                                                                                   │
│                                                                                                                                                                  │
│ - backend/apps/candidates/models.py                                                                                                                              │
│ - backend/apps/candidates/serializers.py                                                                                                                         │
│ - backend/apps/candidates/views.py                                                                                                                               │
│ - backend/apps/candidates/urls.py                                                                                                                                │
│                                                                                                                                                                  │
│ Notifications App                                                                                                                                                │
│                                                                                                                                                                  │
│ - backend/apps/notifications/models.py                                                                                                                           │
│ - backend/apps/notifications/serializers.py                                                                                                                      │
│ - backend/apps/notifications/views.py                                                                                                                            │
│ - backend/apps/notifications/urls.py                                                                                                                             │
│ - backend/apps/notifications/backends/ (email, sms, push, webhook)                                                                                               │
│                                                                                                                                                                  │
│ Social App                                                                                                                                                       │
│                                                                                                                                                                  │
│ - backend/apps/social/models.py                                                                                                                                  │
│ - backend/apps/social/serializers.py                                                                                                                             │
│ - backend/apps/social/views.py                                                                                                                                   │
│ - backend/apps/social/urls.py                                                                                                                                    │
│                                                                                                                                                                  │
│ Search App                                                                                                                                                       │
│                                                                                                                                                                  │
│ - backend/apps/search/models.py                                                                                                                                  │
│ - backend/apps/search/serializers.py                                                                                                                             │
│ - backend/apps/search/views.py                                                                                                                                   │
│ - backend/apps/search/urls.py                                                                                                                                    │
│                                                                                                                                                                  │
│ Moderation App                                                                                                                                                   │
│                                                                                                                                                                  │
│ - backend/apps/moderation/models.py                                                                                                                              │
│ - backend/apps/moderation/serializers.py                                                                                                                         │
│ - backend/apps/moderation/views.py                                                                                                                               │
│ - backend/apps/moderation/urls.py                                                                                                                                │
│                                                                                                                                                                  │
│ Audit App                                                                                                                                                        │
│                                                                                                                                                                  │
│ - backend/apps/audit/models.py                                                                                                                                   │
│ - backend/apps/audit/serializers.py                                                                                                                              │
│ - backend/apps/audit/services.py                                                                                                                                 │
│ - backend/apps/audit/middleware.py                                                                                                                               │
│ - backend/apps/audit/tasks.py                                                                                                                                    │
│                                                                                                                                                                  │
│ Marketing App                                                                                                                                                    │
│                                                                                                                                                                  │
│ - backend/apps/marketing/models.py                                                                                                                               │
│ - backend/apps/marketing/serializers.py                                                                                                                          │
│ - backend/apps/marketing/views.py                                                                                                                                │
│ - backend/apps/marketing/urls.py                                                                                                                                 │
│ - backend/apps/marketing/services/                                                                                                                               │
│                                                                                                                                                                  │
│ AI App                                                                                                                                                           │
│                                                                                                                                                                  │
│ - backend/apps/ai/models.py                                                                                                                                      │
│ - backend/apps/ai/serializers.py                                                                                                                                 │
│ - backend/apps/ai/views.py                                                                                                                                       │
│ - backend/apps/ai/urls.py                                                                                                                                        │
│ - backend/apps/ai/services.py                                                                                                                                    │
│ - backend/apps/ai/tasks.py                                                                                                                                       │
│                                                                                                                                                                  │
│ RUM App                                                                                                                                                          │
│                                                                                                                                                                  │
│ - backend/apps/rum/models.py                                                                                                                                     │
│ - backend/apps/rum/serializers.py                                                                                                                                │
│ - backend/apps/rum/views.py                                                                                                                                      │
│ - backend/apps/rum/urls.py                                                                                                                                       │
│                                                                                                                                                                  │
│ 14.4 Monitoring & Observability                                                                                                                                  │
│                                                                                                                                                                  │
│ - backend/grafana/ — Monitoring dashboards                                                                                                                       │
│ - backend/otel/ — OpenTelemetry config                                                                                                                           │
│ - backend/clickhouse/ — Analytics database                                                                                                                       │
│ - backend/rabbitmq/ — Message queue config                                                                                                                       │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 15. Documentation                                                                                                                                                │
│                                                                                                                                                                  │
│ - docs/modern_job_board_product_ux_and_architecture_report-2.md — Master product spec                                                                            │
│ - docs/platform_admin_workflows_settings_django_admin.md — Admin workflows                                                                                       │
│ - docs/company_employer_workflows_settings.md — Employer workflows                                                                                               │
│ - docs/employee_candidate_workflows_settings.md — Candidate workflows                                                                                            │
│ - docs/agency_workflows_settings.md — Agency workflows                                                                                                           │
│ - docs/job_post_lifecycle.md — Job publishing flow                                                                                                               │
│ - docs/admin-gap-analysis.md — Admin UI/UX gaps                                                                                                                  │
│ - docs/notifications.md — Notification system                                                                                                                    │
│ - docs/banner_management_design_style.md — Banner design                                                                                                         │
│ - docs/email-template.md — Email templates                                                                                                                       │
│ - docs/stripe.md — Stripe integration                                                                                                                            │
│ - docs/ai.md — AI features                                                                                                                                       │
│ - docs/hardening.md — Security hardening                                                                                                                         │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 16. Public Assets                                                                                                                                                │
│                                                                                                                                                                  │
│ 16.1 Logos                                                                                                                                                       │
│                                                                                                                                                                  │
│ - public/logos/ — Email provider logos (resend, postmark, smtp, mailgun, ses, sendgrid, zeptomail)                                                               │
│                                                                                                                                                                  │
│ 16.2 Templates                                                                                                                                                   │
│                                                                                                                                                                  │
│ - public/templates/job-import-template.csv                                                                                                                       │
│ - public/templates/job-import-template.json                                                                                                                      │
│ - public/templates/job-import-template-agency.csv                                                                                                                │
│ - public/templates/job-import-template-agency.json                                                                                                               │
│                                                                                                                                                                  │
│ 16.3 Placeholders & Icons                                                                                                                                        │
│                                                                                                                                                                  │
│ - public/placeholder-logo.svg                                                                                                                                    │
│ - public/placeholder.svg                                                                                                                                         │
│ - public/icon.svg                                                                                                                                                │
│ - public/apple-icon.png                                                                                                                                          │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ 17. Fonts                                                                                                                                                        │
│                                                                                                                                                                  │
│ - assets/fonts/Inter/ — Body font (variable + 80 static)                                                                                                         │
│ - assets/fonts/Manrope/ — Heading font (variable + 8 static)                                                                                                     │
│ - assets/fonts/JetBrains_Mono/ — Code font (variable + 18 static)                                                                                                │
│                                                                                                                                                                  │
│ ---                                                                                                                                                              │
│ Review Stats                                                                                                                                                     │
│                                                                                                                                                                  │
│ ┌───────────────────────┬───────┬──────────┐                                                                                                                     │
│ │        Section        │ Items │ Reviewed │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 1. Root Config        │ 11    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 2. Design System      │ 6     │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 3. Auth               │ 10    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 4. Public Pages       │ 20    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 5. Candidate          │ 12    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 6. Company            │ 34    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 7. Agency             │ 26    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 8. Admin              │ 67    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 9. UI Components      │ 34    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 10. Shared Components │ 14    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 11. AI Features       │ 4     │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 12. API Modules       │ 35    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 13. RUM               │ 6     │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 14. Backend           │ 68    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 15. Documentation     │ 13    │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 16. Public Assets     │ 7     │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ 17. Fonts             │ 3     │ 0        │                                                                                                                     │
│ ├───────────────────────┼───────┼──────────┤                                                                                                                     │
│ │ TOTAL                 │ ~370  │ 0        │                                                                                                                     │
│ └───────────────────────┴───────┴──────────┘                                                                                                                     │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

⏺ This is a massive review — ~370 items across the full stack. I'll parallelize this by launching multiple specialized review agents, each covering a group of
  sections. Let me start with the first wave.

  Wave 1: Critical foundations + largest sections

⏺ feature-dev:code-reviewer(Review auth & API client)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ Continuing with the review — launching the remaining parallel agents while the auth review runs in the background.

⏺ feature-dev:code-reviewer(Review root config & design system)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ feature-dev:code-reviewer(Review public pages & SEO)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ feature-dev:code-reviewer(Review company & candidate dashboards)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ feature-dev:code-reviewer(Review admin dashboard)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ feature-dev:code-reviewer(Review agency dashboard & quick post)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ feature-dev:code-reviewer(Review backend Django codebase)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ feature-dev:code-reviewer(Review UI components & shared)
  ⎿  Backgrounded agent (↓ to manage · ctrl+o to expand)

⏺ All 8 review agents are now running in parallel across the entire codebase:

  ┌───────┬────────────────────────────────────────────────┬─────────┐
  │ Agent │                     Scope                      │ Status  │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 1     │ Auth & API Client (Section 3)                  │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 2     │ Root Config & Design System (Sections 1-2)     │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 3     │ Public Pages & SEO (Section 4)                 │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 4     │ Company & Candidate Dashboards (Sections 5-6)  │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 5     │ Admin Dashboard (Section 8)                    │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 6     │ Agency Dashboard & Quick Post (Section 7)      │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 7     │ Backend Django (Section 14)                    │ Running │
  ├───────┼────────────────────────────────────────────────┼─────────┤
  │ 8     │ UI Components, Shared, AI, RUM (Sections 9-13) │ Running │
  └───────┴────────────────────────────────────────────────┴─────────┘

  I'll compile a comprehensive review report as each agent completes. This covers all ~370 items from the checklist. I'll be notified automatically as results come
  in.

✻ Baked for 1m 59s

⏺ Agent "Review auth & API client" completed

⏺ Agent 1 complete: Auth & API Client — Found 9 issues (2 CRITICAL, 7 IMPORTANT). Waiting for the remaining 7 agents to finish. I'll compile the full report once
  all are done.

  Key findings so far:
  - CRITICAL: server.js disables TLS verification globally (NODE_TLS_REJECT_UNAUTHORIZED=0)
  - CRITICAL: Unguarded setTimeout redirects cause memory leaks on unmount
  - IMPORTANT: Open redirect vulnerability via unvalidated ?redirect= parameter on login
  - IMPORTANT: Token refresh clears tokens on network errors (forces re-login on transient failures)
  - IMPORTANT: Cookie deletion missing SameSite/Secure attributes — stale auth cookie possible
  - IMPORTANT: Signup form never collects password confirmation field
  - IMPORTANT: Verify-email resend button calls authenticated endpoint without session

⏺ Agent "Review root config & design system" completed

⏺ Agent 2 complete: Root Config & Design System — Found 9 issues (3 CRITICAL, 4 HIGH, 2 LOW).

  Notable findings:
  - CRITICAL: next.config.mjs has ignoreBuildErrors: true — TypeScript errors silently ship to production
  - CRITICAL: @emotion/is-prop-valid pinned to "latest" — breaks reproducible builds
  - HIGH: No ESLint config exists — npm run lint is non-functional
  - HIGH: images.unoptimized: true disables all image optimization on Vercel
  - HIGH: Font variable naming inconsistency (--font-primary vs --font-face-secondary)

  Running tally: 18 issues found (4 CRITICAL, 11 HIGH/IMPORTANT, 3 LOW). 6 agents still running.

⏺ Agent "Review agency dashboard & quick post" completed

⏺ Agent 6 complete: Agency Dashboard & Quick Post — Found 14 issues (4 CRITICAL, 6 HIGH, 4 MEDIUM).

  Major findings:
  - CRITICAL: Quick Job Post publish is a no-op — simulates a delay but never calls the API
  - CRITICAL: addAgencyClient always sends company: 0 — add client feature is broken
  - CRITICAL: website field is mapped from logo property — wrong data displayed
  - CRITICAL: job.job_id missing from type — all job links render /agency/jobs/undefined
  - HIGH: Unmemoized clientCompanies array causes infinite API fetch loop
  - HIGH: Billing mode hardcoded to "Agency Pays" — company_pays never shown
  - HIGH: formatCurrency receives undefined for currency field

  Running tally: 32 issues found across 3 completed agents. 5 agents still running.

⏺ Agent "Review company & candidate dashboards" completed

⏺ Agent 4 complete: Company & Candidate Dashboards — Found 14 issues (4 CRITICAL, 10 HIGH).

  Major findings:
  - CRITICAL: Job wizard stores numeric id instead of string job_id — all draft updates and auto-publish after payment return 404
  - CRITICAL: validatePromoCode hard-codes valid: true — invalid promo codes always accepted
  - CRITICAL: Race condition on checkout success — refreshEntitlements called before Stripe webhook writes credits
  - HIGH: Candidate context fires 4-7 redundant API calls per page load (dedicated stats endpoint exists but is unused)
  - HIGH: Location/compensation Zod schemas diverge from wizard validation logic
  - HIGH: Payment method operations silently swallow errors

  Running tally: 46 issues found across 4 completed agents. 4 agents still running.

⏺ Agent "Review UI components & shared" completed

⏺ Agent 8 complete: UI Components, Shared, AI, RUM — Found 11 issues (3 CRITICAL, 8 IMPORTANT).

  Major findings:
  - CRITICAL: RUM HMAC key exposed in client bundle via NEXT_PUBLIC_ prefix — attackers can forge signatures
  - CRITICAL: Turnstile fails open on network error — silently disables CAPTCHA protection
  - IMPORTANT: All notification preference switches are uncontrolled — settings never persist
  - IMPORTANT: TipTap editor uses window.prompt() for links with no URL protocol validation (XSS risk)
  - IMPORTANT: DashboardHeader.isActive uses startsWith without slash guard — false matches possible
  - IMPORTANT: Sidebar skeleton random width causes SSR hydration mismatch

  Running tally: 57 issues found across 5 completed agents. 3 agents still running.

⏺ Agent "Review public pages & SEO" completed

⏺ Agent 3 complete: Public Pages & SEO — Found 23 issues (4 CRITICAL, 11 IMPORTANT, 8 MEDIUM).

  Major findings:
  - CRITICAL: Job search and company directory pages are "use client" — zero SEO metadata on the two most important public pages
  - CRITICAL: No Open Graph image anywhere — social shares show no preview
  - CRITICAL: Job posting JSON-LD schema uses internal DB id instead of public job_id slug — breaks Google for Jobs
  - IMPORTANT: "Search Jobs" button on /jobs page has no handler — does nothing
  - IMPORTANT: Canvas ctx.scale() stacks on resize — rendering breaks after window resize
  - MEDIUM: Hero CTA buttons ("Get Started", "Learn more") have no href or onClick — dead buttons
  - MEDIUM: Dev navigation menu shipped unconditionally to production

  Running tally: 80 issues found across 6 completed agents. 2 agents still running (Admin Dashboard, Backend Django).

⏺ Agent "Review admin dashboard" completed

⏺ Agent 5 complete: Admin Dashboard — Found 14 issues (2 CRITICAL, 6 HIGH, 6 MEDIUM).

  Major findings:
  - CRITICAL: alert() used pervasively in security-sensitive pages (fraud, compliance, support) — 18+ call sites
  - CRITICAL: Bulk user delete has no type-to-confirm safeguard — one mis-click deletes all selected
  - HIGH: Impersonation from Users page requires no audit reason (Support page correctly requires one)
  - HIGH: GDPR executeDeletion has no typed confirmation before permanent PII destruction
  - HIGH: syncPackageToStripe bypasses API module pattern — defined inline in page component
  - HIGH: Packages page silently swallows save errors; dialog closes whether save succeeded or not
  - MEDIUM: ChangePlanDialog hardcodes "Visa ····4242" for all companies
  - MEDIUM: Moderation queue capped at 50 items with no pagination — excess jobs invisible

  Running tally: 94 issues found across 7 completed agents. 1 agent still running (Backend Django).

⏺ Agent "Review backend Django codebase" completed

⏺ All 8 review agents have completed. Here's the full compiled report.

  ---
  Orion Full Project Review — Complete Report

  Executive Summary

  110 issues found across the entire codebase:

  ┌────────────────┬───────┐
  │    Severity    │ Count │
  ├────────────────┼───────┤
  │ CRITICAL       │ 27    │
  ├────────────────┼───────┤
  │ HIGH/IMPORTANT │ 60    │
  ├────────────────┼───────┤
  │ MEDIUM/LOW     │ 23    │
  └────────────────┴───────┘

  ---
  Top 15 Most Urgent Issues (Fix First)

  Backend Security (fix immediately)

  ┌─────┬──────────┬───────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │  #  │ Severity │             Location              │                                                  Issue                                                  │
  ├─────┼──────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1   │ CRITICAL │ backend/apps/jobs/services.py:436 │ SSRF — urlopen on employer-supplied URL with no private IP blocking. Attacker can hit 169.254.169.254   │
  │     │          │                                   │ or internal Docker services                                                                             │
  ├─────┼──────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2   │ CRITICAL │ backend/apps/users/models.py:108  │ MFA secret stored plaintext — TOTP seed in plain CharField, should use EncryptedTextField               │
  ├─────┼──────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 3   │ CRITICAL │ backend/core/permissions.py:71    │ IDOR via None==None — IsCompanyMember returns True when both user and object have no company (None ==   │
  │     │          │                                   │ None)                                                                                                   │
  ├─────┼──────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 4   │ CRITICAL │ backend/apps/users/views.py:730   │ Invalid status 'deleted' — status='deleted' not in STATUS_CHOICES, silently corrupts user records       │
  ├─────┼──────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 5   │ CRITICAL │ backend/apps/users/views.py:793   │ AuditLog wrong field — metadata={} passed but model has changes field. Impersonation audit logging      │
  │     │          │                                   │ crashes                                                                                                 │
  ├─────┼──────────┼───────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 6   │ HIGH     │ backend/apps/billing/models.py:92 │ TOCTOU race — Entitlement.use_credit checks validity before lock; can overspend credits                 │
  └─────┴──────────┴───────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Frontend Security

  ┌─────┬───────────┬─────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────┐
  │  #  │ Severity  │              Location               │                                            Issue                                            │
  ├─────┼───────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 7   │ CRITICAL  │ server.js:10 + package.json:7       │ TLS verification disabled globally — NODE_TLS_REJECT_UNAUTHORIZED=0 for entire Node process │
  ├─────┼───────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 8   │ CRITICAL  │ lib/rum/config.ts:14                │ HMAC key in client bundle — NEXT_PUBLIC_RUM_HMAC_KEY exposes signing secret to browsers     │
  ├─────┼───────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 9   │ IMPORTANT │ app/login/page.tsx:37 + proxy.ts:55 │ Open redirect — unvalidated ?redirect= accepts external URLs like https://evil.com          │
  ├─────┼───────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 10  │ IMPORTANT │ components/ui/tiptap-editor.tsx:144 │ XSS risk — Link insertion accepts javascript: protocol URLs                                 │
  └─────┴───────────┴─────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────┘

  Core Functionality Broken

  ┌─────┬──────────┬───────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────┐
  │  #  │ Severity │                 Location                  │                                             Issue                                              │
  ├─────┼──────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 11  │ CRITICAL │ components/job-wizard/job-wizard.tsx:206  │ Draft updates 404 — stores numeric id instead of string job_id; all wizard saves after initial │
  │     │          │                                           │  create fail                                                                                   │
  ├─────┼──────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 12  │ CRITICAL │ lib/api/billing.ts:174                    │ Promo codes always valid — validatePromoCode hard-codes valid: true regardless of server       │
  │     │          │                                           │ response                                                                                       │
  ├─────┼──────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 13  │ CRITICAL │ hooks/use-quick-job-post.ts:236           │ Publish is a no-op — Quick Job Post simulates a delay with setTimeout but never calls the API  │
  ├─────┼──────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 14  │ CRITICAL │ next.config.mjs:4                         │ TypeScript errors silenced — ignoreBuildErrors: true means type errors ship to production      │
  ├─────┼──────────┼───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 15  │ CRITICAL │ app/jobs/page.tsx +                       │ Zero SEO on key pages — "use client" prevents all metadata on job search and company directory │
  │     │          │ app/companies/page.tsx                    │                                                                                                │
  └─────┴──────────┴───────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---
  Section-by-Section Findings

  1. Root Config & Design System (9 issues)

  ┌──────────┬──────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
  │ Severity │           File           │                                    Issue                                     │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ next.config.mjs:4        │ ignoreBuildErrors: true silences all TypeScript errors at build              │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ package.json:7           │ NODE_TLS_REJECT_UNAUTHORIZED=0 in dev script (redundant with server.js)      │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ package.json:13          │ @emotion/is-prop-valid: "latest" breaks reproducible builds                  │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ package.json:8           │ No ESLint config or devDependency — npm run lint is non-functional           │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ layout.tsx / globals.css │ Font variable naming inconsistency (--font-primary vs --font-face-secondary) │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ next.config.mjs:7        │ images.unoptimized: true disables image optimization on Vercel               │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ Dockerfile.dev           │ No source code COPY — container non-functional without volume mount          │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ LOW      │ categories.json:104      │ sort_order: 12 gap in sequence                                               │
  ├──────────┼──────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ LOW      │ globals.css:123          │ Dark mode wipes brand color; JS constants have no dark mode awareness        │
  └──────────┴──────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘

  2. Authentication & API Client (9 issues)

  ┌───────────┬─────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
  │ Severity  │              File               │                                    Issue                                     │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ server.js:10-12                 │ NODE_TLS_REJECT_UNAUTHORIZED=0 disables TLS for entire Node process          │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ app/reset-password/page.tsx:88  │ Unguarded setTimeout redirect — memory leak on unmount                       │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ proxy.ts:60 + login/page.tsx:37 │ Open redirect via unvalidated ?redirect= parameter                           │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ lib/api/client.ts:159           │ clearTokens() on network error forces re-login on transient failures         │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ lib/api/client.ts:127           │ Race condition: refresh deduplication flag reset before all waiters resume   │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ lib/api/client.ts:41            │ deleteCookie missing SameSite/Secure — may leave stale auth cookie           │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ proxy.ts:60                     │ Authenticated users on auth pages always redirect to / regardless of role    │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ app/signup/page.tsx:65          │ password_confirm hardcoded to password — no confirm field collected          │
  ├───────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ app/verify-email/page.tsx:60    │ resendVerificationEmail() called without auth — will 401, silently swallowed │
  └───────────┴─────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘

  3. Public Pages & SEO (23 issues)

  ┌───────────┬─────────────────────────────────────┬──────────────────────────────────────────────────────────────────────┐
  │ Severity  │                File                 │                                Issue                                 │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ app/companies/page.tsx:1            │ "use client" prevents all SEO metadata on company directory          │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ app/jobs/page.tsx:1                 │ "use client" prevents all SEO metadata on job search                 │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ app/layout.tsx:49                   │ No OG image, no canonical URL, generator: v0.app leaks               │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ seo/job-posting-schema.tsx:125      │ Schema url uses internal DB id, not public job_id slug               │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ jobs/job-card.tsx:50                │ saved state not synced to isSaved prop after async load              │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ companies/[id]/page.tsx:29          │ No canonical URL or Twitter metadata in company profile              │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ companies/[id]/page.tsx:155         │ Empty employeeCount emits malformed schema.org JSON-LD               │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ companies/[id]/page.tsx:500         │ #positions anchor points to non-existent DOM id                      │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ app/sitemap.ts:107                  │ Query-param category URLs in sitemap invalid per Google spec         │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ components/header.tsx:280           │ NavLink casts ReactNode to string for active state                   │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ app/jobs/[id]/page.tsx:14           │ getJob() called twice per SSR — no cache() wrapper                   │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ app/jobs/page.tsx:390               │ "Search Jobs" button has no handler — non-functional                 │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ jobs/job-card.tsx:171               │ Salary period hardcoded as "/ year" regardless of actual period      │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ jobs/[id]/job-detail-client.tsx:179 │ alert() used 5 times instead of sonner toast                         │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ constellation-canvas.tsx:44         │ ctx.scale() stacks on resize; nodes not re-distributed               │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ jobs/[id]/page.tsx:104              │ Paused jobs incorrectly get noindex                                  │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ app/sitemap.ts:71                   │ /login and /signup in sitemap despite being disallowed in robots.txt │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ hero-section.tsx:51                 │ Hero CTA buttons have no href or onClick — dead buttons              │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ candidates-section.tsx:59           │ Section CTA buttons have no href                                     │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ companies/page.tsx:36               │ Location filter is hardcoded static US city list                     │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ jobs/[id]/page.tsx:88               │ metaDescription slices raw HTML — may cut entities mid-string        │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ companies/[id]/page.tsx:244         │ <h1> wrapped in motion animation — invisible on SSR, harms LCP       │
  ├───────────┼─────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ MEDIUM    │ components/header.tsx:182           │ Dev navigation menu shipped unconditionally to production            │
  └───────────┴─────────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘

  4. Candidate Dashboard (subset of Company & Candidate)

  ┌──────────┬────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┐
  │ Severity │                File                │                                   Issue                                    │
  ├──────────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ lib/candidate/context.tsx:42       │ 4-7 redundant API calls per page load; getDashboardStats exists but unused │
  ├──────────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ candidate/applications/page.tsx:73 │ page_size: 100 silently truncates; no server-side pagination               │
  ├──────────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ candidate/saved/page.tsx:65        │ Same page_size: 100 truncation                                             │
  ├──────────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ candidate/saved/page.tsx:92        │ Bulk remove uses Promise.all but error message implies partial success     │
  ├──────────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ candidate/alerts/page.tsx:98       │ handleCreate catch-and-rethrow is a no-op                                  │
  ├──────────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ lib/api/candidates.ts:249          │ getJobAlerts() fetches only first page — truncated for many alerts         │
  └──────────┴────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┘

  5. Company Dashboard & Job Wizard

  ┌──────────┬─────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
  │ Severity │                      File                       │                                     Issue                                     │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ job-wizard.tsx:206                              │ Stores numeric id not string job_id — all draft updates and auto-publish 404  │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ job-wizard.tsx:263                              │ Pending-publish localStorage stores wrong ID; post-payment auto-publish fails │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ lib/api/billing.ts:174                          │ validatePromoCode hard-codes valid: true                                      │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ checkout/success/page.tsx:152                   │ refreshEntitlements before Stripe webhook credits land — race condition       │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ company/billing/page.tsx:118                    │ Payment method ops silently swallow errors                                    │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ job-wizard-schema.ts:32 / use-job-wizard.ts:108 │ Location schema diverges from wizard validation for remote jobs               │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ use-job-wizard.ts:127                           │ compensationSchema allows salaryMin=0; wizard blocks it — inconsistent        │
  ├──────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ job-wizard.tsx:297                              │ Same type mismatch as CRITICAL: publishJob(number) in has-credits path        │
  └──────────┴─────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘

  6. Agency Dashboard (14 issues)

  ┌──────────┬────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────┐
  │ Severity │                      File                      │                               Issue                                │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ hooks/use-quick-job-post.ts:236                │ Publish is a no-op — setTimeout simulation, no API call            │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ agency/layout.tsx:176 + companies/page.tsx:217 │ addAgencyClient always sends company: 0                            │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ agency/companies/page.tsx:84                   │ website field mapped from logo property                            │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ agency/page.tsx:455                            │ job.job_id missing from type — links render /agency/jobs/undefined │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ agency/jobs/page.tsx:118                       │ clientCompanies not memoized — infinite API fetch loop             │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ quick-job-post-v3:100                          │ Missing useEffect dependencies                                     │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ agency/page.tsx:608                            │ "Add Company" button has no handler                                │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ agency/jobs/page.tsx:258                       │ API errors silently swallowed — no user feedback                   │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ agency/billing/page.tsx:501                    │ Billing mode hardcoded to "Agency Pays"; ignores company_pays      │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ agency/billing/page.tsx:37                     │ creditPackages missing currency — formatCurrency(undefined)        │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ All 3 quick-job-post variants                  │ Hardcoded mock companies; massive duplication                      │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ agency/layout.tsx:112                          │ Company context switcher is visual-only — doesn't scope child data │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ agency/companies/page.tsx:60                   │ initials not populated in transformClientToDisplay                 │
  ├──────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ agency/team/page.tsx:347                       │ Member removal has no confirmation dialog                          │
  └──────────┴────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────┘

  7. Admin Dashboard (14 issues)

  ┌──────────┬──────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
  │ Severity │               File               │                                       Issue                                       │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ 5 admin files                    │ alert() in 18+ call sites across fraud, compliance, support, moderation, agencies │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ admin/users/page.tsx:906         │ Bulk user delete has no type-to-confirm safeguard                                 │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ admin/users/page.tsx:221         │ Name parsing by space split corrupts multi-part names                             │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ admin/packages/page.tsx:77       │ syncPackageToStripe defined inline — bypasses API module pattern                  │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ admin/packages/page.tsx:245      │ Save errors silently swallowed; dialog closes whether save succeeded or not       │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ admin/compliance/page.tsx:269    │ GDPR executeDeletion — no double-confirm before permanent PII destruction         │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ admin/users/page.tsx:336         │ Impersonation requires no audit reason (support page correctly requires one)      │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ HIGH     │ lib/auth/require-role.tsx:29     │ Client-side-only role check; proxy.ts doesn't verify JWT role claim               │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ admin/users/page.tsx:221         │ Unused nameParts variable                                                         │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ admin/moderation/page.tsx:148    │ alert() in rejection leaves action dialog frozen                                  │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ admin/change-plan-dialog.tsx:213 │ Hardcoded "Visa ····4242" for all companies                                       │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ admin/moderation/page.tsx:112    │ Moderation queue capped at 50 — no pagination                                     │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ admin/users/page.tsx:428         │ Toast shows stale count after array reset (works by accident)                     │
  ├──────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ admin/agencies/page.tsx:304      │ Agencies page uses alert() exclusively — no toast                                 │
  └──────────┴──────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘

  8. UI Components, Shared, AI, RUM (11 issues)

  ┌───────────┬────────────────────────────────────┬──────────────────────────────────────────────────────────────────────┐
  │ Severity  │                File                │                                Issue                                 │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ lib/rum/config.ts:14               │ HMAC secret exposed via NEXT_PUBLIC_ prefix                          │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ components/turnstile.tsx:41        │ Turnstile fails open on network error — silently disables CAPTCHA    │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CRITICAL  │ ai/social-content-generator.tsx:77 │ Unhandled clipboard rejection causes silent failure                  │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ notification-center.tsx:115        │ All notification preference switches uncontrolled — nothing persists │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ ui/tiptap-editor.tsx:144           │ window.prompt() for links; no URL protocol validation (XSS risk)     │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ ui/date-picker.tsx:112             │ Shortcut highlight uses wall-clock comparison — can misfire          │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ lib/rum/reporter.ts:171            │ Module-level visibilitychange listener leaks across HMR              │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ ui/input-group.tsx:66              │ Incorrect role="group" on decorative addon element                   │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ dashboard-header.tsx:82            │ isActive uses startsWith without slash guard — false matches         │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ ui/sidebar.tsx:619                 │ useMemo(() => Math.random(), []) causes SSR hydration mismatch       │
  ├───────────┼────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
  │ IMPORTANT │ ui/combobox.tsx:135                │ children typed as (item: any, ...) loses type safety                 │
  └───────────┴────────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘

  9. Backend Django (16 issues)

  ┌──────────┬──────────────────────────────┬──────────────────────────────────────────────────────────────────┐
  │ Severity │             File             │                              Issue                               │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ apps/users/views.py:793      │ AuditLog.create uses wrong field metadata instead of changes     │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ apps/users/views.py:730      │ status='deleted' not a valid choice — corrupts records           │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ Dockerfile:33                │ collectstatic during build uses insecure default SECRET_KEY      │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ apps/jobs/services.py:436    │ SSRF via urlopen on employer-supplied URL                        │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ CRITICAL │ apps/users/models.py:108     │ MFA TOTP secret stored in plaintext                              │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ config/settings/base.py:13   │ Insecure defaults for SECRET_KEY and RUM_HMAC_SECRET             │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ apps/users/views.py:827      │ Resume upload accepts any file type — no validation              │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ apps/users/urls.py:18        │ Duplicate path me/resume/ — DELETE route unreachable             │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ config/settings/base.py:175  │ Celery broker default wrong vhost, no credentials                │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ core/permissions.py:71       │ IsCompanyMember: None == None IDOR vulnerability                 │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ apps/users/serializers.py:97 │ LoginSerializer doesn't enforce lockout or check pending status  │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ apps/billing/models.py:92    │ TOCTOU race in use_credit — validity checked before lock         │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ HIGH     │ apps/companies/views.py:~200 │ Invited user created without password or invitation email        │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ apps/users/views.py:738      │ Admin CSV export loads all records into memory — DoS risk        │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ Dockerfile:33-39             │ collectstatic runs as root before appuser created                │
  ├──────────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ MEDIUM   │ apps/billing/views.py:860    │ Checkout session endpoint doesn't verify session belongs to user │
  └──────────┴──────────────────────────────┴──────────────────────────────────────────────────────────────────┘

  ---
  Issue Distribution by Category

  ┌──────────────────────────────────────────────────────┬───────┐
  │                       Category                       │ Count │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Security (SSRF, XSS, IDOR, plaintext secrets, TLS)   │ 12    │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Broken functionality (404s, no-ops, wrong data)      │ 18    │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Silent failures (swallowed errors, no user feedback) │ 14    │
  ├──────────────────────────────────────────────────────┼───────┤
  │ SEO / metadata missing                               │ 8     │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Data integrity (races, invalid states, truncation)   │ 10    │
  ├──────────────────────────────────────────────────────┼───────┤
  │ UX (dead buttons, alert(), missing confirmations)    │ 16    │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Code quality (duplication, typing, conventions)      │ 15    │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Performance (redundant API calls, no pagination)     │ 8     │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Accessibility / a11y                                 │ 3     │
  ├──────────────────────────────────────────────────────┼───────┤
  │ Configuration / build                                │ 6     │
  └──────────────────────────────────────────────────────┴───────┘

  ---
  Recommended Fix Priority

  P0 — Fix before any deployment:
  1. SSRF in validate_external_url (backend)
  2. MFA secret encryption (backend)
  3. IsCompanyMember None==None IDOR (backend)
  4. status='deleted' invalid choice (backend)
  5. Open redirect on login page (frontend)
  6. TLS verification disabled globally (frontend+server.js)
  7. HMAC key exposed in client bundle (frontend)

  P1 — Fix this sprint:
  8. Job wizard id vs job_id type mismatch (breaks all draft saves)
  9. validatePromoCode always returns valid: true
  10. Quick Job Post publish no-op
  11. ignoreBuildErrors: true in next.config.mjs
  12. Job search & company directory missing SEO metadata
  13. AuditLog.create wrong field name
  14. Entitlement TOCTOU race condition
  15. Resume upload file type validation

  P2 — Fix this cycle:
  - All alert() → toast migrations (18+ sites)
  - Silent error swallowing across billing/packages/agency
  - Pagination for moderation queue, candidate applications, saved jobs
  - Dead CTA buttons on landing page
  - Notification preferences persistence
  - addAgencyClient sending company: 0