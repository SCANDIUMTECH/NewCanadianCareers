"use client"

import React from "react"
import { Suspense } from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Search,
  Bell,
  ChevronUp,
  User,
  LogOut,
} from "lucide-react"

// Navigation structure based on the spec
const navigation = {
  main: [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Companies", href: "/admin/companies", icon: Building2 },
    { name: "Agencies", href: "/admin/agencies", icon: Briefcase },
    { name: "Jobs", href: "/admin/jobs", icon: FileText },
    { name: "Moderation", href: "/admin/moderation", icon: Shield, badge: 12 },
  ],
  distribution: [
    { name: "Social", href: "/admin/social", icon: Share2 },
    { name: "Search & SEO", href: "/admin/search", icon: Globe },
  ],
  monetization: [
    { name: "Job Packages", href: "/admin/packages", icon: Package },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Banners", href: "/admin/banners", icon: ImageIcon },
  ],
  system: [
    { name: "Email Config", href: "/admin/email", icon: Mail },
    { name: "Feature Flags", href: "/admin/features", icon: ToggleLeft },
    { name: "Audit Logs", href: "/admin/audit", icon: ScrollText },
    { name: "Fraud", href: "/admin/fraud", icon: AlertTriangle },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ],
  support: [
    { name: "Support Tools", href: "/admin/support", icon: LifeBuoy },
    { name: "Compliance", href: "/admin/compliance", icon: ShieldCheck },
  ],
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <SidebarProvider defaultOpen>
      <Suspense fallback={null}>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader className="p-4">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                O
              </div>
              <span className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                Orion Admin
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            {/* Search */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-sidebar-accent/50 border-0"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.main.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          {item.badge && (
                            <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Distribution */}
            <SidebarGroup>
              <SidebarGroupLabel>Distribution</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.distribution.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Monetization */}
            <SidebarGroup>
              <SidebarGroupLabel>Monetization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.monetization.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* System */}
            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.system.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Support */}
            <SidebarGroup>
              <SidebarGroupLabel>Support</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.support.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="h-12">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          SA
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                        <span className="text-sm font-medium">Super Admin</span>
                        <span className="text-xs text-muted-foreground">admin@orion.io</span>
                      </div>
                      <ChevronUp className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
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
          <AdminHeaderActions />
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AdminHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      {/* Notifications */}
      <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
      </button>
      
      {/* Environment indicator */}
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
        Staging
      </Badge>
    </div>
  )
}
