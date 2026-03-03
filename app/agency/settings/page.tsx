"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { cn, getCompanyInitials } from "@/lib/utils"
import {
  Briefcase,
  CreditCard,
  Building2,
  Users,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { useAgencyContext } from "@/hooks/use-agency"
import { CHART } from "@/lib/constants/colors"

/**
 * Agency Settings Landing Page
 * Navigation hub for all agency settings sections
 */

interface SettingsSection {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  comingSoon?: boolean
}

const settingsSections: SettingsSection[] = [
  {
    title: "Job Posting",
    description: "Workflow preferences, default settings, and posting templates",
    href: "/agency/settings/job-posting",
    icon: Briefcase,
    color: CHART.primary,
  },
  {
    title: "Billing & Credits",
    description: "Payment methods, credit allocation, and invoices",
    href: "/agency/billing",
    icon: CreditCard,
    color: CHART.success,
  },
  {
    title: "Company Management",
    description: "Client company profiles and verification status",
    href: "/agency/companies",
    icon: Building2,
    color: CHART.purple,
  },
  {
    title: "Team & Permissions",
    description: "Team members, roles, and access controls",
    href: "/agency/team",
    icon: Users,
    color: CHART.warning,
  },
  {
    title: "Notifications",
    description: "Email alerts, reminders, and communication preferences",
    href: "/agency/settings/notifications",
    icon: Bell,
    color: CHART.pink,
  },
  {
    title: "Security",
    description: "Password, two-factor authentication, and login history",
    href: "/agency/settings/security",
    icon: Shield,
    color: CHART.indigo,
  },
]

const staggerAnimation = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemAnimation = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export default function AgencySettingsPage() {
  const { agency, isLoading } = useAgencyContext()

  const agencyInitials = agency?.name
    ? getCompanyInitials(agency.name)
    : 'AG'

  const memberSinceDate = agency?.created_at
    ? new Date(agency.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A'

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Manage your agency preferences and configurations
        </p>
      </motion.div>

      {/* Settings Grid */}
      <motion.div
        variants={staggerAnimation}
        initial="hidden"
        animate="show"
        className="grid gap-4"
      >
        {settingsSections.map((section) => (
          <motion.div key={section.href} variants={itemAnimation}>
            <Link
              href={section.comingSoon ? "#" : section.href}
              className={cn(
                "group flex items-center gap-4 p-5 rounded-xl border transition-all duration-200",
                section.comingSoon
                  ? "border-border/50 bg-muted/30 cursor-not-allowed opacity-60"
                  : "border-border/60 bg-card hover:border-primary/30 hover:shadow-sm"
              )}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{ backgroundColor: `${section.color}10` }}
              >
                <section.icon
                  className="w-6 h-6"
                  style={{ color: section.color }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">
                    {section.title}
                  </h3>
                  {section.comingSoon && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {section.description}
                </p>
              </div>

              {/* Arrow */}
              {!section.comingSoon && (
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
              )}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Agency Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-8 p-5 rounded-xl bg-violet-500/5 border border-violet-500/10"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-violet-600">{agencyInitials}</span>
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {agency?.name || 'Your Agency'}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Agency Account · Owner
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Member since {memberSinceDate}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
