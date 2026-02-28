"use client"

import { type ReactNode, useEffect, useMemo, useState, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { motion } from "framer-motion"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react"
import { cn, getVisibleTextLength } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

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

export interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  error?: string
  characterCount?: { current: number; min: number }
}

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  minHeight = 200,
  error,
  characterCount,
}: TiptapEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [visibleCharCount, setVisibleCharCount] = useState(0)

  const extensions = useMemo(
    () => [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write the job description...",
      }),
    ],
    [placeholder]
  )

  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      setVisibleCharCount(getVisibleTextLength(html))
    },
  })

  useEffect(() => {
    if (!editor) return

    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false })
      setVisibleCharCount(getVisibleTextLength(value || ""))
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

  // Initialize character count on mount
  useEffect(() => {
    if (value) {
      setVisibleCharCount(getVisibleTextLength(value))
    }
  }, [])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previousUrl || "")

    if (url === null) return

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    // Validate URL protocol — only allow http(s) and mailto
    try {
      const parsed = new URL(url, window.location.origin)
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return
      }
    } catch {
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const charMin = characterCount?.min ?? 50
  const charCurrent = characterCount?.current ?? visibleCharCount
  const meetsMinimum = charCurrent >= charMin

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
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/60 bg-muted/30">
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
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

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
        className="p-4 overflow-auto"
        style={{ minHeight, resize: "vertical" }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Footer with character count */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/20">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Minimum {charMin} characters
          </p>
        )}
        <p
          className={cn(
            "text-xs font-medium",
            meetsMinimum ? "text-muted-foreground" : "text-amber-600"
          )}
        >
          {charCurrent} / {charMin}+
        </p>
      </div>
    </motion.div>
  )
}
