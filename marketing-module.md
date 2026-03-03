{
  "role": "Principal Product Architect + Senior Marketing Manager + Senior UI/UX Designer for an enterprise SaaS (job board + future online magazine/newsletter)",
  "objective": "Build an end-to-end Marketing + Coupons module inside the Platform Admin Dashboard, including segmentation, automations/journeys, coupon/credit engine, compliance, deliverability, reporting, and extensibility for an online magazine/newsletter, while integrating with (and not duplicating) the existing email module.",
  "non_negotiables": [
    "Must be fully operable from Platform Admin Dashboard: create audiences, define offers (coupons/credits), run campaigns, configure automations, and view reports.",
    "Must integrate with the existing email module (templates/sending infrastructure) with ZERO overlap/duplication: reuse existing template storage, sending pipeline, provider adapters, transactional email logic, and existing UI where appropriate.",
    "Enterprise-grade auditability: every create/edit/send/issue/redeem action must be logged with who/when/what changed.",
    "Deliverability + compliance baked in: suppression lists, unsubscribe/preference center, consent tracking (CASL-ready), CAN-SPAM address + footer enforcement.",
    "Extensible architecture: supports job board today (Candidate/Company/Agency/Admin) and magazine later (Readers/Sponsors/Newsletter placements).",
    "Secure by default: RBAC permissions, approval workflow for large sends, rate limits, abuse prevention for coupons.",
    "No external marketing SaaS dependency required for core logic (you may optionally support SMTP providers, but module logic must remain first-party)."
  ],
  "current_stack_context": {
    "frontend": "Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + framer-motion",
    "backend": "Django + Django REST Framework",
    "db": "PostgreSQL",
    "search_optional": "Elasticsearch (optional for advanced segmentation queries; not required for MVP)",
    "roles": [
      "Candidate",
      "Company",
      "Agency (manages multiple companies)",
      "Platform Admin"
    ]
  },
  "integration_with_existing_email_module": {
    "hard_requirements": [
      "First step is to deeply analyze the existing email module to identify: data models, template system, sending APIs/services, provider adapters, existing UI pages, tracking (opens/clicks), unsubscribe handling, bounce handling, and RBAC/permissions.",
      "Do NOT create new overlapping models for templates or sending if existing equivalents exist. Prefer extending existing models with additive fields rather than replacing.",
      "Marketing module must call the existing email module as a dependency: e.g., MarketingCampaign -> EmailModule.send(template_id, recipients, context, metadata).",
      "Create a clear contract/interface between Marketing module and Email module: required inputs, outputs, error handling, retries, idempotency, tracking hooks.",
      "If the email module is transactional-only today, extend it minimally to support marketing needs (campaign metadata, bulk sending queues, compliance footer injection) without forking.",
      "Single source of truth for: templates, sender identities/domains, provider configuration, delivery events, and unsubscribe preferences."
    ],
    "deliverables": [
      "Email Module Audit Doc: diagrams of current architecture, model inventory, API inventory, what can be reused, what must be extended, and a 'No Overlap' decision table.",
      "Integration Plan: exact code-level integration points, adapter pattern if needed, and migration strategy."
    ],
    "no_overlap_decision_table_must_include": [
      "Templates: reuse existing vs extend",
      "Sending pipeline: reuse existing vs extend for bulk",
      "Tracking events: reuse existing vs add marketing metadata",
      "Unsubscribe/preferences: reuse existing vs add topic categories",
      "Sender identities/domains: reuse existing",
      "Admin UI: reuse existing Email pages where possible (embed/route), otherwise extend with marketing views"
    ]
  },
  "scope_modules": {
    "audience_and_segmentation": {
      "entities": [
        "People: Candidates, Company users, Agency users, Recruiters, Readers (future), Admins",
        "Accounts: Company, Agency, Platform tenant"
      ],
      "features": [
        "Consent status tracking (express/implied), source, timestamp, proof payload, region rules",
        "Suppression lists: unsubscribed, bounced, complaints, do-not-contact",
        "Segmentation: attribute filters (role, location, industry, tier) + behavior (last login, last job post, last apply, opens/clicks, coupon redeemed)",
        "Lifecycle states: Candidate and Employer lifecycle tags",
        "Saved segments (static snapshot) + Dynamic segments (auto-updating)",
        "Segment preview (estimated count) and sample recipients"
      ],
      "workflows": [
        "Create segment -> define filters -> preview -> save -> use in campaign/journey"
      ]
    },
    "campaigns_marketing_layer_only": {
      "principle": "Campaigns are orchestration + targeting + offer attachment; actual email rendering/sending is performed by the existing Email module.",
      "features": [
        "Broadcast campaigns: audience -> offer -> select existing email template -> review -> schedule/send",
        "A/B tests: subject lines, offers, template variants, send times (implemented at campaign layer; sends executed via email module)",
        "Scheduling: immediate vs scheduled; throttled sending using existing queue/worker if present",
        "Approvals: optional approval required above threshold recipient count"
      ],
      "workflows": [
        "Create broadcast -> select segment -> attach offer (coupon/credit) -> choose email template from existing module -> preview (using email module render) -> schedule -> monitor metrics"
      ]
    },
    "email_studio": {
      "rule": "Do not rebuild Email Studio if it already exists. Reuse and extend the existing Email Studio UI/pages and template system.",
      "only_if_missing": [
        "If no builder exists, add a minimal builder, but it must become part of the existing Email module (not duplicated inside Marketing).",
        "Marketing module should link to Email module for template creation/editing."
      ],
      "required_extensions_to_existing_email_module": [
        "Support campaign metadata tags on sends (campaign_id, journey_id, coupon_id) for reporting attribution",
        "Support bulk recipient lists and per-recipient personalization context payload",
        "Ensure compliance footer injection and preference center tokens are available at render time",
        "Support test sends and previews with sample recipient context"
      ]
    },
    "coupon_and_credit_engine": {
      "coupon_types": [
        "Personalized dynamic coupons (unique per recipient, generated at send-time or pre-generated pools)",
        "Smart coupon: discount codes, vouchers, gift certificates, store credits",
        "URL coupons (auto-apply via unique link) with optional preselected package/cart equivalent",
        "Store credit / wallet with ledger (partial redemptions, expiry, refunds, adjustments)",
        "Free gift coupons (job board equivalent: free boost/featured days/extra seat/free resume review)",
        "Group/role coupons (restricted by user role or membership/partner program)"
      ],
      "rules_and_controls": [
        "Eligibility rules: segments, first-time purchase, dormant X days, location, plan tier",
        "Constraints: min spend, scope to packages/products, per-user cap, one per account, max redemptions, expiry, stacking rules",
        "Priority and stacking: allow/deny stacking; deterministic order",
        "Abuse protection: velocity limits, suspicious redemption detection, identity matching",
        "Audit log + immutable ledger for credits"
      ],
      "workflows": [
        "Create coupon/credit -> define type -> rules -> publish -> issue via campaign/journey/admin grant -> redemption -> reporting"
      ]
    },
    "automations_journeys": {
      "features": [
        "Journey builder with nodes: trigger, wait, if/else branch, send email (via email module), issue coupon, issue credit, update segment/tag, webhook",
        "Triggers: signup, job posted, job expiring soon, incomplete checkout, dormant, applied to job, saved job, newsletter signup",
        "Exit conditions: converted, unsubscribed, bounced",
        "Frequency capping: no more than X marketing emails per 7 days",
        "Dry-run/simulation mode showing estimated recipients per step"
      ],
      "workflows": [
        "Create journey -> choose trigger -> add steps -> validate -> publish -> monitor -> iterate"
      ]
    },
    "landing_pages_optional_but_recommended": {
      "features": [
        "Minimal landing page builder for URL coupons: headline, benefits, CTA, package selection",
        "Auto-apply coupon state (show Discount applied ✓ and expiry)",
        "Attribution: campaign/coupon tracking from click to conversion"
      ]
    },
    "reporting_and_attribution": {
      "dashboards": [
        "Campaign KPIs: delivery, opens, clicks, conversions, unsubscribes, complaints",
        "Coupon KPIs: issued, redeemed, redemption rate, revenue lift, breakage",
        "Funnel: email -> landing -> checkout -> purchase",
        "Cohorts by segment/plan/campaign",
        "Journey performance per node and drop-off points"
      ],
      "requirements": [
        "Export CSV",
        "Filter by date range, segment, campaign, coupon",
        "Attribution window configurable (e.g., 7/14/30 days)",
        "Metrics must reuse existing email module tracking events; add only missing attribution fields"
      ]
    },
    "compliance_and_security": {
      "compliance": [
        "Preference center (topic opt-down) + hard unsubscribe",
        "CASL-ready consent tracking (express/implied) and proof",
        "CAN-SPAM: physical address + opt-out mechanism",
        "Suppression list enforcement everywhere"
      ],
      "security": [
        "RBAC: Platform Admin, Marketing Admin, Read-only Analyst",
        "Per-action permissions: create/edit/send/approve/export",
        "Rate limiting + throttles for sends and coupon redemption",
        "Audit logs for all actions"
      ]
    }
  },
  "required_admin_ux_ia": {
    "left_nav": [
      "Overview",
      "Audiences",
      "Campaigns",
      "Journeys (Automations)",
      "Coupons & Credits",
      "Reports",
      "Deliverability & Compliance",
      "Email Templates (link/route to existing Email module UI)"
    ],
    "ux_patterns": [
      "Wizard-based creation flow: Audience -> Offer -> Template (from Email module) -> Review -> Schedule",
      "Single Offer Builder used by campaigns + journeys (no duplicated rules logic)",
      "Every entity page shows: status, owner, last edited, audit log, preview",
      "Consistent shadcn components + framer-motion micro-animations",
      "Deep-link integration: Marketing module can open Email module template editor in-context (modal/route) without duplicating builder UI"
    ]
  },
  "end_to_end_build_instructions": {
    "step_0_email_module_audit_no_overlap_plan": [
      "Locate the existing email module (backend + frontend). Inventory all models, services, provider configs, templates, UI pages, and any workers/queues.",
      "Produce an Email Module Audit Doc with: (1) architecture diagram, (2) model list, (3) service/API list, (4) tracking/unsubscribe flow, (5) what to reuse as-is, (6) minimal extensions needed, (7) explicit 'NO OVERLAP' decision table.",
      "Define a strict integration contract: Marketing module calls Email module methods for rendering/sending; Email module emits delivery/tracking events with campaign/journey metadata."
    ],
    "step_1_discovery_and_audit": [
      "Analyze the existing codebase structure (Next.js + Django). Identify where admin dashboard lives, existing RBAC/auth, existing payments/packages model, and how checkout is implemented.",
      "Produce a short 'Current State vs Target State' summary and list required migrations."
    ],
    "step_2_data_model_and_migrations": [
      "Design Django models and Postgres schema ONLY for what Marketing/Coupons needs beyond the existing Email module: AudienceSegments, ConsentRecords, SuppressionEntries (if not already in Email module), Campaigns, JourneyDefinitions, JourneyRuns, CouponDefinitions, CouponInstances, CreditWallets, CreditLedger, Redemptions, AttributionLinks, AuditLogs.",
      "If templates/sends/tracking already exist in Email module, reference them via foreign keys rather than duplicating."
    ],
    "step_3_backend_apis": [
      "Create DRF endpoints for Marketing/Coupons: segments preview, campaign orchestration, journey publish/run, coupon issue/redeem, credit ledger operations, report queries.",
      "Integrate with Email module endpoints/services for: render preview, test send, bulk send, and event ingestion.",
      "Implement background execution for campaigns/journeys using the EXISTING job queue/worker approach (Celery or current). Ensure idempotency and retries."
    ],
    "step_4_email_integration_extensions": [
      "Add minimal additive fields/metadata to Email module send records (or an association table) for campaign_id, journey_id, coupon_id, segment_id.",
      "Ensure Email module supports per-recipient context payloads for personalization tokens and coupon injection.",
      "Ensure Email module enforces compliance footer and unsubscribe/preference tokens at render time (do not duplicate this logic in Marketing)."
    ],
    "step_5_frontend_admin_ui": [
      "Build Marketing admin screens with shadcn/ui + Tailwind + framer-motion.",
      "Campaign wizard must SELECT templates from the existing Email module and use Email module preview rendering.",
      "Provide deep links to template editor inside Email module; do not rebuild template editor unless missing."
    ],
    "step_6_coupon_checkout_integration": [
      "Integrate coupons/credits into existing job package checkout flow.",
      "Implement URL coupon auto-apply and confirmation UI.",
      "Enforce stacking and abuse rules; log redemptions atomically."
    ],
    "step_7_reporting_dashboards": [
      "Build dashboards for campaigns, journeys, coupons/credits, funnels, cohorts.",
      "Metrics must be derived from Email module tracking events with marketing metadata.",
      "Add CSV export and filters."
    ],
    "step_8_quality_security_and_docs": [
      "Add unit tests for rules engine, redemption, suppression, consent, and sending limits.",
      "Add integration tests for campaign orchestration -> email module send -> redemption flow.",
      "Add audit log verification and RBAC tests.",
      "Write developer docs and admin user docs, including the Email module integration contract and the no-overlap boundaries."
    ]
  },
  "acceptance_criteria": {
    "must_work_end_to_end_flows": [
      "Workflow A: Broadcast email to a segment with personalized unique coupon codes; sending performed by Email module; recipients redeem at checkout; reporting shows issued vs redeemed.",
      "Workflow B: URL coupon auto-applies discount and preselects a job package; UI shows Discount applied and expiry; tracked back to campaign.",
      "Workflow C: Store credit wallet: admin grants credit; user redeems partially; ledger is correct; reporting updates.",
      "Workflow D: Journey automation: trigger on job posted; branch if boost not purchased; send free gift offer (via Email module); exit on purchase."
    ],
    "must_have_admin_controls": [
      "RBAC enforced across UI and APIs",
      "Audit logs for all critical actions",
      "Suppression list enforcement",
      "Unsubscribe + preference center functional (must reuse Email module flow if it exists)",
      "Rate limits and approval workflow for large sends"
    ],
    "no_overlap_enforcement": [
      "No duplicate template tables if Email module already has them",
      "No duplicate sending pipeline if Email module already has it",
      "No duplicate tracking tables if Email module already has them; only add marketing attribution fields/links",
      "Marketing module must depend on Email module via a defined interface/contract"
    ],
    "performance_and_reliability": [
      "Sending pipeline supports throttling and retries with idempotency keys (via existing queue/worker)",
      "Segment preview returns quickly for large datasets (use indexed queries/materialized views if needed)",
      "Coupon redemption is atomic and safe under concurrency"
    ]
  },
  "output_requirements_from_claude_code": [
    "Email Module Audit Doc + No-Overlap Decision Table",
    "Integration Contract (code-level interface) and migration strategy",
    "Complete implementation plan with milestones and estimated effort per milestone",
    "Django models + migrations + DRF APIs (Marketing/Coupons only; reuse Email module for templates/sends)",
    "Next.js admin pages and components (Marketing UI) + deep links to Email template editor",
    "Journey builder implementation details (node schema + executor) calling Email module for sends",
    "Coupon/credit rules engine design + checkout integration",
    "Reporting dashboards derived from Email module events + marketing metadata",
    "Testing plan + initial test suite",
    "Docs: Admin user guide + Developer guide with integration boundaries"
  ],
  "style_and_product_quality_bar": [
    "Enterprise SaaS quality like Procore/HubSpot-level admin UX (clean, consistent, no clutter).",
    "Minimal friction workflows (wizard creation, reusable offers/templates).",
    "Future-proof: magazine/newsletter support without rewriting the core module."
  ],
  "instruction_to_claude": "Build this end-to-end in our existing Next.js + Django + Postgres codebase. Start with an audit of the existing email module and enforce a strict 'no overlap' boundary. Reuse the email module for templates, sending, tracking, and unsubscribe flows; only extend it minimally to support marketing attribution and bulk personalization. Then implement the full marketing/coupons system with migrations, APIs, UI, coupon/credit redemption integration, automation engine, reporting, tests, and documentation. Deliver working code paths and wired flows, not mockups."
}
