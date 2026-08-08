import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useBusiness } from "@/context/BusinessContext";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, X, Package } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const DEFAULT_UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "dozen", "metre", "set", "bag", "quintal"];
const PAY_MODES = ["Cash", "UPI", "Credit", "Cheque", "Bank Transfer"];
const EMPTY_ITEM = { name: "", qty: 1, unit: "pcs", cost_price: "" };

export default function Purchases() {
  const { t } = useLang();
  const { category } = useBusiness();
  const UNITS = category?.units || DEFAULT_UNITS;
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [payMode, setPayMode] = useState("Cash");
  const [paid, setPaid] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/khata/purchases"),
      api.get("/khata/purchases/summary"),
      api.get("/business/inventory"),
    ]).then(([p, s, inv]) => {
      setPurchases(p.data);
      setSummary(s.data);
      setInventory(inv.data);
    }).catch(() => toast.error("Failed to load purchases"))
      .finally(() => setLoading(false));
  }, []);

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const u = [...items]; u[i] = { ...u[i], [field]: val }; setItems(u);
  };

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.cost_price) || 0), 0);

  const resetForm = () => {
    setSupplier(""); setItems([{ ...EMPTY_ITEM }]); setPayMode("Cash");
    setPaid(true); setDate(new Date().toISOString().slice(0, 10)); setNotes("");
    setShowForm(false);
  };

  const save = async () => {
    if (!supplier.trim()) { toast.error("Enter supplier name"); return; }
    const valid = items.filter(i => i.name && i.cost_price > 0);
    if (!valid.length) { toast.error(t("errorMsg")); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/khata/purchases", {
        supplier_name: supplier.trim(),
        items: valid.map(i => ({ name: i.name, qty: Number(i.qty), unit: i.unit, cost_price: Number(i.cost_price) })),
        payment_mode: payMode,
        paid,
        date,
        notes,
      });
      setPurchases([data, ...purchases]);
      // Refresh summary
      const s = await api.get("/khata/purchases/summary");
      setSummary(s.data);
      toast.success(`Purchase of ${fmt(data.total)} recorded. Inventory updated automatically.`);
      resetForm();
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const deletePurchase = async (p) => {
    if (!window.confirm(`Delete this purchase of ${fmt(p.total)} from ${p.supplier_name}?`)) return;
    await api.delete(`/khata/purchases/${p.id}`);
    setPurchases(purchases.filter(x => x.id !== p.id));
    toast.success("Deleted");
  };

  // Autocomplete suggestions from existing inventory
  const invNames = inventory.map(i => i.product_name);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="purchases-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">PURCHASES</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("purchases")}</h1>
            <p className="text-sm text-muted-foreground mt-1">Stock auto-updates when you record a purchase.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
            + Add Purchase
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-0 border-l border-t border-foreground/15 mb-6">
            <div className="border-r border-b border-foreground/15 p-5">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Purchases This Month</div>
              <div className="text-2xl font-black">{fmt(summary.total_purchases)}</div>
              <div className="text-xs text-muted-foreground mt-1">{summary.count} orders</div>
            </div>
            <div className="border-r border-b border-foreground/15 p-5">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">You Owe Suppliers</div>
              <div className={`text-2xl font-black ${summary.unpaid_to_suppliers > 0 ? "text-teal-500" : ""}`}>{fmt(summary.unpaid_to_suppliers)}</div>
              <div className="text-xs text-muted-foreground mt-1">credit purchases</div>
            </div>
            <div className="border-r border-b border-foreground/15 p-5">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Top Supplier</div>
              <div className="text-lg font-black truncate">{Object.keys(summary.by_supplier || {})[0] || "—"}</div>
              <div className="text-xs text-muted-foreground">{fmt(Object.values(summary.by_supplier || {})[0] || 0)}</div>
            </div>
          </div>
        )}

        {/* Add Purchase Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="purchase-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Record Purchase</div>
              <button onClick={resetForm}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-1">
                <label className="text-xs text-muted-foreground block mb-1">Supplier Name *</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="e.g. Raju Wholesalers" value={supplier} onChange={e => setSupplier(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <input type="date" className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Payment</label>
                <select className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={payMode} onChange={e => setPayMode(e.target.value)}>
                  {PAY_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <input type="checkbox" id="paid-cb" checked={paid} onChange={e => setPaid(e.target.checked)} />
              <label htmlFor="paid-cb" className="text-sm">Paid now</label>
              {!paid && <span className="text-xs text-teal-500 font-medium">Will show as amount you owe supplier</span>}
            </div>

            {/* Items */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-2">Items *</label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 mb-2">
                  <input className="col-span-5 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900"
                    placeholder="Product name"
                    value={item.name}
                    onChange={e => updateItem(idx, "name", e.target.value)}
                    list="inv-names"
                    data-testid={`purchase-item-name-${idx}`} />
                  <datalist id="inv-names">
                    {invNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                  <input type="number" min={0.01}
                    className="col-span-2 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900"
                    placeholder="Qty" value={item.qty}
                    onChange={e => updateItem(idx, "qty", e.target.value)} />
                  <select className="col-span-2 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900"
                    value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" min={0}
                    className="col-span-2 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900"
                    placeholder="₹ Cost" value={item.cost_price}
                    onChange={e => updateItem(idx, "cost_price", e.target.value)} />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="col-span-1 text-red-500 flex items-center justify-center">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="text-xs underline text-teal-600 mt-1">+ Add item</button>
            </div>

            <div className="text-right font-black mb-4">Total: {fmt(total)}</div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                placeholder="Any notes about this purchase" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 p-3 mb-4 text-xs text-blue-700 dark:text-blue-300">
              <Package size={12} className="inline mr-1" />
              Stock will be auto-updated in Inventory. Matching products will get +{items.reduce((s, i) => s + Number(i.qty || 0), 0)} units added.
            </div>

            <button onClick={save} disabled={saving} data-testid="save-purchase-btn"
              className="w-full bg-black text-white py-2.5 text-sm font-bold hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving…" : `Record Purchase — ${fmt(total)}`}
            </button>
          </div>
        )}

        {/* Purchases list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-foreground/15 text-sm">{t("noRecordsYet")}</div>
        ) : (
          <div className="border border-foreground/15">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Supplier</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Payment</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3 font-bold">{p.supplier_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                      {p.items?.map(i => `${i.name} ×${i.qty}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.payment_mode}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 font-medium ${p.paid ? "bg-green-100 text-green-700" : "bg-teal-100 text-teal-700"}`}>
                        {p.paid ? "Paid" : "Credit"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{fmt(p.total)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deletePurchase(p)} className="text-red-500 hover:text-red-700">
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-foreground/20 bg-secondary">
                <tr>
                  <td colSpan={5} className="px-4 py-3 font-bold text-sm">Total This Month</td>
                  <td className="px-4 py-3 text-right font-black">{fmt(summary?.total_purchases || 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
