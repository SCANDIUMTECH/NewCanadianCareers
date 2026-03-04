"use client";

import React, { useMemo, useState } from "react";
import { useGDPR } from "@/hooks/useGDPR";
import { ConsentToggle } from "./ConsentToggle";
import styles from "./gdpr.module.css";

export function PrivacySettingsModal() {
  const {
    settings,
    services,
    categories,
    consents,
    isPreferencesOpen,
    closePreferences,
    updateConsent,
    updateCategoryConsent,
    allowAll,
    declineAll,
  } = useGDPR();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (!isPreferencesOpen || !settings) return null;

  const activeCatSlug = activeCategory || categories[0]?.slug || "";
  const filteredServices = services.filter(
    (s) => s.category_slug === activeCatSlug
  );

  // Compute category-level toggle state
  const isCategoryAllowed = filteredServices.length > 0 &&
    filteredServices
      .filter((s) => s.is_deactivatable)
      .every((s) => {
        const state = consents[String(s.id)];
        return state?.allowed ?? s.default_enabled;
      });

  // Check if any service in the category is deactivatable (toggleable)
  const isCategoryToggleable = filteredServices.some((s) => s.is_deactivatable);

  return (
    <>
      <div
        className={styles.modalBackdrop}
        onClick={settings.privacy_settings_backdrop_close ? closePreferences : undefined}
      />
      <div className={styles.modal} role="dialog" aria-label="Privacy Settings">
        <div className={styles.modalHeader}>
          <h2>Privacy Settings</h2>
          <button
            className={styles.modalClose}
            onClick={closePreferences}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Category Sidebar */}
          <nav className={styles.categorySidebar}>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className={`${styles.categoryItem} ${
                  activeCatSlug === cat.slug ? styles.categoryItemActive : ""
                }`}
                onClick={() => setActiveCategory(cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </nav>

          {/* Services Panel */}
          <div className={styles.servicesPanel}>
            {categories
              .filter((c) => c.slug === activeCatSlug)
              .map((cat) => (
                <div key={cat.slug} className={styles.categoryHeader}>
                  <div className={styles.categoryHeaderInfo}>
                    <h3>{cat.name}</h3>
                    <p className={styles.categoryDescription}>{cat.description}</p>
                  </div>
                  {/* Category-level toggle */}
                  {isCategoryToggleable && (
                    <div className={styles.categoryToggle}>
                      <span className={styles.categoryToggleLabel}>
                        {isCategoryAllowed ? "All enabled" : "All disabled"}
                      </span>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={isCategoryAllowed}
                          onChange={(e) =>
                            updateCategoryConsent(cat.slug, e.target.checked)
                          }
                          aria-label={`Toggle all ${cat.name} services`}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  )}
                </div>
              ))}

            <div className={styles.servicesList}>
              {filteredServices.map((service) => {
                const consentState = consents[String(service.id)];
                const isAllowed = consentState?.allowed ?? service.default_enabled;

                return (
                  <div key={service.id} className={styles.serviceItem}>
                    <div className={styles.serviceInfo}>
                      <strong>{service.name}</strong>
                      {service.description && (
                        <p>{service.description}</p>
                      )}
                    </div>
                    <ConsentToggle
                      serviceId={service.id}
                      serviceName={service.name}
                      checked={isAllowed}
                      disabled={!service.is_deactivatable}
                      onChange={updateConsent}
                    />
                  </div>
                );
              })}
              {filteredServices.length === 0 && (
                <p className={styles.noServices}>
                  No services in this category.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.btnAgree}
            onClick={allowAll}
            style={{
              backgroundColor: settings.agree_btn_bg_color,
              color: settings.agree_btn_text_color,
            }}
          >
            {settings.popup_agree_text}
          </button>
          <button
            className={styles.btnDecline}
            onClick={declineAll}
            style={{
              backgroundColor: settings.decline_btn_bg_color,
              color: settings.decline_btn_text_color,
            }}
          >
            {settings.popup_decline_text}
          </button>
          <button className={styles.btnSave} onClick={closePreferences}>
            Save Preferences
          </button>
        </div>
      </div>
    </>
  );
}
