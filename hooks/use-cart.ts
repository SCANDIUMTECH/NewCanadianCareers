"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { validatePromoCode } from "@/lib/api/billing"

export interface CartItem {
  id: string
  type: "package" | "credit-pack"
  name: string
  description: string
  credits: number
  unitPrice: number
  quantity: number
  popular?: boolean
}

interface PromoCode {
  code: string
  source: "coupon" | "promo_code"
  discountType: "percentage" | "fixed" | "credits" | "free_trial"
  discountValue: number
  maxDiscountAmount?: number | null
}

interface CartState {
  items: CartItem[]
  promoCode: PromoCode | null
}

const CART_STORAGE_KEY = "orion_cart"

function getInitialState(): CartState {
  if (typeof window === "undefined") {
    return { items: [], promoCode: null }
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        items: Array.isArray(parsed.items) ? parsed.items.map((i: CartItem) => ({ ...i, unitPrice: Number(i.unitPrice) || 0 })) : [],
        promoCode: parsed.promoCode || null,
      }
    }
  } catch {
    // Invalid data in localStorage
  }

  return { items: [], promoCode: null }
}

export function useCart() {
  const [state, setState] = useState<CartState>({ items: [], promoCode: null })
  const [isHydrated, setIsHydrated] = useState(false)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)

  useEffect(() => {
    setState(getInitialState())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
      } catch {
        // localStorage may be full or unavailable (e.g., private browsing)
      }
    }
  }, [state, isHydrated])

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    const safeItem = { ...item, unitPrice: Number(item.unitPrice) || 0 }
    setState((prev) => {
      const existingIndex = prev.items.findIndex((i) => i.id === safeItem.id)
      if (existingIndex >= 0) {
        const newItems = [...prev.items]
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: Math.min(newItems[existingIndex].quantity + 1, 10),
        }
        return { ...prev, items: newItems }
      }
      return {
        ...prev,
        items: [...prev.items, { ...safeItem, quantity: 1 }],
      }
    })
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1 || quantity > 10) return

    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }))
  }, [])

  const clearCart = useCallback(() => {
    setState({ items: [], promoCode: null })
  }, [])

  const applyPromoCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedCode = code.toUpperCase().trim()
      if (!normalizedCode) return { success: false, error: "Please enter a promo code" }

      setIsValidatingPromo(true)
      try {
        const result = await validatePromoCode(normalizedCode)
        if (result.valid) {
          setState((prev) => ({
            ...prev,
            promoCode: {
              code: result.code,
              source: result.source,
              discountType: result.discount_type,
              discountValue: result.discount_value,
              maxDiscountAmount: result.max_discount_amount,
            },
          }))
          return { success: true }
        }
        return { success: false, error: result.message || "Invalid promo code" }
      } catch {
        return { success: false, error: "Failed to validate promo code. Please try again." }
      } finally {
        setIsValidatingPromo(false)
      }
    },
    []
  )

  const removePromoCode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      promoCode: null,
    }))
  }, [])

  const subtotal = useMemo(() => {
    return state.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )
  }, [state.items])

  const discount = useMemo(() => {
    if (!state.promoCode) return 0

    if (state.promoCode.discountType === "percentage") {
      let d = (subtotal * state.promoCode.discountValue) / 100
      if (state.promoCode.maxDiscountAmount) {
        d = Math.min(d, state.promoCode.maxDiscountAmount)
      }
      return d
    }
    if (state.promoCode.discountType === "fixed") {
      return Math.min(state.promoCode.discountValue, subtotal)
    }
    // credits and free_trial don't reduce cart total directly
    return 0
  }, [state.promoCode, subtotal])

  const total = useMemo(() => {
    return Math.max(subtotal - discount, 0)
  }, [subtotal, discount])

  const itemCount = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0)
  }, [state.items])

  const totalCredits = useMemo(() => {
    return state.items.reduce(
      (sum, item) => sum + item.credits * item.quantity,
      0
    )
  }, [state.items])

  return {
    items: state.items,
    promoCode: state.promoCode,
    isHydrated,
    isValidatingPromo,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
    subtotal,
    discount,
    total,
    itemCount,
    totalCredits,
  }
}
