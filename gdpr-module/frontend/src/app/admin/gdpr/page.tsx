"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface DataRequest {
  id: string;
  request_type: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  is_email_confirmed: boolean;
  created_at: string;
}

interface ConsentLogEntry {
  id: number;
  ip_address: string;
  consents: Record<string, boolean>;
  updated_at: string;
}

type Tab = "requests" | "consent-logs" | "settings";

export default function GDPRAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [consentLogs, setConsentLogs] = useState<ConsentLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (activeTab === "requests") fetchRequests();
    if (activeTab === "consent-logs") fetchConsentLogs();
  }, [activeTab]);

  async function adminFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${API_BASE}/api/gdpr/admin${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await adminFetch("/requests/");
      setRequests(data.results || data);
    } catch {
      setMessage("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchConsentLogs() {
    setLoading(true);
    try {
      const data = await adminFetch("/consent-logs/");
      setConsentLogs(data.results || data);
    } catch {
      setMessage("Failed to load consent logs.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAction(id: string, action: string) {
    try {
      await adminFetch(`/requests/${id}/action/`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setMessage(`Action '${action}' completed.`);
      fetchRequests();
    } catch {
      setMessage(`Failed to perform action '${action}'.`);
    }
  }

  async function handleDataBreach() {
    if (!confirm("Send data breach notification to ALL users?")) return;
    try {
      const result = await adminFetch("/data-breach/notify/", { method: "POST" });
      setMessage(`Data breach notification sent to ${result.users_notified} users.`);
    } catch {
      setMessage("Failed to send data breach notification.");
    }
  }

  async function handlePolicyUpdate() {
    if (!confirm("Send policy update notification to ALL users?")) return;
    try {
      const result = await adminFetch("/policy-update/notify/", { method: "POST" });
      setMessage(`Policy update notification sent to ${result.users_notified} users.`);
    } catch {
      setMessage("Failed to send policy update notification.");
    }
  }

  const typeLabels: Record<string, string> = {
    forget_me: "Forget Me",
    request_data: "Data Access",
    rectification: "Rectification",
    dpo_contact: "DPO Contact",
  };

  const statusColors: Record<string, string> = {
    pending: "#ff9800",
    confirmed: "#2196f3",
    processing: "#9c27b0",
    done: "#4caf50",
    rejected: "#f44336",
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>GDPR Admin Dashboard</h1>

      {message && (
        <div style={{ padding: "0.75rem", background: "#e3f2fd", borderRadius: 4, marginBottom: "1rem" }}>
          {message}
          <button onClick={() => setMessage("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>
            &times;
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid #e0e0e0" }}>
        {(["requests", "consent-logs", "settings"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.75rem 1.5rem",
              border: "none",
              background: activeTab === tab ? "#1a73e8" : "transparent",
              color: activeTab === tab ? "#fff" : "#555",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <div>
          <h2>Data Requests</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>Name</th>
                  <th style={{ padding: "0.5rem" }}>Email</th>
                  <th style={{ padding: "0.5rem" }}>Type</th>
                  <th style={{ padding: "0.5rem" }}>Status</th>
                  <th style={{ padding: "0.5rem" }}>Confirmed</th>
                  <th style={{ padding: "0.5rem" }}>Date</th>
                  <th style={{ padding: "0.5rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "0.5rem" }}>
                      {req.first_name} {req.last_name}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{req.email}</td>
                    <td style={{ padding: "0.5rem" }}>{typeLabels[req.request_type] || req.request_type}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <span
                        style={{
                          background: statusColors[req.status] || "#999",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.5rem" }}>{req.is_email_confirmed ? "Yes" : "No"}</td>
                    <td style={{ padding: "0.5rem" }}>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "0.5rem", display: "flex", gap: "0.25rem" }}>
                      {req.status !== "done" && (
                        <>
                          {req.request_type === "request_data" && (
                            <button onClick={() => handleRequestAction(req.id, "send_data")} style={actionBtn}>
                              Send Data
                            </button>
                          )}
                          {req.request_type === "forget_me" && (
                            <button onClick={() => handleRequestAction(req.id, "delete_data")} style={{ ...actionBtn, background: "#f44336" }}>
                              Delete Data
                            </button>
                          )}
                          <button onClick={() => handleRequestAction(req.id, "mark_done")} style={{ ...actionBtn, background: "#4caf50" }}>
                            Done
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "#999" }}>
                      No data requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Consent Logs Tab */}
      {activeTab === "consent-logs" && (
        <div>
          <h2>Consent Logs (Anonymous Visitors)</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>IP Address (Masked)</th>
                  <th style={{ padding: "0.5rem" }}>Consents</th>
                  <th style={{ padding: "0.5rem" }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {consentLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{log.ip_address}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {Object.entries(log.consents).map(([id, val]) => (
                        <span
                          key={id}
                          style={{
                            display: "inline-block",
                            margin: "1px 3px",
                            padding: "1px 6px",
                            background: val ? "#e8f5e9" : "#ffebee",
                            color: val ? "#2e7d32" : "#c62828",
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        >
                          {id}: {val ? "Yes" : "No"}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{new Date(log.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
                {consentLogs.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "1rem", textAlign: "center", color: "#999" }}>
                      No consent logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div>
          <h2>GDPR Actions</h2>
          <p style={{ color: "#666", marginBottom: "1rem" }}>
            Manage GDPR settings via the Django admin panel. Use the actions below
            for notifications.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={handleDataBreach} style={{ ...actionBtn, background: "#f44336", padding: "0.75rem 1.5rem" }}>
              Send Data Breach Notification
            </button>
            <button onClick={handlePolicyUpdate} style={{ ...actionBtn, background: "#ff9800", padding: "0.75rem 1.5rem" }}>
              Send Policy Update Notification
            </button>
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            <a href={`${API_BASE}/admin/gdpr/`}>Open Django Admin &rarr;</a>
          </p>
        </div>
      )}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  padding: "4px 10px",
  border: "none",
  borderRadius: 4,
  background: "#2196f3",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
};
