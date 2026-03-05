"use client"

import { useState, useEffect, useCallback, Suspense, type ReactNode, type ElementType } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAdminContext, AdminProvider } from "@/hooks/use-admin"
import { RequireRole } from "@/lib/auth/require-role"
import { cn, getInitials } from "@/lib/utils"
import Image from "next/image"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  Bell,
  ChevronUp,
  User,
  LogOut,
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
  Loader2,
  CheckCheck,
  MessageSquare,
  AlertCircle,
  Clock,
  Newspaper,
} from "lucide-react"
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/api/notifications"
import type { Notification } from "@/lib/company/types"
import { AdminCommandPalette } from "@/components/admin/command-palette"

// Navigation structure based on the spec
const navigation = {
  main: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard, gradient: "from-primary to-primary-hover" },
    { name: "Users", href: "/admin/users", icon: Users, gradient: "from-primary to-primary-hover" },
    { name: "Companies", href: "/admin/companies", icon: Building2, gradient: "from-sky to-sky-deep" },
    { name: "Agencies", href: "/admin/agencies", icon: Briefcase, gradient: "from-primary-light to-primary" },
    { name: "Jobs", href: "/admin/jobs", icon: FileText, gradient: "from-primary to-primary-hover" },
    { name: "Moderation", href: "/admin/moderation", icon: Shield, badgeKey: "pending_jobs" as const, gradient: "from-destructive to-destructive-deep" },
    { name: "Taxonomies", href: "/admin/taxonomies", icon: Tags, gradient: "from-foreground to-foreground-deep" },
  ],
  distribution: [
    { name: "Articles", href: "/admin/articles", icon: Newspaper, gradient: "from-primary to-primary-hover" },
    { name: "Article Categories", href: "/admin/articles/categories", icon: Tags, gradient: "from-primary-light to-primary" },
    { name: "Social", href: "/admin/social", icon: Share2, gradient: "from-destructive to-destructive-deep" },
    { name: "Search & SEO", href: "/admin/search", icon: Globe, gradient: "from-sky to-sky-deep" },
    { name: "AI Services", href: "/admin/ai", icon: Sparkles, gradient: "from-foreground to-foreground-deep" },
  ],
  monetization: [
    { name: "Job Packages", href: "/admin/packages", icon: Package, gradient: "from-primary to-primary-hover" },
    { name: "Payments", href: "/admin/payments", icon: CreditCard, gradient: "from-primary-light to-primary" },
    { name: "Banners", href: "/admin/banners", icon: ImageIcon, gradient: "from-sky to-sky-deep" },
    { name: "Affiliates", href: "/admin/affiliates", icon: Link2, gradient: "from-sky to-sky-deep" },
    { name: "Entitlements", href: "/admin/entitlements", icon: Wallet, gradient: "from-foreground to-foreground-deep" },
  ],
  marketing: [
    { name: "Overview", href: "/admin/marketing", icon: Megaphone, gradient: "from-destructive to-destructive-deep" },
    { name: "Audiences", href: "/admin/marketing/audiences", icon: UsersRound, gradient: "from-primary to-primary-hover" },
    { name: "Campaigns", href: "/admin/marketing/campaigns", icon: Send, gradient: "from-sky to-sky-deep" },
    { name: "Templates", href: "/admin/email/templates", icon: FileText, gradient: "from-primary-light to-primary" },
    { name: "Journeys", href: "/admin/marketing/journeys", icon: GitBranchPlus, gradient: "from-foreground to-foreground-deep" },
    { name: "Coupons & Credits", href: "/admin/marketing/coupons", icon: Ticket, gradient: "from-primary to-primary-hover" },
    { name: "Reports", href: "/admin/marketing/reports", icon: BarChart3, gradient: "from-sky to-sky-deep" },
    { name: "Compliance", href: "/admin/marketing/compliance", icon: ShieldCheck, gradient: "from-foreground to-foreground-deep" },
  ],
  system: [
    { name: "Email Config", href: "/admin/email", icon: Mail, gradient: "from-sky to-sky-deep" },
    { name: "Feature Flags", href: "/admin/features", icon: ToggleLeft, gradient: "from-primary to-primary-hover" },
    { name: "Audit Logs", href: "/admin/audit", icon: ScrollText, gradient: "from-foreground to-foreground-deep" },
    { name: "Fraud", href: "/admin/fraud", icon: AlertTriangle, gradient: "from-destructive to-destructive-deep" },
    { name: "Settings", href: "/admin/settings", icon: Settings, gradient: "from-foreground to-foreground-deep" },
  ],
  support: [
    { name: "Support Tools", href: "/admin/support", icon: LifeBuoy, gradient: "from-sky to-sky-deep" },
    { name: "Compliance", href: "/admin/compliance", icon: ShieldCheck, gradient: "from-foreground to-foreground-deep" },
  ],
}

function AdminLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, isLoading, logout } = useAuth()
  const { quickCounts, unreadNotifications } = useAdminContext()

  // Show loading state while auth is hydrating
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Build user display info from auth state
  const userName = authUser ? (authUser.full_name || `${authUser.first_name} ${authUser.last_name}`) : "Super Admin"
  const userEmail = authUser?.email || "admin@newcanadian.careers"
  const userInitials = authUser ? getInitials(authUser.first_name, authUser.last_name) : "SA"

  const handleSignOut = async () => {
    await logout()
    router.push("/login")
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const renderNavGroup = (label: string, items: typeof navigation.main) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.href)
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.name}
                  className={cn(
                    "relative transition-all duration-200",
                    active && "bg-sidebar-accent shadow-sm"
                  )}
                >
                  <Link href={item.href}>
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md transition-all duration-200",
                      active
                        ? `bg-gradient-to-br ${item.gradient} text-white shadow-sm`
                        : "text-sidebar-foreground/60"
                    )}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      "transition-colors duration-200",
                      active ? "font-medium text-sidebar-foreground" : "text-sidebar-foreground/70"
                    )}>
                      {item.name}
                    </span>
                    {"badgeKey" in item && item.badgeKey && quickCounts && quickCounts[item.badgeKey] > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px] font-semibold">
                        {quickCounts[item.badgeKey]}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )

  return (
    <SidebarProvider defaultOpen>
      <Suspense fallback={null}>
        <Sidebar variant="inset" collapsible="icon">
          {/* Logo */}
          <SidebarHeader className="p-4 pb-2">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <Image
                src="/favicon-ncc.svg"
                alt="NCC"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg shadow-md"
                priority
              />
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold tracking-tight font-secondary leading-none">
                  NCC
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/60 tracking-wide uppercase">
                  Admin
                </span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            {renderNavGroup("Platform", navigation.main)}
            {renderNavGroup("Distribution", navigation.distribution)}
            {renderNavGroup("Monetization", navigation.monetization)}
            {renderNavGroup("Marketing", navigation.marketing)}
            {renderNavGroup("System", navigation.system)}
            {renderNavGroup("Support", navigation.support)}
          </SidebarContent>

          <SidebarFooter className="p-2">
            <SidebarSeparator className="mb-1" />
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="h-12 rounded-lg hover:bg-sidebar-accent/80 transition-colors">
                      <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary-hover text-white text-[10px] font-semibold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium leading-none">{userName}</span>
                        <span className="text-[11px] text-muted-foreground/60 mt-0.5">{userEmail}</span>
                      </div>
                      <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground/40 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    <DropdownMenuItem className="gap-2" onClick={() => authUser?.id && router.push(`/admin/users/${authUser.id}`)}>
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => router.push("/admin/settings")}>
                      <Settings className="h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive gap-2" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </Suspense>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <SidebarTrigger />
          <div className="flex-1" />
          <AdminCommandPalette />
          <AdminHeaderActions />
        </header>
        <main className="flex-1 p-6 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <RequireRole allowedRoles={['admin']}>
      <AdminProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AdminProvider>
    </RequireRole>
  )
}

const ENV_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  production: { label: "Production", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  staging: { label: "Staging", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  development: { label: "Development", className: "bg-sky/10 text-sky border-sky/20" },
}

const notificationTypeIcons: Record<string, ElementType> = {
  application: Briefcase,
  message: MessageSquare,
  system: Bell,
  job: Briefcase,
  alert: AlertCircle,
}

const notificationTypeColors: Record<string, string> = {
  application: "bg-sky/10 text-sky",
  message: "bg-emerald-500/10 text-emerald-600",
  system: "bg-primary/10 text-primary",
  job: "bg-amber-500/10 text-amber-600",
  alert: "bg-red-500/10 text-red-600",
}

function AdminHeaderActions() {
  const { unreadNotifications, refreshNotifications } = useAdminContext()
  const env = (process.env.NEXT_PUBLIC_ENV || "development").toLowerCase()
  const envConfig = ENV_BADGE_CONFIG[env] || ENV_BADGE_CONFIG.development

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setIsLoadingNotifs(true)
    try {
      const data = await getNotifications({ page_size: 8 })
      setNotifications(data.results)
    } catch {
      // Silently fail — bell still shows count
    } finally {
      setIsLoadingNotifs(false)
    }
  }, [])

  // Fetch notifications when popover opens
  useEffect(() => {
    if (notifOpen) fetchNotifications()
  }, [notifOpen, fetchNotifications])

  const handleMarkRead = async (id: number) => {
    try {
      await markAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      refreshNotifications()
    } catch {
      // Silently fail
    }
  }

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      refreshNotifications()
    } catch {
      // Silently fail
    } finally {
      setIsMarkingAll(false)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="flex items-center gap-2">
      {/* Notifications */}
      <Popover open={notifOpen} onOpenChange={setNotifOpen}>
        <PopoverTrigger asChild>
          <button aria-label="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadNotifications > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {unreadNotifications}
                </Badge>
              )}
            </div>
            {unreadNotifications > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="mr-1 h-3 w-3" />
                )}
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingNotifs ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const IconComp = notificationTypeIcons[notif.type] || Bell
                const colorClass = notificationTypeColors[notif.type] || "bg-muted text-muted-foreground"
                return (
                  <button
                    key={notif.id}
                    onClick={() => !notif.read && handleMarkRead(notif.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
                      !notif.read && "bg-primary/[0.02]"
                    )}
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0", colorClass)}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", !notif.read && "font-medium")}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{notif.message}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground/60">{formatTimeAgo(notif.created_at)}</span>
                      </div>
                    </div>
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Environment indicator — hidden in production */}
      {env !== "production" && (
        <Badge variant="outline" className={cn(envConfig.className, "text-[10px] font-semibold")}>
          {envConfig.label}
        </Badge>
      )}
    </div>
  )
}
