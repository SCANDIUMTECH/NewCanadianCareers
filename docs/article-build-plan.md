Article/News Module — Fullstack Implementation Plan

 Context

 Orion needs an editorial content system for publishing news, insights, and career advice. The module is platform admin only — no
 writer/moderator roles. It integrates with existing banners, affiliates, marketing, and AI modules. Articles support 6 selectable layout
 templates for ultra-premium editorial presentation (per the reference image showing magazine-style spreads). Content is authored via
 TipTap rich text editor.

 Key specs: docs/article-news-module-feature-list.md + docs/ultra-premium-article-system.md

 ---
 Phase 1: Backend — Django App (backend/apps/articles/)

 1.1 Create app scaffold

 New files:
 backend/apps/articles/
   __init__.py
   apps.py          → ArticlesConfig (name='apps.articles')
   models.py        → ArticleCategory, Article, ArticleView
   serializers.py   → 7 serializer classes
   views.py         → PublicArticleViewSet, AdminArticleViewSet, AdminArticleCategoryViewSet
   tasks.py         → publish_due_scheduled_articles
   urls.py          → public router
   admin.py         → Django admin registrations
   migrations/__init__.py

 1.2 Models (models.py)

 ArticleCategory — TimestampMixin, fields: name, slug, description, sort_order, is_active. Table: article_categories.

 Article — TimestampMixin + SoftDeleteMixin, SoftDeleteManager. Key fields:
 - article_id — CharField(10), unique, generated via generate_entity_id() from core.utils
 - title, slug (unique, auto-generated from title with collision check)
 - excerpt (TextField, max 500), content (TextField — TipTap JSON as string)
 - cover_image (ImageField, upload_to='articles/'), og_image (ImageField, upload_to='articles/og/')
 - author (FK to User, SET_NULL), category (FK to ArticleCategory, SET_NULL)
 - tags (JSONField, default=list)
 - status — choices: draft, scheduled, published, archived (default: draft)
 - featured (BooleanField), selected_template — choices for 6 templates: editorial_hero, split_magazine, minimal_luxury, bold_typography,
 image_led, modern_grid
 - published_at, scheduled_publish_at (DateTimeFields, nullable)
 - reading_time (PositiveSmallIntegerField, computed in save() from word count at 220 wpm)
 - views, unique_views (PositiveIntegerField)
 - meta_title (max 70), meta_description (max 160), canonical_url (URLField)
 - allow_inline_banners (bool, default True), affiliate_disclosure (auto/manual/none), sponsored_by (CharField)
 - preview_token (UUIDField, unique), preview_expires_at (DateTimeField, nullable)
 - State-transition methods: publish(), schedule(), unpublish(), archive(), feature(), unfeature()
 - Table: articles, indexes on: (status, published_at), (status, scheduled_publish_at), (featured, status), (category, status),
 (deleted_at)

 ArticleView — view tracking model for unique visitor deduplication (mirrors JobView pattern). Fields: article (FK), visitor_id, user (FK
 nullable), ip_address, user_agent, referrer, created_at. Table: article_views.

 Helper: _extract_text_from_tiptap(node) — recursively extracts plain text from TipTap JSON for reading time calculation.

 1.3 Serializers (serializers.py)

 ┌───────────────────────────────┬──────────────────┬──────────────────────────────────────────────────────────────────────────────────┐
 │          Serializer           │     Purpose      │                                    Key fields                                    │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ ArticleCategorySerializer     │ Shared           │ + article_count (SerializerMethodField)                                          │
 │                               │ public+admin     │                                                                                  │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ PublicArticleListSerializer   │ Public feed      │ title, slug, excerpt, cover_image, author_name, category_name/slug, tags,        │
 │                               │                  │ published_at, reading_time, views                                                │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ PublicArticleDetailSerializer │ Public detail    │ extends list + content, category (nested), SEO fields, commercial flags,         │
 │                               │                  │ updated_at                                                                       │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ AdminArticleListSerializer    │ Admin table      │ all public list fields + author_email, scheduled_publish_at, deleted_at          │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ AdminArticleDetailSerializer  │ Admin            │ extends admin list + content, cover_image, og_image, SEO fields, preview_token   │
 │                               │ detail/edit      │                                                                                  │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ AdminArticleCreateSerializer  │ Admin create     │ write fields, validates scheduled_publish_at > now, auto-assigns author          │
 ├───────────────────────────────┼──────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ AdminArticleUpdateSerializer  │ Admin update     │ write fields except status (status changes via @actions only)                    │
 └───────────────────────────────┴──────────────────┴──────────────────────────────────────────────────────────────────────────────────┘

 1.4 Views (views.py)

 PublicArticleViewSet (ReadOnlyModelViewSet, AllowAny):
 - lookup_field = 'slug', queryset: status='published'
 - retrieve() — view tracking with 24h unique dedup (same pattern as PublicJobViewSet)
 - @action categories — GET /api/articles/categories/
 - @action featured — GET /api/articles/featured/ (top 6)
 - @action preview — GET /api/articles/{slug}/preview/{token}/ (token-gated, any status)

 AdminArticleViewSet (ModelViewSet, IsAdmin):
 - Default pk lookup, supports ?trash=true for soft-deleted
 - State-transition @actions: publish, unpublish, schedule (takes publish_at), archive, feature, unfeature
 - @action regenerate_preview_token, @action stats (daily view aggregation)

 AdminArticleCategoryViewSet (ModelViewSet, IsAdmin): CRUD for categories.

 1.5 URLs & Registration

 apps/articles/urls.py: DefaultRouter registering PublicArticleViewSet at r''

 config/urls.py: Add path('api/articles/', include('apps.articles.urls')) after api/candidates/

 apps/moderation/urls.py: Register admin ViewSets:
 router.register(r'articles', AdminArticleViewSet, basename='admin-articles')
 router.register(r'article-categories', AdminArticleCategoryViewSet, basename='admin-article-categories')

 config/settings/base.py: Add 'apps.articles' to INSTALLED_APPS, add publish-due-scheduled-articles task to CELERY_BEAT_SCHEDULE (every 5
 min).

 1.6 Celery Task (tasks.py)

 publish_due_scheduled_articles — mirrors publish_due_scheduled_jobs exactly: fetch overdue IDs → per-item
 select_for_update(skip_locked=True) → set status=published, published_at, clear scheduled_publish_at.

 1.7 Verify backend

 cd backend && docker-compose exec web python manage.py makemigrations articles
 cd backend && docker-compose exec web python manage.py migrate
 curl -s http://localhost/api/articles/ | python3 -m json.tool
 curl -s -H "Authorization: Bearer <token>" http://localhost/api/admin/articles/ | python3 -m json.tool

 ---
 Phase 2: Frontend Types & API Layer

 2.1 Types — append to lib/admin/types.ts

 - ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived'
 - ArticleTemplate = 'editorial_hero' | 'split_magazine' | 'minimal_luxury' | 'bold_typography' | 'image_led' | 'modern_grid'
 - AdminArticle — list item type (id, article_id, title, slug, excerpt, cover_image, author_name, category_name, tags, status, featured,
 selected_template, published_at, scheduled_publish_at, reading_time, views)
 - AdminArticleDetail extends AdminArticle — + content, og_image, SEO fields, preview_token, commercial flags
 - AdminArticleStats — total, draft, scheduled, published, archived, total_views
 - AdminArticleFilters — search, status, category, featured, page, page_size, ordering
 - CreateArticleData, UpdateArticleData
 - PublicArticle, PublicArticleDetail — public-facing variants

 2.2 API modules

 lib/api/admin-articles.ts (new) — Pattern: lib/api/admin-jobs.ts
 - getAdminArticles(filters), getAdminArticle(id), getAdminArticleStats()
 - createArticle(data), updateArticle(id, data), deleteArticle(id)
 - publishArticle(id), unpublishArticle(id), scheduleArticle(id, publishAt), archiveArticle(id)
 - featureArticle(id), unfeatureArticle(id), regeneratePreviewToken(id)
 - getArticleCategories(), createArticleCategory(), updateArticleCategory(), deleteArticleCategory()

 lib/api/articles.ts (new) — Public read-only
 - getPublicArticles(filters), getPublicArticle(slug), getFeaturedArticles(), getArticleCategories()

 ---
 Phase 3: Admin Articles Page — app/admin/articles/page.tsx

 Pattern: mirrors app/admin/jobs/page.tsx exactly.

 - Suspense wrapper + "use client" ArticlesContent component
 - Header: Gradient icon (Newspaper, from-violet-500 to-purple-600), title "Articles", subtitle, [Refresh] + [New Article →
 /admin/articles/new] buttons
 - Stats cards grid (4 cards): Total, Published, Drafts, Scheduled
 - Status tabs: All | Draft | Scheduled | Published | Archived
 - Filter bar: Search + Category dropdown + Template dropdown + Sort
 - Table: CSS grid with columns: Checkbox | Title+excerpt | Category | Template | Status badge | Views | Published date | Actions dropdown
 (Edit, View, Publish, Archive, Delete)
 - Bulk actions bar (AnimatePresence): Delete selected, Archive selected
 - Pagination: Same ChevronLeft/Right pattern
 - Framer Motion: containerVariants/itemVariants with [0.22, 1, 0.36, 1] easing

 Admin nav entry — app/admin/layout.tsx

 Add to distribution array:
 { name: "Articles", href: "/admin/articles", icon: Newspaper, gradient: "from-violet-500 to-purple-600" },
 Import Newspaper from lucide-react.

 ---
 Phase 4: Admin Article Editor — Full-page create/edit

 Why full-page (not Dialog): Articles have 15+ fields + a TipTap editor needing 600px+ height. Dialog can't accommodate this.

 4.1 app/admin/articles/new/page.tsx — Create

 Two-column layout within admin shell:

 Left column (8/12) — Editor area:
 - Back button → /admin/articles
 - Title input (large text, text-2xl font-bold)
 - Slug input with auto-generate from title
 - Excerpt textarea (3 rows)
 - ArticleTiptapEditor (enhanced TipTap, minHeight 600)

 Right sidebar (4/12) — Controls (sticky):
 - Publishing card: Status select, DatePicker for scheduled_at (shown when status=scheduled), [Save Draft] + [Publish] buttons
 - Media card: Cover image upload/URL + preview thumbnail
 - Template card: 6 visual selectors with small inline SVG layout thumbnails, radio-group selection, selected state: ring-2 ring-primary
 - Categorization card: Category select/create, Tags input (comma-separated → Badge pills)
 - SEO card (Collapsible): meta_title, meta_description, og_image
 - Commercial card: Switch for allow_inline_banners, Switch for affiliate_disclosure
 - Featured card: Switch for is_featured

 4.2 app/admin/articles/[id]/edit/page.tsx — Edit

 Same layout as create. On mount: fetches getAdminArticle(id) and populates form. Additional "Performance" read-only card with view count.

 4.3 components/articles/article-tiptap-editor.tsx — Enhanced TipTap

 Extends the base components/ui/tiptap-editor.tsx pattern with additional extensions for long-form:
 - StarterKit configured with heading: { levels: [2, 3, 4] }
 - Link, Placeholder, Image (new extension — needs @tiptap/extension-image install)
 - Extended toolbar: [H2|H3] | [Bold|Italic] | [BulletList|OrderedList] | [Blockquote|HR|CodeBlock] | [Link|Image] | [Undo|Redo]
 - Prose classes: prose-headings:font-secondary prose-h2:text-2xl prose-h3:text-xl prose-blockquote:border-l-4
 prose-blockquote:border-primary/30
 - minHeight default: 500px

 ---
 Phase 5: Public Pages

 5.1 /news — News Index (app/news/page.tsx + app/news/news-index-client.tsx)

 Server component (page.tsx): export const metadata + Suspense wrapper

 Client component (news-index-client.tsx): Pattern from app/jobs/jobs-search-client.tsx
 - Sticky glassmorphism header: "News & Insights" + count badge + search input
 - Featured hero section: ArticleCard variant="featured" (full-width, large, shown when no active search)
 - Filter bar: Category tabs + Tag filter + Sort select
 - Article grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 with ArticleCard variant="default"
 - Pagination
 - Skeleton loading states (3 cards)
 - Empty state

 5.2 /news/[slug] — Article Detail (app/news/[slug]/page.tsx + article-detail-client.tsx)

 Server component (page.tsx): Pattern from app/jobs/[id]/page.tsx
 - cache() + getPublicArticle(slug)
 - generateMetadata(): title, description, OG (type: 'article'), Twitter card, canonical, noindex for non-published
 - ArticleJsonLd + BreadcrumbJsonLd components
 - notFound() on missing

 Client component (article-detail-client.tsx):
 - Resolves template via TEMPLATE_COMPONENTS[article.selected_template]
 - Fetches related articles via separate API call
 - Share floating pill (Web Share API → fallback copy URL)
 - Renders the selected template component

 ---
 Phase 6: 6 Layout Template Components

 All in components/articles/templates/. Each receives ArticleTemplateProps (article, bannerSlots?, affiliateSlots?, relatedArticles?).

 Barrel: components/articles/templates/index.ts exports TEMPLATE_COMPONENTS map (Record<ArticleTemplate, ComponentType>).

 ┌─────┬────────────────────┬─────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
 │  #  │      Template      │          File           │                               Layout Description                               │
 ├─────┼────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
 │ 1   │ Editorial Hero     │ editorial-hero.tsx      │ Full-width cover image → centered body column (max-w-720px) → Manrope H1 at    │
 │     │                    │                         │ 48-60px                                                                        │
 ├─────┼────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
 │ 2   │ Split Magazine     │ split-magazine.tsx      │ 50/50 hero (image left, text right) → 2-col body (sticky sidebar + main) →     │
 │     │                    │                         │ pull quotes                                                                    │
 ├─────┼────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
 │ 3   │ Minimal Luxury     │ minimal-luxury.tsx      │ Centered title, narrow single column (max-w-680px), generous whitespace, pt-32 │
 ├─────┼────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
 │ 4   │ Bold Typography    │ bold-typography.tsx     │ Oversized H1 (text-7xl+), CSS multi-column body layout                         │
 ├─────┼────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
 │ 5   │ Image-Led          │ image-led-immersive.tsx │ Full-bleed min-h-screen hero with title overlay → alternating image/text       │
 │     │ Immersive          │                         │ sections                                                                       │
 ├─────┼────────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
 │ 6   │ Modern News Grid   │ modern-grid.tsx         │ 12-column grid, main (8-col) + sidebar (4-col), structured modular layout      │
 └─────┴────────────────────┴─────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

 Template typography tokens (consistent across all):

 - H1: font-secondary text-5xl md:text-6xl font-black tracking-tight leading-[1.08]
 - Body: prose prose-lg max-w-none (Inter 18px, line-height 1.6-1.8)
 - Pull quotes: text-2xl italic font-secondary border-l-4 border-primary pl-6
 - Captions: text-sm text-muted-foreground
 - Max readable width: 680-760px depending on template
 - 8pt spacing grid via Tailwind spacing scale

 Banner injection strategy:

 Templates receive bannerSlots as Partial<Record<BannerZone, ReactNode>>. Each template renders the slot at its designated position. The
 detail client page fetches banner data and builds ReactNode components to pass in. For MVP, banner slots render as styled placeholder
 containers.

 ---
 Phase 7: Supporting Components

 components/articles/article-card.tsx

 - Props: article: PublicArticle, variant: 'default' | 'featured' | 'compact'
 - featured: Large hero card, cover image top, title text-2xl, full excerpt
 - default: Standard card, 16:9 cover image, title text-lg, 2-line excerpt truncated
 - compact: Horizontal (image left, text right), no excerpt
 - All link to /news/[slug], show: category Badge, reading time, published date, author

 components/seo/article-schema.tsx

 - ArticleJsonLd component — @type: "Article", headline, description, image, datePublished, dateModified, author (Person), publisher
 (Organization), url, keywords, articleSection, timeRequired
 - Pattern: matches existing JobPostingJsonLd

 ---
 Phase 8: Package Dependencies

 Install TipTap Image extension:
 pnpm add @tiptap/extension-image

 No other new dependencies needed — StarterKit already includes headings, blockquote, code-block, horizontal-rule.

 ---
 Build Order

 1. Backend: Create apps/articles/ scaffold → models → serializers → views → urls → tasks → admin.py → register in settings/urls → migrate
 → verify with curl
 2. Frontend types: Add article types to lib/admin/types.ts
 3. Frontend API: Create lib/api/admin-articles.ts + lib/api/articles.ts
 4. SEO component: Create components/seo/article-schema.tsx
 5. Enhanced TipTap: Create components/articles/article-tiptap-editor.tsx
 6. Article card: Create components/articles/article-card.tsx
 7. Admin list page: Create app/admin/articles/page.tsx + add nav entry to layout
 8. Admin editor pages: Create app/admin/articles/new/page.tsx + app/admin/articles/[id]/edit/page.tsx
 9. 6 templates: Create components/articles/templates/ (all 6 + barrel + types)
 10. Public news index: Create app/news/page.tsx + news-index-client.tsx
 11. Public article detail: Create app/news/[slug]/page.tsx + article-detail-client.tsx
 12. Verify: npm run build must pass

 ---
 Critical Files to Modify (existing)

 ┌─────────────────────────────────┬─────────────────────────────────────────────────────────────┐
 │              File               │                           Change                            │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────┤
 │ backend/config/settings/base.py │ Add 'apps.articles' to INSTALLED_APPS, add Celery beat task │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────┤
 │ backend/config/urls.py          │ Add path('api/articles/', include('apps.articles.urls'))    │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────┤
 │ backend/apps/moderation/urls.py │ Register 2 admin ViewSets + imports                         │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────┤
 │ app/admin/layout.tsx            │ Add "Articles" nav entry + import Newspaper icon            │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────┤
 │ lib/admin/types.ts              │ Append article type definitions                             │
 └─────────────────────────────────┴─────────────────────────────────────────────────────────────┘

 Critical Files to Reference (patterns)

 ┌─────────────────────┬─────────────────────────────────────────────────────┐
 │       Pattern       │                        File                         │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ Model + mixins      │ backend/apps/jobs/models.py, backend/core/mixins.py │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ Serializers         │ backend/apps/jobs/serializers.py                    │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ Views + @actions    │ backend/apps/jobs/views.py                          │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ Celery tasks        │ backend/apps/jobs/tasks.py                          │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ Admin list page     │ app/admin/jobs/page.tsx                             │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ Public detail + SEO │ app/jobs/[id]/page.tsx                              │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ TipTap editor       │ components/ui/tiptap-editor.tsx                     │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ JSON-LD component   │ components/seo/job-posting-schema.tsx               │
 ├─────────────────────┼─────────────────────────────────────────────────────┤
 │ API module          │ lib/api/admin-jobs.ts                               │
 └─────────────────────┴─────────────────────────────────────────────────────┘

 ---
 Verification

 1. Backend: docker-compose exec web python manage.py migrate succeeds
 2. Backend: curl http://localhost/api/articles/ returns empty paginated list
 3. Backend: Create article via admin API → verify publish/schedule/archive actions
 4. Frontend: npm run build passes with zero TypeScript errors
 5. Frontend: /admin/articles loads with empty state
 6. Frontend: Create article via admin editor → verify it appears in /news
 7. Frontend: /news/[slug] renders correct template based on selected_template
 8. SEO: Check page source for JSON-LD Article schema + correct OG tags