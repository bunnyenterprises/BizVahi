import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { ArrowRight, Check } from "@phosphor-icons/react";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = pick category, 2 = business details
  const [selectedCat, setSelectedCat] = useState(null);
  const [saving, setSaving] = useState(false);

  // Business details form
  const [bizName, setBizName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [upiId, setUpiId] = useState("");

  const selectCategory = (cat) => {
    setSelectedCat(cat);
    setTimeout(() => setStep(2), 300);
  };

  const save = async () => {
    if (!bizName.trim()) { toast.error("Enter your business name"); return; }
    setSaving(true);
    try {
      await api.put("/business/settings", {
        business_name: bizName.trim(),
        phone,
        gstin,
        address,
        state,
        upi_id: upiId,
        business_category: selectedCat.id,
        email: "",
        bank_name: "",
        account_no: "",
        ifsc: "",
      });
      toast.success(`Welcome to Business Vahi! Your ${selectedCat.label} profile is ready.`);
      navigate("/dashboard");
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: "#0A0A0A" }}>Business Vahi</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Step {step} of 2</div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>

        {/* STEP 1 — Category Selection */}
        {step === 1 && (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
                WELCOME TO FINTR
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>
                What type of business do you run?
              </h1>
              <p style={{ fontSize: 15, color: "#6b7280" }}>
                We'll set up the app perfectly for your business — right units, right categories, right GST rates.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {BUSINESS_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  style={{
                    border: selectedCat?.id === cat.id ? `2px solid ${cat.color}` : "1px solid #e5e7eb",
                    borderRadius: 0,
                    padding: "20px 16px",
                    textAlign: "left",
                    background: selectedCat?.id === cat.id ? `${cat.color}10` : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                  data-testid={`category-${cat.id}`}
                >
                  {selectedCat?.id === cat.id && (
                    <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, background: cat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={12} weight="bold" color="#fff" />
                    </div>
                  )}
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{cat.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{cat.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — Business Details */}
        {step === 2 && selectedCat && (
          <>
            <button
              onClick={() => setStep(1)}
              style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Back
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, padding: 20, border: `2px solid ${selectedCat.color}`, background: `${selectedCat.color}08` }}>
              <div style={{ fontSize: 40 }}>{selectedCat.icon}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{selectedCat.label}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{selectedCat.desc}</div>
              </div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>
              Tell us about your business
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28 }}>
              This fills your GST invoices automatically. You can change this later in Settings.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6, fontWeight: 600 }}>Business Name *</label>
                <input
                  autoFocus
                  style={{ width: "100%", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  placeholder="e.g. Sharma General Store"
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  data-testid="onboarding-biz-name"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6, fontWeight: 600 }}>Phone Number</label>
                <input
                  style={{ width: "100%", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6, fontWeight: 600 }}>State</label>
                <select
                  style={{ width: "100%", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 14, background: "#fff", boxSizing: "border-box" }}
                  value={state}
                  onChange={e => setState(e.target.value)}
                >
                  {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6, fontWeight: 600 }}>GSTIN (optional)</label>
                <input
                  style={{ width: "100%", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
                  placeholder="22AAAAA0000A1Z5"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6, fontWeight: 600 }}>UPI ID (optional)</label>
                <input
                  style={{ width: "100%", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6, fontWeight: 600 }}>Business Address (optional)</label>
                <textarea
                  rows={2}
                  style={{ width: "100%", border: "1px solid #e5e7eb", padding: "10px 12px", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
                  placeholder="Shop address — shown on your GST invoices"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* What's pre-set for you */}
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                SET UP AUTOMATICALLY FOR YOUR BUSINESS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Stock Units</div>
                  <div style={{ color: "#6b7280" }}>{selectedCat.units.slice(0, 4).join(", ")}...</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>GST Rates</div>
                  <div style={{ color: "#6b7280" }}>{selectedCat.gst_rates.map(r => `${r}%`).join(", ")}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Expense Categories</div>
                  <div style={{ color: "#6b7280" }}>{selectedCat.expense_cats.slice(0, 3).join(", ")}...</div>
                </div>
                {selectedCat.sample_products.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Sample Products</div>
                    <div style={{ color: "#6b7280" }}>{selectedCat.sample_products.slice(0, 2).join(", ")}...</div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving || !bizName.trim()}
              data-testid="onboarding-save-btn"
              style={{
                width: "100%",
                background: saving ? "#9ca3af" : "#111",
                color: "#fff",
                border: "none",
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {saving ? "Setting up your account…" : <>Start using Business Vahi <ArrowRight size={18} /></>}
            </button>

            <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
              You can change all these details later in Settings
            </p>
          </>
        )}
      </div>
    </div>
  );
}
