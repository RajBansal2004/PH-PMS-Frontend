"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
  AlertTriangle,
} from "lucide-react";
import { getClient, updateClient, employees as getEmployeesApi } from "@/lib/api";
import "./client-workflow.css";

type EditClientProps = {
  clientId: string;
};

export default function EditClient({ clientId }: EditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [employeeList, setEmployeeList] = useState<any[]>([]);

  const [form, setForm] = useState({
    clientCode: "",
    legalName: "",
    displayName: "",
    clientType: "Enterprise",
    industry: "Healthcare",
    website: "",
    pan: "",
    gstin: "",
    status: "ACTIVE",
    accountManagerId: "",
    billingModel: "Milestone Based",
    contractStart: "",
    contractEnd: "",
    notes: "",
    logo: "",
    // Address
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cData, empData] = await Promise.allSettled([
          getClient(clientId),
          getEmployeesApi().catch(() => []),
        ]);

        if (empData.status === "fulfilled" && empData.value) {
          const emps = Array.isArray(empData.value)
            ? empData.value
            : (empData.value as any)?.items || [];
          setEmployeeList(emps);
        }

        if (cData.status === "fulfilled" && cData.value) {
          const c = cData.value;
          setForm({
            clientCode: c.clientCode || "",
            legalName: c.legalName || c.name || "",
            displayName: c.displayName || c.name || "",
            clientType: c.clientType || "Enterprise",
            industry: c.industry || "Healthcare",
            website: c.website || "",
            pan: c.pan || "",
            gstin: c.gstin || "",
            status: c.status || "ACTIVE",
            accountManagerId: c.accountManagerId?._id || c.accountManagerId || "",
            billingModel: c.billingModel || "Milestone Based",
            contractStart: c.contractStart ? c.contractStart.slice(0, 10) : "",
            contractEnd: c.contractEnd ? c.contractEnd.slice(0, 10) : "",
            notes: c.notes || "",
            logo: c.logo || "",
            line1: c.billingAddress?.line1 || "",
            line2: c.billingAddress?.line2 || "",
            city: c.billingAddress?.city || "",
            state: c.billingAddress?.state || "",
            country: c.billingAddress?.country || "India",
            postalCode: c.billingAddress?.postalCode || "",
          });
        } else {
          setError("Failed to load client details from database.");
        }
      } catch (err: any) {
        setError(err?.message || "Error fetching client details");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [clientId]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError("Display Name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        legalName: form.legalName.trim() || form.displayName.trim(),
        displayName: form.displayName.trim(),
        industry: form.industry,
        website: form.website || null,
        pan: form.pan ? form.pan.toUpperCase() : null,
        gstin: form.gstin ? form.gstin.toUpperCase() : null,
        status: form.status,
        billingModel: form.billingModel,
        accountManagerId: form.accountManagerId || null,
        contractStart: form.contractStart ? new Date(form.contractStart) : null,
        contractEnd: form.contractEnd ? new Date(form.contractEnd) : null,
        notes: form.notes || null,
        logo: form.logo || null,
        billingAddress: {
          line1: form.line1 || null,
          line2: form.line2 || null,
          city: form.city || null,
          state: form.state || null,
          country: form.country || "India",
          postalCode: form.postalCode || null,
        },
      };

      await updateClient(clientId, payload);
      setNotice("Client updated successfully in database.");
      setTimeout(() => {
        router.push(`/clients/${clientId}`);
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="cw-page">
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
          Loading client information...
        </div>
      </main>
    );
  }

  return (
    <main className="cw-page">
      <div className="cw-heading">
        <div>
          <div className="cw-breadcrumb">
            <Link href="/clients">Client Management</Link>
            <span>›</span>
            <Link href={`/clients/${clientId}`}>Overview</Link>
            <span>›</span>
            <b>Edit Client</b>
          </div>
          <div className="cw-title-line">
            <h1>Edit Client: {form.displayName}</h1>
            <span className="cw-code-badge">{form.clientCode}</span>
          </div>
        </div>
        <button className="cw-secondary" onClick={() => router.push(`/clients/${clientId}`)}>
          <ArrowLeft size={14} /> Back to Overview
        </button>
      </div>

      {notice && (
        <div style={{ padding: "12px 18px", background: "#ecfdf5", color: "#065f46", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 18px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <section className="cw-panel" style={{ marginBottom: 20 }}>
          <h2>1. Basic Corporate Information</h2>
          <div className="cw-grid">
            <div className="cw-field" style={{ gridColumn: "span 2" }}>
              <span>Client Logo</span>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "#f8fafc"
                }}>
                  {form.logo ? (
                    <img src={form.logo} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <Building2 size={24} style={{ color: "#94a3b8" }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: "#2563eb",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "fit-content"
                  }}>
                    {form.logo ? "Change Logo" : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            handleChange("logo", reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {form.logo && (
                    <button
                      type="button"
                      onClick={() => handleChange("logo", "")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "left"
                      }}
                    >
                      Remove Logo (Use Default)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="cw-field">
              <span>Display / Trade Name *</span>
              <input
                required
                value={form.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="e.g. City Care Hospital"
              />
            </label>

            <label className="cw-field">
              <span>Legal Name</span>
              <input
                value={form.legalName}
                onChange={(e) => handleChange("legalName", e.target.value)}
                placeholder="e.g. City Care Healthcare Pvt Ltd"
              />
            </label>

            <label className="cw-field">
              <span>Industry</span>
              <select value={form.industry} onChange={(e) => handleChange("industry", e.target.value)}>
                <option>Healthcare</option>
                <option>Pharmaceuticals</option>
                <option>Diagnostics</option>
                <option>Medical Devices</option>
                <option>HealthTech / SaaS</option>
                <option>Insurance / TPA</option>
                <option>Government / PSU</option>
              </select>
            </label>

            <label className="cw-field">
              <span>Website</span>
              <input
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="e.g. https://citycare.org"
              />
            </label>

            <label className="cw-field">
              <span>GSTIN</span>
              <input
                value={form.gstin}
                onChange={(e) => handleChange("gstin", e.target.value)}
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </label>

            <label className="cw-field">
              <span>PAN</span>
              <input
                value={form.pan}
                onChange={(e) => handleChange("pan", e.target.value)}
                placeholder="e.g. ABCDE1234F"
              />
            </label>

            <label className="cw-field">
              <span>Client Status</span>
              <select value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <label className="cw-field">
              <span>Account Manager</span>
              <select
                value={form.accountManagerId}
                onChange={(e) => handleChange("accountManagerId", e.target.value)}
              >
                <option value="">Select Account Manager</option>
                {employeeList.map((emp) => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.displayName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="cw-panel" style={{ marginBottom: 20 }}>
          <h2>2. Registered Billing Address</h2>
          <div className="cw-grid">
            <label className="cw-field" style={{ gridColumn: "span 2" }}>
              <span>Address Line 1</span>
              <input
                value={form.line1}
                onChange={(e) => handleChange("line1", e.target.value)}
                placeholder="Building, street name"
              />
            </label>

            <label className="cw-field">
              <span>City</span>
              <input
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="e.g. Mumbai"
              />
            </label>

            <label className="cw-field">
              <span>State</span>
              <input
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </label>

            <label className="cw-field">
              <span>PIN / Postal Code</span>
              <input
                value={form.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="e.g. 400001"
              />
            </label>

            <label className="cw-field">
              <span>Country</span>
              <input
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="India"
              />
            </label>
          </div>
        </section>

        <section className="cw-panel" style={{ marginBottom: 24 }}>
          <h2>3. Commercial Engagement & Terms</h2>
          <div className="cw-grid">
            <label className="cw-field">
              <span>Billing Model</span>
              <select value={form.billingModel} onChange={(e) => handleChange("billingModel", e.target.value)}>
                <option>Milestone Based</option>
                <option>Time & Material</option>
                <option>Fixed Price</option>
                <option>Retainer</option>
                <option>Subscription</option>
              </select>
            </label>

            <label className="cw-field">
              <span>Contract Start Date</span>
              <input
                type="date"
                value={form.contractStart}
                onChange={(e) => handleChange("contractStart", e.target.value)}
              />
            </label>

            <label className="cw-field">
              <span>Contract End Date</span>
              <input
                type="date"
                value={form.contractEnd}
                onChange={(e) => handleChange("contractEnd", e.target.value)}
              />
            </label>

            <label className="cw-field" style={{ gridColumn: "span 2" }}>
              <span>Account Management Notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Special engagement clauses, delivery considerations..."
              />
            </label>
          </div>
        </section>

        <div className="cw-actions">
          <button type="button" className="cw-secondary" onClick={() => router.push(`/clients/${clientId}`)}>
            Cancel
          </button>
          <button type="submit" className="cw-primary" disabled={saving}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? "Saving Changes..." : "Save Client Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
