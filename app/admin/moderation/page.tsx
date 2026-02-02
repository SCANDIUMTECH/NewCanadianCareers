"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Sample moderation queue data
const moderationQueue = [
  {
    id: 1,
    type: "new_job",
    title: "Senior Software Engineer",
    company: "TechCorp Industries",
    submittedAt: "2 hours ago",
    flags: ["salary_missing"],
    content: "We are looking for a Senior Software Engineer to join our growing team...",
    salary: null,
    location: "Remote",
  },
  {
    id: 2,
    type: "flagged",
    title: "Marketing Specialist - URGENT!!!",
    company: "QuickHire Solutions",
    submittedAt: "4 hours ago",
    flags: ["spam_keywords", "excessive_caps"],
    content: "AMAZING OPPORTUNITY! Make $$$$ working from home! No experience needed!!!",
    salary: "$100,000+",
    location: "Remote",
    reports: 3,
  },
  {
    id: 3,
    type: "new_job",
    title: "Product Designer",
    company: "DesignCo Studio",
    submittedAt: "6 hours ago",
    flags: [],
    content: "Join our design team to create beautiful user experiences for enterprise clients...",
    salary: "$120,000 - $150,000",
    location: "New York, NY",
  },
  {
    id: 4,
    type: "reported",
    title: "Data Entry Clerk",
    company: "Unknown Corp",
    submittedAt: "1 day ago",
    flags: ["potential_scam"],
    content: "Easy work from home! Just enter data and earn big money. Send $50 to start...",
    salary: "$5,000/week",
    location: "Remote",
    reports: 12,
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

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedItem, setSelectedItem] = useState<typeof moderationQueue[0] | null>(null)
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | null>(null)
  const [reason, setReason] = useState("")

  const pendingItems = moderationQueue.filter((item) => item.type === "new_job" || item.type === "flagged")
  const reportedItems = moderationQueue.filter((item) => item.type === "reported" || item.reports)

  const handleAction = (action: "approve" | "reject") => {
    // Handle the moderation action
    setActionDialog(null)
    setSelectedItem(null)
    setReason("")
  }

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
          <h1 className="text-2xl font-semibold tracking-tight">Moderation Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and moderate job postings
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        <StatCard title="Pending Review" value="12" color="amber" />
        <StatCard title="Reported Jobs" value="4" color="red" />
        <StatCard title="Approved Today" value="28" color="green" />
        <StatCard title="Avg Response Time" value="2.4h" />
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending Review
              <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-amber-500">12</Badge>
            </TabsTrigger>
            <TabsTrigger value="reported">
              Reported
              <Badge className="ml-2 h-5 px-1.5 text-[10px]" variant="destructive">4</Badge>
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Queue List */}
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <ModerationCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>

              {/* Detail Panel */}
              <AnimatePresence mode="wait">
                {selectedItem ? (
                  <motion.div
                    key={selectedItem.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="sticky top-20">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{selectedItem.title}</CardTitle>
                            <CardDescription>{selectedItem.company}</CardDescription>
                          </div>
                          {selectedItem.reports && (
                            <Badge variant="destructive">
                              {selectedItem.reports} reports
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Flags */}
                        {selectedItem.flags.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Flags Detected</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedItem.flags.map((flag) => (
                                <Badge
                                  key={flag}
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-amber-700"
                                >
                                  {formatFlag(flag)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Job Details */}
                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Location</span>
                            <span>{selectedItem.location}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Salary</span>
                            <span>{selectedItem.salary || "Not specified"}</span>
                          </div>
                        </div>

                        {/* Content Preview */}
                        <div className="space-y-2 pt-2">
                          <p className="text-sm font-medium">Job Description</p>
                          <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            {selectedItem.content}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            className="flex-1"
                            onClick={() => setActionDialog("approve")}
                          >
                            <CheckIcon className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => setActionDialog("reject")}
                          >
                            <XIcon className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button variant="ghost" size="icon">
                            <FlagIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center rounded-lg border border-dashed h-[400px]"
                  >
                    <p className="text-muted-foreground">Select an item to review</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="reported" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                {reportedItems.map((item) => (
                  <ModerationCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
              {selectedItem && reportedItems.includes(selectedItem) && (
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedItem.title}</CardTitle>
                    <CardDescription>{selectedItem.company}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Detailed view for reported item
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Moderation history will be displayed here
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "approve" ? "Approve Job Posting" : "Reject Job Posting"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === "approve"
                ? "This job will be published immediately."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog === "reject" && (
            <Textarea
              placeholder="Enter reason for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog === "approve" ? "default" : "destructive"}
              onClick={() => handleAction(actionDialog!)}
            >
              {actionDialog === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function ModerationCard({
  item,
  isSelected,
  onClick,
}: {
  item: typeof moderationQueue[0]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {item.company.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.company}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{item.submittedAt}</span>
                {item.flags.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-200 text-amber-700">
                    {item.flags.length} flag{item.flags.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {item.reports && (
            <Badge variant="destructive" className="text-[10px]">
              {item.reports} reports
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold",
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

function formatFlag(flag: string): string {
  return flag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  )
}
