import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { TrendUp, TrendDown, Printer, DownloadSimple, ArrowRight, CaretDown, CaretUp } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmt2 = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Change({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <CaretUp size={10} weight="fill" /> : <CaretDown size={10} weight="fill" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Row({ label, value, bold, indent, highlight, sub }) {
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? "pl-6" : ""} ${highlight ? "border-t-2 border-black font-black text-base" : "border-t border-foreground/10"} ${bold ? "font-bold" : ""}`}>
      <span className={`text-sm ${sub ? "text-muted-foreground" : ""}`}>{label}</span>
      <span className={`text-sm font-mono ${highlight ? "text-lg" : ""} ${value < 0 ? "text-red-600" : ""}`}>{fmt(value)}</span>
    </div>
  );
}

function getMonthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}


// Download rows as CSV — opens directly in Excel, no library needed
const downloadCSV = (rows, filename) => {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = rows.map((r) => (Array.isArray(r) ? r : [r]).map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function ProfitLoss() {
  const { t } = useLang();
  const def = getMonthRange();
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  const fetchPL = async (f = from, t = to) => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/business/pl?from_date=${f}&to_date=${t}`);
      setData(d);
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => { fetchPL(); }, []);

  const setRange = (f, t) => { setFrom(f); setTo(t); fetchPL(f, t); };

  const downloadExcel = () => {
    if (!data) return;
    const rows = [
      ["PROFIT & LOSS STATEMENT"],
      [`Period: ${data.period.from} to ${data.period.to}`],
      [],
      ["REVENUE", ""],
      ["Total Sales", data.revenue.total],
      [`(${data.revenue.transactions} transactions)`, ""],
      [],
      ["COST OF GOODS SOLD", ""],
      ["Material / Inventory Cost", data.cogs.total],
      [],
      ["GROSS PROFIT", data.gross_profit],
      [`Gross Margin`, `${data.gross_margin_pct}%`],
      [],
      ["OPERATING EXPENSES", ""],
      ...Object.entries(data.operating_expenses.by_category).map(([k, v]) => [k, v]),
      ["Total Operating Expenses", data.operating_expenses.total],
      [],
      ["NET PROFIT / (LOSS)", data.net_profit],
      [`Net Margin`, `${data.net_margin_pct}%`],
    ];
    downloadCSV(rows, `PL_${data.period.from}_to_${data.period.to}.csv`);
    toast.success("Downloaded");
  };

  const isProfit = data?.is_profit ?? true;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
        }
      `}</style>

      <main className="max-w-3xl mx-auto px-4 py-8" data-testid="pl-page">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 no-print">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">FINANCIAL STATEMENT</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("profitLoss")}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 border border-foreground/20 px-3 py-2 text-sm hover:bg-secondary">
              <Printer size={14} /> Print
            </button>
            <button onClick={downloadExcel} className="flex items-center gap-2 bg-black text-white px-3 py-2 text-sm hover:bg-gray-800">
              <DownloadSimple size={14} /> Excel
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="border border-foreground/15 p-4 mb-6 no-print">
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: "This Month", fn: () => { const r = getMonthRange(); setRange(r.from, r.to); } },
              { label: "Last Month", fn: () => { const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth() - 1, 1); const t = new Date(n.getFullYear(), n.getMonth(), 0); setRange(f.toISOString().slice(0, 10), t.toISOString().slice(0, 10)); } },
              { label: "Last 3 Months", fn: () => { const n = new Date(); const f = new Date(n.getFullYear(), n.getMonth() - 2, 1); setRange(f.toISOString().slice(0, 10), n.toISOString().slice(0, 10)); } },
              { label: "This Year", fn: () => { const n = new Date(); setRange(`${n.getFullYear()}-01-01`, n.toISOString().slice(0, 10)); } },
            ].map(({ label, fn }) => (
              <button key={label} onClick={fn} className="text-xs border border-foreground/20 px-3 py-1.5 hover:bg-secondary transition-colors">{label}</button>
            ))}
          </div>
          <div className="flex gap-3 items-end">
            <div><label className="text-xs text-muted-foreground block mb-1">From</label>
              <input type="date" className="border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">To</label>
              <input type="date" className="border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" value={to} onChange={e => setTo(e.target.value)} /></div>
            <button onClick={() => fetchPL()} className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800">View</button>
          </div>
        </div>

        {loading && <div className="text-center py-16 text-muted-foreground">Calculating…</div>}

        {data && !loading && (
          <>
            {/* Top KPIs */}
            <div className={`p-6 mb-6 ${isProfit ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">NET {isProfit ? "PROFIT" : "LOSS"}</div>
                  <div className={`text-4xl font-black ${isProfit ? "text-green-700" : "text-red-600"}`}>
                    {isProfit ? "+" : ""}{fmt(data.net_profit)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Net margin: <span className="font-bold">{data.net_margin_pct}%</span>
                  </div>
                </div>
                <div className="text-right">
                  {isProfit
                    ? <TrendUp size={56} weight="duotone" className="text-green-500" />
                    : <TrendDown size={56} weight="duotone" className="text-red-400" />}
                  {data.comparison.profit_change_pct !== null && (
                    <div className="mt-1">
                      <Change pct={data.comparison.profit_change_pct} />
                      <div className="text-xs text-muted-foreground">vs prev period</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* P&L Statement */}
            <div className="border border-foreground/15 p-6 mb-6" data-testid="pl-statement">
              <div className="text-center mb-6">
                <div className="font-black text-lg uppercase tracking-widest">Income Statement</div>
                <div className="text-sm text-muted-foreground">{data.period.from} to {data.period.to}</div>
              </div>

              {/* Revenue */}
              <div className="mb-4">
                <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">INCOME</div>
                <Row label={`Sales Revenue (${data.revenue.transactions} sales)`} value={data.revenue.total} bold />
                {data.comparison.prev_revenue > 0 && (
                  <div className="flex items-center gap-2 pl-0 pb-1 text-xs text-muted-foreground">
                    Prev period: {fmt(data.comparison.prev_revenue)}
                    <Change pct={data.comparison.revenue_change_pct} />
                  </div>
                )}
                {showProducts && data.revenue.by_product?.map(p => (
                  <Row key={p.name} label={p.name} value={p.amount} indent sub />
                ))}
                {data.revenue.by_product?.length > 0 && (
                  <button onClick={() => setShowProducts(!showProducts)} className="text-xs underline text-teal-600 ml-0 mt-1">
                    {showProducts ? "Hide" : "Show"} product breakdown
                  </button>
                )}
              </div>

              {/* COGS */}
              {data.cogs.total > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">COST OF GOODS SOLD</div>
                  <Row label="Material / Inventory Cost" value={data.cogs.total} bold />
                  {data.cogs.inventory_based > 0 && data.cogs.expense_based > 0 && (
                    <div className="text-xs text-muted-foreground pl-0 pb-1">
                      Based on {data.cogs.inventory_based >= data.cogs.expense_based ? "inventory cost prices" : "material expenses logged"}
                    </div>
                  )}
                </div>
              )}

              {/* Gross Profit */}
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold">GROSS PROFIT</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Margin: {data.gross_margin_pct}%</span>
                    <span className={`font-black ${data.gross_profit < 0 ? "text-red-600" : ""}`}>{fmt(data.gross_profit)}</span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="mb-4">
                <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">OPERATING EXPENSES</div>
                {Object.entries(data.operating_expenses.by_category).map(([cat, amt]) => (
                  <Row key={cat} label={cat} value={amt} indent />
                ))}
                <Row label="Total Operating Expenses" value={data.operating_expenses.total} bold />
              </div>

              {/* Net Profit */}
              <div className={`px-4 py-4 border-2 ${isProfit ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "border-red-500 bg-red-50 dark:bg-red-950/30"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-base">NET {isProfit ? "PROFIT" : "LOSS"}</div>
                    <div className="text-xs text-muted-foreground">Net margin: {data.net_margin_pct}%</div>
                  </div>
                  <div className={`font-black text-2xl ${isProfit ? "text-green-700" : "text-red-600"}`}>
                    {isProfit ? "+" : ""}{fmt(data.net_profit)}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Card */}
            {data.comparison.prev_revenue > 0 && (
              <div className="border border-foreground/15 p-5 mb-6">
                <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">VS PREVIOUS PERIOD</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: "Revenue", curr: data.revenue.total, prev: data.comparison.prev_revenue, pct: data.comparison.revenue_change_pct },
                    { label: "Expenses", curr: data.operating_expenses.total, prev: data.comparison.prev_revenue > 0 ? null : null },
                    { label: "Net Profit", curr: data.net_profit, prev: data.comparison.prev_net_profit, pct: data.comparison.profit_change_pct },
                  ].filter(x => x.prev !== null).map(({ label, curr, prev, pct }) => (
                    <div key={label}>
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="font-bold text-sm">{fmt(curr)}</div>
                      {prev !== undefined && prev !== null && (
                        <>
                          <div className="text-xs text-muted-foreground">was {fmt(prev)}</div>
                          <Change pct={pct} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What this means - plain English */}
            <div className="border border-foreground/15 p-5 bg-secondary/30">
              <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">WHAT THIS MEANS</div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <span className="font-bold w-36 shrink-0">Revenue</span>
                  <span>You collected <strong>{fmt(data.revenue.total)}</strong> from {data.revenue.transactions} sale(s)</span>
                </div>
                {data.cogs.total > 0 && (
                  <div className="flex gap-3">
                    <span className="font-bold w-36 shrink-0">Cost of Goods</span>
                    <span>You spent <strong>{fmt(data.cogs.total)}</strong> on materials/inventory to make those sales</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <span className="font-bold w-36 shrink-0">Gross Profit</span>
                  <span>After deducting goods cost: <strong>{fmt(data.gross_profit)}</strong> ({data.gross_margin_pct}% margin)</span>
                </div>
                {data.operating_expenses.total > 0 && (
                  <div className="flex gap-3">
                    <span className="font-bold w-36 shrink-0">Running Costs</span>
                    <span>Rent, salary, utilities and other costs: <strong>{fmt(data.operating_expenses.total)}</strong></span>
                  </div>
                )}
                <div className={`flex gap-3 font-bold mt-2 pt-2 border-t border-foreground/15 ${isProfit ? "text-green-700" : "text-red-600"}`}>
                  <span className="w-36 shrink-0">{isProfit ? "You Made" : "You Lost"}</span>
                  <span>{isProfit ? "+" : ""}{fmt(data.net_profit)} {isProfit ? "— keep going! 🎉" : "— review your expenses."}</span>
                </div>
              </div>
            </div>

            {/* No data warnings */}
            {data.revenue.total === 0 && (
              <div className="mt-4 border border-teal-200 bg-teal-50 p-4 text-sm text-teal-700">
                No sales recorded for this period. Add sales entries to see your P&L.
              </div>
            )}
            {data.operating_expenses.total === 0 && (
              <div className="mt-4 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                No expenses logged for this period. Add rent, salary, utilities to get your real net profit.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
