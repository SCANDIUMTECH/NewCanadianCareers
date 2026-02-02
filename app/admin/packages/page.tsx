"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Sample packages data
const packages = [
  {
    id: 1,
    name: "Starter",
    credits: 3,
    price: 99,
    validity: 30,
    features: ["Basic job posting", "Email support", "30 day visibility"],
    active: true,
    sales: 234,
  },
  {
    id: 2,
    name: "Professional",
    credits: 10,
    price: 249,
    validity: 60,
    features: ["Featured job posting", "Social distribution", "60 day visibility", "Analytics"],
    active: true,
    sales: 156,
    popular: true,
  },
  {
    id: 3,
    name: "Enterprise",
    credits: 30,
    price: 599,
    validity: 90,
    features: ["Premium placement", "Social + newsletter", "90 day visibility", "Advanced analytics", "Dedicated support"],
    active: true,
    sales: 42,
  },
  {
    id: 4,
    name: "Unlimited",
    credits: -1,
    price: 999,
    validity: 30,
    features: ["Unlimited postings", "All features", "Priority support", "Custom branding"],
    active: false,
    sales: 8,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function PackagesPage() {
  const [editingPackage, setEditingPackage] = useState<typeof packages[0] | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Packages</h1>
          <p className="text-muted-foreground mt-1">
            Configure job posting packages and pricing
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Package
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Packages</p>
            <p className="mt-1 text-2xl font-semibold">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sales (MTD)</p>
            <p className="mt-1 text-2xl font-semibold">$28,400</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Most Popular</p>
            <p className="mt-1 text-2xl font-semibold">Professional</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg. Order Value</p>
            <p className="mt-1 text-2xl font-semibold">$218</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Packages Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-md",
              !pkg.active && "opacity-60",
              pkg.popular && "ring-2 ring-primary"
            )}
          >
            {pkg.popular && (
              <div className="absolute top-0 right-0">
                <Badge className="rounded-none rounded-bl-lg">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingPackage(pkg)}>
                      <EditIcon className="mr-2 h-4 w-4" />
                      Edit Package
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CopyIcon className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>
                {pkg.credits === -1 ? "Unlimited" : `${pkg.credits} credits`} • {pkg.validity} days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                ${pkg.price}
                <span className="text-sm font-normal text-muted-foreground">/pkg</span>
              </div>

              <ul className="space-y-2">
                {pkg.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
                {pkg.features.length > 4 && (
                  <li className="text-xs text-muted-foreground">
                    +{pkg.features.length - 4} more features
                  </li>
                )}
              </ul>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">{pkg.sales} sales</span>
                <Badge variant={pkg.active ? "secondary" : "outline"}>
                  {pkg.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Package Editor Dialog */}
      <Dialog open={!!editingPackage || isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingPackage(null)
          setIsCreateDialogOpen(false)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create Package"}
            </DialogTitle>
            <DialogDescription>
              Configure the package details and pricing
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Package Name</Label>
                  <Input
                    id="name"
                    defaultValue={editingPackage?.name}
                    placeholder="e.g., Professional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    defaultValue={editingPackage?.credits}
                    placeholder="-1 for unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity">Validity (days)</Label>
                  <Input
                    id="validity"
                    type="number"
                    defaultValue={editingPackage?.validity}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch defaultChecked={editingPackage?.active} />
                    <span className="text-sm">Active</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-4 space-y-4">
              <div className="space-y-3">
                <Label>Included Features</Label>
                <div className="space-y-2">
                  {["Basic job posting", "Featured job posting", "Social distribution", "Newsletter inclusion", "Analytics", "Priority support"].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Switch defaultChecked={editingPackage?.features.includes(feature)} />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    defaultValue={editingPackage?.price}
                    placeholder="99"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Options</Label>
                  <Select defaultValue="once">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setEditingPackage(null)
              setIsCreateDialogOpen(false)
            }}>
              Cancel
            </Button>
            <Button>
              {editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
