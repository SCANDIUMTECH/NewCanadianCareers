Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Orion Codebase Simplification — Complete File-by-File Checklist

 Context

 Systematic simplification of the entire Orion frontend codebase (244 files, 120K+ lines). Every file gets reviewed for: dead code, duplication, unnecessary
 complexity, unused imports, inconsistent patterns, and opportunities for consolidation. Zero functionality changes — only clarity, consistency, and
 maintainability improvements.

 Rules

 - Run npm run build after each batch to verify zero breakage
 - Skip files under 10 lines (loading.tsx stubs, re-exports, env declarations)
 - Focus on: unused imports, dead code, duplicated logic, overly verbose patterns, inconsistent styles
 - Do NOT add new features, docstrings, or type annotations to unchanged code
 - Do NOT refactor working patterns unless clearly duplicated or broken

 ---
 Batch 0: Pre-Flight Cleanup

 - Remove unused dependency @base-ui/react from package.json
 - Remove unused dependency @emotion/is-prop-valid from package.json
 - Remove unused CSS keyframes from app/globals.css (draw-line, grain, confetti)
 - Simplify next.config.mjs — remove default-value settings
 - Run npm run build to verify

 ---
 Batch 1: Shared Utilities — Extract Duplicated Functions

 Before touching individual files, extract common utilities that are duplicated everywhere.

 - lib/utils.ts (80 lines) — Add: getVisibleTextLength(), formatTimeAgo(), getInitials(), getCompanyInitials(). Consolidate CURRENCY_OPTIONS with
 lib/quick-job-schema.ts currencies
 - lib/constants/status-styles.ts — NEW: Create canonical job status badge style mapping (currently duplicated in company/page, agency/page, admin pages)
 - components/status-badge.tsx — NEW: Reusable StatusBadge component consuming status-styles
 - components/activity-icon.tsx — NEW: Extract from company/page.tsx + agency/page.tsx (config map, not switch)
 - Run npm run build to verify

 ---
 Batch 2: Root & Config Files

 - app/layout.tsx (106 lines) — review font loading, simplify className assembly
 - app/globals.css (447 lines) — remove unused animations, dedupe CSS variables, simplify font stacks
 - app/page.tsx (25 lines) — review
 - next.config.mjs (11 lines) — already simplified in Batch 0
 - eslint.config.mjs (46 lines) — review for unnecessary rules
 - postcss.config.mjs (8 lines) — review
 - server.js (33 lines) — review
 - proxy.ts (108 lines) — review middleware logic
 - Run npm run build to verify

 ---
 Batch 3: Core Libraries — /lib/

 - lib/utils.ts (80 lines) — updated in Batch 1
 - lib/seo-types.ts (172 lines) — review for unused types
 - lib/job-wizard-schema.ts (202 lines) — consolidate with hook validation, remove duplicate currency def
 - lib/quick-job-schema.ts (215 lines) — remove duplicate getVisibleTextLength, use shared currencies
 - lib/constants/colors.ts (90 lines) — review
 - lib/constants/industries.ts (50 lines) — review
 - lib/constants/company-sizes.ts (14 lines) — review
 - Run npm run build to verify

 ---
 Batch 4: API Client & Modules — /lib/api/

 - lib/api/client.ts (443 lines) — review error handling, token refresh logic
 - lib/api/auth.ts (177 lines) — review
 - lib/api/jobs.ts (265 lines) — review
 - lib/api/companies.ts (243 lines) — review
 - lib/api/billing.ts (287 lines) — review
 - lib/api/applications.ts (217 lines) — review
 - lib/api/candidates.ts (490 lines) — review
 - lib/api/agencies.ts (804 lines) — review for dead endpoints
 - lib/api/social.ts (123 lines) — review
 - lib/api/notifications.ts (112 lines) — review
 - lib/api/settings.ts (71 lines) — review
 - lib/api/public.ts (405 lines) — review
 - lib/api/ai.ts (433 lines) — review
 - Run npm run build to verify

 ---
 Batch 5: Admin API Modules — /lib/api/admin-*.ts

 - lib/api/admin-dashboard.ts (150 lines)
 - lib/api/admin-jobs.ts (381 lines)
 - lib/api/admin-companies.ts (364 lines)
 - lib/api/admin-users.ts (269 lines)
 - lib/api/admin-agencies.ts (343 lines)
 - lib/api/admin-email.ts (863 lines) — large, check for dead code
 - lib/api/admin-marketing.ts (1143 lines) — largest API module, review carefully
 - lib/api/admin-packages.ts (158 lines)
 - lib/api/admin-payments.ts (188 lines)
 - lib/api/admin-billing.ts (42 lines)
 - lib/api/admin-banners.ts (118 lines)
 - lib/api/admin-settings.ts (282 lines)
 - lib/api/admin-social.ts (267 lines)
 - lib/api/admin-support.ts (355 lines)
 - lib/api/admin-search.ts (604 lines) — large, review
 - lib/api/admin-fraud.ts (192 lines)
 - lib/api/admin-compliance.ts (203 lines)
 - lib/api/admin-features.ts (109 lines)
 - lib/api/admin-audit.ts (56 lines)
 - lib/api/admin-affiliates.ts (113 lines)
 - lib/api/admin-entitlements.ts (91 lines)
 - lib/api/admin-taxonomies.ts (141 lines)
 - Run npm run build to verify

 ---
 Batch 6: Type Definitions — /lib/*/types.ts

 - lib/auth/types.ts (107 lines) — review for unused types
 - lib/company/types.ts (514 lines) — review for unused types
 - lib/agency/types.ts (544 lines) — review, check for types duplicated in page files
 - lib/candidate/types.ts (313 lines) — review
 - lib/admin/types.ts (1205 lines) — largest type file, review for dead types
 - lib/admin/all-types.ts (193 lines) — review overlap with types.ts
 - lib/admin/import-job-schema.ts (494 lines) — review
 - Run npm run build to verify

 ---
 Batch 7: Context Providers — /lib/*/context.tsx

 - lib/auth/context.tsx (200 lines) — review
 - lib/auth/require-role.tsx (76 lines) — review
 - lib/company/context.tsx (144 lines) — review
 - lib/agency/context.tsx (147 lines) — review
 - lib/candidate/context.tsx (112 lines) — review
 - lib/admin/context.tsx (193 lines) — review
 - Run npm run build to verify

 ---
 Batch 8: Hooks — /hooks/

 - hooks/use-auth.ts (12 lines) — review
 - hooks/use-company.ts (9 lines) — review
 - hooks/use-agency.ts (9 lines) — review
 - hooks/use-candidate.ts (6 lines) — review
 - hooks/use-admin.ts (9 lines) — review
 - hooks/use-mobile.ts (19 lines) — review
 - hooks/use-cart.ts (210 lines) — simplify state mutations, hydration pattern
 - hooks/use-job-wizard.ts (228 lines) — consolidate validation with Zod schema
 - hooks/use-quick-job-post.ts (363 lines) — review hydration pattern, simplify
 - Run npm run build to verify

 ---
 Batch 9: UI Primitives — /components/ui/

 - components/ui/button.tsx (64 lines)
 - components/ui/input.tsx (21 lines)
 - components/ui/textarea.tsx (18 lines)
 - components/ui/select.tsx (188 lines)
 - components/ui/label.tsx (24 lines)
 - components/ui/checkbox.tsx (32 lines)
 - components/ui/switch.tsx (31 lines)
 - components/ui/radio-group.tsx (45 lines)
 - components/ui/badge.tsx (46 lines)
 - components/ui/card.tsx (92 lines)
 - components/ui/avatar.tsx (53 lines)
 - components/ui/skeleton.tsx (13 lines)
 - components/ui/separator.tsx (28 lines)
 - components/ui/progress.tsx (31 lines)
 - components/ui/tooltip.tsx (61 lines)
 - components/ui/popover.tsx (92 lines)
 - components/ui/dialog.tsx (143 lines)
 - components/ui/alert-dialog.tsx (157 lines)
 - components/ui/sheet.tsx (139 lines)
 - components/ui/dropdown-menu.tsx (257 lines)
 - components/ui/accordion.tsx (69 lines)
 - components/ui/collapsible.tsx (33 lines)
 - components/ui/tabs.tsx (66 lines)
 - components/ui/table.tsx (116 lines)
 - components/ui/scroll-area.tsx (58 lines)
 - components/ui/pagination.tsx (233 lines)
 - components/ui/sidebar.tsx (735 lines) — large, review for dead code
 - components/ui/command.tsx (177 lines)
 - components/ui/combobox.tsx (321 lines) — review
 - components/ui/calendar.tsx (75 lines)
 - components/ui/date-picker.tsx (143 lines)
 - components/ui/input-group.tsx (170 lines)
 - components/ui/breadcrumb.tsx (118 lines)
 - components/ui/tiptap-editor.tsx (292 lines) — remove duplicate getVisibleTextLength
 - Run npm run build to verify

 ---
 Batch 10: Marketing/Landing Components

 - components/header.tsx (409 lines) — extract PremiumButton, simplify logo
 - components/footer.tsx (105 lines) — review
 - components/hero-section.tsx (94 lines) — review
 - components/candidates-section.tsx (77 lines) — review
 - components/companies-section.tsx (74 lines) — review
 - components/platform-section.tsx (55 lines) — review
 - components/why-orion-section.tsx (68 lines) — review
 - components/final-cta-section.tsx (59 lines) — review
 - components/constellation-canvas.tsx (195 lines) — optimize reduced motion path
 - components/ui-frame.tsx (265 lines) — merge duplicate wireframe variants
 - components/text-reveal.tsx (166 lines) — extract shared IntersectionObserver hook
 - components/motion-wrapper.tsx (82 lines) — review
 - components/magnetic-button.tsx (111 lines) — review overlap with header PremiumButton
 - Run npm run build to verify

 ---
 Batch 11: Shared Feature Components

 - components/dashboard-header.tsx (335 lines) — simplify icon mapping, break into sub-components
 - components/notification-center.tsx (325 lines) — review
 - components/company-onboarding.tsx (377 lines) — review
 - components/company-team-management.tsx (638 lines) — large, review
 - components/account-security.tsx (281 lines) — review
 - components/form-field.tsx (130 lines) — review
 - components/auth-input.tsx (71 lines) — review
 - components/error-boundary-view.tsx (97 lines) — review
 - components/company-avatar.tsx (119 lines) — review overlap with user-avatar
 - components/user-avatar.tsx (119 lines) — review overlap with company-avatar
 - components/turnstile.tsx (120 lines) — review
 - components/theme-provider.tsx (11 lines) — review
 - components/rum-provider.tsx (23 lines) — review
 - Run npm run build to verify

 ---
 Batch 12: SEO Components

 - components/seo/job-posting-schema.tsx (208 lines)
 - components/seo/faq-schema.tsx (120 lines)
 - components/seo/organization-schema.tsx (102 lines)
 - components/seo/breadcrumb-schema.tsx (60 lines)
 - Run npm run build to verify

 ---
 Batch 13: AI Components

 - components/ai/ai-generate-button.tsx (97 lines)
 - components/ai/seo-fields.tsx (188 lines)
 - components/ai/social-content-generator.tsx (201 lines)
 - Run npm run build to verify

 ---
 Batch 14: Admin Components

 - components/admin/import-jobs-dialog.tsx (1360 lines) — very large, review carefully
 - components/admin/add-credits-dialog.tsx (739 lines) — large, review
 - components/admin/job-policy-settings-dialog.tsx (533 lines) — review
 - components/admin/change-plan-dialog.tsx (279 lines) — review
 - components/admin/command-palette.tsx (178 lines) — review
 - components/admin/segment-rule-builder.tsx (227 lines) — review
 - components/admin/industry-combobox.tsx (44 lines) — review
 - Run npm run build to verify

 ---
 Batch 15: Job Wizard

 - components/job-wizard/job-wizard.tsx (612 lines) — extract mappings, consolidate dialogs
 - components/job-wizard/wizard-navigation.tsx (133 lines) — review
 - components/job-wizard/wizard-progress.tsx (92 lines) — review
 - components/job-wizard/steps/step-basics.tsx (227 lines) — review
 - components/job-wizard/steps/step-role-details.tsx (297 lines) — review
 - components/job-wizard/steps/step-location.tsx (291 lines) — review
 - components/job-wizard/steps/step-compensation.tsx (274 lines) — review
 - components/job-wizard/steps/step-apply-method.tsx (222 lines) — review
 - components/job-wizard/steps/step-distribution.tsx (172 lines) — review
 - components/job-wizard/steps/step-preview.tsx (298 lines) — review
 - components/job-wizard/steps/step-publish.tsx (371 lines) — review
 - Run npm run build to verify

 ---
 Batch 16: Quick Job Post v1

 - components/quick-job-post/quick-job-post.tsx (310 lines) — review
 - components/quick-job-post/job-form-fields.tsx (371 lines) — review
 - components/quick-job-post/company-selector.tsx (332 lines) — review
 - components/quick-job-post/sidebar-cards.tsx (234 lines) — review
 - components/quick-job-post/status-pill.tsx (69 lines) — review
 - components/quick-job-post/index.ts (9 lines) — review
 - Run npm run build to verify

 ---
 Batch 17: Quick Job Post v2

 - components/quick-job-post-v2/quick-job-post-v2.tsx (1132 lines) — large, review
 - components/quick-job-post-v2/quick-job-post-premium.tsx (1054 lines) — large, remove duplicate getVisibleTextLength
 - components/quick-job-post-v2/tiptap-editor.tsx (224 lines) — review overlap with ui/tiptap-editor
 - Run npm run build to verify

 ---
 Batch 18: Quick Job Post v3

 - components/quick-job-post-v3/quick-job-post.tsx (415 lines) — remove duplicate getVisibleTextLength
 - components/quick-job-post-v3/job-form.tsx (471 lines) — remove duplicate getVisibleTextLength
 - components/quick-job-post-v3/company-section.tsx (514 lines) — review
 - components/quick-job-post-v3/job-preview.tsx (231 lines) — review
 - components/quick-job-post-v3/index.ts (4 lines) — review
 - Run npm run build to verify

 ---
 Batch 19: Job Components

 - components/jobs/job-card.tsx (213 lines) — replace inline SVGs with Lucide, extract formatters
 - components/jobs/empty-state.tsx (204 lines) — replace hardcoded SVG icons with Lucide
 - components/jobs/job-filters-sidebar.tsx (222 lines) — review
 - components/jobs/job-filters-sheet.tsx (68 lines) — review overlap with sidebar
 - Run npm run build to verify

 ---
 Batch 20: Auth Pages

 - app/login/page.tsx (295 lines) — review
 - app/login/loading.tsx (64 lines) — review
 - app/signup/page.tsx (454 lines) — review
 - app/signup/loading.tsx (75 lines) — review
 - app/forgot-password/page.tsx (263 lines) — review
 - app/forgot-password/loading.tsx (39 lines) — review
 - app/reset-password/page.tsx (370 lines) — review
 - app/verify-email/page.tsx (332 lines) — review
 - app/verify-email/prompt/page.tsx (248 lines) — review
 - Run npm run build to verify

 ---
 Batch 21: Public Pages

 - app/jobs/page.tsx (32 lines) — review
 - app/jobs/loading.tsx (127 lines) — review
 - app/jobs/[id]/page.tsx (229 lines) — review
 - app/jobs/[id]/loading.tsx (186 lines) — review
 - app/jobs/[id]/job-detail-client.tsx (1074 lines) — large, review carefully
 - app/jobs/jobs-search-client.tsx (586 lines) — review
 - app/companies/page.tsx (32 lines) — review
 - app/companies/loading.tsx (67 lines) — review
 - app/companies/[id]/page.tsx (552 lines) — review
 - app/companies/[id]/loading.tsx (113 lines) — review
 - app/companies/companies-directory-client.tsx (498 lines) — review
 - app/preferences/[token]/page.tsx (252 lines) — review
 - app/llms.txt/route.ts (57 lines) — review
 - app/robots.ts (168 lines) — review
 - app/sitemap.ts (102 lines) — review
 - app/terms/page.tsx (508 lines) — review
 - app/privacy/page.tsx (474 lines) — review
 - Run npm run build to verify

 ---
 Batch 22: Candidate Dashboard

 - app/candidate/layout.tsx (108 lines) — use shared getInitials from utils
 - app/candidate/page.tsx (603 lines) — use shared formatTimeAgo, activity icons, status badges
 - app/candidate/profile/page.tsx (599 lines) — review
 - app/candidate/profile/loading.tsx (134 lines) — review
 - app/candidate/applications/page.tsx (574 lines) — use shared status badges
 - app/candidate/saved/page.tsx (564 lines) — review
 - app/candidate/saved/loading.tsx (63 lines) — review
 - app/candidate/alerts/page.tsx (716 lines) — review
 - app/candidate/settings/page.tsx (727 lines) — review
 - app/candidate/settings/loading.tsx (87 lines) — review
 - app/candidate/notifications/page.tsx (191 lines) — review
 - Run npm run build to verify

 ---
 Batch 23: Company Dashboard

 - app/company/layout.tsx (283 lines) — use shared getInitials, sign out logic
 - app/company/loading.tsx (68 lines) — review
 - app/company/error.tsx (20 lines) — review
 - app/company/page.tsx (722 lines) — use shared formatTimeAgo, status badges, activity icons
 - app/company/analytics/page.tsx (5 lines) — review
 - app/company/profile/page.tsx (734 lines) — review
 - app/company/profile/loading.tsx (110 lines) — review
 - app/company/settings/page.tsx (456 lines) — review
 - app/company/settings/loading.tsx (56 lines) — review
 - app/company/team/page.tsx (17 lines) — review
 - app/company/team/loading.tsx (52 lines) — review
 - Run npm run build to verify

 ---
 Batch 24: Company Jobs & Billing

 - app/company/jobs/page.tsx (1375 lines) — large, review carefully
 - app/company/jobs/loading.tsx (62 lines) — review
 - app/company/jobs/error.tsx (24 lines) — review
 - app/company/jobs/new/page.tsx (40 lines) — review
 - app/company/jobs/new/loading.tsx (61 lines) — review
 - app/company/jobs/[id]/page.tsx (1555 lines) — very large, review carefully
 - app/company/jobs/[id]/loading.tsx (97 lines) — review
 - app/company/jobs/[id]/edit/page.tsx (28 lines) — review
 - app/company/billing/page.tsx (978 lines) — review
 - app/company/billing/loading.tsx (86 lines) — review
 - app/company/billing/error.tsx (24 lines) — review
 - app/company/billing/add-card/page.tsx (303 lines) — review
 - app/company/billing/invoices/page.tsx (422 lines) — review
 - app/company/packages/page.tsx (412 lines) — review
 - app/company/packages/loading.tsx (69 lines) — review
 - app/company/cart/page.tsx (424 lines) — review
 - app/company/cart/loading.tsx (67 lines) — review
 - app/company/checkout/page.tsx (387 lines) — review
 - app/company/checkout/loading.tsx (107 lines) — review
 - app/company/checkout/success/page.tsx (539 lines) — review
 - app/company/checkout/success/loading.tsx (43 lines) — review
 - app/company/applications/page.tsx (819 lines) — review
 - app/company/applications/loading.tsx (68 lines) — review
 - app/company/applications/error.tsx (24 lines) — review
 - app/company/notifications/page.tsx (246 lines) — review
 - app/company/notifications/loading.tsx (42 lines) — review
 - Run npm run build to verify

 ---
 Batch 25: Agency Dashboard

 - app/agency/layout.tsx (657 lines) — use shared getInitials, sign out logic
 - app/agency/page.tsx (828 lines) — use shared formatTimeAgo, status badges, activity icons
 - app/agency/analytics/page.tsx (582 lines) — review
 - app/agency/analytics/loading.tsx (133 lines) — review
 - app/agency/billing/page.tsx (627 lines) — review
 - app/agency/billing/loading.tsx (119 lines) — review
 - app/agency/companies/page.tsx (992 lines) — review
 - app/agency/companies/loading.tsx (72 lines) — review
 - app/agency/companies/[id]/page.tsx (500 lines) — review
 - app/agency/companies/[id]/loading.tsx (47 lines) — review
 - app/agency/jobs/page.tsx (853 lines) — review
 - app/agency/jobs/loading.tsx (68 lines) — review
 - app/agency/jobs/new/page.tsx (400 lines) — review
 - app/agency/jobs/new/loading.tsx (67 lines) — review
 - app/agency/jobs/new/quick/page.tsx (66 lines) — review
 - app/agency/jobs/new/quick-v2/page.tsx (59 lines) — review
 - app/agency/jobs/new/quick-v3/page.tsx (60 lines) — review
 - app/agency/jobs/[id]/page.tsx (1138 lines) — large, review
 - app/agency/jobs/[id]/edit/page.tsx (28 lines) — review
 - app/agency/packages/page.tsx (556 lines) — review
 - app/agency/team/page.tsx (608 lines) — review
 - app/agency/team/loading.tsx (56 lines) — review
 - app/agency/settings/page.tsx (209 lines) — review
 - app/agency/settings/job-posting/page.tsx (353 lines) — review
 - app/agency/settings/notifications/page.tsx (419 lines) — review
 - app/agency/settings/security/page.tsx (117 lines) — review
 - Run npm run build to verify

 ---
 Batch 26: Admin Layout & Dashboard

 - app/admin/layout.tsx (500 lines) — use shared getInitials, simplify icon mapping
 - app/admin/error.tsx (23 lines) — review
 - app/admin/page.tsx (988 lines) — use shared formatTimeAgo, status badges, stat card
 - Run npm run build to verify

 ---
 Batch 27: Admin — Users & Companies

 - app/admin/users/page.tsx (1338 lines) — review
 - app/admin/users/[id]/page.tsx (1134 lines) — review
 - app/admin/companies/page.tsx (1524 lines) — review
 - app/admin/companies/[id]/page.tsx (1769 lines) — very large, review
 - app/admin/agencies/page.tsx (1457 lines) — review
 - app/admin/agencies/[id]/page.tsx (1987 lines) — very large, review
 - Run npm run build to verify

 ---
 Batch 28: Admin — Jobs & Content

 - app/admin/jobs/page.tsx (2685 lines) — very large, review for dead code
 - app/admin/jobs/[id]/page.tsx (1938 lines) — very large, review
 - app/admin/moderation/page.tsx (527 lines) — review
 - app/admin/banners/page.tsx (847 lines) — review
 - app/admin/taxonomies/page.tsx (1179 lines) — review
 - Run npm run build to verify

 ---
 Batch 29: Admin — Email & Marketing

 - app/admin/email/page.tsx (4047 lines) — LARGEST FILE, review aggressively
 - app/admin/email/templates/page.tsx (928 lines) — review
 - app/admin/email/templates/[id]/page.tsx (860 lines) — review
 - app/admin/marketing/page.tsx (490 lines) — review
 - app/admin/marketing/campaigns/page.tsx (404 lines) — review
 - app/admin/marketing/campaigns/new/page.tsx (640 lines) — review
 - app/admin/marketing/campaigns/[id]/page.tsx (865 lines) — review
 - app/admin/marketing/coupons/page.tsx (481 lines) — review
 - app/admin/marketing/coupons/new/page.tsx (388 lines) — review
 - app/admin/marketing/coupons/[id]/page.tsx (597 lines) — review
 - app/admin/marketing/coupons/wallets/[id]/page.tsx (302 lines) — review
 - app/admin/marketing/journeys/page.tsx (366 lines) — review
 - app/admin/marketing/journeys/new/page.tsx (258 lines) — review
 - app/admin/marketing/journeys/[id]/page.tsx (735 lines) — review
 - app/admin/marketing/audiences/page.tsx (1164 lines) — large, review
 - app/admin/marketing/reports/page.tsx (1116 lines) — large, review
 - app/admin/marketing/compliance/page.tsx (806 lines) — review
 - Run npm run build to verify

 ---
 Batch 30: Admin — Finance & Operations

 - app/admin/payments/page.tsx (1908 lines) — very large, review
 - app/admin/packages/page.tsx (1139 lines) — review
 - app/admin/entitlements/page.tsx (891 lines) — review
 - app/admin/billing page — (handled via payments/packages)
 - app/admin/fraud/page.tsx (1494 lines) — review
 - app/admin/compliance/page.tsx (1072 lines) — review
 - Run npm run build to verify

 ---
 Batch 31: Admin — Settings & Tools

 - app/admin/settings/page.tsx (1789 lines) — very large, review
 - app/admin/search/page.tsx (2217 lines) — very large, review
 - app/admin/search/components/widgets/seo-health-score-card.tsx (118 lines) — review
 - app/admin/search/components/widgets/core-web-vitals-gauge.tsx (106 lines) — review
 - app/admin/search/components/widgets/bot-access-card.tsx (102 lines) — review
 - app/admin/social/page.tsx (1705 lines) — very large, review
 - app/admin/support/page.tsx (758 lines) — review
 - app/admin/features/page.tsx (678 lines) — review
 - app/admin/audit/page.tsx (597 lines) — review
 - app/admin/affiliates/page.tsx (665 lines) — review
 - app/admin/ai/page.tsx (1162 lines) — review
 - Run npm run build to verify

 ---
 Batch 32: RUM (Real User Monitoring)

 - lib/rum/config.ts (27 lines) — review
 - lib/rum/hmac.ts (41 lines) — review
 - lib/rum/session.ts (42 lines) — review
 - lib/rum/web-vitals.ts (50 lines) — review
 - lib/rum/reporter.ts (179 lines) — review
 - Run npm run build to verify

 ---
 Final Verification

 - npm run build — full clean build passes
 - npm run lint — no new warnings
 - Spot-check: admin dashboard renders
 - Spot-check: company dashboard renders
 - Spot-check: candidate dashboard renders
 - Spot-check: public job search renders
 - Spot-check: login page renders

 ---
 Summary

 ┌───────┬───────────────────────────┬────────────┬─────────────┐
 │ Batch │           Area            │   Files    │ Est. Lines  │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 0     │ Pre-flight cleanup        │ 3          │ ~450        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 1     │ Extract shared utilities  │ 4 new      │ —           │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 2     │ Root & config             │ 8          │ ~750        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 3     │ Core libraries            │ 7          │ ~830        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 4     │ API client modules        │ 13         │ ~3,800      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 5     │ Admin API modules         │ 22         │ ~5,600      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 6     │ Type definitions          │ 7          │ ~3,300      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 7     │ Context providers         │ 6          │ ~870        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 8     │ Hooks                     │ 9          │ ~870        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 9     │ UI primitives             │ 34         │ ~3,400      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 10    │ Marketing components      │ 13         │ ~1,560      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 11    │ Shared feature components │ 13         │ ~2,600      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 12    │ SEO components            │ 4          │ ~490        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 13    │ AI components             │ 3          │ ~490        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 14    │ Admin components          │ 7          │ ~3,360      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 15    │ Job wizard                │ 11         │ ~2,700      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 16    │ Quick job post v1         │ 6          │ ~1,330      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 17    │ Quick job post v2         │ 3          │ ~2,410      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 18    │ Quick job post v3         │ 5          │ ~1,640      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 19    │ Job components            │ 4          │ ~710        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 20    │ Auth pages                │ 9          │ ~2,140      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 21    │ Public pages              │ 17         │ ~4,730      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 22    │ Candidate dashboard       │ 11         │ ~4,370      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 23    │ Company dashboard         │ 11         │ ~2,510      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 24    │ Company jobs & billing    │ 26         │ ~6,350      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 25    │ Agency dashboard          │ 26         │ ~8,180      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 26    │ Admin layout & dashboard  │ 3          │ ~1,510      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 27    │ Admin users & companies   │ 6          │ ~9,210      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 28    │ Admin jobs & content      │ 5          │ ~7,180      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 29    │ Admin email & marketing   │ 17         │ ~14,050     │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 30    │ Admin finance & ops       │ 5          │ ~6,500      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 31    │ Admin settings & tools    │ 11         │ ~9,100      │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ 32    │ RUM                       │ 5          │ ~340        │
 ├───────┼───────────────────────────┼────────────┼─────────────┤
 │ Total │                           │ ~244 files │ ~120K lines │
 └───────┴───────────────────────────┴────────────┴─────────────┘