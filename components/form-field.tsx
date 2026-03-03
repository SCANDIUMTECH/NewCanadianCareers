"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  description?: string
  children?: React.ReactNode
}

/**
 * FormField wrapper component
 * Provides consistent styling for form fields with label, error display, and optional description
 */
export function FormField({
  label,
  htmlFor,
  error,
  required,
  description,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
      {description && !error && (
        <p className="text-xs text-foreground-muted">{description}</p>
      )}
    </div>
  )
}

export interface FormInputProps extends React.ComponentProps<typeof Input> {
  label: string
  error?: string
  required?: boolean
  description?: string
}

/**
 * FormInput - Input with built-in label and error handling
 */
export function FormInput({
  label,
  error,
  required,
  description,
  id,
  className,
  ...props
}: FormInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      error={error}
      required={required}
      description={description}
    >
      <Input
        id={inputId}
        className={cn(error && "border-destructive focus-visible:ring-destructive", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
    </FormField>
  )
}

export interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  label: string
  error?: string
  required?: boolean
  description?: string
}

/**
 * FormTextarea - Textarea with built-in label and error handling
 */
export function FormTextarea({
  label,
  error,
  required,
  description,
  id,
  className,
  ...props
}: FormTextareaProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-")

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      error={error}
      required={required}
      description={description}
    >
      <Textarea
        id={inputId}
        className={cn(error && "border-destructive focus-visible:ring-destructive", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
    </FormField>
  )
}
