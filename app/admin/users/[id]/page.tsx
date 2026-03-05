"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/user-avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
import { Textarea } from "@/components/ui/textarea"
import {
  getAdminUser,
  updateAdminUser,
  deleteAdminUser,
  suspendUser,
  reactivateUser,
  getUserActivity,
  getUserLoginHistory,
  verifyUserEmail,
} from "@/lib/api/admin-users"
import type { AdminUserDetail, UserActivity, LoginAttempt } from "@/lib/admin/types"
import type { UserRole } from "@/lib/auth/types"

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  // Data state
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [activity, setActivity] = useState<UserActivity[]>([])
  const [activityPage, setActivityPage] = useState(1)
  const [hasMoreActivity, setHasMoreActivity] = useState(false)
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([])
  const [loginHistoryPage, setLoginHistoryPage] = useState(1)
  const [hasMoreLoginHistory, setHasMoreLoginHistory] = useState(false)

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true)
  const [isActivityLoading, setIsActivityLoading] = useState(true)
  const [isLoginHistoryLoading, setIsLoginHistoryLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [isEditing, setIsEditing] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [suspendDuration, setSuspendDuration] = useState<"indefinite" | "7" | "30" | "90">("indefinite")
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)

  // Form state for editing
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "" as UserRole,
    verified: false,
    is_marketing_admin: false,
    is_marketing_analyst: false,
  })

  // Fetch user data
  const fetchUser = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAdminUser(userId)
      setUser(data)
      // Initialize edit form with current values
      setEditForm({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: data.role,
        verified: data.email_verified,
        is_marketing_admin: data.is_marketing_admin,
        is_marketing_analyst: data.is_marketing_analyst,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Fetch activity
  const fetchActivity = useCallback(async (page: number = 1, append: boolean = false) => {
    setIsActivityLoading(true)
    try {
      const response = await getUserActivity(userId, { page, page_size: 10 })
      if (append) {
        setActivity((prev) => [...prev, ...response.results])
      } else {
        setActivity(response.results)
      }
      setHasMoreActivity(response.next !== null)
      setActivityPage(page)
    } catch (err) {
      console.error("Failed to load activity:", err)
    } finally {
      setIsActivityLoading(false)
    }
  }, [userId])

  // Fetch login history
  const fetchLoginHistory = useCallback(async (page: number = 1, append: boolean = false) => {
    setIsLoginHistoryLoading(true)
    try {
      const response = await getUserLoginHistory(userId, { page, page_size: 15 })
      if (append) {
        setLoginHistory((prev) => [...prev, ...response.results])
      } else {
        setLoginHistory(response.results)
      }
      setHasMoreLoginHistory(response.next !== null)
      setLoginHistoryPage(page)
    } catch (err) {
      console.error("Failed to load login history:", err)
    } finally {
      setIsLoginHistoryLoading(false)
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchUser()
    fetchActivity()
    fetchLoginHistory()
  }, [fetchUser, fetchActivity, fetchLoginHistory])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateAdminUser(user.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        role: editForm.role,
        email_verified: editForm.verified,
        is_marketing_admin: editForm.is_marketing_admin,
        is_marketing_analyst: editForm.is_marketing_analyst,
      })
      setUser(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSuspend = async () => {
    if (!user) return
    setIsSaving(true)
    setError(null)
    try {
      if (user.status === "suspended") {
        // Reactivate
        const updated = await reactivateUser(user.id, { notify_user: true })
        setUser(updated)
      } else {
        // Suspend
        const updated = await suspendUser(user.id, {
          reason: suspendReason,
          duration: suspendDuration,
          notify_user: true,
        })
        setUser(updated)
      }
      setSuspendDialogOpen(false)
      setSuspendReason("")
      setSuspendDuration("indefinite")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    setIsSaving(true)
    setError(null)
    try {
      await deleteAdminUser(user.id)
      router.push("/admin/users")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
      setIsSaving(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCancelEdit = () => {
    if (user) {
      setEditForm({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        verified: user.email_verified,
        is_marketing_admin: user.is_marketing_admin,
        is_marketing_analyst: user.is_marketing_analyst,
      })
    }
    setIsEditing(false)
  }

  const handleVerifyEmail = async () => {
    setIsVerifyingEmail(true)
    try {
      await verifyUserEmail(userId)
      setUser((prev) => prev ? { ...prev, email_verified: true } : prev)
      setEditForm((prev) => ({ ...prev, verified: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify email")
    } finally {
      setIsVerifyingEmail(false)
    }
  }

  const handleLoadMoreActivity = () => {
    fetchActivity(activityPage + 1, true)
  }

  const handleLoadMoreLoginHistory = () => {
    fetchLoginHistory(loginHistoryPage + 1, true)
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Admin</Badge>
      case "employer":
        return <Badge className="bg-sky/10 text-sky border-sky/20">Company</Badge>
      case "agency":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Agency</Badge>
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Candidate</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
      case "suspended":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>
      default:
        return null
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  // Error state
  if (error && !user) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link href="/admin/users">Users</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Error</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Failed to load user</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/admin/users")}>
                  Back to Users
                </Button>
                <Button onClick={fetchUser}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) return null

  const fullName = `${user.first_name} ${user.last_name}`.trim()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href="/admin/users">Users</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="h-5 w-5 text-red-600" />
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
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={fullName}
            avatar={user.avatar}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{fullName}</h1>
              {getRoleBadge(user.role)}
              {getStatusBadge(user.status)}
            </div>
            <p className="text-foreground-muted">{user.email}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="bg-transparent"
              >
                Edit User
              </Button>
              {!user.email_verified && (
                <Button
                  variant="outline"
                  onClick={handleVerifyEmail}
                  disabled={isVerifyingEmail}
                  className="text-sky"
                >
                  {isVerifyingEmail ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSuspendDialogOpen(true)}
                className={user.status === "suspended" ? "text-emerald-600" : "text-amber-600"}
              >
                {user.status === "suspended" ? "Reactivate" : "Suspend"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-background-secondary/50 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info */}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={isEditing ? editForm.first_name : user.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={isEditing ? editForm.last_name : user.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={isEditing ? editForm.email : user.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={isEditing ? editForm.role : user.role}
                      onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candidate">Candidate</SelectItem>
                        <SelectItem value="employer">Company</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input value={String(user.id)} disabled className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={user.phone || "Not provided"} disabled />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <Label>Email Verified</Label>
                    <p className="text-sm text-foreground-muted">User has verified their email address</p>
                  </div>
                  <Switch
                    checked={isEditing ? editForm.verified : user.email_verified}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, verified: checked })}
                    disabled={!isEditing}
                  />
                </div>

                {/* Marketing Roles */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <Label>Marketing Admin</Label>
                    <p className="text-sm text-foreground-muted">Full access to marketing module (campaigns, coupons, journeys)</p>
                  </div>
                  <Switch
                    checked={isEditing ? editForm.is_marketing_admin : user.is_marketing_admin}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, is_marketing_admin: checked, ...(checked ? { is_marketing_analyst: false } : {}) })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <Label>Marketing Analyst</Label>
                    <p className="text-sm text-foreground-muted">Read-only access to marketing reports and dashboards</p>
                  </div>
                  <Switch
                    checked={isEditing ? editForm.is_marketing_analyst : user.is_marketing_analyst}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, is_marketing_analyst: checked, ...(checked ? { is_marketing_admin: false } : {}) })}
                    disabled={!isEditing || (isEditing && editForm.is_marketing_admin)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.role === "candidate" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">Applications</span>
                      <span className="font-medium text-foreground">{user.applications_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">Saved Jobs</span>
                      <span className="font-medium text-foreground">{user.saved_jobs_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">Job Alerts</span>
                      <span className="font-medium text-foreground">{user.alerts_count}</span>
                    </div>
                  </>
                )}
                {(user.role === "employer" || user.role === "agency") && (
                  <div className="flex justify-between items-center">
                    <span className="text-foreground-muted">Jobs Posted</span>
                    <span className="font-medium text-foreground">{user.jobs_posted_count}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-foreground-muted">Joined</span>
                    <span className="font-medium text-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground-muted">Last Login</span>
                    <span className="font-medium text-foreground">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
                {user.company_detail && (
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">Company</span>
                      <Link
                        href={`/admin/companies/${user.company_detail.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {user.company_detail.name}
                      </Link>
                    </div>
                  </div>
                )}
                {user.agency_detail && (
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-muted">Agency</span>
                      <Link
                        href={`/admin/agencies/${user.agency_detail.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {user.agency_detail.name}
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isActivityLoading && activity.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                      <Skeleton className="w-2 h-2 rounded-full mt-2" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-8 text-foreground-muted">
                  <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        item.type === 'login'
                          ? item.status === 'success'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                          : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-foreground">{item.action}</p>
                          {item.type === 'login' && item.status && (
                            <Badge
                              className={
                                item.status === 'success'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : item.status === 'locked'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                              }
                            >
                              {item.status === 'success' ? 'Success' : item.status === 'locked' ? 'Locked' : 'Failed'}
                            </Badge>
                          )}
                        </div>
                        {item.target && (
                          <p className="text-sm text-foreground-muted">{item.target}</p>
                        )}
                        {/* Show IP and Location for login activities */}
                        {item.type === 'login' && (item.ip_address || item.location) && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-foreground-muted">
                            {item.ip_address && (
                              <span className="font-mono">{item.ip_address}</span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3" />
                                {item.location}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-foreground-muted whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {hasMoreActivity && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={handleLoadMoreActivity}
                      disabled={isActivityLoading}
                    >
                      {isActivityLoading ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Login History</CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-foreground-muted">Success</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-foreground-muted">Failed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-foreground-muted">Locked</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoginHistoryLoading && loginHistory.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                </div>
              ) : loginHistory.length === 0 ? (
                <div className="text-center py-8 text-foreground-muted">
                  <ShieldIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No login attempts recorded</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-foreground-muted uppercase tracking-wider bg-background-secondary/30 rounded-t-lg">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-3">Date & Time</div>
                    <div className="col-span-2">IP Address</div>
                    <div className="col-span-3">Location</div>
                    <div className="col-span-3">Reason</div>
                  </div>
                  {/* Table Body */}
                  <div className="divide-y divide-border/50">
                    {loginHistory.map((attempt) => (
                      <div key={attempt.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-background-secondary/20 transition-colors">
                        <div className="col-span-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            attempt.status === 'success'
                              ? 'bg-emerald-500'
                              : attempt.status === 'locked'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`} />
                        </div>
                        <div className="col-span-3 text-sm">
                          <div className="text-foreground">
                            {new Date(attempt.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-foreground-muted text-xs">
                            {new Date(attempt.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="font-mono text-sm text-foreground">{attempt.ip_address}</span>
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-1 text-sm text-foreground-muted">
                            <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{attempt.location || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="col-span-3">
                          {attempt.status === 'success' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              Success
                            </Badge>
                          ) : (
                            <Badge className={
                              attempt.status === 'locked'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-red-500/10 text-red-600 border-red-500/20'
                            }>
                              {attempt.failure_reason === 'invalid_credentials' && 'Invalid Credentials'}
                              {attempt.failure_reason === 'account_suspended' && 'Account Suspended'}
                              {attempt.failure_reason === 'account_locked' && 'Account Locked'}
                              {!attempt.failure_reason && attempt.status === 'failed' && 'Failed'}
                              {!attempt.failure_reason && attempt.status === 'locked' && 'Locked'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreLoginHistory && (
                    <Button
                      variant="ghost"
                      className="w-full mt-4"
                      onClick={handleLoadMoreLoginHistory}
                      disabled={isLoginHistoryLoading}
                    >
                      {isLoginHistoryLoading ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Summary Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Security Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-background-secondary/30">
                  <div className="text-2xl font-bold text-emerald-600">
                    {loginHistory.filter(a => a.status === 'success').length}
                  </div>
                  <div className="text-sm text-foreground-muted">Successful Logins</div>
                  <div className="text-xs text-foreground-muted mt-1">(showing recent)</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-background-secondary/30">
                  <div className="text-2xl font-bold text-red-600">
                    {loginHistory.filter(a => a.status === 'failed').length}
                  </div>
                  <div className="text-sm text-foreground-muted">Failed Attempts</div>
                  <div className="text-xs text-foreground-muted mt-1">(showing recent)</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-background-secondary/30">
                  <div className="text-2xl font-bold text-foreground">
                    {new Set(loginHistory.map(a => a.ip_address)).size}
                  </div>
                  <div className="text-sm text-foreground-muted">Unique IPs</div>
                  <div className="text-xs text-foreground-muted mt-1">(showing recent)</div>
                </div>
              </div>
              {loginHistory.filter(a => a.status === 'failed').length >= 3 && (
                <div className="mt-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      This account has had multiple failed login attempts. Consider reviewing the login history for suspicious activity.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div>
                  <p className="font-medium text-foreground">
                    {user.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {user.status === "suspended"
                      ? "Allow this user to access their account again"
                      : "Temporarily prevent this user from accessing their account"}
                  </p>
                  {user.status === "suspended" && user.suspension_reason && (
                    <p className="text-sm text-amber-600 mt-2">
                      Reason: {user.suspension_reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSuspendDialogOpen(true)}
                  className={user.status === "suspended" ? "text-emerald-600 border-emerald-500/20" : "text-amber-600 border-amber-500/20"}
                >
                  {user.status === "suspended" ? "Reactivate" : "Suspend"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="font-medium text-foreground">Delete Account</p>
                  <p className="text-sm text-foreground-muted">
                    Permanently delete this user account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
            </DialogTitle>
            <DialogDescription>
              {user.status === "suspended"
                ? `Are you sure you want to reactivate ${fullName}'s account? They will regain access to the platform.`
                : `Suspend ${fullName}'s account. They will be logged out and unable to access the platform.`}
            </DialogDescription>
          </DialogHeader>
          {user.status !== "suspended" && (
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={isSaving || (user.status !== "suspended" && !suspendReason)}
              className={user.status === "suspended"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {user.status === "suspended" ? "Reactivating..." : "Suspending..."}
                </>
              ) : (
                user.status === "suspended" ? "Reactivate" : "Suspend"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {fullName}&apos;s account?
              This action cannot be undone. All data including applications, saved jobs, and alerts will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Icons
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function Loader2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
