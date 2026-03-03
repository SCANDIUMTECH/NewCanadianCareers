Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Full CRUD for Retention Rules & Legal Documents

 Context

 The Compliance page's Retention Rules and Privacy Policies tabs are static demo data — a hardcoded array of 6 rules and 4 non-functional policy cards. Need real
 database-backed CRUD for both, following existing Orion admin patterns (Banners, Articles).

 ---
 New Backend Models — backend/apps/moderation/models.py

 RetentionRule

 ┌──────────────────┬──────────────────────┬────────────────────────────────────┐
 │      Field       │         Type         │               Notes                │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ category         │ CharField(100)       │ e.g. "Candidate Profiles"          │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ description      │ TextField            │ e.g. "3 years after last activity" │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ retention_days   │ PositiveIntegerField │ Actual days (1095 = 3 years)       │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ is_deletable     │ BooleanField         │ Whether users can request deletion │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ is_active        │ BooleanField         │ Default True                       │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ enforcement      │ CharField choices    │ manual / automated / legal_hold    │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ legal_basis      │ CharField(200)       │ e.g. "GDPR Article 5(1)(e)"        │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ sort_order       │ PositiveIntegerField │ Display ordering                   │
 ├──────────────────┼──────────────────────┼────────────────────────────────────┤
 │ + TimestampMixin │                      │ created_at, updated_at             │
 └──────────────────┴──────────────────────┴────────────────────────────────────┘

 db_table = 'retention_rules', ordering = ['sort_order', 'category']

 LegalDocument

 ┌──────────────────┬────────────────────────┬──────────────────────────────────────────────────────────────────────────────────┐
 │      Field       │          Type          │                                      Notes                                       │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ title            │ CharField(200)         │ e.g. "Privacy Policy"                                                            │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ slug             │ SlugField unique       │ Auto-generated from title                                                        │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ document_type    │ CharField choices      │ privacy_policy / terms_of_service / cookie_policy / dpa / acceptable_use / other │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ content          │ TextField              │ TipTap HTML content                                                              │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ status           │ CharField choices      │ draft / published / archived                                                     │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ version          │ CharField(20)          │ e.g. "1.0"                                                                       │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ published_at     │ DateTimeField nullable │                                                                                  │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ effective_date   │ DateField nullable     │                                                                                  │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ last_reviewed_at │ DateTimeField nullable │                                                                                  │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ reviewed_by      │ FK → User nullable     │                                                                                  │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ public_url       │ URLField blank         │ External URL override                                                            │
 ├──────────────────┼────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ + TimestampMixin │                        │ created_at, updated_at                                                           │
 └──────────────────┴────────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘

 db_table = 'legal_documents', ordering = ['-updated_at'], auto-slug in save()

 ---
 Backend Serializers — backend/apps/moderation/serializers.py

 - RetentionRuleSerializer — simple ModelSerializer, all fields, read_only timestamps
 - LegalDocumentSerializer — ModelSerializer + reviewed_by_name method field (source='reviewed_by.get_full_name'), slug read-only

 Backend ViewSets — backend/apps/moderation/views.py

 AdminRetentionRuleViewSet (ModelViewSet)
 - pagination_class = None (always small set)
 - filterset_fields = ['enforcement', 'is_active']
 - search_fields = ['category', 'description']

 AdminLegalDocumentViewSet (ModelViewSet)
 - pagination_class = None
 - filterset_fields = ['document_type', 'status']
 - search_fields = ['title']
 - @action publish — sets status='published', published_at=now, reviewed_by=request.user
 - @action archive — sets status='archived'

 Backend URLs — backend/apps/moderation/urls.py

 router.register(r'compliance/retention-rules', ...)
 router.register(r'compliance/legal-documents', ...)

 Migrations

 1. 0016 — makemigrations for both new models
 2. 0017 — seed migration with RunPython: 6 retention rules + 4 legal documents (matching current static data)

 ---
 Frontend Types — lib/admin/types.ts

 Add RetentionRule, CreateRetentionRuleData, UpdateRetentionRuleData, LegalDocument, CreateLegalDocumentData, UpdateLegalDocumentData interfaces.

 Frontend API — lib/api/admin-compliance.ts

 Add CRUD functions for both resources:
 - getRetentionRules() → RetentionRule[] (no pagination)
 - createRetentionRule(), updateRetentionRule(), deleteRetentionRule()
 - getLegalDocuments() → LegalDocument[] (no pagination)
 - getLegalDocument(id), createLegalDocument(), updateLegalDocument(), deleteLegalDocument()
 - publishLegalDocument(id), archiveLegalDocument(id)

 Frontend Compliance Page — app/admin/compliance/page.tsx

 Retention Rules tab (rewrite)

 - Remove hardcoded retentionRules array
 - Fetch from API on tab activation (lazy load)
 - "Add Rule" button → opens create/edit Dialog with form fields
 - Each rule row: category, description, retention badge, enforcement badge, is_deletable badge, Edit/Delete dropdown
 - Edit → same Dialog pre-filled
 - Delete → confirmation Dialog

 Privacy Policies tab (rewrite)

 - Fetch legal documents from API on tab activation
 - "New Document" button → links to /admin/compliance/documents/new
 - Card grid: title, type badge, status badge, version, dates
 - View → Dialog with read-only content display
 - Edit → links to /admin/compliance/documents/{id}/edit
 - Publish/Archive/Delete actions in dropdown

 New Pages

 app/admin/compliance/documents/new/page.tsx
 - Two-column layout: TipTap editor (left) + metadata sidebar (right)
 - Fields: title, content (ArticleTiptapEditor), document_type, version, effective_date, public_url
 - Save Draft / Save & Publish buttons
 - Reuses components/articles/article-tiptap-editor.tsx

 app/admin/compliance/documents/[id]/edit/page.tsx
 - Same layout, fetches existing document on mount
 - Additional Publish/Archive buttons based on current status

 ---
 Files Modified/Created

 ┌───────────────────────────────────────────────────┬─────────────────────────┐
 │                       File                        │         Action          │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/moderation/models.py                 │ Add 2 models            │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/moderation/serializers.py            │ Add 2 serializers       │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/moderation/views.py                  │ Add 2 viewsets          │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/moderation/urls.py                   │ Register 2 routes       │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/moderation/migrations/0016_*.py      │ Schema migration (auto) │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ backend/apps/moderation/migrations/0017_*.py      │ Seed data migration     │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ lib/admin/types.ts                                │ Add type definitions    │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ lib/api/admin-compliance.ts                       │ Add CRUD functions      │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/compliance/page.tsx                     │ Rewrite both tabs       │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/compliance/documents/new/page.tsx       │ New create page         │
 ├───────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/compliance/documents/[id]/edit/page.tsx │ New edit page           │
 └───────────────────────────────────────────────────┴─────────────────────────┘