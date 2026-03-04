"use client";

import React from "react";
import { useGDPR } from "@/hooks/useGDPR";
import styles from "./gdpr.module.css";

export function PrivacySettingsTrigger() {
  const { settings, openPreferences, isBannerVisible } = useGDPR();

  if (
    !settings?.privacy_settings_trigger_enabled ||
    isBannerVisible
  ) {
    return null;
  }

  const positionMap: Record<string, string> = {
    bottom_left: styles.triggerBottomLeft,
    bottom_right: styles.triggerBottomRight,
    top_left: styles.triggerTopLeft,
    top_right: styles.triggerTopRight,
  };

  const posClass =
    positionMap[settings.privacy_settings_trigger_position] ||
    styles.triggerBottomLeft;

  return (
    <button
      className={`${styles.trigger} ${posClass}`}
      onClick={openPreferences}
      aria-label="Privacy Settings"
      style={{
        backgroundColor: settings.preferences_btn_bg_color,
        color: settings.preferences_btn_text_color,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}
