"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileText,
  Shield,
  Share2,
  Globe,
  Package,
  CreditCard,
  ImageIcon,
  Mail,
  ToggleLeft,
  ScrollText,
  AlertTriangle,
  Settings,
  LifeBuoy,
  ShieldCheck,
  Megaphone,
  UsersRound,
  Send,
  GitBranchPlus,
  Ticket,
  BarChart3,
  Sparkles,
  Tags,
  Link2,
  Wallet,
  Search,
} from "lucide-react"

interface CommandRoute {
  name: string
  href: string
  icon: React.ElementType
  keywords?: string[]
}

const routes: { group: string; items: CommandRoute[] }[] = [
  {
    group: "Platform",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard, keywords: ["home", "overview", "stats"] },
      { name: "Users", href: "/admin/users", icon: Users, keywords: ["people", "accounts", "candidates", "employers"] },
      { name: "Companies", href: "/admin/companies", icon: Building2, keywords: ["employers", "organizations"] },
      { name: "Agencies", href: "/admin/agencies", icon: Briefcase, keywords: ["recruiters", "staffing"] },
      { name: "Jobs", href: "/admin/jobs", icon: FileText, keywords: ["postings", "listings", "positions"] },
      { name: "Moderation", href: "/admin/moderation", icon: Shield, keywords: ["review", "queue", "approve", "reports"] },
      { name: "Taxonomies", href: "/admin/taxonomies", icon: Tags, keywords: ["categories", "industries", "tags"] },
    ],
  },
  {
    group: "Distribution",
    items: [
      { name: "Social", href: "/admin/social", icon: Share2, keywords: ["facebook", "linkedin", "twitter", "instagram", "posting"] },
      { name: "Search & SEO", href: "/admin/search", icon: Globe, keywords: ["indexing", "sitemap", "google", "optimization"] },
      { name: "AI Services", href: "/admin/ai", icon: Sparkles, keywords: ["providers", "generation", "openai", "anthropic"] },
    ],
  },
  {
    group: "Monetization",
    items: [
      { name: "Job Packages", href: "/admin/packages", icon: Package, keywords: ["products", "pricing", "plans"] },
      { name: "Payments", href: "/admin/payments", icon: CreditCard, keywords: ["transactions", "invoices", "stripe", "revenue"] },
      { name: "Banners", href: "/admin/banners", icon: ImageIcon, keywords: ["ads", "sponsored", "advertising"] },
      { name: "Affiliates", href: "/admin/affiliates", icon: Link2, keywords: ["partners", "referrals", "links"] },
      { name: "Entitlements", href: "/admin/entitlements", icon: Wallet, keywords: ["credits", "balances", "grants"] },
    ],
  },
  {
    group: "Marketing",
    items: [
      { name: "Marketing Overview", href: "/admin/marketing", icon: Megaphone, keywords: ["campaigns", "email marketing"] },
      { name: "Audiences", href: "/admin/marketing/audiences", icon: UsersRound, keywords: ["segments", "consent", "suppression"] },
      { name: "Campaigns", href: "/admin/marketing/campaigns", icon: Send, keywords: ["email", "blast", "newsletter"] },
      { name: "Email Templates", href: "/admin/email/templates", icon: FileText, keywords: ["email", "template", "transactional", "marketing", "html", "editor"] },
      { name: "Journeys", href: "/admin/marketing/journeys", icon: GitBranchPlus, keywords: ["automation", "workflows", "drip"] },
      { name: "Coupons & Credits", href: "/admin/marketing/coupons", icon: Ticket, keywords: ["discounts", "promos", "codes", "wallets"] },
      { name: "Marketing Reports", href: "/admin/marketing/reports", icon: BarChart3, keywords: ["analytics", "metrics"] },
      { name: "Marketing Compliance", href: "/admin/marketing/compliance", icon: ShieldCheck, keywords: ["gdpr", "consent", "deliverability"] },
    ],
  },
  {
    group: "System",
    items: [
      { name: "Email Config", href: "/admin/email", icon: Mail, keywords: ["templates", "triggers", "smtp", "resend", "deliverability"] },
      { name: "Feature Flags", href: "/admin/features", icon: ToggleLeft, keywords: ["toggles", "experiments"] },
      { name: "Audit Logs", href: "/admin/audit", icon: ScrollText, keywords: ["history", "activity", "trail"] },
      { name: "Fraud", href: "/admin/fraud", icon: AlertTriangle, keywords: ["alerts", "rules", "detection", "security"] },
      { name: "Settings", href: "/admin/settings", icon: Settings, keywords: ["config", "platform", "slack", "branding"] },
    ],
  },
  {
    group: "Support",
    items: [
      { name: "Support Tools", href: "/admin/support", icon: LifeBuoy, keywords: ["impersonate", "timeline", "lookup", "export"] },
      { name: "Compliance", href: "/admin/compliance", icon: ShieldCheck, keywords: ["gdpr", "data export", "deletion", "privacy"] },
    ],
  },
]

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Register Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Admin Navigation" description="Search admin pages and navigate quickly">
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {routes.map((group, groupIndex) => (
            <div key={group.group}>
              {groupIndex > 0 && <CommandSeparator />}
              <CommandGroup heading={group.group}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.name} ${item.keywords?.join(" ") || ""}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
