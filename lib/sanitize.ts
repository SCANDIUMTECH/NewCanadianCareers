"use client"

/**
 * HTML sanitizer for rich text previews.
 *
 * Client-side: Uses DOMPurify for robust XSS prevention.
 * Server-side: Uses a lightweight regex sanitizer that strips dangerous
 * elements/attributes as defense-in-depth. The client hydration pass then
 * applies full DOMPurify sanitization.
 *
 * Allows safe formatting tags; strips scripts, iframes, forms, event handlers,
 * style attributes, and dangerous URI schemes.
 */

const ALLOWED_TAGS = [
  "p", "br", "b", "i", "em", "strong", "u", "s", "a",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "code", "span", "div", "hr", "table",
  "thead", "tbody", "tr", "th", "td", "sub", "sup",
  "figure", "figcaption", "img",
]

const ALLOWED_ATTR = ["href", "target", "rel", "class", "src", "alt", "width", "height"]

/**
 * Lightweight server-safe sanitizer — strips dangerous elements and attributes
 * without requiring a DOM. Not as thorough as DOMPurify, but prevents the most
 * critical XSS vectors (script injection, event handlers, dangerous URIs).
 */
function sanitizeHtmlServer(html: string): string {
  let result = html

  // Remove dangerous tags and their content
  result = result.replace(/<\s*(script|iframe|object|embed|form|style|link|meta|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
  // Remove self-closing/unclosed dangerous tags
  result = result.replace(/<\s*(script|iframe|object|embed|form|style|link|meta|base)\b[^>]*\/?>/gi, "")

  // Remove event handler attributes (on*)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")

  // Remove javascript:, vbscript:, data: URIs from href/src attributes
  result = result.replace(/(href|src)\s*=\s*(?:"[^"]*(?:javascript|vbscript|data)\s*:[^"]*"|'[^']*(?:javascript|vbscript|data)\s*:[^']*')/gi, "")

  // Remove style attributes (can contain expression() or url() vectors)
  result = result.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")

  return result
}

export function sanitizeHtml(html: string): string {
  // SSR: use lightweight regex sanitizer (defense-in-depth)
  if (typeof window === "undefined") return sanitizeHtmlServer(html)

  // Client: use DOMPurify for full sanitization
  // Lazy-load to avoid top-level window access during SSR bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require("dompurify") as typeof import("dompurify")["default"]

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer")
      if (!node.getAttribute("target")) {
        node.setAttribute("target", "_blank")
      }
    }
  })

  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    })
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes")
  }
}
