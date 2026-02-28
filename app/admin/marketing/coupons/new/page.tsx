"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createCoupon } from "@/lib/api/admin-marketing"
import type { CouponDiscountType, CouponDistribution } from "@/lib/api/admin-marketing"
import { ArrowLeft, Ticket } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

export default function CreateCouponPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Form fields
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("")
  const [distribution, setDistribution] = useState<CouponDistribution>("public")
  const [minPurchase, setMinPurchase] = useState("")
  const [maxUsesTotal, setMaxUsesTotal] = useState("")
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState("1")
  const [startsAt, setStartsAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [onePerIp, setOnePerIp] = useState(false)
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState(false)

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCode(result)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !code || !discountValue) {
      setError("Name, code, and discount value are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const coupon = await createCoupon({
        name,
        code: code.toUpperCase(),
        description,
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        distribution,
        min_purchase: minPurchase ? Number(minPurchase) : null,
        max_uses_total: maxUsesTotal ? Number(maxUsesTotal) : null,
        max_uses_per_customer: Number(maxUsesPerCustomer),
        starts_at: startsAt || null,
        expires_at: expiresAt || null,
        one_per_ip: onePerIp,
        require_verified_email: requireVerifiedEmail,
      })
      router.push(`/admin/marketing/coupons/${coupon.id}`)
    } catch (err) {
      console.error("Failed to create coupon:", err)
      setError("Failed to create coupon. Please check your input.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const discountLabel = () => {
    switch (discountType) {
      case "percentage":
        return "Discount (%)"
      case "fixed":
        return "Amount ($)"
      case "credits":
        return "Bonus Credits"
      case "free_trial":
        return "Trial Days"
      default:
        return "Value"
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl"
    >
      {/* Breadcrumb */}
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/admin/marketing/coupons">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Coupons
          </Link>
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create Coupon</h1>
            <p className="text-muted-foreground text-sm">
              Create a new discount coupon for your customers
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-2 border-l-blue-200">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Coupon Name</Label>
                <Input
                  id="name"
                  placeholder="Summer Sale 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="SUMMER2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Internal description for this coupon..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Discount Settings */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-2 border-l-green-200">
            <CardHeader>
              <CardTitle className="text-base">Discount Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as CouponDiscountType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                      <SelectItem value="credits">Bonus Credits</SelectItem>
                      <SelectItem value="free_trial">Free Trial Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{discountLabel()}</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              {discountType === "percentage" && (
                <div className="space-y-2">
                  <Label>Max Discount Amount ($) (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="No cap"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cap the maximum discount for percentage-based coupons
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Distribution</Label>
                  <Select
                    value={distribution}
                    onValueChange={(v) => setDistribution(v as CouponDistribution)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="url">URL Auto-Apply</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Purchase ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="No minimum"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Limits */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-2 border-l-amber-200">
            <CardHeader>
              <CardTitle className="text-base">Usage & Validity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Uses (Total)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxUsesTotal}
                    onChange={(e) => setMaxUsesTotal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Per Customer</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxUsesPerCustomer}
                    onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-2 border-l-purple-200">
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">One Per IP Address</p>
                  <p className="text-xs text-muted-foreground">
                    Prevent the same IP from using this coupon multiple times
                  </p>
                </div>
                <Switch checked={onePerIp} onCheckedChange={setOnePerIp} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Require Verified Email</p>
                  <p className="text-xs text-muted-foreground">
                    Only allow users with verified email to redeem
                  </p>
                </div>
                <Switch
                  checked={requireVerifiedEmail}
                  onCheckedChange={setRequireVerifiedEmail}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error + Submit */}
        <motion.div variants={itemVariants}>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Coupon"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/marketing/coupons">Cancel</Link>
            </Button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  )
}
