"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { AccountSecurity } from "@/components/account-security"

/**
 * Agency Security Settings Page
 * Uses shared AccountSecurity component for password, 2FA, and sessions.
 * Keeps agency-specific danger zone (deactivate agency).
 */

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <Link
          href="/agency/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Security
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Manage your account security and authentication
          </p>
        </div>
      </motion.div>

      {/* Shared Account Security Component */}
      <div className="space-y-6 mb-6">
        <AccountSecurity motionDelay={100} />
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="p-5 rounded-xl border border-destructive/30 bg-card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-medium text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              Irreversible actions
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <Label className="text-sm font-medium">Deactivate Agency Account</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete your agency and all associated data
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Deactivate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your agency account and remove all associated data, including:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 py-2">
                <li>All client company profiles</li>
                <li>Job postings and applications</li>
                <li>Team member accounts</li>
                <li>Billing history and credits</li>
              </ul>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, deactivate my agency
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>
    </div>
  )
}
