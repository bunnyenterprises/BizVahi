import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useBusiness } from "@/context/BusinessContext";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, X } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const DEFAULT_CATS = ["Rent", "Salary", "Utilities", "Raw Materials", "Transport", "Marketing", "Maintenance", "Taxes", "Other"];

const CAT_COLORS = {
  Rent: "bg-blue-100 text-blue-700",
  Salary: "bg-purple-100 text-purple-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  "Raw Materials": "bg-green-100 text-green-700",
  "Raw Material Purchase": "bg-green-100 text-green-700",
  "Medicine Purchase": "bg-red-100 text-red-700",
  "Stock Purchase": "bg-indigo-100 text-indigo-700",
  Transport: "bg-teal-100 text-teal-700",
  Marketing: "bg-pink-100 text-pink-700",
  Maintenance: "bg-gray-100 text-gray-700",
  Taxes: "bg-red-100 text-red-700",
  Other: "bg-slate-100 text-slate-700",
};

export default function Expenses() {
  const { t } = useLang();
  const { category: bizCategory } = useBusiness();
  const CATEGORIES = bizCategory?.expense_cats || DEFAULT_CATS;
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    api.get("/business/expenses")
      .then(r => setExpenses(r.data))
      .catch(() => toast.error("Failed to load expenses"))
      .finally(() => setLoading(false));
  }, []);

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catTotal = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    if (catTotal > 0) acc[cat] = catTotal;
    return acc;
  }, {});

  const resetForm = () => { setAmount(""); setDescription(""); setDate(new Date().toISOString().slice(0, 10)); setShowForm(false); };

  const saveExpense = async () => {
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/business/expenses", {
        category, amount: Number(amount), description, date,
      });
      setExpenses([data, ...expenses]);
      toast.success("Expense logged");
      resetForm();
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (exp) => {
    if (!window.confirm(`Delete ₹${exp.amount} ${exp.category} expense?`)) return;
    try {
      await api.delete(`/business/expenses/${exp.id}`);
      setExpenses(expenses.filter(e => e.id !== exp.id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="expenses-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">EXPENSES</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("expenses")}</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            data-testid="add-expense-btn"
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={15} weight="bold" /> Log Expense
          </button>
        </div>

        {/* Summary */}
        <div className="border border-foreground/15 p-5 mb-6">
          <div className="text-xs text-muted-foreground mb-1">Total Expenses This Month</div>
          <div className="text-3xl font-black mb-4">{fmt(total)}</div>
          {Object.entries(byCategory).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <span key={cat} className={`text-xs px-2.5 py-1 font-medium ${CAT_COLORS[cat] || CAT_COLORS.Other}`}>
                  {cat}: {fmt(amt)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="expense-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Log Expense</div>
              <button onClick={resetForm}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category *</label>
                <select
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={category} onChange={e => setCategory(e.target.value)}
                  data-testid="expense-category"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Amount (₹) *</label>
                <input
                  type="number" min={1}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="0"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  data-testid="expense-amount"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <input type="date"
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description</label>
                <input
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="e.g. Monthly rent for shop"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
            <button onClick={saveExpense} disabled={saving} data-testid="save-expense-btn"
              className="w-full bg-black text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving…" : "Log Expense"}
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t("noExpenses")}</div>
        ) : (
          <div className="border border-foreground/15">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Category</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Description</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-2">Amount</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-foreground/10">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 ${CAT_COLORS[e.category] || CAT_COLORS.Other}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.date}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(e.amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteExpense(e)} className="text-red-500 hover:text-red-700">
                        <Trash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-foreground/20 bg-secondary">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-sm">Total</td>
                  <td className="px-4 py-3 text-right font-black">{fmt(total)}</td>
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
