"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Company Billing Dashboard
 * Manage packages, entitlements, subscriptions, and invoices
 */

// Mock data
const currentPlan = {
  name: "Growth",
  price: "$199/mo",
  credits: 20,
  features: ["20 job posts/month", "Social distribution", "Priority support", "Analytics"],
}

const entitlements = {
  available: 12,
  used: 8,
  total: 20,
  expiring: { count: 4, days: 14 },
}

const packages = [
  { id: 1, name: "Starter", price: "$49", credits: 3, popular: false, description: "Perfect for small teams" },
  { id: 2, name: "Growth", price: "$199", credits: 20, popular: true, description: "Best for growing companies" },
  { id: 3, name: "Enterprise", price: "Custom", credits: "Unlimited", popular: false, description: "For large organizations" },
]

const creditPacks = [
  { id: 1, credits: 5, price: "$75", pricePerCredit: "$15" },
  { id: 2, credits: 10, price: "$120", pricePerCredit: "$12", popular: true },
  { id: 3, credits: 25, price: "$250", pricePerCredit: "$10" },
]

const invoices = [
  { id: "INV-001", date: "Feb 1, 2026", amount: "$199.00", status: "paid", description: "Growth Plan - Monthly" },
  { id: "INV-002", date: "Jan 15, 2026", amount: "$120.00", status: "paid", description: "10 Credit Pack" },
  { id: "INV-003", date: "Jan 1, 2026", amount: "$199.00", status: "paid", description: "Growth Plan - Monthly" },
]

export default function CompanyBillingPage() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showBuyCreditsDialog, setShowBuyCreditsDialog] = useState(false)

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing</h1>
            <p className="text-sm text-foreground-muted mt-1">Manage your subscription and job credits</p>
          </div>
        </div>
      </MotionWrapper>

      {/* Current Plan & Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Plan */}
        <MotionWrapper delay={100}>
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Current Plan</CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">{currentPlan.name}</h3>
                  <p className="text-foreground-muted">{currentPlan.price}</p>
                </div>
                <Button variant="outline" onClick={() => setShowUpgradeDialog(true)} className="bg-transparent">
                  Change Plan
                </Button>
              </div>
              
              <div className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground-muted">
                  Next billing date: <span className="text-foreground font-medium">March 1, 2026</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Job Credits */}
        <MotionWrapper delay={150}>
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Job Credits</CardTitle>
                <Button size="sm" onClick={() => setShowBuyCreditsDialog(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  Buy Credits
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-semibold text-primary">{entitlements.available}</span>
                  <span className="text-foreground-muted ml-1">/ {entitlements.total} credits</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">Usage</span>
                  <span className="text-foreground font-medium">{entitlements.used} used</span>
                </div>
                <Progress value={(entitlements.used / entitlements.total) * 100} className="h-2" />
              </div>

              {entitlements.expiring.count > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-600">
                        {entitlements.expiring.count} credits expiring soon
                      </p>
                      <p className="text-xs text-amber-600/80 mt-0.5">
                        Expires in {entitlements.expiring.days} days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Monthly renewal</span>
                  <span className="text-foreground">+20 credits</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">From credit packs</span>
                  <span className="text-foreground">+{entitlements.available - (entitlements.total - entitlements.used)} credits</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Credit Packs */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 shadow-sm mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Buy Additional Credits</CardTitle>
            <CardDescription>One-time credit packs that never expire</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {creditPacks.map((pack) => (
                <div 
                  key={pack.id} 
                  className={cn(
                    "relative p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                    pack.popular 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 hover:border-primary/50"
                  )}
                >
                  {pack.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Best Value
                    </Badge>
                  )}
                  <div className="text-center">
                    <p className="text-3xl font-semibold text-foreground">{pack.credits}</p>
                    <p className="text-sm text-foreground-muted">credits</p>
                    <p className="text-xl font-semibold text-primary mt-2">{pack.price}</p>
                    <p className="text-xs text-foreground-muted">{pack.pricePerCredit}/credit</p>
                    <Button 
                      variant={pack.popular ? "default" : "outline"} 
                      size="sm" 
                      className={cn("w-full mt-4", pack.popular ? "bg-primary hover:bg-primary-hover text-primary-foreground" : "bg-transparent")}
                    >
                      Purchase
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Payment Method & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Method */}
        <MotionWrapper delay={250}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50">
                <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">VISA</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-xs text-foreground-muted">Expires 12/28</p>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Default
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Update Payment Method
              </Button>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Invoices */}
        <MotionWrapper delay={300} className="lg:col-span-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
                        <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{invoice.description}</p>
                        <p className="text-xs text-foreground-muted">{invoice.date} · {invoice.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-foreground">{invoice.amount}</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize">
                        {invoice.status}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your hiring needs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className={cn(
                    "relative p-4 rounded-lg border transition-all cursor-pointer",
                    pkg.popular 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 hover:border-primary/50",
                    pkg.name === currentPlan.name && "ring-2 ring-primary"
                  )}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Popular
                    </Badge>
                  )}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    <p className="text-sm text-foreground-muted">{pkg.description}</p>
                    <p className="text-2xl font-semibold text-primary mt-2">{pkg.price}</p>
                    <p className="text-sm text-foreground-muted">{pkg.credits} credits/month</p>
                    <Button 
                      variant={pkg.name === currentPlan.name ? "outline" : "default"} 
                      size="sm" 
                      className={cn(
                        "w-full mt-4",
                        pkg.name === currentPlan.name 
                          ? "bg-transparent" 
                          : "bg-primary hover:bg-primary-hover text-primary-foreground"
                      )}
                      disabled={pkg.name === currentPlan.name}
                    >
                      {pkg.name === currentPlan.name ? "Current Plan" : "Select"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="bg-transparent">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Credits Dialog */}
      <Dialog open={showBuyCreditsDialog} onOpenChange={setShowBuyCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Credits</DialogTitle>
            <DialogDescription>
              Purchase additional job posting credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {creditPacks.map((pack) => (
              <div 
                key={pack.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                  pack.popular ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{pack.credits} Credits</span>
                    {pack.popular && <Badge className="bg-primary/10 text-primary text-xs">Best Value</Badge>}
                  </div>
                  <p className="text-sm text-foreground-muted">{pack.pricePerCredit} per credit</p>
                </div>
                <span className="text-lg font-semibold text-primary">{pack.price}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyCreditsDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
