Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Banner Editor: Enterprise Full-Page with Live Placement Preview

 Context

 The current "Add/Edit Banner" dialog (app/admin/banners/page.tsx lines 563-723) overflows the
 screen — it crams image upload, 6 form fields, date pickers, and performance stats into a
 max-w-2xl Radix Dialog with no scroll container. The admin has zero visual context for how the
 banner will actually appear on the site.

 Goal: Replace the dialog with a full-page, split-screen editor featuring enterprise-grade UX:
 visual placement selection, live page-context preview inside a device frame, real-time
 form-to-preview binding, and proper image upload guidance. Follow patterns from Google Ads, Meta
 Business Suite, and Mailchimp's editor.

 Auth is already handled — all /admin/* pages inherit RequireRole(['admin']) from the admin
 layout.

 ---
 Architecture Overview

 app/admin/banners/
   page.tsx                          ← MODIFY: remove dialog, link to sub-pages
   new/page.tsx                      ← NEW: full-page create editor
   new/loading.tsx                   ← NEW
   [id]/edit/page.tsx                ← NEW: full-page edit editor
   [id]/edit/loading.tsx             ← NEW

 components/admin/banners/
   banner-editor.tsx                 ← NEW: shared editor layout (header + split panels)
   banner-form.tsx                   ← NEW: form panel (left side)
   placement-selector.tsx            ← NEW: visual card-based placement picker
   banner-preview-panel.tsx          ← NEW: preview panel with device frame (right side)
   device-frame.tsx                  ← NEW: browser-chrome mockup wrapper
   placement-mockups/
     homepage-mockup.tsx             ← NEW: homepage page mockup
     search-page-mockup.tsx          ← NEW: search page mockup (top + sidebar zones)
     job-detail-mockup.tsx           ← NEW: job detail page mockup

 ---
 Design Decisions (Enterprise Best Practices)

 1. Visual Placement Selector (not a dropdown)

 Replace the <Select> dropdown with 4 selectable cards in a 2x2 grid. Each card contains:
 - A mini wireframe sketch showing the page layout with the banner zone highlighted in primary
 color
 - Placement name + recommended dimensions as subtext
 - Radio-style selection (ring highlight on selected card, subtle hover on others)
 - Badge for context: "Full-width", "Sidebar", etc.

 This follows Meta Business Suite's placement picker and Salt Design System's selectable card
 pattern. Admin instantly understands where the banner goes without mental mapping from text
 labels.

 2. Device-Frame Preview

 The right panel renders the live preview inside a browser chrome mockup — a rounded card with a
 fake URL bar showing the page path (e.g., orion.com, orion.com/jobs,
 orion.com/jobs/product-designer). This gives realistic context like WordPress Customizer and
 Mailchimp's preview.

 The frame contains:
 - A gray toolbar with dots (traffic lights) + the page URL text
 - The scaled page mockup inside, with the banner rendered using the user's actual image
 - The banner zone highlighted with a subtle pulsing ring + "Your banner" annotation label

 3. Responsive Preview Toggle

 Above the device frame, a Desktop / Tablet / Mobile button group lets the admin see how the
 banner appears across breakpoints. On mobile, sidebar placements (search_sidebar, job_detail)
 show a "Hidden on mobile" indicator since they're hidden lg:block in the actual site.

 4. Image Upload with Placement-Aware Guidance

 Below the upload zone, show a context-aware info bar with recommended dimensions based on the
 selected placement:
 - Homepage: "Recommended: 1400×350px (4:1 ratio, full-width)"
 - Search Top: "Recommended: 1200×300px (4:1 ratio, content-width)"
 - Search Sidebar: "Recommended: 288×72px (4:1 ratio, sidebar)"
 - Job Detail: "Recommended: 320×80px (4:1 ratio, sidebar)"

 If uploaded image dimensions don't match the 4:1 ratio, show a soft amber warning (not blocking).

 5. Progressive Disclosure

 Group form into clear sections. Schedule + Advanced settings collapsed by default with a
 Collapsible trigger. Core fields (image, title, URL, placement) always visible. This reduces
 cognitive load — most banners just need image + title + URL + placement.

 6. Split-Screen Layout

 40/60 split — form left (5 cols), preview right (7 cols). Form panel scrolls independently.
 Preview panel is sticky so it's always visible. This gives the preview enough horizontal space to
  render page mockups legibly while keeping the form comfortable.

 ---
 Detailed Component Specs

 components/admin/banners/banner-editor.tsx

 Shared layout wrapper used by both new and edit pages.

 Props:
   mode: "create" | "edit"
   initialData?: SponsoredBanner     // pre-fill for edit mode
   onSave: (data: CreateBannerData) => Promise<void>
   saving: boolean
   stats?: { impressions, clicks, ctr }  // edit mode only

 Layout structure:
 <div className="min-h-screen flex flex-col">
   {/* Sticky Header */}
   <header> Back arrow + title + Cancel/Save buttons </header>

   {/* Split Panels */}
   <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
     {/* Left: Form (scrollable) */}
     <div className="lg:col-span-5 border-r overflow-y-auto p-6">
       <BannerForm ... />
     </div>

     {/* Right: Preview (sticky) */}
     <div className="lg:col-span-7 bg-muted/30 overflow-y-auto p-6">
       <BannerPreviewPanel ... />
     </div>
   </div>
 </div>

 Owns all form state (useState pattern, matching existing banner page convention). Passes state
 down to BannerForm and BannerPreviewPanel as props. Handles blob URL lifecycle (revoke on
 unmount).

 components/admin/banners/banner-form.tsx

 Pure presentational. Receives form values + onChange callbacks.

 Sections (top to bottom, single-column):
 1. Image — Upload zone (drag-and-drop with dashed border) OR URL input (tab toggle). Inline
 preview at aspect-[4/1]. Placement-aware dimension guidance below.
 2. Details — Title (with helper text "Used for internal reference and sponsored label"), Target
 URL, Sponsor
 3. Placement — <PlacementSelector /> (visual cards, see below)
 4. Schedule & Settings — Wrapped in Collapsible, collapsed by default. Contains: Start Date, End
 Date, Active toggle.
 5. Performance — (edit mode only) Read-only stats: Impressions, Clicks, CTR in a 3-col grid.

 components/admin/banners/placement-selector.tsx

 2x2 grid of selectable cards. Each card:

 ┌─────────────────────────┐
 │  ┌───────────────────┐  │
 │  │   Mini wireframe  │  │  ← Tiny SVG/div representation of the page
 │  │   with [█████]    │  │  ← Banner zone highlighted in primary
 │  │   banner zone     │  │
 │  └───────────────────┘  │
 │                         │
 │  Homepage       ● ←radio│
 │  Full-width · 4:1       │
 └─────────────────────────┘

 Selected card: ring-2 ring-primary bg-primary/5 border-primary/20
 Hover: hover:border-primary/30 hover:bg-muted/50
 Default: border-border bg-card

 Mini wireframes are small div compositions with bg-muted blocks to represent page regions, and a
 bg-primary/20 border border-primary/40 block for the banner zone. Not images — pure Tailwind divs
  for consistency and dark mode support.

 components/admin/banners/banner-preview-panel.tsx

 Orchestrates the preview. Contains:
 1. Device toggle — Desktop | Tablet | Mobile segmented control (using shadcn Button group)
 2. Device frame — <DeviceFrame> wrapping the appropriate mockup
 3. Dimension info — Small text below the frame showing placement dimensions

 Switches mockup component based on placement prop:
 - homepage → <HomepageMockup />
 - search_top → <SearchPageMockup highlight="top" />
 - search_sidebar → <SearchPageMockup highlight="sidebar" />
 - job_detail → <JobDetailMockup />

 components/admin/banners/device-frame.tsx

 Browser chrome mockup. Pure CSS, no libraries.

 ┌─────────────────────────────────────────┐
 │  ● ● ●    orion.com/jobs               │  ← Fake browser toolbar
 ├─────────────────────────────────────────┤
 │                                         │
 │         [Page mockup content]           │  ← children rendered here
 │                                         │
 └─────────────────────────────────────────┘

 Props: url: string (display URL), device: "desktop" | "tablet" | "mobile", children.
 - Desktop: Full width of container, rounded-xl, subtle shadow-xl
 - Tablet: Max-w-md, centered, rounded-2xl, device-like bezel
 - Mobile: Max-w-xs, centered, rounded-3xl, phone-like aspect ratio with notch

 Placement Mockup Components

 Each mockup is a proportional wireframe using Tailwind divs. The user's actual banner image is
 rendered in the correct zone.

 homepage-mockup.tsx — Props: imageUrl, title, sponsor
 ┌──────────────────────────────────────┐
 │          [Header bar]                │  bg-muted h-10
 ├──────────────────────────────────────┤
 │                                      │
 │      [Hero Section - tall block]     │  bg-muted/60 h-32
 │                                      │
 ├──────────────────────────────────────┤
 │  ╔══════════════════════════════════╗│
 │  ║   YOUR BANNER (real image)      ║│  aspect-[4/1] with ring highlight
 │  ║   Sponsored · {sponsor}         ║│  gradient overlay + label
 │  ╚══════════════════════════════════╝│
 ├──────────────────────────────────────┤
 │  [Content blocks]  [Content blocks]  │  bg-muted/40 grid blocks
 │  [Content blocks]  [Content blocks]  │
 └──────────────────────────────────────┘

 search-page-mockup.tsx — Props: imageUrl, title, sponsor, highlight: "top" | "sidebar"
 ┌──────────────────────────────────────┐
 │          [Header + Search bar]       │
 ├──────────────────────────────────────┤
 │  ╔═══ TOP BANNER (if highlight) ═══╗│
 │  ║   YOUR BANNER / placeholder     ║│
 │  ╚══════════════════════════════════╝│
 │                                      │
 │  ┌─────┐  ┌──────────────────────┐  │
 │  │Filtr│  │  [Job card line]     │  │
 │  │ box │  │  [Job card line]     │  │
 │  │     │  │  [Job card line]     │  │
 │  ├─────┤  └──────────────────────┘  │
 │  │SIDE │                             │
 │  │BANNR│  ← highlighted if sidebar   │
 │  └─────┘                             │
 └──────────────────────────────────────┘

 Both zones are always visible, but only the selected one gets the highlight ring + "Your Banner"
 label + the real image. The other zone shows as a muted placeholder.

 job-detail-mockup.tsx — Props: imageUrl, title, sponsor
 ┌──────────────────────────────────────┐
 │          [Header bar]                │
 ├──────────────────────────────────────┤
 │  ┌───────────────────┐ ┌──────────┐ │
 │  │                   │ │ Meta box │ │
 │  │  Job title/desc   │ │          │ │
 │  │  content block    │ ├──────────┤ │
 │  │                   │ │ Similar  │ │
 │  │                   │ │  jobs    │ │
 │  │                   │ ├──────────┤ │
 │  │                   │ │ YOUR     │ │
 │  │                   │ │ BANNER   │ │
 │  └───────────────────┘ └──────────┘ │
 └──────────────────────────────────────┘

 app/admin/banners/new/page.tsx

 "use client"
 import { Suspense } from "react"
 import { useRouter } from "next/navigation"
 import { BannerEditor } from "@/components/admin/banners/banner-editor"
 import { createBanner } from "@/lib/api/admin-banners"
 import type { CreateBannerData } from "@/lib/api/admin-banners"
 import { toast } from "sonner"

 function NewBannerContent() {
   const router = useRouter()
   const [saving, setSaving] = useState(false)

   const handleSave = async (data: CreateBannerData) => {
     setSaving(true)
     try {
       await createBanner(data)
       toast.success("Banner created successfully")
       router.push("/admin/banners")
     } catch {
       toast.error("Failed to create banner")
     } finally {
       setSaving(false)
     }
   }

   return <BannerEditor mode="create" onSave={handleSave} saving={saving} />
 }

 export default function NewBannerPage() {
   return <Suspense fallback={null}><NewBannerContent /></Suspense>
 }

 app/admin/banners/[id]/edit/page.tsx

 Same pattern but:
 - use(params) for Next.js 16 async params
 - Fetches banner with getAdminBanner(id) on mount
 - Passes initialData + stats to BannerEditor
 - Calls updateBanner(id, data) on save
 - Loading skeleton while fetching, redirect on 404

 Modifications to app/admin/banners/page.tsx (list page)

 - "Create Banner" button → router.push('/admin/banners/new')
 - "Edit" menu item → router.push('/admin/banners/${banner.id}/edit')
 - Remove: All dialog state, form state, dialog functions, Dialog JSX (lines 138-154, 212-308,
 563-723)
 - Remove: Unused imports (Dialog*, Tabs*, Upload, useRef)
 - Keep: AlertDialog for delete (small, appropriate as dialog)
 - Net reduction: ~830 lines → ~500 lines

 ---
 Files Summary

 Create (9 files)

 ┌───────────────────────────────────────────────────────────────────┬─────────────────────────┐
 │                               File                                │         Purpose         │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/banner-editor.tsx                        │ Shared editor layout +  │
 │                                                                   │ state management        │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/banner-form.tsx                          │ Form fields (left       │
 │                                                                   │ panel)                  │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/placement-selector.tsx                   │ Visual placement card   │
 │                                                                   │ grid                    │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/banner-preview-panel.tsx                 │ Preview orchestrator    │
 │                                                                   │ (right panel)           │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/device-frame.tsx                         │ Browser chrome mockup   │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/placement-mockups/homepage-mockup.tsx    │ Homepage wireframe      │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/placement-mockups/search-page-mockup.tsx │ Search page wireframe   │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ components/admin/banners/placement-mockups/job-detail-mockup.tsx  │ Job detail wireframe    │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/banners/new/page.tsx                                    │ Create banner page      │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/banners/new/loading.tsx                                 │ Loading state           │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/banners/[id]/edit/page.tsx                              │ Edit banner page        │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────┤
 │ app/admin/banners/[id]/edit/loading.tsx                           │ Loading state           │
 └───────────────────────────────────────────────────────────────────┴─────────────────────────┘

 Modify (1 file)

 ┌────────────────────────────┬──────────────────────────────────────┐
 │            File            │                Change                │
 ├────────────────────────────┼──────────────────────────────────────┤
 │ app/admin/banners/page.tsx │ Remove dialog, add router navigation │
 └────────────────────────────┴──────────────────────────────────────┘

 Existing Code to Reuse

 - lib/api/admin-banners.ts — All API functions (getAdminBanner, createBanner, updateBanner,
 types)
 - components/banners/banner-slot.tsx — Banner rendering reference (aspect-[4/1], gradient
 overlay, "Sponsored" label)
 - app/admin/articles/new/page.tsx — Full-page editor pattern (sticky header, grid-cols-12,
 Suspense)
 - app/admin/articles/[id]/edit/page.tsx — Edit pattern (use(params), data fetch)
 - components/ui/collapsible.tsx — For progressive disclosure sections

 Verification

 1. npm run build — TypeScript check
 2. /admin/banners → "Create Banner" → opens full-page editor
 3. Select each placement card → preview mockup switches, device frame URL updates
 4. Toggle Desktop/Tablet/Mobile → preview resizes appropriately
 5. Upload image → appears in preview mockup in correct zone
 6. Fill all fields → "Create Banner" → toast + redirect to list
 7. Edit existing banner → pre-filled form, performance stats visible
 8. Sidebar placements show "Hidden on mobile" indicator in mobile preview
 9. Delete confirmation AlertDialog still works on list page
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌