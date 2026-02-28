"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserAvatar } from "@/components/user-avatar"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Plus,
  Download,
  FileSpreadsheet,
  MoreHorizontal,
  Eye,
  Pencil,
  KeyRound,
  User,
  Users,
  Ban,
  AlertTriangle,
  AlertCircle,
  Loader2,
  UserCheck,
  Clock,
  ShieldBan,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getAdminUsers,
  getAdminUserStats,
  createAdminUser,
  updateAdminUser,
  sendPasswordReset,
  suspendUser,
  startImpersonation,
  exportUsers,
  bulkSuspendUsers,
  bulkDeleteUsers,
} from "@/lib/api/admin-users"
import type {
  AdminUser,
  AdminUserStats,
  AdminUserFilters,
  SuspendUserData,
} from "@/lib/admin/types"
import type { ApiError, UserRole, UserStatus } from "@/lib/auth/types"

function getErrorMsg(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) return (err as ApiError).message
  if (err instanceof Error) return err.message
  return fallback
}

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

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
      <UsersContent />
    </Suspense>
  )
}

function UsersContent() {
  const searchParams = useSearchParams()

  // Data state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminUserStats | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filter state — initialize from URL params if present
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">(() => {
    const role = searchParams.get("role")
    if (role && ["admin", "employer", "candidate", "agency"].includes(role)) return role as UserRole
    return "all"
  })
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">(() => {
    const status = searchParams.get("status")
    if (status && ["active", "suspended", "pending", "banned"].includes(status)) return status as UserStatus
    return "all"
  })
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") || "")

  // Dialog states
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [resettingPasswordFor, setResettingPasswordFor] = useState<AdminUser | null>(null)
  const [impersonatingUser, setImpersonatingUser] = useState<AdminUser | null>(null)
  const [suspendingUser, setSuspendingUser] = useState<AdminUser | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [bulkSuspendOpen, setBulkSuspendOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Export state
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv")
  const [isExporting, setIsExporting] = useState(false)

  // Form states
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "employer" as UserRole, company: "", sendInvite: true })
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" as UserRole, company: "", status: "" as UserStatus })
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendDuration, setSuspendDuration] = useState<"indefinite" | "7" | "30" | "90">("indefinite")
  const [impersonateConfirmed, setImpersonateConfirmed] = useState(false)
  const [impersonateReason, setImpersonateReason] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: AdminUserFilters = {
        page: currentPage,
        page_size: pageSize,
      }
      if (debouncedSearch) filters.search = debouncedSearch
      if (roleFilter !== "all") filters.role = roleFilter
      if (statusFilter !== "all") filters.status = statusFilter

      const response = await getAdminUsers(filters)
      setUsers(response.results)
      setTotalCount(response.count)
    } catch (err) {
      setError(getErrorMsg(err, "Failed to load users"))
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAdminUserStats()
      setStats(data)
    } catch {
      // Stats are non-critical, don't show error
      console.error("Failed to load user stats")
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, roleFilter, statusFilter])

  const handleOpenEditDialog = (user: AdminUser) => {
    setEditForm({
      name: user.full_name,
      email: user.email,
      role: user.role,
      company: user.company_name || "",
      status: user.status,
    })
    setEditingUser(user)
  }

  const handleCloseEditDialog = () => {
    setEditingUser(null)
    setEditForm({ name: "", email: "", role: "" as UserRole, company: "", status: "" as UserStatus })
  }

  const handleOpenSuspendDialog = (user: AdminUser) => {
    setSuspendReason("")
    setSuspendDuration("indefinite")
    setSuspendingUser(user)
  }

  const handleCloseSuspendDialog = () => {
    setSuspendingUser(null)
    setSuspendReason("")
    setSuspendDuration("indefinite")
  }

  const handleOpenImpersonateDialog = (user: AdminUser) => {
    setImpersonateConfirmed(false)
    setImpersonatingUser(user)
  }

  const handleCloseImpersonateDialog = () => {
    setImpersonatingUser(null)
    setImpersonateConfirmed(false)
    setImpersonateReason("")
  }

  const handleAddUser = async () => {
    setActionLoading("add")
    try {
      const nameParts = newUser.name.trim().split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""

      const created = await createAdminUser({
        email: newUser.email,
        first_name: firstName,
        last_name: lastName,
        role: newUser.role,
        status: "active",
      })

      // Send password reset link if checkbox was checked
      if (newUser.sendInvite) {
        try {
          await sendPasswordReset(created.id)
        } catch {
          // User created but reset email failed — still show success
          toast.warning("User created but failed to send password reset email")
        }
      }

      setAddUserOpen(false)
      setNewUser({ name: "", email: "", role: "employer", company: "", sendInvite: true })
      toast.success(newUser.sendInvite ? "User created and invitation sent" : "User created successfully")
      fetchUsers()
      fetchStats()
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to create user"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return
    setActionLoading("edit")
    try {
      const nameParts = editForm.name.trim().split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""

      await updateAdminUser(editingUser.id, {
        email: editForm.email,
        first_name: firstName,
        last_name: lastName,
        role: editForm.role,
        status: editForm.status,
      })
      handleCloseEditDialog()
      toast.success("User updated successfully")
      fetchUsers()
      fetchStats()
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to update user"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async () => {
    if (!resettingPasswordFor) return
    setActionLoading("reset")
    try {
      await sendPasswordReset(resettingPasswordFor.id)
      setResettingPasswordFor(null)
      toast.success("Password reset link sent")
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to send password reset"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleImpersonate = async () => {
    if (!impersonatingUser) return
    setActionLoading("impersonate")
    try {
      const result = await startImpersonation(impersonatingUser.id, { reason: impersonateReason })
      toast.success("Starting impersonation...")
      // Redirect to impersonation URL
      window.location.href = result.redirect_url
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to start impersonation"))
      setActionLoading(null)
    }
  }

  const handleSuspendUser = async () => {
    if (!suspendingUser) return
    setActionLoading("suspend")
    try {
      await suspendUser(suspendingUser.id, {
        reason: suspendReason,
        duration: suspendDuration,
        notify_user: true,
      })
      handleCloseSuspendDialog()
      toast.success("User suspended successfully")
      fetchUsers()
      fetchStats()
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to suspend user"))
    } finally {
      setActionLoading(null)
    }
  }

  // Export
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const filters: AdminUserFilters = {}
      if (debouncedSearch) filters.search = debouncedSearch
      if (roleFilter !== "all") filters.role = roleFilter
      if (statusFilter !== "all") filters.status = statusFilter

      const blob = await exportUsers(filters, exportFormat)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-export.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setExportOpen(false)
      toast.success(`Exported users as ${exportFormat.toUpperCase()}`)
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to export users"))
    } finally {
      setIsExporting(false)
    }
  }

  // Bulk selection helpers
  const selectAllVisible = () => {
    const visibleIds = users.map((u) => u.id)
    setSelectedUsers((prev) => {
      const allSelected = visibleIds.every((id) => prev.includes(id))
      return allSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]
    })
  }

  const handleBulkSuspend = async () => {
    setActionLoading("bulk-suspend")
    try {
      await bulkSuspendUsers(selectedUsers, {
        reason: suspendReason,
        duration: suspendDuration,
        notify_user: true,
      })
      const count = selectedUsers.length
      setBulkSuspendOpen(false)
      setSuspendReason("")
      setSuspendDuration("indefinite")
      setSelectedUsers([])
      toast.success(`${count} user${count !== 1 ? "s" : ""} suspended`)
      fetchUsers()
      fetchStats()
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to suspend users"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkDelete = async () => {
    const count = selectedUsers.length
    setActionLoading("bulk-delete")
    try {
      await bulkDeleteUsers(selectedUsers)
      setBulkDeleteOpen(false)
      setSelectedUsers([])
      setDeleteConfirmText("")
      toast.success(`${count} user${count !== 1 ? "s" : ""} deleted`)
      fetchUsers()
      fetchStats()
    } catch (err) {
      toast.error(getErrorMsg(err, "Failed to delete users"))
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage user accounts and permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setAddUserOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div variants={itemVariants}>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-600 hover:text-red-700"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {isStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Total Users" value={stats?.total.toLocaleString() || "0"} icon={<Users className="h-4 w-4" />} gradient="from-slate-600 to-slate-800" />
            <StatCard title="Active" value={stats?.active.toLocaleString() || "0"} color="green" icon={<UserCheck className="h-4 w-4" />} gradient="from-green-500 to-emerald-600" />
            <StatCard title="Pending Verification" value={stats?.pending.toLocaleString() || "0"} color="amber" icon={<Clock className="h-4 w-4" />} gradient="from-amber-500 to-orange-600" />
            <StatCard title="Suspended" value={stats?.suspended.toLocaleString() || "0"} color="red" icon={<ShieldBan className="h-4 w-4" />} gradient="from-red-500 to-rose-600" />
          </>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="candidate">Candidate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus | "all")}>
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

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={users.length > 0 && users.every((u) => selectedUsers.includes(u.id))}
                    onCheckedChange={() => selectAllVisible()}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8" />
                      <p>No users found</p>
                      {(debouncedSearch || roleFilter !== "all" || statusFilter !== "all") && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("")
                            setRoleFilter("all")
                            setStatusFilter("all")
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() =>
                          setSelectedUsers((prev) =>
                            prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={user.full_name}
                          avatar={user.avatar}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          user.role === "admin" && "border-purple-200 text-purple-700",
                          user.role === "employer" && "border-blue-200 text-blue-700",
                          user.role === "agency" && "border-teal-200 text-teal-700",
                          user.role === "candidate" && "border-green-200 text-green-700"
                        )}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.company_name || user.agency_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          user.status === "active" && "bg-green-100 text-green-700",
                          user.status === "pending" && "bg-amber-100 text-amber-700",
                          user.status === "suspended" && "bg-red-100 text-red-700"
                        )}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResettingPasswordFor(user)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenImpersonateDialog(user)}>
                            <User className="mr-2 h-4 w-4" />
                            Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status !== "suspended" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenSuspendDialog(user)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 bg-background border rounded-lg shadow-lg">
              <span className="text-sm font-medium tabular-nums">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected
              </span>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => { setSuspendReason(""); setSuspendDuration("indefinite"); setBulkSuspendOpen(true) }}>
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  Suspend
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
              <div className="h-4 w-px bg-border" />
              <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export Users</DialogTitle>
            <DialogDescription>
              Download {totalCount.toLocaleString()} users matching your current filters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === "csv" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("csv")}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant={exportFormat === "xlsx" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportFormat("xlsx")}
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Suspend Dialog */}
      <Dialog open={bulkSuspendOpen} onOpenChange={setBulkSuspendOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suspend {selectedUsers.length} Users</DialogTitle>
            <DialogDescription>
              This will suspend the selected user accounts. They will lose access until reinstated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={suspendDuration} onValueChange={(v) => setSuspendDuration(v as typeof suspendDuration)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason for suspension..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkSuspend}
              disabled={!suspendReason || actionLoading === "bulk-suspend"}
            >
              {actionLoading === "bulk-suspend" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend Users"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => {
        setBulkDeleteOpen(open)
        if (!open) setDeleteConfirmText("")
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete {selectedUsers.length} Users</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected user accounts and their data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground-muted mb-2">
              Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkDeleteOpen(false); setDeleteConfirmText("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={actionLoading === "bulk-delete" || deleteConfirmText !== "DELETE"}
            >
              {actionLoading === "bulk-delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Users"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive an invitation email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Full Name</Label>
              <Input
                id="new-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}>
                <SelectTrigger id="new-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="candidate">Candidate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-company">Company (optional)</Label>
              <Input
                id="new-company"
                value={newUser.company}
                onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-invite"
                checked={newUser.sendInvite}
                onCheckedChange={(checked) => setNewUser({ ...newUser, sendInvite: checked === true })}
              />
              <Label htmlFor="send-invite" className="text-sm font-normal">
                Send password reset link via email
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!newUser.name || !newUser.email || actionLoading === "add"}
            >
              {actionLoading === "add" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="candidate">Candidate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value as UserStatus })}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={!editForm.name || !editForm.email || actionLoading === "edit"}
            >
              {actionLoading === "edit" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resettingPasswordFor} onOpenChange={(open) => !open && setResettingPasswordFor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Send a password reset link to this user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              A password reset link will be sent to{" "}
              <span className="font-medium text-foreground">{resettingPasswordFor?.email}</span>.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The link will expire in 24 hours.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResettingPasswordFor(null)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={actionLoading === "reset"}>
              {actionLoading === "reset" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate User Dialog */}
      <Dialog open={!!impersonatingUser} onOpenChange={(open) => !open && handleCloseImpersonateDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>
              You are about to view the platform as this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Security Warning</p>
                  <p className="mt-1">
                    Impersonation allows you to see the platform exactly as{" "}
                    <span className="font-medium">{impersonatingUser?.full_name}</span> ({impersonatingUser?.email}) sees it.
                    This action is logged for security purposes.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="impersonate-reason" className="text-sm font-medium">
                Reason for impersonation <span className="text-destructive">*</span>
              </Label>
              <input
                id="impersonate-reason"
                type="text"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="e.g. Investigating support ticket #1234"
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="impersonate-confirm"
                checked={impersonateConfirmed}
                onCheckedChange={(checked) => setImpersonateConfirmed(checked === true)}
              />
              <Label htmlFor="impersonate-confirm" className="text-sm font-normal">
                I understand this action is logged
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImpersonateDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleImpersonate}
              disabled={!impersonateConfirmed || !impersonateReason.trim() || actionLoading === "impersonate"}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading === "impersonate" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Impersonation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={!!suspendingUser} onOpenChange={(open) => !open && handleCloseSuspendDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend <span className="font-medium">{suspendingUser?.full_name}</span>&apos;s account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason for Suspension</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Explain why this user is being suspended..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suspend-duration">Duration</Label>
              <Select value={suspendDuration} onValueChange={(v) => setSuspendDuration(v as "indefinite" | "7" | "30" | "90")}>
                <SelectTrigger id="suspend-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              The user will be notified via email about this suspension.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSuspendDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspendUser}
              disabled={!suspendReason || actionLoading === "suspend"}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading === "suspend" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function StatCard({ title, value, color, icon, gradient }: { title: string; value: string; color?: string; icon?: React.ReactNode; gradient?: string }) {
  return (
    <Card className="relative overflow-hidden group">
      {gradient && (
        <>
          <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.10]", gradient.includes("green") ? "bg-green-500" : gradient.includes("amber") ? "bg-amber-500" : gradient.includes("red") ? "bg-red-500" : "bg-slate-500")} />
          <div className={cn("absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", gradient)} />
        </>
      )}
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && gradient && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm", gradient)}>
              {icon}
            </div>
          )}
        </div>
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            color === "green" && "text-green-600",
            color === "amber" && "text-amber-600",
            color === "red" && "text-red-600"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-1 h-8 w-16" />
      </CardContent>
    </Card>
  )
}
