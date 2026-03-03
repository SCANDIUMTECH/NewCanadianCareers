"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  getPreferences,
  updatePreferences,
  processUnsubscribe,
} from "@/lib/api/admin-marketing"
import type { UserPreferences } from "@/lib/api/admin-marketing"
import {
  ShieldCheck,
  Mail,
  MailX,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function PreferenceCenterPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const data = await getPreferences(token)
        setPreferences(data)
      } catch (err) {
        setError("This link is invalid or has expired.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchPreferences()
  }, [token])

  async function handleOptIn() {
    setIsUpdating(true)
    setUpdateSuccess(null)
    try {
      await updatePreferences(token, "opted_in")
      setPreferences((prev) => prev ? { ...prev, consent_status: "opted_in" } : prev)
      setUpdateSuccess("You have been re-subscribed to marketing emails.")
    } catch (err) {
      setError("Failed to update preferences. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleUnsubscribe() {
    setIsUpdating(true)
    setUpdateSuccess(null)
    try {
      await processUnsubscribe(token)
      setPreferences((prev) => prev ? { ...prev, consent_status: "unsubscribed" } : prev)
      setUpdateSuccess("You have been unsubscribed from marketing emails.")
    } catch (err) {
      setError("Failed to unsubscribe. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-64 mx-auto mb-6" />
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !preferences) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Link Invalid</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const isSubscribed = preferences?.consent_status === "opted_in"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden shadow-lg shadow-black/5">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-light p-6 text-white text-center relative">
              {/* Subtle noise/texture overlay */}
              <div className="absolute inset-0 bg-black/5 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 mx-auto mb-3 relative z-10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-semibold relative z-10">Email Preferences</h1>
              {preferences && (
                <p className="text-white/80 text-sm mt-1 relative z-10">{preferences.email}</p>
              )}
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Success Message */}
              {updateSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-start gap-3 bg-green-50 text-green-800 rounded-lg p-4"
                >
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                  <p className="text-sm">{updateSuccess}</p>
                </motion.div>
              )}

              {/* Error Message */}
              {error && preferences && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-start gap-3 bg-red-50 text-red-800 rounded-lg p-4"
                >
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              {/* Current Status */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Current status</p>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-sm px-3 py-1 transition-all duration-300",
                    isSubscribed
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  )}
                >
                  {isSubscribed ? "Subscribed" : "Unsubscribed"}
                </Badge>
              </div>

              {/* Greeting */}
              {preferences?.first_name && (
                <p className="text-center text-sm text-muted-foreground">
                  Hi {preferences.first_name}, manage your marketing email preferences below.
                </p>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {isSubscribed ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2 font-medium shadow-sm"
                    onClick={handleUnsubscribe}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MailX className="h-4 w-4" />
                    )}
                    Unsubscribe from marketing emails
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2 font-medium shadow-sm"
                    onClick={handleOptIn}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Re-subscribe to marketing emails
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>
                  This will {isSubscribed ? "stop" : "resume"} all promotional emails.
                  Transactional emails (receipts, account alerts) are not affected.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-center text-xs text-muted-foreground mt-4">
          Powered by Orion
        </motion.p>
      </motion.div>
    </div>
  )
}
