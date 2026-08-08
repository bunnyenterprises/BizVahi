import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, PencilSimple, Phone, X } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const EMPTY = { name: "", phone: "", email: "", address: "", notes: "" };

export default function Customers() {
  const { t } = useLang();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    api.get("/business/customers")
      .then(r => setCustomers(r.data))
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => { setForm({ ...EMPTY }); setEditId(null); setShowForm(false); };

  const startEdit = (c) => {
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", notes: c.notes || "" });
    setEditId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveCustomer = async () => {
    if (!form.name.trim()) { toast.error("Customer name is required"); return; }
    setSaving(true);
    try {
      if (editId) {
        const { data } = await api.put(`/business/customers/${editId}`, form);
        setCustomers(customers.map(c => c.id === editId ? { ...c, ...data } : c));
        toast.success("Customer updated");
      } else {
        const { data } = await api.post("/business/customers", form);
        setCustomers([...customers, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Customer added");
      }
      resetForm();
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (c) => {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return;
    try {
      await api.delete(`/business/customers/${c.id}`);
      setCustomers(customers.filter(x => x.id !== c.id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );
  const topCustomers = [...customers].sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0)).slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="customers-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">CUSTOMERS</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("customers")}</h1>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            data-testid="add-customer-btn"
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={15} weight="bold" /> Add Customer
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-0 border-l border-t border-foreground/15 mb-6">
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Customers</div>
            <div className="text-2xl font-black">{customers.length}</div>
          </div>
          <div className="border-r border-b border-foreground/15 p-4">
            <div className="text-xs text-muted-foreground mb-1">Top Customer</div>
            <div className="text-lg font-black truncate">{topCustomers[0]?.name || "—"}</div>
            {topCustomers[0] && <div className="text-xs text-muted-foreground">{fmt(topCustomers[0].total_purchases)}</div>}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="customer-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">{editId ? t("editItem") : t("addCustomer")}</div>
              <button onClick={resetForm}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="Customer name"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Phone</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="+91 98765 43210"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email</label>
                <input type="email"
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="email@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Address</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="Shop/home address"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="Any notes about this customer"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <button onClick={saveCustomer} disabled={saving} data-testid="save-customer-btn"
              className="w-full mt-4 bg-black text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? t("saving") : (editId ? t("update") : t("addCustomer"))}
            </button>
          </div>
        )}

        <input
          className="w-full border border-foreground/20 p-2.5 text-sm mb-4 bg-white dark:bg-gray-900"
          placeholder="Search by name or phone…"
          value={search} onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t("noRecordsYet")}</div>
        ) : (
          <div className="border border-foreground/15">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Address</th>
                  <th className="text-right px-4 py-2">Total Bought</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3 font-medium">
                      <div>{c.name}</div>
                      {c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:klein">
                          <Phone size={12} /> {c.phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{c.address || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(c.total_purchases)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => startEdit(c)} className="text-blue-500 hover:text-blue-700 mr-3">
                        <PencilSimple size={15} />
                      </button>
                      <button onClick={() => deleteCustomer(c)} className="text-red-500 hover:text-red-700">
                        <Trash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
