"use client";

import { useContext } from "react";
import { GDPRContext } from "@/components/gdpr/GDPRProvider";
import type { GDPRContextValue } from "@/types/gdpr";

export function useGDPR(): GDPRContextValue {
  const ctx = useContext(GDPRContext);
  if (!ctx) {
    throw new Error("useGDPR must be used within a <GDPRProvider>");
  }
  return ctx;
}
