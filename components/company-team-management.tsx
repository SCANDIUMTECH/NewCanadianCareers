"use client"

import { useState, useEffect, useCallback } from "react"
import { cn, formatTimeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/user-avatar"
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
import {
  getCompanyMembers,
  getPendingInvites,
  inviteMember,
  updateMember,
  removeMember,
  resendInvite,
  cancelInvite,
  transferOwnership,
} from "@/lib/api/companies"
import { toast } from "sonner"
import type { TeamMember, PendingInvite, MemberRole } from "@/lib/company/types"

/**
 * Company Team Management Component
 * Reusable team management UI for embedding in Settings page.
 * Manages employer users with roles: Owner, Admin, Recruiter, Viewer
 */

const roles = [
  { value: "owner", label: "Owner", description: "Full control, billing, users" },
  { value: "admin", label: "Admin", description: "Manage jobs, users, analytics" },
  { value: "recruiter", label: "Recruiter", description: "Manage jobs only" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
]

function RoleBadge({ role }: { role: MemberRole }) {
  const styles: Record<MemberRole, string> = {
    owner: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    recruiter: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    viewer: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  }

  const labels: Record<MemberRole, string> = {
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

export function CompanyTeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferTarget, setTransferTarget] = useState<TeamMember | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<MemberRole>("recruiter")
  const [newRole, setNewRole] = useState<MemberRole>("recruiter")
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [members, invites] = await Promise.all([
        getCompanyMembers(),
        getPendingInvites().catch(() => []),
      ])
      setTeamMembers(members)
      setPendingInvites(invites)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  // Invite member
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setIsActionLoading(true)
    try {
      await inviteMember({ email: inviteEmail, role: inviteRole })
      setShowInviteDialog(false)
      setInviteEmail("")
      setInviteRole("recruiter")
      fetchTeamData()
    } catch (err) {
      console.error("Failed to invite member:", err)
      toast.error("Failed to invite member. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // Change role
  const handleChangeRole = async () => {
    if (!selectedMember) return
    setIsActionLoading(true)
    try {
      await updateMember(selectedMember.id, { role: newRole })
      setShowRoleDialog(false)
      setSelectedMember(null)
      fetchTeamData()
    } catch (err) {
      console.error("Failed to change role:", err)
      toast.error("Failed to change role. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // Remove member
  const handleRemoveMember = async () => {
    if (!selectedMember) return
    setIsActionLoading(true)
    try {
      await removeMember(selectedMember.id)
      setShowRemoveDialog(false)
      setSelectedMember(null)
      fetchTeamData()
    } catch (err) {
      console.error("Failed to remove member:", err)
      toast.error("Failed to remove member. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // Resend invite
  const handleResendInvite = async (invite: PendingInvite) => {
    try {
      await resendInvite(invite.id)
      fetchTeamData()
    } catch (err) {
      console.error("Failed to resend invite:", err)
      toast.error("Failed to resend invite. Please try again.")
    }
  }

  // Cancel invite
  const handleCancelInvite = async (invite: PendingInvite) => {
    try {
      await cancelInvite(invite.id)
      fetchTeamData()
    } catch (err) {
      console.error("Failed to cancel invite:", err)
      toast.error("Failed to cancel invite. Please try again.")
    }
  }

  // Transfer ownership
  const handleTransferOwnership = async () => {
    if (!transferTarget) return
    setIsActionLoading(true)
    try {
      await transferOwnership(transferTarget.id)
      setShowTransferDialog(false)
      setTransferTarget(null)
      toast.success(`Ownership transferred to ${transferTarget.user.full_name}`)
      fetchTeamData()
    } catch (err) {
      console.error("Failed to transfer ownership:", err)
      toast.error("Failed to transfer ownership. Please try again.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-background-secondary rounded-lg animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load team</h2>
        <p className="text-foreground-muted mb-6">{error}</p>
        <Button onClick={fetchTeamData}>Try Again</Button>
      </div>
    )
  }

  const activeMembers = teamMembers.filter(m => m.is_active)

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
          <p className="text-sm text-foreground-muted">Manage your team members and permissions</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-foreground-muted uppercase">Total Members</p>
            <p className="text-2xl font-semibold mt-1">{activeMembers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-foreground-muted uppercase">Pending Invites</p>
            <p className="text-2xl font-semibold mt-1">{pendingInvites.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-foreground-muted uppercase">Admins</p>
            <p className="text-2xl font-semibold mt-1">
              {activeMembers.filter(m => m.role === "admin" || m.role === "owner").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-foreground-muted uppercase">Recruiters</p>
            <p className="text-2xl font-semibold mt-1">
              {activeMembers.filter(m => m.role === "recruiter").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Active Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {/* Active Members */}
            {activeMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={member.user.full_name}
                    avatar={member.user.avatar}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.user.full_name}</p>
                    <p className="text-xs text-foreground-muted">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                    <p className="text-xs text-foreground-muted">Joined</p>
                    <p className="text-sm text-foreground">{formatTimeAgo(member.joined_at)}</p>
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
                          <DropdownMenuItem onClick={() => {
                            setSelectedMember(member)
                            setNewRole(member.role)
                            setShowRoleDialog(true)
                          }}>
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(member)
                              setShowRemoveDialog(true)
                            }}
                            className="text-destructive"
                          >
                            Remove from Team
                          </DropdownMenuItem>
                        </>
                      )}
                      {member.role === "owner" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setTransferTarget(null)
                              setShowTransferDialog(true)
                            }}
                          >
                            Transfer Ownership
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {/* Pending Invites */}
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4 hover:bg-background-secondary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={invite.email}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{invite.email}</p>
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    </div>
                    <p className="text-xs text-foreground-muted">Invitation sent</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <RoleBadge role={invite.role} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleResendInvite(invite)}>
                        Resend Invite
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCancelInvite(invite)}
                        className="text-destructive"
                      >
                        Cancel Invite
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {activeMembers.length === 0 && pendingInvites.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-foreground-muted mb-4">No team members yet</p>
                <Button onClick={() => setShowInviteDialog(true)}>Invite Your First Member</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Roles Reference */}
      <Card className="border-border/50 shadow-sm mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => (
              <div key={role.value} className="p-4 rounded-lg bg-background-secondary/50">
                <RoleBadge role={role.value as MemberRole} />
                <p className="text-sm text-foreground-muted mt-2">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              <Label htmlFor="team-invite-email">Email Address</Label>
              <Input
                id="team-invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
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
            <Button
              onClick={handleInvite}
              disabled={isActionLoading || !inviteEmail.trim()}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isActionLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.user.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as MemberRole)}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={isActionLoading}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isActionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.user.full_name} from your team?
              They will lose access to all company resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isActionLoading}
            >
              {isActionLoading ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Transfer company ownership to another team member. This action is permanent —
              you will be demoted to Admin and cannot undo this without the new owner&apos;s approval.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select New Owner</Label>
              <Select
                value={transferTarget?.id.toString() ?? ""}
                onValueChange={(v) => {
                  const member = activeMembers.find(m => m.id === Number(v))
                  setTransferTarget(member ?? null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers
                    .filter(m => m.role !== "owner")
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.user.full_name}</span>
                          <span className="text-foreground-muted text-xs">({member.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {transferTarget && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-700 font-medium">⚠️ Warning</p>
                <p className="text-sm text-amber-600 mt-1">
                  <span className="font-medium">{transferTarget.user.full_name}</span> will become the
                  new owner with full control over billing, team, and all company settings.
                  You will be changed to Admin role.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={isActionLoading || !transferTarget}
            >
              {isActionLoading ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
