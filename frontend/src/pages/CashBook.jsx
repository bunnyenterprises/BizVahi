import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, Printer, X, CaretLeft, CaretRight } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmt2 = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const IN_CATS = ["Sale", "Payment Received", "Other Income", "Loan Received"];
const OUT_CATS = ["Purchase", "Expense", "Salary", "Rent", "Transport", "Other"];

export default function CashBook() {
  const { t } = useLang();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [cashData, setCashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showOpeningForm, setShowOpeningForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  // Form fields
  const [entryType, setEntryType] = useState("in");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Sale");
  const [openingAmt, setOpeningAmt] = useState("");

  const load = async (d = date) => {
    setLoading(true);
    try {
      const [cb, hist] = await Promise.all([
        api.get(`/khata/cashbook?date=${d}`),
        api.get("/khata/cashbook/history"),
      ]);
      setCashData(cb.data);
      setHistory(hist.data);
      setOpeningAmt(String(cb.data.opening_balance || ""));
    } catch { toast.error("Failed to load cash book"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => { load(); }, []);

  const changeDate = (offset) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().slice(0, 10);
    setDate(newDate);
    load(newDate);
  };

  const saveOpening = async () => {
    if (openingAmt === "" || Number(openingAmt) < 0) { toast.error("Enter valid opening balance"); return; }
    await api.post("/khata/cashbook/opening", { date, amount: Number(openingAmt) });
    toast.success("Opening balance set");
    setShowOpeningForm(false);
    load(date);
  };

  const addEntry = async () => {
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!desc.trim()) { toast.error("Enter a description"); return; }
    setSaving(true);
    try {
      await api.post("/khata/cashbook/entries", {
        date, type: entryType, amount: Number(amount),
        description: desc.trim(), category,
      });
      toast.success(`${entryType === "in" ? "Cash in" : "Cash out"} recorded`);
      setShowForm(false);
      setAmount(""); setDesc("");
      load(date);
    } catch (e) { toast.error("Something went wrong. Try again."); }
    finally { setSaving(false); }
  };

  const deleteEntry = async (id) => {
    await api.delete(`/khata/cashbook/entries/${id}`);
    toast.success("Deleted");
    load(date);
  };

  const isToday = date === today;
  const cb = cashData;
  const closingColor = cb?.closing_balance < 0 ? "text-red-600" : cb?.closing_balance === 0 ? "text-muted-foreground" : "text-green-700";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />

      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="fintr-page">
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">CASH BOOK</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("cashBook")}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track every rupee in and out of your shop.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="border border-foreground/20 px-3 py-2 text-sm hover:bg-secondary">
              <Printer size={14} />
            </button>
            <button onClick={() => { setEntryType("in"); setCategory("Sale"); setShowForm(!showForm); }}
              className="bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700">
              + Cash In
            </button>
            <button onClick={() => { setEntryType("out"); setCategory("Purchase"); setShowForm(!showForm); }}
              className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
              + Cash Out
            </button>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-4 mb-6 no-print">
          <button onClick={() => changeDate(-1)} className="border border-foreground/20 p-2 hover:bg-secondary">
            <CaretLeft size={16} />
          </button>
          <input type="date" className="border border-foreground/20 px-3 py-2 text-sm bg-white dark:bg-gray-900"
            value={date} onChange={e => { setDate(e.target.value); load(e.target.value); }} />
          <button onClick={() => changeDate(1)} disabled={isToday}
            className="border border-foreground/20 p-2 hover:bg-secondary disabled:opacity-30">
            <CaretRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => { setDate(today); load(today); }}
              className="text-xs underline klein">Today</button>
          )}
        </div>

        {/* Opening Balance */}
        <div className="border border-foreground/15 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Opening Balance</div>
              <div className="text-xl font-black">{fmt2(cb?.opening_balance || 0)}</div>
            </div>
            <button onClick={() => setShowOpeningForm(!showOpeningForm)}
              className="text-xs border border-foreground/20 px-3 py-1.5 hover:bg-secondary no-print">
              {cb?.opening_balance ? "Edit" : "Set Opening Balance"}
            </button>
          </div>
          {showOpeningForm && (
            <div className="flex gap-3 mt-3 no-print">
              <input type="number" min={0}
                className="border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900 w-40"
                placeholder="₹ Opening balance" value={openingAmt}
                onChange={e => setOpeningAmt(e.target.value)} />
              <button onClick={saveOpening} className="bg-black text-white px-4 py-2 text-sm font-medium">Set</button>
              <button onClick={() => setShowOpeningForm(false)} className="text-sm text-muted-foreground">Cancel</button>
            </div>
          )}
        </div>

        {/* Add Entry Form */}
        {showForm && (
          <div className="border border-foreground/15 p-4 mb-4 bg-secondary/30 no-print" data-testid="fintr-form">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button onClick={() => { setEntryType("in"); setCategory("Sale"); }}
                  className={`px-4 py-2 text-sm font-bold ${entryType === "in" ? "bg-green-600 text-white" : "border border-foreground/20"}`}>
                  Cash In
                </button>
                <button onClick={() => { setEntryType("out"); setCategory("Purchase"); }}
                  className={`px-4 py-2 text-sm font-bold ${entryType === "out" ? "bg-black text-white" : "border border-foreground/20"}`}>
                  Cash Out
                </button>
              </div>
              <button onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Category</label>
                <select className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  value={category} onChange={e => setCategory(e.target.value)}>
                  {(entryType === "in" ? IN_CATS : OUT_CATS).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Amount (₹) *</label>
                <input type="number" min={1}
                  className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Description *</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder={entryType === "in" ? "e.g. Sale to Ravi Stores, Payment from Sharma" : "e.g. Rice purchase from Raju, Rent paid"}
                  value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
            </div>
            <button onClick={addEntry} disabled={saving}
              className={`w-full py-2.5 text-sm font-bold text-white disabled:opacity-50 ${entryType === "in" ? "bg-green-600 hover:bg-green-700" : "bg-black hover:bg-gray-800"}`}>
              {saving ? "Saving…" : `Add ${entryType === "in" ? isHindi ? "नकद प्राप्त" : "Cash In" : isHindi ? "नकद भुगतान" : "Cash Out"} — ${amount ? fmt(Number(amount)) : "₹0"}`}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : (
          <>
            {/* Cash Book Table */}
            <div className="border border-foreground/15 mb-6">
              <div className="grid grid-cols-3 border-b border-foreground/15">
                <div className="p-4 border-r border-foreground/15 text-center">
                  <div className="text-xs text-muted-foreground mb-1">CASH IN</div>
                  <div className="text-xl font-black text-green-600">{fmt2(cb?.cash_in || 0)}</div>
                </div>
                <div className="p-4 border-r border-foreground/15 text-center">
                  <div className="text-xs text-muted-foreground mb-1">CASH OUT</div>
                  <div className="text-xl font-black text-red-500">{fmt2(cb?.cash_out || 0)}</div>
                </div>
                <div className="p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">CLOSING BALANCE</div>
                  <div className={`text-xl font-black ${closingColor}`}>{fmt2(cb?.closing_balance || 0)}</div>
                </div>
              </div>

              {cb?.entries?.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No entries for {date}. Add cash in or out above.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Description</th>
                      <th className="text-left px-4 py-2 hidden sm:table-cell">Category</th>
                      <th className="text-right px-4 py-2 text-green-600">Cash In</th>
                      <th className="text-right px-4 py-2 text-red-500">Cash Out</th>
                      <th className="px-4 py-2 no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cb.entries.map((e, i) => (
                      <tr key={e.id || i} className="border-t border-foreground/10">
                        <td className="px-4 py-2.5 font-medium">{e.description}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                          <span className="text-xs border border-foreground/20 px-2 py-0.5">{e.category}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                          {e.type === "in" ? fmt2(e.amount) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-500">
                          {e.type === "out" ? fmt2(e.amount) : "—"}
                        </td>
                        <td className="px-4 py-2.5 no-print">
                          <button onClick={() => deleteEntry(e.id)} className="text-red-400 hover:text-red-600">
                            <Trash size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-foreground/20 bg-secondary text-sm">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold">Total</td>
                      <td className="px-4 py-3 text-right font-black text-green-600">{fmt2(cb?.cash_in || 0)}</td>
                      <td className="px-4 py-3 text-right font-black text-red-500">{fmt2(cb?.cash_out || 0)}</td>
                      <td className="no-print" />
                    </tr>
                    <tr className="border-t border-foreground/15">
                      <td colSpan={2} className="px-4 py-3 font-black">Closing Balance (Cash in Hand)</td>
                      <td colSpan={2} className={`px-4 py-3 text-right font-black text-xl ${closingColor}`}>{fmt2(cb?.closing_balance || 0)}</td>
                      <td className="no-print" />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* 7-day history */}
            {history.length > 0 && (
              <div className="no-print">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Last 7 Days</div>
                <div className="border border-foreground/15">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-right px-3 py-2 text-green-600">In</th>
                        <th className="text-right px-3 py-2 text-red-500">Out</th>
                        <th className="text-right px-3 py-2">Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(-7).reverse().map((h, i) => (
                        <tr key={i} className={`border-t border-foreground/10 ${h.date === date ? "bg-secondary" : ""} cursor-pointer hover:bg-secondary/50`}
                          onClick={() => { setDate(h.date); load(h.date); }}>
                          <td className="px-3 py-2 font-medium">{h.date}{h.date === today ? " (Today)" : ""}</td>
                          <td className="px-3 py-2 text-right text-green-600">{h.in > 0 ? fmt(h.in) : "—"}</td>
                          <td className="px-3 py-2 text-right text-red-500">{h.out > 0 ? fmt(h.out) : "—"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${h.closing < 0 ? "text-red-500" : ""}`}>{fmt2(h.closing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
