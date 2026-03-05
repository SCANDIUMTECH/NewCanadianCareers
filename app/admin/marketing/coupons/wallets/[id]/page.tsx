"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  getWallet,
  getWalletTransactions,
  issueCredit,
} from "@/lib/api/admin-marketing"
import type {
  StoreCreditWallet,
  StoreCreditTransaction,
} from "@/lib/api/admin-marketing"
import { ArrowLeft, Plus, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react"

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

const TXN_TYPE_COLORS: Record<string, string> = {
  credit: "border-green-200 text-green-600 bg-green-50",
  debit: "border-red-200 text-red-600 bg-red-50",
  refund: "border-sky/20 text-sky bg-sky/10",
  expired: "border-gray-200 text-gray-500 bg-gray-50",
}

export default function WalletDetailPage() {
  const params = useParams()
  const walletId = Number(params.id)

  const [wallet, setWallet] = useState<StoreCreditWallet | null>(null)
  const [transactions, setTransactions] = useState<StoreCreditTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showIssueDialog, setShowIssueDialog] = useState(false)
  const [issueAmount, setIssueAmount] = useState("")
  const [issueDescription, setIssueDescription] = useState("")
  const [isIssuing, setIsIssuing] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [walletData, txnData] = await Promise.all([
        getWallet(walletId),
        getWalletTransactions(walletId),
      ])
      setWallet(walletData)
      setTransactions(txnData.results)
    } catch (err) {
      console.error("Failed to fetch wallet:", err)
    } finally {
      setIsLoading(false)
    }
  }, [walletId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleIssueCredit = async () => {
    if (!issueAmount || !issueDescription) return
    setIsIssuing(true)
    try {
      await issueCredit(walletId, {
        amount: Number(issueAmount),
        description: issueDescription,
      })
      setShowIssueDialog(false)
      setIssueAmount("")
      setIssueDescription("")
      fetchData()
    } catch (err) {
      console.error("Failed to issue credit:", err)
    } finally {
      setIsIssuing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Wallet not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/marketing/coupons">Back to Coupons & Credits</Link>
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Breadcrumb + Header */}
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3">
          <Link href="/admin/marketing/coupons">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Coupons & Credits
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-sm shadow-primary/20">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {wallet.owner_name || "Unknown"}
              </h1>
              <p className="text-muted-foreground text-sm">
                <Badge variant="outline" className="text-xs capitalize mr-2">
                  {wallet.owner_type}
                </Badge>
                Store Credit Wallet
              </p>
            </div>
          </div>

          <Button onClick={() => setShowIssueDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Issue Credit
          </Button>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-primary-hover/[0.03]" />
          <CardContent className="pt-6 pb-6 relative">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-4xl font-bold mt-1 bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                ${Number(wallet.balance).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transactions yet
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs capitalize", TXN_TYPE_COLORS[txn.transaction_type])}
                      >
                        {txn.transaction_type === "credit" && (
                          <ArrowUpCircle className="mr-1 h-3 w-3" />
                        )}
                        {txn.transaction_type === "debit" && (
                          <ArrowDownCircle className="mr-1 h-3 w-3" />
                        )}
                        {txn.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.description}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      txn.transaction_type === "credit" || txn.transaction_type === "refund"
                        ? "text-green-600"
                        : "text-red-600"
                    )}>
                      {txn.transaction_type === "credit" || txn.transaction_type === "refund"
                        ? "+"
                        : "-"}
                      ${Number(txn.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${Number(txn.balance_after).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {txn.admin_email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </motion.div>

      {/* Issue Credit Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Store Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={issueAmount}
                onChange={(e) => setIssueAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Reason for issuing credit..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleIssueCredit}
              disabled={isIssuing || !issueAmount || !issueDescription}
            >
              {isIssuing ? "Issuing..." : "Issue Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
