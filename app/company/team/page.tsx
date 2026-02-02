"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
 * Company Team Management
 * Manage employer users with roles: Owner, Admin, Recruiter, Viewer
 */

const teamMembers = [
  { id: 1, name: "Jane Doe", email: "jane@acme.com", role: "owner", status: "active", joinedAt: "Jan 1, 2025", lastActive: "Just now" },
  { id: 2, name: "Sarah Chen", email: "sarah@acme.com", role: "recruiter", status: "active", joinedAt: "Jan 15, 2026", lastActive: "2 hours ago" },
  { id: 3, name: "Mike Johnson", email: "mike@acme.com", role: "admin", status: "active", joinedAt: "Jan 10, 2026", lastActive: "Yesterday" },
  { id: 4, name: "Alex Rivera", email: "alex@acme.com", role: "viewer", status: "active", joinedAt: "Jan 20, 2026", lastActive: "3 days ago" },
  { id: 5, name: "pending@acme.com", email: "pending@acme.com", role: "recruiter", status: "pending", joinedAt: "-", lastActive: "-" },
]

const roles = [
  { value: "owner", label: "Owner", description: "Full control, billing, users" },
  { value: "admin", label: "Admin", description: "Manage jobs, users, analytics" },
  { value: "recruiter", label: "Recruiter", description: "Manage jobs only" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
]

export default function CompanyTeamPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("recruiter")

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <MotionWrapper delay={0}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team</h1>
            <p className="text-sm text-foreground-muted mt-1">Manage your team members and permissions</p>
          </div>
          <Button 
            onClick={() => setShowInviteDialog(true)}
            className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </Button>
        </div>
      </MotionWrapper>

      {/* Stats */}
      <MotionWrapper delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Total Members</p>
              <p className="text-2xl font-semibold mt-1">{teamMembers.filter(m => m.status === "active").length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Pending Invites</p>
              <p className="text-2xl font-semibold mt-1">{teamMembers.filter(m => m.status === "pending").length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Admins</p>
              <p className="text-2xl font-semibold mt-1">{teamMembers.filter(m => m.role === "admin" || m.role === "owner").length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground-muted uppercase">Recruiters</p>
              <p className="text-2xl font-semibold mt-1">{teamMembers.filter(m => m.role === "recruiter").length}</p>
            </CardContent>
          </Card>
        </div>
      </MotionWrapper>

      {/* Team List */}
      <MotionWrapper delay={200}>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={cn(
                        "font-medium",
                        member.status === "pending" ? "bg-slate-100 text-slate-500" : "bg-primary/10 text-primary"
                      )}>
                        {member.status === "pending" ? "?" : member.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {member.status === "pending" ? member.email : member.name}
                        </p>
                        {member.status === "pending" && (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted">
                        {member.status === "pending" ? "Invitation sent" : member.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-foreground-muted">Last active</p>
                      <p className="text-sm text-foreground">{member.lastActive}</p>
                    </div>
                    
                    <RoleBadge role={member.role} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {member.role !== "owner" && (
                          <>
                            <DropdownMenuItem>Change Role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {member.status === "pending" && (
                          <>
                            <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Cancel Invite</DropdownMenuItem>
                          </>
                        )}
                        {member.status === "active" && member.role !== "owner" && (
                          <DropdownMenuItem className="text-destructive">Remove from Team</DropdownMenuItem>
                        )}
                        {member.role === "owner" && (
                          <DropdownMenuItem>Transfer Ownership</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Roles Reference */}
      <MotionWrapper delay={300}>
        <Card className="border-border/50 shadow-sm mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {roles.map((role) => (
                <div key={role.value} className="p-4 rounded-lg bg-background-secondary/50">
                  <RoleBadge role={role.value} />
                  <p className="text-sm text-foreground-muted mt-2">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </MotionWrapper>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your company on Orion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => r.value !== "owner").map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-foreground-muted ml-2 text-xs">- {role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    recruiter: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    viewer: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  }

  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    recruiter: "Recruiter",
    viewer: "Viewer",
  }

  return (
    <Badge variant="outline" className={cn("text-xs capitalize", styles[role])}>
      {labels[role]}
    </Badge>
  )
}
