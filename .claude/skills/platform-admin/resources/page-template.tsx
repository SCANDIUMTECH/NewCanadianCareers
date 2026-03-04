/**
 * Platform Admin Page Template
 *
 * Use this as a starting point for new admin pages.
 * Follows established patterns from existing admin pages.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  SearchIcon,
  MoreHorizontalIcon,
  PlusIcon,
  EyeIcon,
  // Add more icons as needed from lucide-react
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  },
}

// ============================================================================
// Types
// ============================================================================

interface Item {
  id: string
  name: string
  email: string
  status: "active" | "pending" | "suspended"
  createdAt: string
}

// ============================================================================
// Mock Data (replace with API calls)
// ============================================================================

const mockItems: Item[] = [
  { id: "1", name: "Example User", email: "user@example.com", status: "active", createdAt: "2024-01-15" },
  { id: "2", name: "Another User", email: "another@example.com", status: "pending", createdAt: "2024-01-14" },
  { id: "3", name: "Third User", email: "third@example.com", status: "suspended", createdAt: "2024-01-13" },
]

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({
  title,
  value,
  color
}: {
  title: string
  value: string | number
  color?: "green" | "amber" | "red" | "blue"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold",
            color === "green" && "text-green-600",
            color === "amber" && "text-amber-600",
            color === "red" && "text-red-600",
            color === "blue" && "text-blue-600"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AdminFeaturePage() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Dialog state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Filter logic
  const filteredItems = mockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Stats calculation
  const stats = {
    total: mockItems.length,
    active: mockItems.filter((i) => i.status === "active").length,
    pending: mockItems.filter((i) => i.status === "pending").length,
    suspended: mockItems.filter((i) => i.status === "suspended").length,
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ================================================================== */}
      {/* Header */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feature Name</h1>
          <p className="text-muted-foreground">
            Manage and configure feature settings
          </p>
        </div>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </motion.div>

      {/* ================================================================== */}
      {/* Stats Grid */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Items" value={stats.total} />
        <StatCard title="Active" value={stats.active} color="green" />
        <StatCard title="Pending" value={stats.pending} color="amber" />
        <StatCard title="Suspended" value={stats.suspended} color="red" />
      </motion.div>

      {/* ================================================================== */}
      {/* Filters */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================================================== */}
      {/* Data Table */}
      {/* ================================================================== */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    {/* Name + Email Cell */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {item.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          item.status === "active" && "bg-green-100 text-green-700",
                          item.status === "pending" && "bg-amber-100 text-amber-700",
                          item.status === "suspended" && "bg-red-100 text-red-700"
                        )}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-muted-foreground">
                      {item.createdAt}
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedItem(item)}>
                            <EyeIcon className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {/* Add more actions as needed */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Empty State */}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================================================== */}
      {/* Detail View Dialog */}
      {/* ================================================================== */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>
              View detailed information
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedItem.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedItem.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge
                    variant="secondary"
                    className={cn(
                      selectedItem.status === "active" && "bg-green-100 text-green-700",
                      selectedItem.status === "pending" && "bg-amber-100 text-amber-700",
                      selectedItem.status === "suspended" && "bg-red-100 text-red-700"
                    )}
                  >
                    {selectedItem.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="font-medium">{selectedItem.createdAt}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
