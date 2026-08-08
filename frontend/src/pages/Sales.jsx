import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, X } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const PAYMENT_MODES = ["Cash", "UPI", "Credit", "Cheque", "Bank Transfer"];
const EMPTY_ITEM = { name: "", qty: 1, price: "" };

export default function Sales() {
  const { t } = useLang();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/business/sales"),
      api.get("/business/customers"),
      api.get("/business/inventory"),
    ]).then(([s, c, inv]) => {
      setSales(s.data);
      setCustomers(c.data);
      setInventory(inv.data || []);
    }).catch(() => toast.error(t("errorMsg")))
      .finally(() => setLoading(false));
  }, []);

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };

    // Stock auto-fill: if the typed name exactly matches a stock item, fill its price in automatically
    if (field === "name") {
      const match = inventory.find(
        (p) => p.product_name?.toLowerCase() === val.toLowerCase()
      );
      if (match) {
        updated[idx].price = match.selling_price || updated[idx].price;
      }
    }

    setItems(updated);
  };

  const selectCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerId(c.id);
  };

  const resetForm = () => {
    setCustomerName(""); setCustomerId(""); setItems([{ ...EMPTY_ITEM }]);
    setPaymentMode("Cash"); setNotes(""); setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  };

  const saveSale = async () => {
    if (!items[0].name || !items[0].price) { toast.error(t("errorMsg")); return; }
    const validItems = items.filter(i => i.name && i.price > 0);
    if (!validItems.length) { toast.error(t("errorMsg")); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/business/sales", {
        customer_name: customerName || "Walk-in",
        customer_id: customerId || null,
        items: validItems.map(i => ({ name: i.name, qty: Number(i.qty), price: Number(i.price) })),
        payment_mode: paymentMode,
        date,
        notes,
      });
      setSales([data, ...sales]);
      toast.success(`${t("saved")} ${fmt(data.total)}`);
      resetForm();
    } catch (e) {
      toast.error(t("errorMsg"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm(`${t("confirmDeleteSale")} ${fmt(sale.total)}`)) return;
    try {
      await api.delete(`/business/sales/${sale.id}`);
      setSales(sales.filter(s => s.id !== sale.id));
      toast.success(t("deletedMsg"));
    } catch { toast.error(t("errorMsg")); }
  };

  const filtered = sales.filter(s =>
    !search || s.customer_name?.toLowerCase().includes(search.toLowerCase())
  );
  const monthTotal = sales.reduce((s, x) => s + (x.total || 0), 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="sales-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">{t("sales")}</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("salesEntry")}</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            data-testid="add-sale-btn"
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={15} weight="bold" /> {t("newSale")}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-0 border-l border-t border-foreground/15 mb-6">
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">{t("totalSalesLabel")}</div>
            <div className="text-2xl font-black">{fmt(monthTotal)}</div>
          </div>
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">{t("numSalesLabel")}</div>
            <div className="text-2xl font-black">{sales.length}</div>
          </div>
        </div>

        {/* Add Sale Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="sale-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">{t("newSale")}</div>
              <button onClick={resetForm}><X size={18} /></button>
            </div>

            {/* Customer */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">{t("customer")} {t("optional")}</label>
              <input
                className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                placeholder={`${t("walkIn")} / ${t("customer")}`}
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setCustomerId(""); }}
                list="customer-list"
              />
              <datalist id="customer-list">
                {customers.map(c => (
                  <option key={c.id} value={c.name} onClick={() => selectCustomer(c)} />
                ))}
              </datalist>
            </div>

            {/* Items */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1">{t("itemsLabel")} *</label>
              <datalist id="stock-item-list">
                {inventory.map(p => (
                  <option key={p.id} value={p.product_name} />
                ))}
              </datalist>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                    placeholder={t("itemNamePh")}
                    value={item.name}
                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                    data-testid={`item-name-${idx}`}
                    list="stock-item-list"
                  />
                  <input
                    type="number"
                    className="w-16 border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                    placeholder={t("qty")}
                    value={item.qty}
                    min={0.01}
                    onChange={(e) => updateItem(idx, "qty", e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-24 border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                    placeholder={`₹ ${t("pricePh")}`}
                    value={item.price}
                    min={0}
                    onChange={(e) => updateItem(idx, "price", e.target.value)}
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-red-500 px-1">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="text-xs underline text-teal-600 mt-1">{t("addItem")}</button>
            </div>

            {/* Total */}
            <div className="text-right font-bold mb-4">{t("total")}: {fmt(total)}</div>

            {/* Date, Payment, Notes */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t("date")}</label>
                <input
                  type="date"
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t("payment")}</label>
                <select
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-1">{t("notes")} {t("optional")}</label>
              <input
                className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={saveSale}
              disabled={saving}
              data-testid="save-sale-btn"
              className="w-full bg-black text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? t("saving") : `${t("save")} — ${fmt(total)}`}
            </button>
          </div>
        )}

        {/* Search */}
        <input
          className="w-full border border-foreground/20 p-2.5 text-sm mb-4 bg-white dark:bg-gray-900"
          placeholder={t("searchCustomerPh")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Sales Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t("noSalesEmptyMsg")}</div>
        ) : (
          <div className="border border-foreground/15">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">{t("customer")}</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">{t("itemsLabel")}</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">{t("date")}</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">{t("payment")}</th>
                  <th className="text-right px-4 py-2">{t("total")}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3 font-medium">{s.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {s.items?.map(i => `${i.name} ×${i.qty}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.payment_mode}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(s.total)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteSale(s)} className="text-red-500 hover:text-red-700">
                        <Trash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-foreground/20 bg-secondary">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-bold text-sm">{t("total")}</td>
                  <td className="px-4 py-3 text-right font-black">{fmt(monthTotal)}</td>
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
