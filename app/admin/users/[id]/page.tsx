"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
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

/**
 * Admin User Detail Page
 * View and manage individual user accounts
 */

// Mock user data
const mockUser = {
  id: "USR-001",
  name: "Sarah Chen",
  email: "sarah.chen@example.com",
  initials: "SC",
  avatar: null,
  role: "candidate", // candidate, company, agency, admin
  status: "active", // active, suspended, pending
  verified: true,
  createdAt: "2025-06-15",
  lastLogin: "2026-02-02T14:32:00Z",
  company: null,
  applications: 12,
  savedJobs: 8,
  alerts: 3,
}

const mockActivity = [
  { id: "1", action: "Applied to job", target: "Senior Product Designer at Acme Corp", timestamp: "2 hours ago" },
  { id: "2", action: "Saved job", target: "Full Stack Engineer at TechStart", timestamp: "1 day ago" },
  { id: "3", action: "Updated profile", target: "Resume updated", timestamp: "3 days ago" },
  { id: "4", action: "Created alert", target: "Product Designer in San Francisco", timestamp: "1 week ago" },
]

export default function AdminUserDetailPage() {
  const params = useParams()
  const [user, setUser] = useState(mockUser)
  const [isEditing, setIsEditing] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleSave = () => {
    setIsEditing(false)
  }

  const handleSuspend = () => {
    setUser({ ...user, status: user.status === "suspended" ? "active" : "suspended" })
    setSuspendDialogOpen(false)
  }

  const getRoleBadge = () => {
    switch (user.role) {
      case "admin":
        return <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20">Admin</Badge>
      case "company":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Company</Badge>
      case "agency":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Agency</Badge>
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Candidate</Badge>
    }
  }

  const getStatusBadge = () => {
    switch (user.status) {
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-foreground-muted">
        <Link href="/admin/users" className="hover:text-foreground transition-colors">Users</Link>
        <span>/</span>
        <span className="text-foreground">{user.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{user.name}</h1>
              {getRoleBadge()}
              {getStatusBadge()}
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
                onClick={() => setIsEditing(false)}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                Save Changes
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
                    <Label>Full Name</Label>
                    <Input
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={user.role}
                      onValueChange={(value) => setUser({ ...user, role: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candidate">Candidate</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input value={user.id} disabled className="font-mono" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <Label>Email Verified</Label>
                    <p className="text-sm text-foreground-muted">User has verified their email address</p>
                  </div>
                  <Switch
                    checked={user.verified}
                    onCheckedChange={(checked) => setUser({ ...user, verified: checked })}
                    disabled={!isEditing}
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
                <div className="flex justify-between items-center">
                  <span className="text-foreground-muted">Applications</span>
                  <span className="font-medium text-foreground">{user.applications}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground-muted">Saved Jobs</span>
                  <span className="font-medium text-foreground">{user.savedJobs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground-muted">Job Alerts</span>
                  <span className="font-medium text-foreground">{user.alerts}</span>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-foreground-muted">Joined</span>
                    <span className="font-medium text-foreground">{user.createdAt}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground-muted">Last Login</span>
                    <span className="font-medium text-foreground">
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </span>
                  </div>
                </div>
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
              <div className="space-y-4">
                {mockActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="text-foreground">{activity.action}</p>
                      <p className="text-sm text-foreground-muted">{activity.target}</p>
                    </div>
                    <span className="text-sm text-foreground-muted whitespace-nowrap">{activity.timestamp}</span>
                  </div>
                ))}
              </div>
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
                ? `Are you sure you want to reactivate ${user.name}'s account? They will regain access to the platform.`
                : `Are you sure you want to suspend ${user.name}'s account? They will be logged out and unable to access the platform.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              className={user.status === "suspended"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"}
            >
              {user.status === "suspended" ? "Reactivate" : "Suspend"}
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
              Are you sure you want to permanently delete {user.name}&apos;s account?
              This action cannot be undone. All data including applications, saved jobs, and alerts will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false)
                window.location.href = "/admin/users"
              }}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
