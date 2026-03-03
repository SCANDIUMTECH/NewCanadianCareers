Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Award-Winning Email Template Redesign + Admin Portal Fixes

 Context

 Orion's 16 email templates are bare-bones (3-5 lines of content each, no brand identity, no logo, no visual hierarchy). The admin email portal at
 /admin/email also has several broken features (test send is a console.log placeholder, log details use hardcoded mock data, no error toasts). The goal
 is to redesign all templates to Apple/SpaceX/v0 caliber and fix the admin portal issues.

 ---
 Part 1: Backend Email Template Redesign (17 files)

 All files in /backend/templates/email/. No Python code changes — all existing template variables remain backward-compatible.

 1A. base.html — Complete Redesign

 New 5-zone architecture:

 ┌──────────────┬───────────────────────────────────────────────────────────────────────┐
 │     Zone     │                                Content                                │
 ├──────────────┼───────────────────────────────────────────────────────────────────────┤
 │ Preheader    │ Hidden preview text via {% block preheader %}                         │
 ├──────────────┼───────────────────────────────────────────────────────────────────────┤
 │ Header       │ 2px brand accent stripe + centered Orion logo (inline SVG) + wordmark │
 ├──────────────┼───────────────────────────────────────────────────────────────────────┤
 │ Content      │ 600px card with 16px radius, elegant shadow, generous padding         │
 ├──────────────┼───────────────────────────────────────────────────────────────────────┤
 │ Help Footer  │ "Need help?" support link + social links (LinkedIn, X)                │
 ├──────────────┼───────────────────────────────────────────────────────────────────────┤
 │ Legal Footer │ Copyright + CAN-SPAM address + "Sent by Orion"                        │
 └──────────────┴───────────────────────────────────────────────────────────────────────┘

 Design tokens:
 - Background: #F8FAFC (softer than current #f5f5f5)
 - Card: #FFFFFF, border-radius: 16px, box-shadow: 0 1px 3px rgba(0,0,0,0.06)
 - Primary: #3B5BDB, Accent stripe via {% block accent_color %}
 - Headings: 28px, #0F172A, weight 700, letter-spacing -0.02em
 - Body: 16px, #374151, line-height 1.6
 - Secondary: 14px, #6B7280
 - Legal: 12px, #9CA3AF
 - Font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif

 Dark mode via @media (prefers-color-scheme: dark):
 - Background: #0F172A, Card: #1E293B, Text: #E2E8F0, Borders: #334155

 Responsive via @media (max-width: 600px):
 - Full-width card, reduced padding (40px → 24px), full-width CTAs

 Reusable blocks: {% block accent_color %}, {% block preheader %}, {% block hero_icon %}, {% block content %}, {% block content_footer %}

 Reusable inline patterns (used across templates):
 - Status badge: Colored pill with text (<td style="background:#DCFCE7;color:#166534;padding:4px
 12px;border-radius:20px;font-size:12px;font-weight:600;">)
 - Info card: Bordered box with left accent stripe for metadata
 - CTA button: padding: 14px 32px; background: #3B5BDB; color: #fff; border-radius: 10px; font-weight: 600; font-size: 16px; + MSO conditional for
 Outlook
 - Hero icon: 48x48 inline SVG circle with contextual color

 1B. Individual Template Redesigns (16 templates)

 Each template gets: preheader text, hero icon, status context, professional copy, structured info card, CTA button, helpful footer text.

 ┌─────┬──────────────────────────────┬─────────┬────────────────┬─────────────────────────────────────────┐
 │  #  │           Template           │ Accent  │   Hero Icon    │           Key Design Element            │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 1   │ welcome.html                 │ #3B5BDB │ Star/sparkle   │ 3-column feature highlight cards        │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 2   │ email_verification.html      │ #3B5BDB │ Shield-check   │ CTA + fallback URL in monospace         │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 3   │ password_reset.html          │ #3B5BDB │ Lock           │ CTA + expiry notice + security note     │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 4   │ security_alert.html          │ #EF4444 │ Shield-alert   │ Red info card with IP/location/time     │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 5   │ fraud_alert.html             │ #DC2626 │ Triangle-alert │ Severity badge + 7-field detail card    │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 6   │ job_pending_review.html      │ #F59E0B │ Clock          │ Amber "Pending" badge + job details     │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 7   │ job_approved.html            │ #10B981 │ Check-circle   │ Green "Live" badge + job card           │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 8   │ job_rejected.html            │ #EF4444 │ X-circle       │ Red badge + reason + "next steps" box   │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 9   │ application_received.html    │ #3B5BDB │ Inbox          │ Job title card + CTA to view            │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 10  │ application_status.html      │ Dynamic │ Briefcase      │ Status badge (color by status)          │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 11  │ job_alert.html               │ #3B5BDB │ Bell           │ {% for job in jobs %} job listing cards │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 12  │ payment_success.html         │ #10B981 │ Check-circle   │ Green "Confirmed" badge + amount        │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 13  │ payment_failed.html          │ #EF4444 │ X-circle       │ Red badge + red CTA                     │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 14  │ payment_action_required.html │ #F59E0B │ Shield-lock    │ Amber "Action Required" badge           │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 15  │ subscription_past_due.html   │ #EF4444 │ Clock-alert    │ Red badge + urgency warning             │
 ├─────┼──────────────────────────────┼─────────┼────────────────┼─────────────────────────────────────────┤
 │ 16  │ default.html                 │ #3B5BDB │ None           │ Clean {{ content }} rendering           │
 └─────┴──────────────────────────────┴─────────┴────────────────┴─────────────────────────────────────────┘

 Copy direction: Concise, confident, human. No exclamation marks overuse. Apple-style clarity. Every email has a clear single action.

 ---
 Part 2: Admin Email Portal Fixes

 File: app/admin/email/page.tsx (2650 lines)

 Fix 1: Test Send (line 1645-1660)

 - Replace console.log() + fake timeout with actual testProvider() API call
 - Get active provider ID from the providers state already loaded in OverviewTab
 - Add success/error toast feedback

 Fix 2: Log Details (lines 2183-2217)

 - Import getEmailLog from @/lib/api/admin-email (currently not imported)
 - On log row click → fetch getEmailLog(id) for full payload/HTML/response
 - Add logDetail state + loading spinner
 - Replace hardcoded mock JSON with real logDetail.payload, logDetail.renderedHtml, logDetail.providerResponse
 - Render HTML preview in sandboxed iframe (srcdoc)

 Fix 3: Error/Success Toasts (all catch blocks)

 - Add import { toast } from "sonner"
 - Replace ~12 console.error() calls with toast.error()
 - Add toast.success() on successful operations (save, publish, toggle, retry, settings)

 Fix 4: Create Trigger Dialog (line 1052 state exists, no dialog rendered)

 - Import createTrigger from @/lib/api/admin-email
 - Add a Sheet/Dialog for new trigger (mirrors Edit Trigger sheet at lines 1490-1578)
 - Wire the existing "Add Trigger" button (line 1373) to open it

 Fix 5: Create Template Button (line 1687, no onClick)

 - Wire Plus button to open create template dialog
 - Import createEmailTemplate (already exported from API module)
 - Collect: name, type, subject, initial HTML

 ---
 Implementation Order

 1. base.html — Foundation must be right first
 2. All 16 child templates — Each extending the new base (batch by category: auth → jobs → applications → billing → fallback)
 3. Admin portal fixes — Fix 3 (toasts) first, then Fix 2 (log details), Fix 1 (test send), Fix 4 (create trigger), Fix 5 (create template)
 4. Build verification — npm run build

 ---
 Key Files

 ┌──────────────────────────────────────────────────────┬──────────────────┐
 │                         File                         │      Action      │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/base.html                    │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/welcome.html                 │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/email_verification.html      │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/password_reset.html          │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/security_alert.html          │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/fraud_alert.html             │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/job_pending_review.html      │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/job_approved.html            │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/job_rejected.html            │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/application_received.html    │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/application_status.html      │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/job_alert.html               │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/payment_success.html         │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/payment_failed.html          │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/payment_action_required.html │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/subscription_past_due.html   │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ backend/templates/email/default.html                 │ Complete rewrite │
 ├──────────────────────────────────────────────────────┼──────────────────┤
 │ app/admin/email/page.tsx                             │ Edit (5 fixes)   │
 └──────────────────────────────────────────────────────┴──────────────────┘

 Existing Code to Reuse

 - render_email_template() in backend/apps/notifications/tasks.py:96 — no changes needed
 - EMAIL_TEMPLATES dict in backend/apps/notifications/tasks.py:76 — no changes needed
 - testProvider() in lib/api/admin-email.ts — wire into template test send
 - getEmailLog() in lib/api/admin-email.ts — wire into log detail drawer
 - createTrigger() in lib/api/admin-email.ts — wire into add trigger dialog
 - createEmailTemplate() in lib/api/admin-email.ts — wire into add template button
 - toast from sonner — already used in other admin pages (e.g., app/admin/settings/page.tsx)

 Verification

 1. npm run build — TypeScript compilation passes
 2. Backend templates render: python manage.py shell → from django.template.loader import render_to_string; print(render_to_string('email/welcome.html',
 {'name': 'Test', 'current_year': 2026}))
 3. Admin portal: Navigate to /admin/email → Templates tab → select template → Send Test → verify real API call
 4. Admin portal: Logs tab → click log row → verify real payload/HTML/response data loads
 5. Test email rendering in Gmail, Outlook, Apple Mail (via Litmus or manual)
 6. Test dark mode: macOS System Preferences → Dark Mode → check email in Apple Mail