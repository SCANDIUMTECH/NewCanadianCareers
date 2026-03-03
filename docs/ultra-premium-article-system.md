# ULTRA PREMIUM ARTICLE SYSTEM
## Combined Document: Visual System Spec + Claude Code Build Prompt + Layout Governance System

---
# PART 1 — VISUAL SYSTEM SPEC (FOR DESIGNERS)

## 1. Design Philosophy
- Editorial-first.
- Luxury whitespace.
- Structured grid discipline.
- Commercial modules feel native, not intrusive.
- Typography drives hierarchy.
- Motion is subtle and purposeful.

---

## 2. Typography System

### Font Rules
- Local fonts only (bundled in repo).
- Serif for headlines.
- Clean sans-serif for body.
- Max 2 font families total.
- No CDN usage.

### Hierarchy Scale
- H1: 48–72px
- H2: 28–36px
- H3: 20–24px
- Body: 16–18px
- Caption: 13–14px
- Pull Quote: 24–32px

### Rhythm
- 8pt spacing grid.
- 1.6–1.8 line-height body text.
- Max readable width: 680–760px.

---

## 3. Grid System
- 12-column responsive grid.
- Content width max: 1200px.
- Article text spans 6–8 columns.
- Sidebar spans 4–5 columns.

---

## 4. Color System
- Neutral base palette.
- One optional accent per article.
- Commercial modules inherit article palette.

---

## 5. Motion System
- Subtle fade transitions only.
- No heavy animations.
- No scroll hijacking.

---

## 6. Commercial Placement Rules

### Banner Zones
- HERO_TOP
- AFTER_INTRO
- MID_ARTICLE
- BEFORE_CONCLUSION
- FOOTER

### Affiliate Zones
- INLINE_CARD
- SIDEBAR_MODULE
- END_RECOMMENDATIONS
- INLINE_CONTEXTUAL_LINK

### Styling Rules
- Soft background containers.
- Subtle borders.
- Max 2 banners per article (default).
- Max 3 affiliate blocks per article.

---
# PART 2 — 6 ARTICLE LAYOUT TEMPLATES

## TEMPLATE 01 — Editorial Hero Spread
- Large headline hero.
- Full-width cover image.
- Centered body column.
- Banner: AFTER_INTRO, MID_ARTICLE.
- Affiliate: Inline elegant card.

## TEMPLATE 02 — Split Magazine Spread
- 50/50 hero split image/text.
- Two-column body.
- Pull quotes.
- Banner: Full-width break section.
- Affiliate: Sidebar card.

## TEMPLATE 03 — Minimal Luxury
- Centered title page.
- Narrow single column.
- Banner: Single mid-article.
- Affiliate: Curated block.

## TEMPLATE 04 — Bold Typography Feature
- Oversized typography opening.
- Multi-column grid.
- Banner: Full-width grid span.
- Affiliate: Dedicated right column module.

## TEMPLATE 05 — Image-Led Immersive
- Full-bleed hero image.
- Alternating image/text blocks.
- Banner: Between image sections.
- Affiliate: End-of-article list.

## TEMPLATE 06 — Modern News Grid
- Structured modular layout.
- 12-column system.
- Geometric accents.
- Banner: 12-column span.
- Affiliate: Sidebar grid module.

---
# PART 3 — CLAUDE CODE BUILD INSTRUCTION PROMPT

You are building an Ultra Premium Article/News Module using:

Frontend:
- Next.js (App Router)
- shadcn components
- TipTap editor
- Framer Motion (minimal)
- Local fonts only

Backend:
- Django + DRF
- PostgreSQL

Requirements:
1. Implement 6 layout templates selectable per article.
2. Store selected_template in article model.
3. Integrate existing banner system via defined placement zones.
4. Integrate affiliate module via structured content nodes.
5. Support draft, scheduled, published states.
6. Implement secure preview with token.
7. Add SEO metadata + JSON-LD Article schema.
8. Implement tag-based revalidation.
9. Ensure no layout shift.
10. Enforce typography and spacing tokens globally.

All commercial blocks must use structured components.
No raw ad HTML allowed.

---
# PART 4 — STRICT LAYOUT GOVERNANCE SYSTEM

## Immutable Tokens
- Typography scale locked.
- Spacing scale locked.
- Color tokens centralized.

## Template Integrity
- Templates cannot be edited per article.
- Admin selects template only.
- No per-article CSS overrides.

## Commercial Limits
- Max 2 banners default.
- Max 3 affiliate modules.
- No consecutive banners.

## Editorial Safety
- No publish without title, excerpt, OG image.
- Noindex for draft/scheduled/preview.

## Performance Standard
- Lighthouse performance target > 90.
- SSR-first rendering.
- No heavy client rendering.

## Change Control
- Any layout change requires version bump.
- Design system documentation update mandatory.

---
# COMPLETION CRITERIA

✓ 6 layout templates implemented  
✓ Banner + affiliate placements integrated  
✓ Admin template selector working  
✓ SEO + JSON-LD active  
✓ Revalidation working  
✓ Governance enforced  

END OF DOCUMENT
