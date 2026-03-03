"use client"

import { type ReactNode, useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useEditor, EditorContent, Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"

/**
 * Image node view — renders image with editable caption/credit fields in the editor.
 */
function ImageNodeView({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: {
  node: { attrs: Record<string, string | null> }
  updateAttributes: (attrs: Record<string, unknown>) => void
  selected: boolean
  deleteNode: () => void
}) {
  const { src, alt, caption, credit } = node.attrs

  return (
    <NodeViewWrapper className="my-6 group/img relative">
      <figure className="article-figure">
        <img
          src={src || ""}
          alt={alt || ""}
          className={cn(
            "rounded-lg max-w-full mx-auto block transition-shadow",
            selected && "ring-2 ring-primary/40 shadow-lg"
          )}
          data-drag-handle
        />
        <figcaption>
          <textarea
            value={caption || ""}
            onChange={e => updateAttributes({ caption: e.target.value || null })}
            onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px" }}
            placeholder="Add a caption..."
            rows={1}
            className="w-full text-sm text-muted-foreground bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/40 leading-relaxed resize-none overflow-hidden"
          />
          <input
            type="text"
            value={credit || ""}
            onChange={e => updateAttributes({ credit: e.target.value || null })}
            placeholder="Credit / Source"
            className="w-full text-[11px] uppercase tracking-[0.08em] text-muted-foreground/60 bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/30 mt-1"
          />
        </figcaption>
      </figure>
      <button
        type="button"
        onClick={deleteNode}
        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
        aria-label="Remove image"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </NodeViewWrapper>
  )
}

/**
 * Image node for TipTap with caption & credit support.
 * Renders as <figure> with <figcaption> when caption/credit are set,
 * plain <img> otherwise. Editor uses ReactNodeViewRenderer for inline editing.
 */
const ImageNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      caption: { default: null },
      credit: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (node) => {
          if (typeof node === "string") return false
          const img = node.querySelector("img")
          if (!img) return false

          const figcaption = node.querySelector("figcaption")
          const captionEl = figcaption?.querySelector(".caption-text")
          const creditEl = figcaption?.querySelector(".caption-credit") || figcaption?.querySelector("cite")

          let captionText = captionEl?.textContent || null
          const creditText = creditEl?.textContent || null

          // Fallback: use full figcaption text if no specific elements found
          if (!captionText && !creditText && figcaption) {
            captionText = figcaption.textContent || null
          }

          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            caption: captionText,
            credit: creditText,
          }
        },
      },
      { tag: "img[src]" },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { caption, credit, ...imgAttrs } = HTMLAttributes

    const hasCaption = caption?.trim()
    const hasCredit = credit?.trim()

    if (!hasCaption && !hasCredit) {
      return ["img", mergeAttributes({ class: "rounded-lg max-w-full mx-auto block" }, imgAttrs)]
    }

    const captionChildren: unknown[] = []
    if (hasCaption) {
      captionChildren.push(["span", { class: "caption-text" }, caption])
    }
    if (hasCredit) {
      captionChildren.push(["cite", { class: "caption-credit" }, credit])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return [
      "figure", { class: "article-figure" },
      ["img", mergeAttributes({ class: "rounded-lg max-w-full mx-auto block" }, imgAttrs)],
      ["figcaption", {}, ...captionChildren],
    ] as any
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})
import { motion } from "framer-motion"
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code2,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
  Upload,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function isImageFile(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type)
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  label: string
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8"
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  )
}

// ─── Image Upload Popover ───

function ImageUploadPopover({
  open,
  onOpenChange,
  onImageUpload,
  onInsertUrl,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImageUpload?: (file: File) => Promise<string>
  onInsertUrl: (url: string) => void
}) {
  const [mode, setMode] = useState<"upload" | "url">("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setMode(onImageUpload ? "upload" : "url")
      setIsDragging(false)
      setIsUploading(false)
      setUploadError("")
      setImageUrl("")
    }
  }, [open, onImageUpload])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!onImageUpload) return

    if (!isImageFile(file)) {
      setUploadError("Please select a PNG, JPG, WebP, or GIF image.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File is too large. Maximum size is 10MB.")
      return
    }

    setUploadError("")
    setIsUploading(true)

    try {
      const url = await onImageUpload(file)
      onInsertUrl(url)
      onOpenChange(false)
    } catch (err: unknown) {
      const message = (err && typeof err === "object" && "message" in err && typeof err.message === "string")
        ? err.message
        : "Upload failed. Please try again."
      setUploadError(message)
    } finally {
      setIsUploading(false)
    }
  }, [onImageUpload, onInsertUrl, onOpenChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl.trim()) return

    try {
      const parsed = new URL(imageUrl.trim())
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setUploadError("URL must start with http:// or https://")
        return
      }
    } catch {
      setUploadError("Please enter a valid URL.")
      return
    }

    onInsertUrl(imageUrl.trim())
    onOpenChange(false)
  }, [imageUrl, onInsertUrl, onOpenChange])

  return (
    <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
      {/* Tab bar */}
      <div className="flex border-b border-border/60">
        {onImageUpload && (
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
              mode === "upload"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Upload
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn(
            "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
            mode === "url"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          URL
        </button>
      </div>

      <div className="p-4">
        {mode === "upload" && onImageUpload ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            />
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                isUploading && "pointer-events-none opacity-60"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">
                    Drag & drop or click to upload
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    PNG, JPG, WebP, GIF &middot; Max 10MB
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleUrlSubmit}>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Image URL
            </label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={e => { setImageUrl(e.target.value); setUploadError("") }}
                placeholder="https://..."
                className="text-sm h-9"
                autoFocus
              />
              <Button type="submit" size="sm" className="h-9 px-3 flex-shrink-0">
                Insert
              </Button>
            </div>
          </form>
        )}

        {uploadError && (
          <p className="text-xs text-destructive mt-2">{uploadError}</p>
        )}
      </div>
    </PopoverContent>
  )
}

// ─── Main component ───

export interface ArticleTiptapEditorProps {
  value: string
  onChange: (html: string) => void
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
  minHeight?: number
  error?: string
}

export function ArticleTiptapEditor({
  value,
  onChange,
  onImageUpload,
  placeholder,
  minHeight = 500,
  error,
}: ArticleTiptapEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write your article content...",
      }),
      ImageNode,
    ],
    [placeholder]
  )

  // Upload a file and insert the resulting URL into the editor
  const uploadAndInsert = useCallback(async (file: File, editorInstance: ReturnType<typeof useEditor>) => {
    if (!onImageUpload || !editorInstance) return false
    if (!isImageFile(file)) return false
    if (file.size > MAX_FILE_SIZE) return false

    try {
      const url = await onImageUpload(file)
      editorInstance.chain().focus().insertContent({ type: "image", attrs: { src: url } }).run()
      return true
    } catch {
      return false
    }
  }, [onImageUpload])

  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-lg max-w-none focus:outline-none",
          "prose-headings:font-secondary",
          "prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4",
          "prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3",
          "prose-p:my-3 prose-p:leading-relaxed",
          "prose-li:my-1",
          "prose-ul:my-3 prose-ol:my-3",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-muted-foreground",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
          "prose-img:rounded-lg prose-img:mx-auto"
        ),
      },
      // Handle image drops directly onto the editor
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !onImageUpload) return false

        const files = event.dataTransfer?.files
        if (!files?.length) return false

        const file = files[0]
        if (!isImageFile(file)) return false

        event.preventDefault()

        // Resolve drop position and insert image there
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
        const insertPos = coordinates?.pos ?? view.state.selection.anchor

        onImageUpload(file).then(url => {
          const node = view.state.schema.nodes.image.create({ src: url })
          const tr = view.state.tr.insert(insertPos, node)
          view.dispatch(tr)
        }).catch(() => {
          // Silent fail — user can retry via toolbar
        })

        return true
      },
      // Handle image pastes from clipboard
      handlePaste: (view, event) => {
        if (!onImageUpload) return false

        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (!file) continue

            event.preventDefault()

            onImageUpload(file).then(url => {
              const { tr } = view.state
              const node = view.state.schema.nodes.image.create({ src: url })
              const transaction = tr.replaceSelectionWith(node)
              view.dispatch(transaction)
            }).catch(() => {
              // Silent fail
            })

            return true
          }
        }

        return false
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
  })

  useEffect(() => {
    if (!editor) return

    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return

    const onFocus = () => setIsFocused(true)
    const onBlur = () => setIsFocused(false)

    editor.on("focus", onFocus)
    editor.on("blur", onBlur)

    return () => {
      editor.off("focus", onFocus)
      editor.off("blur", onBlur)
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previousUrl || "")

    if (url === null) return

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    try {
      const parsed = new URL(url, window.location.origin)
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
        return
      }
    } catch {
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const insertImageUrl = useCallback((url: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({ type: "image", attrs: { src: url } }).run()
  }, [editor])

  if (!editor) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="h-10 border-b border-border/60" />
        <div className="p-4" style={{ minHeight }}>
          <div className="h-24 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-colors",
        error ? "border-destructive" : "border-border",
        isFocused && !error && "ring-2 ring-primary/20"
      )}
      initial={false}
      animate={{
        boxShadow: isFocused && !error
          ? "0 0 0 3px rgba(var(--primary-rgb), 0.1)"
          : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.15 }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/60 bg-muted/30 flex-wrap">
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        {/* Image button with popover */}
        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Insert image"
              title="Insert image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <ImageUploadPopover
            open={imagePopoverOpen}
            onOpenChange={setImagePopoverOpen}
            onImageUpload={onImageUpload}
            onInsertUrl={insertImageUrl}
          />
        </Popover>

        <div className="flex-1" />

        <ToolbarButton
          label="Undo"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div
        className="p-6 overflow-auto"
        style={{ minHeight, resize: "vertical" }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      {error && (
        <div className="px-3 py-2 border-t border-border/60 bg-muted/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </motion.div>
  )
}
