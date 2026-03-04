"use client"

import React, { useState } from "react"
import type { DataRequestFormData, RequestType } from "@/lib/gdpr/types"
import { submitDataRequest } from "@/lib/api/gdpr"
import styles from "./gdpr.module.css"

interface GDPRFormProps {
  type: RequestType
  title: string
  description?: string
}

export function GDPRForm({ type, title, description }: GDPRFormProps) {
  const [formData, setFormData] = useState<DataRequestFormData>({
    request_type: type,
    first_name: "",
    last_name: "",
    email: "",
    message: "",
  })
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!privacyAccepted) {
      setErrorMessage("You must accept the privacy policy to submit this form.")
      setStatus("error")
      return
    }

    setStatus("submitting")
    setErrorMessage("")

    try {
      await submitDataRequest(formData)
      setStatus("success")
      setFormData({
        request_type: type,
        first_name: "",
        last_name: "",
        email: "",
        message: "",
      })
      setPrivacyAccepted(false)
    } catch (err) {
      setStatus("error")
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred. Please try again."
      )
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (status === "success") {
    return (
      <div className={styles.formContainer}>
        <div className={styles.alertSuccess}>
          {type === "dpo_contact" || type === "rectification"
            ? "Your request has been submitted. We will get back to you shortly."
            : "Your request has been submitted. Please check your email to confirm your request."}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>{title}</h2>
      {description && <p className={styles.formDescription}>{description}</p>}

      {status === "error" && (
        <div className={styles.alertError}>{errorMessage}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor={`${type}-first-name`}>First Name *</label>
            <input
              id={`${type}-first-name`}
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor={`${type}-last-name`}>Last Name *</label>
            <input
              id={`${type}-last-name`}
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor={`${type}-email`}>Email Address *</label>
          <input
            id={`${type}-email`}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor={`${type}-message`}>Message</label>
          <textarea
            id={`${type}-message`}
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formCheckbox}>
          <input
            id={`${type}-privacy`}
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            required
          />
          <label htmlFor={`${type}-privacy`}>
            I accept the Privacy Policy and consent to the processing of my
            personal data. *
          </label>
        </div>

        <button
          type="submit"
          className={styles.btnSubmit}
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  )
}

// ─── Convenience Components ─────────────────────────────────────────────────

export function ForgetMeForm() {
  return (
    <GDPRForm
      type="forget_me"
      title="Right to Erasure"
      description="Submit a request to have all your personal data deleted from our systems."
    />
  )
}

export function RequestDataForm() {
  return (
    <GDPRForm
      type="request_data"
      title="Data Access Request"
      description="Request a copy of all personal data we hold about you."
    />
  )
}

export function ContactDPOForm() {
  return (
    <GDPRForm
      type="dpo_contact"
      title="Contact Data Protection Officer"
      description="Send a message directly to our Data Protection Officer."
    />
  )
}

export function DataRectificationForm() {
  return (
    <GDPRForm
      type="rectification"
      title="Data Rectification"
      description="Request correction of inaccurate personal data we hold about you."
    />
  )
}
