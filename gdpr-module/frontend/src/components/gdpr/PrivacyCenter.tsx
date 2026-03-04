"use client";

import React from "react";
import { useGDPR } from "@/hooks/useGDPR";
import styles from "./gdpr.module.css";

interface PrivacyCenterItem {
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

interface PrivacyCenterProps {
  extraItems?: PrivacyCenterItem[];
}

export function PrivacyCenter({ extraItems = [] }: PrivacyCenterProps) {
  const { settings, openPreferences } = useGDPR();

  if (!settings) return null;

  const items: PrivacyCenterItem[] = [
    {
      title: "Privacy Settings",
      description: "Manage your cookie and tracking preferences.",
      onClick: openPreferences,
    },
  ];

  if (settings.forget_me_enabled) {
    items.push({
      title: "Right to Erasure",
      description: "Request deletion of your personal data.",
      href: "/privacy-center/forget-me",
    });
  }

  if (settings.request_data_enabled) {
    items.push({
      title: "Data Access",
      description: "Request a copy of your personal data.",
      href: "/privacy-center/request-data",
    });
  }

  if (settings.contact_dpo_enabled) {
    items.push({
      title: "Contact DPO",
      description: "Contact our Data Protection Officer.",
      href: "/privacy-center/contact-dpo",
    });
  }

  if (settings.data_rectification_enabled) {
    items.push({
      title: "Data Rectification",
      description: "Request correction of your personal data.",
      href: "/privacy-center/data-rectification",
    });
  }

  items.push(...extraItems);

  return (
    <div className={styles.privacyCenter}>
      <h1 className={styles.privacyCenterTitle}>Privacy Center</h1>
      <div className={styles.privacyCenterGrid}>
        {items.map((item, i) => (
          <div key={i} className={styles.privacyCenterCard}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.href ? (
              <a href={item.href} className={styles.privacyCenterLink}>
                Go &rarr;
              </a>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className={styles.privacyCenterLink}
              >
                Open &rarr;
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
