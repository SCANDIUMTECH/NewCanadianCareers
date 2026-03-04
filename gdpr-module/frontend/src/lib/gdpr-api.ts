import type {
  BulkConsentResponse,
  ConsentCheckResponse,
  DataRequest,
  DataRequestFormData,
  GDPRPublicSettings,
  Service,
  ServiceCategory,
} from "@/types/gdpr";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api/gdpr${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function fetchPublicSettings(): Promise<{
  settings: GDPRPublicSettings;
  services: Service[];
  categories: ServiceCategory[];
}> {
  return apiFetch("/settings/");
}

export async function checkConsent(): Promise<ConsentCheckResponse> {
  return apiFetch("/consent/check/", { method: "POST" });
}

export async function updateConsent(
  serviceId: number,
  allowed: boolean
): Promise<{ status: string; service_id: number; allowed: boolean }> {
  return apiFetch("/consent/update/", {
    method: "POST",
    body: JSON.stringify({ service_id: serviceId, allowed }),
  });
}

export async function bulkConsent(
  action: "allow_all" | "decline_all"
): Promise<BulkConsentResponse> {
  return apiFetch("/consent/bulk/", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function acceptPolicy(
  policyType: "privacy_policy" | "terms_conditions"
): Promise<{ status: string }> {
  return apiFetch("/policy/accept/", {
    method: "POST",
    body: JSON.stringify({ policy_type: policyType }),
  });
}

export async function submitDataRequest(
  data: DataRequestFormData
): Promise<DataRequest> {
  return apiFetch("/requests/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── GeoIP (server-side) ───────────────────────────────────────────────────

/**
 * Check EU/EEA status via the backend GeoIP endpoint.
 * The backend uses CDN headers (CF-IPCountry, X-Country-Code) or optional
 * MaxMind GeoLite2 — no third-party JS calls needed (privacy-safe).
 */
export async function isEUVisitor(): Promise<boolean> {
  try {
    const data = await apiFetch<{ is_eu: boolean }>("/geo-ip/");
    return data.is_eu;
  } catch {
    // Default to showing the banner if GeoIP fails
    return true;
  }
}

// ─── Cookie Cleanup ────────────────────────────────────────────────────────

/**
 * Delete cookies by name. Used when a user revokes consent for a service —
 * the backend returns the `cookies` list for each service, and the frontend
 * removes them to enforce the revocation immediately.
 */
export function deleteCookies(
  cookieNames: string[],
  domain?: string
): void {
  if (typeof document === "undefined") return;

  for (const name of cookieNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    // Delete for the current path and root path
    const paths = ["/", window.location.pathname];
    // Delete with and without domain
    const domains = domain ? ["", domain, `.${domain}`] : [""];

    for (const p of paths) {
      for (const d of domains) {
        const domainPart = d ? `; domain=${d}` : "";
        document.cookie = `${trimmed}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${p}${domainPart}`;
      }
    }
  }
}

// ─── Bot Detection ──────────────────────────────────────────────────────────

const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebot/i, /ia_archiver/i,
];

export function isBot(): boolean {
  if (typeof navigator === "undefined") return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(navigator.userAgent));
}
