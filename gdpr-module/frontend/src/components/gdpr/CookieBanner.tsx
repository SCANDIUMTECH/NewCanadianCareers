"use client";

import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { useGDPR } from "@/hooks/useGDPR";
import styles from "./gdpr.module.css";

/**
 * Sanitize HTML using DOMPurify to prevent XSS via admin-configured banner text.
 * Only allows safe inline tags — no scripts, event handlers, or dangerous attributes.
 */
function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "span", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

export function CookieBanner() {
  const {
    settings,
    isBannerVisible,
    allowAll,
    declineAll,
    openPreferences,
    closeBanner,
  } = useGDPR();

  const sanitizedText = useMemo(
    () => (settings?.popup_text ? sanitizeHTML(settings.popup_text) : ""),
    [settings?.popup_text]
  );

  if (!isBannerVisible || !settings) return null;

  const positionClass = settings.popup_position === "top" ? styles.bannerTop : styles.bannerBottom;
  const styleClass =
    settings.popup_style === "overlay"
      ? styles.bannerOverlay
      : settings.popup_style === "small"
        ? styles.bannerSmall
        : settings.popup_style === "full_width_right"
          ? styles.bannerFullWidthRight
          : styles.bannerFullWidth;

  return (
    <>
      {settings.popup_style === "overlay" && (
        <div className={styles.backdrop} onClick={closeBanner} />
      )}
      <div
        className={`${styles.banner} ${positionClass} ${styleClass}`}
        style={{
          backgroundColor: settings.popup_bg_color,
          color: settings.popup_text_color,
        }}
        role="dialog"
        aria-label="Cookie consent"
      >
        <div className={styles.bannerContent}>
          <div
            className={styles.bannerText}
            dangerouslySetInnerHTML={{ __html: sanitizedText }}
          />
          {settings.privacy_policy_url && (
            <div className={styles.bannerPrivacyLink}>
              <a
                href={settings.privacy_policy_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: settings.popup_text_color }}
              >
                Privacy Policy
              </a>
            </div>
          )}
          <div className={styles.bannerActions}>
            <button
              className={styles.btnAgree}
              style={{
                backgroundColor: settings.agree_btn_bg_color,
                color: settings.agree_btn_text_color,
              }}
              onClick={allowAll}
            >
              {settings.popup_agree_text}
            </button>
            <button
              className={styles.btnDecline}
              style={{
                backgroundColor: settings.decline_btn_bg_color,
                color: settings.decline_btn_text_color,
              }}
              onClick={declineAll}
            >
              {settings.popup_decline_text}
            </button>
            <button
              className={styles.btnPreferences}
              style={{
                backgroundColor: settings.preferences_btn_bg_color,
                color: settings.preferences_btn_text_color,
              }}
              onClick={openPreferences}
            >
              {settings.popup_preferences_text}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
