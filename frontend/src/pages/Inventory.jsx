import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useBusiness } from "@/context/BusinessContext";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, PencilSimple, Warning, X } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const CATEGORIES = ["General", "Raw Material", "Finished Goods", "Packaging", "Tools", "Electronics", "Clothing", "Food", "Medicine", "Other"];
const DEFAULT_UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "dozen", "metre", "set", "pair"];

const EMPTY = { product_name: "", category: "General", quantity: "", unit: "pcs", cost_price: "", selling_price: "", low_stock_alert: 5, hsn_code: "", gst_rate: 18 };
const GST_RATES = [0, 5, 12, 18, 28];

export default function Inventory() {
  const { t } = useLang();
  const { category } = useBusiness();
  const UNITS = category?.units || DEFAULT_UNITS;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    api.get("/business/inventory")
      .then(r => setItems(r.data))
      .catch(() => toast.error("Failed to load inventory"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => { setForm({ ...EMPTY }); setEditId(null); setShowForm(false); };

  const startEdit = (item) => {
    setForm({ ...item });
    setEditId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveItem = async () => {
    if (!form.product_name || form.quantity === "") { toast.error("Product name and quantity are required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        low_stock_alert: Number(form.low_stock_alert) || 5,
        gst_rate: Number(form.gst_rate) || 0,
      };
      if (editId) {
        const { data } = await api.put(`/business/inventory/${editId}`, payload);
        setItems(items.map(i => i.id === editId ? data : i));
        toast.success("Item updated");
      } else {
        const { data } = await api.post("/business/inventory", payload);
        setItems([...items, data]);
        toast.success("Item added to inventory");
      }
      resetForm();
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.product_name}"?`)) return;
    try {
      await api.delete(`/business/inventory/${item.id}`);
      setItems(items.filter(i => i.id !== item.id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const filtered = items.filter(i =>
    !search || i.product_name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter(i => i.quantity <= i.low_stock_alert).length;
  const totalValue = items.reduce((s, i) => s + (i.quantity * (i.cost_price || 0)), 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="inventory-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">INVENTORY</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("inventory")}</h1>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            data-testid="add-inventory-btn"
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={15} weight="bold" /> Add Item
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-0 border-l border-t border-foreground/15 mb-6">
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Items</div>
            <div className="text-2xl font-black">{items.length}</div>
          </div>
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">Stock Value (Cost)</div>
            <div className="text-2xl font-black">{fmt(totalValue)}</div>
          </div>
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">Low Stock Alerts</div>
            <div className={`text-2xl font-black ${lowStockCount > 0 ? "text-teal-500" : ""}`}>{lowStockCount}</div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="inventory-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">{editId ? t("editItem") : t("addItem")}</div>
              <button onClick={resetForm}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Product Name *</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.product_name}
                  onChange={e => setForm({ ...form, product_name: e.target.value })}
                  placeholder="e.g. Basmati Rice 1kg"
                  data-testid="inv-product-name"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category</label>
                <select className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Unit</label>
                <select className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Current Quantity *</label>
                <input type="number" min={0}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Low Stock Alert (qty)</label>
                <input type="number" min={0}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.low_stock_alert} onChange={e => setForm({ ...form, low_stock_alert: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cost Price (₹)</label>
                <input type="number" min={0}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Selling Price (₹)</label>
                <input type="number" min={0}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })}
                  placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">HSN Code (for GST bills)</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.hsn_code} onChange={e => setForm({ ...form, hsn_code: e.target.value })}
                  placeholder="e.g. 1006" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">GST Rate</label>
                <select className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={form.gst_rate} onChange={e => setForm({ ...form, gst_rate: e.target.value })}>
                  {GST_RATES.map(r => <option key={r} value={r}>GST {r}%</option>)}
                </select>
              </div>
            </div>
            {form.cost_price > 0 && form.selling_price > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Margin: ₹{(form.selling_price - form.cost_price).toFixed(2)} ({((form.selling_price - form.cost_price) / form.selling_price * 100).toFixed(1)}%)
              </div>
            )}
            <button onClick={saveItem} disabled={saving} data-testid="save-inv-btn"
              className="w-full mt-4 bg-black text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? t("saving") : (editId ? t("update") : t("addNew"))}
            </button>
          </div>
        )}

        <input
          className="w-full border border-foreground/20 p-2.5 text-sm mb-4 bg-white dark:bg-gray-900"
          placeholder="Search by name or category…"
          value={search} onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t("noItems")}</div>
        ) : (
          <div className="border border-foreground/15">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Product</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-2">Qty</th>
                  <th className="text-right px-4 py-2 hidden sm:table-cell">Cost</th>
                  <th className="text-right px-4 py-2 hidden sm:table-cell">Sell</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isLow = item.quantity <= item.low_stock_alert;
                  return (
                    <tr key={item.id} className={`border-t border-foreground/10 ${isLow ? "bg-teal-50 dark:bg-teal-950/20" : ""}`}>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {isLow && <Warning size={14} className="text-teal-500 shrink-0" />}
                          {item.product_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.category}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isLow ? "text-teal-500" : ""}`}>
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{fmt(item.cost_price)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{fmt(item.selling_price)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => startEdit(item)} className="text-blue-500 hover:text-blue-700 mr-3">
                          <PencilSimple size={15} />
                        </button>
                        <button onClick={() => deleteItem(item)} className="text-red-500 hover:text-red-700">
                          <Trash size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
