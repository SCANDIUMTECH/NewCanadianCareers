"use client"

import { useEffect, useState } from "react"

/**
 * Root-level error boundary for Next.js App Router.
 * Catches errors in app/layout.tsx itself. Must render its own <html>/<body>
 * since the root layout is unavailable when this boundary activates.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const isDev = process.env.NODE_ENV === "development"

  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#fafafa", color: "#18181b" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#71717a", marginBottom: 32, lineHeight: 1.6 }}>
            An unexpected error occurred. Please try again or return to the home page.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e4e4e7", backgroundColor: "white", cursor: "pointer", fontSize: 14, fontWeight: 500 }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", backgroundColor: "#3B5BDB", color: "white", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
            >
              Home
            </a>
          </div>

          {isDev && (
            <div style={{ marginTop: 24, textAlign: "left" }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#71717a" }}
              >
                {showDetails ? "Hide" : "Show"} Error Details
              </button>
              {showDetails && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f4f4f5", borderRadius: 8, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{error.name}: {error.message}</p>
                  {error.digest && <p>Digest: {error.digest}</p>}
                  {error.stack && (
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 10, maxHeight: 200, overflow: "auto", marginTop: 8 }}>
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  )
}
