"use client"

/**
 * HTML sanitizer for rich text previews (client-only).
 *
 * Uses DOMPurify for robust XSS prevention. DOMPurify requires a DOM so it
 * only runs in the browser. During SSR pre-rendering the raw HTML is returned
 * unchanged — the client hydration pass will immediately sanitize it.
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

export function sanitizeHtml(html: string): string {
  // SSR guard — DOMPurify requires window/document
  if (typeof window === "undefined") return html

  // Lazy-load DOMPurify to avoid top-level window access during SSR bundling
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
