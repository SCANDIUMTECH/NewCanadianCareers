# Article / News Module — Feature List (Next.js + Django)
**Goal:** super lean, ultra premium, enterprise-grade reliability.  
**Admin model:** **Platform Admin only** (no moderator/writer roles).  
**UI stack:** TipTap editor, shadcn forms/buttons, Framer Motion (very light), **local fonts bundled in repo** (no CDN).  
**Integrations:** Existing **Banners**, **Affiliates**, **Marketing**, and **AI** modules are first-class features of this module.

---

## 1) Public Experience (Reader-Facing)

### 1.1 News Index (`/news`)
- **Featured hero slot** (0–1 featured article)
- **Latest feed** with pagination (or infinite scroll—choose one and keep consistent)
- Optional filters:
  - Category filter (lean)
  - Tag filter (optional)
  - Search (title + excerpt + tags; optional but recommended)
- **Banner placements (existing banners module)**
  - Top banner slot on index
  - Optional sidebar slot (if your layout supports it)
- **Marketing analytics hooks**
  - Page view event
  - Banner impressions/clicks
  - Optional scroll depth events (25/50/75/100%)
- Premium UX:
  - Minimal skeleton loading states
  - No layout shift (reserved image ratios + consistent card heights)

### 1.2 Article Detail (`/news/[slug]`)
- Clean reading layout optimized for long-form (max-width, spacing rhythm)
- Article meta: publish date, updated date (optional), reading time
- Cover image support (with consistent aspect ratio)
- **Inline banners injection points (existing banners module)**
  - Above content
  - After intro
  - Mid-article slots
  - End-of-article
  - Fallback banner logic when no match exists
- **Affiliate integration (existing affiliates module)**
  - Affiliate blocks/cards inserted into content (not raw ad code)
  - Outbound click tracking
  - Campaign attribution support (UTM or internal campaign id)
- Optional (keep lean):
  - Related articles (3–6 items max)
  - “Next article” navigation
  - Share: copy link (+ optional share buttons)

---

## 2) Admin Experience (Platform Admin Only)

### 2.1 Articles List (Admin)
- Tabs: Draft / Scheduled / Published / Archived (Archived optional)
- Filters:
  - Status
  - Category
  - Tags
  - Featured
  - Sponsored (optional)
  - Date range (optional)
- Search: title + slug
- Bulk actions (lean):
  - Publish
  - Schedule
  - Unpublish
  - Archive / Restore
  - Toggle featured (optional)

### 2.2 Create / Edit Article (shadcn forms)
- Fields:
  - Title
  - Slug (auto-generate + editable with collision checks)
  - Excerpt / Dek
  - Cover image upload
  - Publish controls: Draft / Scheduled / Published
  - Scheduled date/time picker
  - SEO overrides (optional): meta title, meta description, canonical, OG image override
  - Banner rules toggles (article-level sponsorship / allow inline banners)
  - Affiliate disclosure toggle (auto or manual)
- **TipTap editor** in distraction-free layout
- Draft autosave (optional but premium)
- Validation:
  - Inline errors (human-friendly)
  - Pre-publish checks: missing excerpt, missing cover/OG warnings, empty content

### 2.3 AI Writing Workflow (via existing `/admin/ai` module)
- Use the existing AI Prompts & Models infrastructure (`/admin/ai`) to power content generation
- **Pre-configured Prompts:**
  - Create standard prompts for: "Generate Article Outline", "Write Article Draft", "Summarize into Excerpt", "Suggest SEO Metadata"
  - Link these prompts directly into the TipTap editor interface as slash commands or toolbar actions
- **AI Draft & Edit Capabilities:**
  - Generate full drafts based on topic/keywords
  - Rewrite/shorten/expand selected sections in TipTap
  - Tone control (professional, editorial, etc.)
  - SEO assist (meta title/description suggestions)
- Guardrails:
  - Admin must approve and review before publish
  - Optional “AI-generated” internal flag for auditing (not public)

---

## 3) Content Model & Editorial Workflow (Core)

### 3.1 Article States
- Draft
- Scheduled
- Published
- Archived (useful to retire content without deleting)

### 3.2 Essential Article Fields
- Title
- Slug (unique)
- Excerpt
- TipTap content (stored as JSON)
- Cover image (optional)
- Featured toggle (optional)
- Category (optional)
- Tags (optional)
- Publish controls:
  - `published_at`
  - `scheduled_for`
- Computed fields:
  - Reading time
  - Word count (optional)

### 3.3 Quality & Safety Guardrails
- Link sanitation:
  - Block unsafe schemes
  - Add rel attributes as needed
- Media upload validation:
  - MIME allowlist
  - Size limits
  - Strip metadata (recommended)
- Content rules:
  - Prevent indexing of drafts/scheduled/preview
  - Canonical management to avoid duplicates

---

## 4) TipTap Editor Capabilities (Lean Set)

### 4.1 Supported Blocks / Marks
- Headings (H2/H3)
- Bold / italic / underline
- Lists (bulleted/numbered)
- Links (validated + sanitized)
- Blockquote
- Horizontal rule
- Image embed (optional, controlled upload)
- Code block (optional)

### 4.2 Embedded Commercial Blocks (First-class, not hacks)
- **Banner Slot node** (select banner placement + targeting)
- **Affiliate Card node** (select affiliate partner/product + CTA)
- Optional “CTA block” node (subscribe / newsletter / promo) if marketing module supports it

---

## 5) Integration: Banners (Existing Module)

### 5.1 Placement Support
- Index page: top banner, optional sidebar
- Article page:
  - Above content
  - After intro
  - Mid-article (1–2 slots recommended to stay lean)
  - End-of-article

### 5.2 Targeting Rules
- By category
- By tags
- By campaign (marketing module)
- Optional audience/segment targeting (only if you already support it)

### 5.3 Delivery & Tracking
- Priority ordering
- Fallback banner behavior
- Frequency caps (if your banners module supports it)
- Impression and click events routed to marketing analytics

---

## 6) Integration: Affiliates (Existing Module)

### 6.1 Affiliate Link / Block Handling
- Manual marking and insertion via TipTap node
- Optional auto-detection of known affiliate domains/params
- Per-article disclosure behavior:
  - Auto-inject disclosure at top (recommended)
  - Or place near first affiliate block

### 6.2 Tracking & Attribution
- Track outbound clicks as marketing events
- Attach to campaign id / attribution params where available

---

## 7) Integration: Marketing Module (Existing)

### 7.1 Campaign Association
- Associate article with campaign(s)
- Schedule campaign tie-ins aligned with article publish schedule

### 7.2 Events & Analytics
- Page view event
- Banner impression/click
- Affiliate click
- Optional: scroll depth milestones
- Optional: share/copy link event

### 7.3 Marketing Actions (Keep lean)
- “Send announcement email” action 
- Add article to a newsletter queue 

---

## 8) Integration: AI Module (Existing `/admin/ai`)

### 8.1 Prompt Management
- Seed dedicated `News Article` prompts in the existing AI system:
  - `article_outline_generator`
  - `article_draft_writer`
  - `article_seo_optimizer`
  - `article_excerpt_summarizer`
- Allow platform admins to tune these prompts centrally in the AI module

### 8.2 TipTap Editor Hooks
- Surface available AI prompts inside the TipTap editor UI (e.g., slash menu or floating toolbar)
- Pass current editor context (highlighted text, current title/excerpt) as variables to the AI Prompts API
- Stream AI responses directly into the editor document

---

## 9) SEO & Sharing (Premium Requirements)

- Page metadata:
  - Title, description, canonical
  - OG tags (title/description/image, article type)
  - Twitter card tags
- Structured data:
  - JSON-LD `Article` or `NewsArticle`
- Sitemap:
  - Only published articles included
- Robots:
  - Draft/scheduled/preview are never indexed
  - Preview URLs use noindex + token gating

---

## 9) Performance, Caching & Revalidation

- Cache strategy:
  - List endpoints: short TTL
  - Detail endpoints: longer TTL
- Revalidation:
  - Revalidate on publish/update/unpublish
  - Tag-based invalidation recommended (e.g., `news`, `news:slug`)
- Image performance:
  - Cover images served in responsive sizes
  - Stable aspect ratios to avoid CLS
- No heavy client-side logic on reader pages (favor SSR/RSC)

---

## 10) Typography & Visual Standard (Ultra Premium)

- **Local fonts bundled in repo**
  - Preload critical weights
  - Define clear fallback stack
  - Subsetting recommended for performance
- Spacing:
  - Consistent rhythm (8pt grid)
  - Comfortable line-height and paragraph spacing
- Motion:
  - Framer Motion used **very lightly** (subtle page transitions only)
- Components:
  - shadcn for all forms/buttons/modals/alerts
  - Consistent radii, borders, focus rings, and shadows

---

# Deliverable Checklist (What “done” looks like)

✅ **Public list + detail pages**  
- `/news` index with featured + feed, banner integration  
- `/news/[slug]` article detail with affiliate + banners blocks  

✅ **Draft/scheduled/published workflow**  
- Status transitions supported  
- Scheduled publishing works reliably  

✅ **Admin CRUD + cover upload**  
- Clean shadcn-based forms  
- TipTap editor integrated  
- Cover image upload + validation  

✅ **AI Writing Integration**
- Hook into existing `/admin/ai` prompts
- TipTap toolbar/slash commands for AI actions
- Streamed draft generation and inline editing

✅ **Preview flow**  
- Secure preview links for draft/scheduled  
- Preview never indexed  

✅ **SEO metadata + OG + JSON-LD**  
- Proper metadata + canonical  
- JSON-LD schema for articles  

✅ **Caching + revalidation**  
- Cached reads  
- Instant revalidation on publish/update  

✅ **Clean typography + premium spacing**  
- Local fonts, consistent typography system  
- Premium reading layout and spacing  
