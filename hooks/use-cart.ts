"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

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
  discountType: "percentage" | "fixed"
  discountValue: number
}

interface CartState {
  items: CartItem[]
  promoCode: PromoCode | null
}

const CART_STORAGE_KEY = "orion_cart"

// TODO: In production, promo codes should be validated server-side to prevent
// client-side manipulation. These are demo codes for development purposes only.
const validPromoCodes: Record<string, Omit<PromoCode, "code">> = {
  SAVE20: { discountType: "percentage", discountValue: 20 },
  LAUNCH50: { discountType: "fixed", discountValue: 50 },
}

function getInitialState(): CartState {
  if (typeof window === "undefined") {
    return { items: [], promoCode: null }
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
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

  // Hydrate from localStorage on mount
  useEffect(() => {
    setState(getInitialState())
    setIsHydrated(true)
  }, [])

  // Persist to localStorage on changes
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
    setState((prev) => {
      const existingIndex = prev.items.findIndex((i) => i.id === item.id)
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
        items: [...prev.items, { ...item, quantity: 1 }],
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

  const applyPromoCode = useCallback((code: string): boolean => {
    const normalizedCode = code.toUpperCase().trim()
    const promoData = validPromoCodes[normalizedCode]

    if (promoData) {
      setState((prev) => ({
        ...prev,
        promoCode: { code: normalizedCode, ...promoData },
      }))
      return true
    }
    return false
  }, [])

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
      return (subtotal * state.promoCode.discountValue) / 100
    }
    return Math.min(state.promoCode.discountValue, subtotal)
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
