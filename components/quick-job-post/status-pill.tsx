"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { type JobStatus } from "@/lib/quick-job-schema"

interface StatusPillProps {
  status: JobStatus
  className?: string
}

const statusConfig: Record<
  JobStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    dotColor: "bg-slate-400",
  },
  scheduled: {
    label: "Scheduled",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-400",
  },
  published: {
    label: "Published",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
}

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          config.bgColor,
          config.color,
          className
        )}
      >
        <motion.span
          className={cn("w-2 h-2 rounded-full", config.dotColor)}
          animate={{
            scale: status === "scheduled" ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: status === "scheduled" ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
        {config.label}
      </motion.div>
    </AnimatePresence>
  )
}
