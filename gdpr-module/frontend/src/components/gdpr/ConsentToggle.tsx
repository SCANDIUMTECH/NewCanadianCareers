"use client";

import React from "react";
import styles from "./gdpr.module.css";

interface ConsentToggleProps {
  serviceId: number;
  serviceName: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (serviceId: number, allowed: boolean) => void;
}

export function ConsentToggle({
  serviceId,
  serviceName,
  checked,
  disabled = false,
  onChange,
}: ConsentToggleProps) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(serviceId, e.target.checked)}
        aria-label={`Toggle ${serviceName}`}
      />
      <span className={styles.toggleSlider} />
    </label>
  );
}
