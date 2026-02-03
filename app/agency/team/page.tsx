"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionWrapper } from "@/components/motion-wrapper"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Agency Team Management
 * Agency-specific roles (Owner, Admin, Recruiter, Viewer) with multi-company access
 */

const teamMembers = [
  { 
    id: 1, 
    name: "Rachel Kim", 
    email: "rachel@talentbridge.io", 
    role: "Owner", 
    status: "active",
    lastActive: "Just now",
    jobsPosted: 24,
    initials: "RK"
  },
  { 
    id: 2, 
    name: "James Lee", 
    email: "james@talentbridge.io", 
    role: "Admin", 
    status: "active",
    lastActive: "2 hours ago",
    jobsPosted: 18,
    initials: "JL"
  },
  { 
    id: 3, 
    name: "Sarah Chen", 
    email: "sarah@talentbridge.io", 
    role: "Recruiter", 
    status: "active",
    lastActive: "Yesterday",
    jobsPosted: 12,
    initials: "SC"
  },
  { 
    id: 4, 
    name: "Michael Torres", 
    email: "michael@talentbridge.io", 
    role: "Viewer", 
    status: "active",
    lastActive: "3 days ago",
    jobsPosted: 0,
    initials: "MT"
  },
]

const pendingInvites = [
  { id: 1, email: "alex@talentbridge.io", role: "Recruiter", sentAt: "Jan 30, 2026" },
]

const rolePermissions = {
  Owner: ["Full access", "Manage billing", "Manage team", "Manage companies", "Post jobs"],
  Admin: ["Manage team", "Manage companies", "Post jobs", "View analytics"],
  Recruiter: ["Post jobs", "Manage own jobs", "View analytics"],
  Viewer: ["View jobs", "View analytics", "View reports"],
}

export default function AgencyTeamPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agency Team</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage your agency team members and their access
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
            onClick={() => setShowInviteDialog(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </Button>
        </div>
      </MotionWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Members */}
          <MotionWrapper delay={100}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    Team Members ({teamMembers.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-violet-600">
                            {member.initials}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{member.name}</p>
                            <RoleBadge role={member.role} />
                          </div>
                          <p className="text-sm text-foreground-muted">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-foreground">{member.jobsPosted} jobs</p>
                          <p className="text-xs text-foreground-muted">{member.lastActive}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Activity</DropdownMenuItem>
                            <DropdownMenuItem>Change Role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" disabled={member.role === "Owner"}>
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <MotionWrapper delay={150}>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Pending Invitations ({pendingInvites.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-background-secondary flex items-center justify-center">
                            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{invite.email}</p>
                              <RoleBadge role={invite.role} />
                            </div>
                            <p className="text-sm text-foreground-muted">Invited {invite.sentAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">Resend</Button>
                          <Button variant="ghost" size="sm" className="text-destructive">Cancel</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </MotionWrapper>
          )}
        </div>

        {/* Sidebar - Role Permissions */}
        <div>
          <MotionWrapper delay={200}>
            <Card className="border-border/50 shadow-sm sticky top-32">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Role Permissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(rolePermissions).map(([role, permissions]) => (
                  <div key={role}>
                    <div className="flex items-center gap-2 mb-2">
                      <RoleBadge role={role} />
                    </div>
                    <ul className="space-y-1">
                      {permissions.map((permission) => (
                        <li key={permission} className="flex items-center gap-2 text-sm text-foreground-muted">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {permission}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </MotionWrapper>
        </div>
      </div>

      {/* Invite Dialog */}
      <InviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Owner: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    Admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Recruiter: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Viewer: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  }

  return (
    <Badge variant="outline" className={cn("text-xs", styles[role])}>
      {role}
    </Badge>
  )
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("recruiter")
  const [error, setError] = useState("")
  const [touched, setTouched] = useState(false)

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return "Please enter an email address"
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address"
    }
    return ""
  }

  const handleSubmit = () => {
    const validationError = validateEmail(email)
    setError(validationError)
    if (!validationError) {
      // Handle submission
      setEmail("")
      setRole("recruiter")
      setError("")
      setTouched(false)
      onOpenChange(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setRole("recruiter")
    setError("")
    setTouched(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your agency team
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className={cn(error && "text-destructive")}>
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error && e.target.value) {
                  const newError = validateEmail(e.target.value)
                  setError(newError)
                }
              }}
              onBlur={() => {
                setTouched(true)
                setError(validateEmail(email))
              }}
              className={cn(error && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!error}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-foreground-muted">
              Recruiters can post and manage jobs. Admins can also manage team and companies.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary-hover text-primary-foreground">
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
