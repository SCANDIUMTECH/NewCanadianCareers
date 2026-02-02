"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

/**
 * Agency Billing & Credits
 * Pooled credits management with per-company usage breakdown
 */

// Mock billing data
const creditUsageByCompany = [
  { company: "Acme Corporation", initials: "AC", credits: 8, color: "#3B5BDB" },
  { company: "TechStart Inc", initials: "TS", credits: 5, color: "#10B981" },
  { company: "Global Dynamics", initials: "GD", credits: 3, color: "#F59E0B" },
  { company: "Innovate Labs", initials: "IL", credits: 0, color: "#8B5CF6" },
]

const creditPackages = [
  { id: 1, name: "Starter", credits: 10, price: 99, perCredit: 9.90, popular: false },
  { id: 2, name: "Growth", credits: 25, price: 199, perCredit: 7.96, popular: true },
  { id: 3, name: "Agency", credits: 50, price: 349, perCredit: 6.98, popular: false },
  { id: 4, name: "Enterprise", credits: 100, price: 599, perCredit: 5.99, popular: false },
]

const invoices = [
  { id: 1, date: "Feb 1, 2026", amount: 199, status: "paid", description: "Growth Package - 25 Credits" },
  { id: 2, date: "Jan 1, 2026", amount: 199, status: "paid", description: "Growth Package - 25 Credits" },
  { id: 3, date: "Dec 1, 2025", amount: 99, status: "paid", description: "Starter Package - 10 Credits" },
]

export default function AgencyBillingPage() {
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<typeof creditPackages[0] | null>(null)

  const totalCredits = 45
  const usedCredits = creditUsageByCompany.reduce((sum, c) => sum + c.credits, 0)
  const remainingCredits = totalCredits - usedCredits

  const pieData = creditUsageByCompany.filter(c => c.credits > 0).map(c => ({
    name: c.company,
    value: c.credits,
    color: c.color,
  }))

  // Add remaining as a slice
  if (remainingCredits > 0) {
    pieData.push({ name: "Available", value: remainingCredits, color: "#E5E7EB" })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Credits</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage your agency credits and billing
            </p>
          </div>
          <Button 
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={() => setShowBuyDialog(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Buy Credits
          </Button>
        </div>
      </MotionWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credit Overview */}
          <MotionWrapper delay={100}>
            <Card className="border-violet-500/20 shadow-sm bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Credit Stats */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className="h-6 px-2 text-xs bg-violet-500/10 text-violet-600 border-violet-500/20">
                        Agency Pooled Credits
                      </Badge>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-violet-600">{remainingCredits}</span>
                      <span className="text-lg text-foreground-muted">/ {totalCredits} credits</span>
                    </div>
                    
                    <Progress value={(remainingCredits / totalCredits) * 100} className="h-3 mb-4" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-foreground-muted">Used this cycle</p>
                        <p className="text-xl font-semibold text-foreground">{usedCredits}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground-muted">Billing cycle ends</p>
                        <p className="text-xl font-semibold text-foreground">Mar 1</p>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="w-full md:w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Usage by Company */}
          <MotionWrapper delay={150}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Credit Usage by Company</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creditUsageByCompany.map((company) => (
                    <div key={company.company} className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${company.color}15` }}
                      >
                        <span className="text-sm font-semibold" style={{ color: company.color }}>
                          {company.initials}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground">{company.company}</p>
                          <p className="text-sm font-medium text-foreground">{company.credits} credits</p>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(company.credits / totalCredits) * 100}%`,
                              backgroundColor: company.color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Invoice History */}
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Invoice History</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary">
                    Download All
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
                          <p className="font-medium text-foreground">{invoice.description}</p>
                          <p className="text-sm text-foreground-muted">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-foreground">${invoice.amount}</p>
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Method */}
          <MotionWrapper delay={250}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary h-8 px-2">
                    Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Visa ending in 4242</p>
                    <p className="text-xs text-foreground-muted">Expires 12/28</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Billing Mode */}
          <MotionWrapper delay={300}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Billing Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                      Agency Pays
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground-muted">
                    Credits are pooled at the agency level and shared across all client companies.
                  </p>
                </div>
                <p className="text-xs text-foreground-muted mt-3">
                  Contact support to change billing mode.
                </p>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Quick Purchase */}
          <MotionWrapper delay={350}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Quick Purchase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {creditPackages.slice(0, 2).map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => { setSelectedPackage(pkg); setShowBuyDialog(true); }}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all hover:border-primary/50",
                      pkg.popular ? "border-violet-500/30 bg-violet-500/5" : "border-border/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{pkg.name}</span>
                      {pkg.popular && (
                        <Badge className="h-5 px-1.5 text-[10px] bg-violet-500 text-white">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-foreground">${pkg.price}</span>
                      <span className="text-sm text-foreground-muted">for {pkg.credits} credits</span>
                    </div>
                  </button>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-transparent"
                  onClick={() => setShowBuyDialog(true)}
                >
                  View All Packages
                </Button>
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>

      {/* Buy Credits Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Credit Package</DialogTitle>
            <DialogDescription>
              Select a package that fits your hiring needs
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {creditPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all",
                  selectedPackage?.id === pkg.id 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-border/50 hover:border-primary/30",
                  pkg.popular && "relative"
                )}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 right-2 h-5 px-2 text-[10px] bg-violet-500 text-white">
                    Most Popular
                  </Badge>
                )}
                <p className="font-semibold text-foreground mb-1">{pkg.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-foreground">${pkg.price}</span>
                </div>
                <p className="text-sm text-foreground-muted">{pkg.credits} job posting credits</p>
                <p className="text-xs text-emerald-600 mt-1">${pkg.perCredit.toFixed(2)} per credit</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button 
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={!selectedPackage}
            >
              Purchase {selectedPackage?.credits} Credits - ${selectedPackage?.price}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
