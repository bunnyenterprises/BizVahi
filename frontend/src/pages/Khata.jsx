import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, WhatsappLogo, Warning, X, CaretDown, CaretUp, Check } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Khata() {
  const { t } = useLang();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected customer
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("credit"); // "credit" | "payment"
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "overdue"
  const [bizSettings, setBizSettings] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/khata/summary"),
      api.get("/business/settings"),
    ]).then(([s, b]) => {
      setSummary(s.data);
      setBizSettings(b.data);
    }).catch(() => toast.error("Failed to load Khata"))
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    api.get("/khata/summary").then(r => setSummary(r.data));
  };

  const openAdd = (type, name = "") => {
    setFormType(type);
    setCustomerName(name);
    setAmount("");
    setDesc("");
    setDate(new Date().toISOString().slice(0, 10));
    setShowForm(true);
  };

  const save = async () => {
    if (!customerName.trim()) { toast.error("Enter customer name"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await api.post("/khata/entries", {
        customer_name: customerName.trim(),
        type: formType,
        amount: Number(amount),
        description: desc,
        date,
      });
      toast.success(formType === "credit" ? "Credit recorded" : "Payment recorded");
      setShowForm(false);
      refresh();
      if (selected?.customer_name === customerName.trim()) {
        // refresh selected customer entries too
        const fresh = await api.get("/khata/summary");
        const c = fresh.data.customers.find(x => x.customer_name === customerName.trim());
        setSelected(c || null);
      }
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsApp = (c) => {
    const shop = bizSettings?.business_name || "Our Store";
    const phone = bizSettings?.phone || "";
    const msg = `Dear ${c.customer_name},\n\nYour outstanding balance at *${shop}* is *${fmt(c.outstanding)}*.\n\nKindly pay at your earliest convenience.\n\nThank you,\n${shop}${phone ? `\nPh: ${phone}` : ""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const displayCustomers = (summary?.customers || []).filter(c =>
    filter === "overdue" ? c.overdue : c.outstanding > 0
  );

  const totalReceivable = summary?.total_receivable ?? 0;
  const overdueCount = summary?.overdue_count ?? 0;

  if (loading) return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="khata-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">KHATA / UDHAAR</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("khata")}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track credit given to customers. Send WhatsApp reminders.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openAdd("payment")} className="border border-foreground/20 px-4 py-2 text-sm font-medium hover:bg-secondary">
              + Payment Received
            </button>
            <button onClick={() => openAdd("credit")} className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
              + Give Credit
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-0 border-l border-t border-foreground/15 mb-6">
          <div className="border-r border-b border-foreground/15 p-5">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Total Outstanding</div>
            <div className="text-2xl font-black text-teal-500">{fmt(totalReceivable)}</div>
            <div className="text-xs text-muted-foreground mt-1">people owe you this</div>
          </div>
          <div className="border-r border-b border-foreground/15 p-5">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Customers with Balance</div>
            <div className="text-2xl font-black">{displayCustomers.length}</div>
          </div>
          <div className="border-r border-b border-foreground/15 p-5">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Overdue (&gt;30 days)</div>
            <div className={`text-2xl font-black ${overdueCount > 0 ? "text-red-500" : ""}`}>{overdueCount}</div>
          </div>
        </div>

        {/* Add Entry Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="khata-form">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button onClick={() => setFormType("credit")} className={`px-4 py-2 text-sm font-bold ${formType === "credit" ? "bg-black text-white" : "border border-foreground/20"}`}>
                  Give Credit (Udhaar)
                </button>
                <button onClick={() => setFormType("payment")} className={`px-4 py-2 text-sm font-bold ${formType === "payment" ? "bg-green-600 text-white" : "border border-foreground/20"}`}>
                  Payment Received
                </button>
              </div>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Customer Name *</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="e.g. Ravi Stores"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  list="khata-customers"
                  data-testid="khata-customer-input"
                />
                <datalist id="khata-customers">
                  {summary?.customers?.map(c => <option key={c.customer_name} value={c.customer_name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Amount (₹) *</label>
                <input
                  type="number" min={1}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  data-testid="khata-amount-input"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <input type="date" className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder={formType === "credit" ? "e.g. Rice and Dal supply" : "e.g. Cash payment"}
                  value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
            </div>
            <button onClick={save} disabled={saving} data-testid="khata-save-btn"
              className={`w-full py-2.5 text-sm font-bold text-white disabled:opacity-50 ${formType === "credit" ? "bg-black hover:bg-gray-800" : "bg-green-600 hover:bg-green-700"}`}>
              {saving ? "Saving…" : formType === "credit" ? `Record Credit${amount ? ` — ${fmt(Number(amount))}` : ""}` : `Record Payment${amount ? ` — ${fmt(Number(amount))}` : ""}`}
            </button>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {[["all", "All Outstanding"], ["overdue", "Overdue Only"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`text-xs px-3 py-1.5 border ${filter === v ? "bg-black text-white border-black" : "border-foreground/20 hover:bg-secondary"}`}>
              {l} {v === "overdue" && overdueCount > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full text-xs">{overdueCount}</span>}
            </button>
          ))}
        </div>

        {/* Customer list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Customer list */}
          <div>
            {displayCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-foreground/15 text-sm">
                {filter === "overdue" ? "No overdue accounts. Well done!" : "No outstanding balances. All clear!"}
              </div>
            ) : (
              <div className="border border-foreground/15 divide-y divide-foreground/10">
                {displayCustomers.map((c) => (
                  <div key={c.customer_name}
                    onClick={() => setSelected(selected?.customer_name === c.customer_name ? null : c)}
                    className={`p-4 cursor-pointer hover:bg-secondary transition-colors ${selected?.customer_name === c.customer_name ? "bg-secondary" : ""}`}
                    data-testid="khata-customer-row"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold truncate">{c.customer_name}</span>
                          {c.overdue && <Warning size={14} className="text-red-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Credit: {fmt(c.total_credit)} · Paid: {fmt(c.total_paid)}
                          {c.days_since_credit > 0 && ` · ${c.days_since_credit}d ago`}
                        </div>
                        {c.overdue && <div className="text-xs text-red-500 mt-1 font-medium">⚠️ Overdue — {c.days_since_credit} days</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-black ${c.outstanding > 0 ? "text-teal-500" : "text-green-600"}`}>
                          {fmt(c.outstanding)}
                        </div>
                        <div className="text-xs text-muted-foreground">outstanding</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={e => { e.stopPropagation(); openAdd("payment", c.customer_name); }}
                        className="text-xs bg-green-600 text-white px-3 py-1 hover:bg-green-700">
                        ✓ Payment
                      </button>
                      <button onClick={e => { e.stopPropagation(); openAdd("credit", c.customer_name); }}
                        className="text-xs border border-foreground/20 px-3 py-1 hover:bg-secondary">
                        + Credit
                      </button>
                      <button onClick={e => { e.stopPropagation(); sendWhatsApp(c); }}
                        className="text-xs bg-green-500 text-white px-3 py-1 hover:bg-green-600 flex items-center gap-1 ml-auto">
                        <WhatsappLogo size={12} /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Selected customer detail */}
          {selected && (
            <div className="border border-foreground/15 p-4" data-testid="khata-customer-detail">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-black text-lg">{selected.customer_name}</div>
                  <div className={`text-xl font-black ${selected.outstanding > 0 ? "text-teal-500" : "text-green-600"}`}>
                    {selected.outstanding > 0 ? `Owes you ${fmt(selected.outstanding)}` : `Settled ✓`}
                  </div>
                </div>
                <button onClick={() => setSelected(null)}><X size={16} /></button>
              </div>

              <button onClick={() => sendWhatsApp(selected)}
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 text-sm font-bold hover:bg-green-600 mb-4">
                <WhatsappLogo size={16} />
                Send WhatsApp Reminder — {fmt(selected.outstanding)}
              </button>

              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Transaction History</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(selected.entries || []).sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-foreground/10">
                    <div>
                      <div className="text-sm font-medium">{e.description || (e.type === "credit" ? "Credit given" : "Payment received")}</div>
                      <div className="text-xs text-muted-foreground">{e.date}</div>
                    </div>
                    <div className={`font-bold text-sm ${e.type === "credit" ? "text-teal-500" : "text-green-600"}`}>
                      {e.type === "credit" ? "+" : "-"}{fmt(e.amount)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-foreground/15 pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Total given on credit</span>
                <span className="font-bold">{fmt(selected.total_credit)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total payments received</span>
                <span className="font-bold text-green-600">{fmt(selected.total_paid)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1 font-black">
                <span>Balance outstanding</span>
                <span className={selected.outstanding > 0 ? "text-teal-500" : "text-green-600"}>{fmt(selected.outstanding)}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
