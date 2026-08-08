import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Printer, TrendUp, TrendDown } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmt0 = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function BSRow({ label, value, bold, indent, highlight, positive }) {
  const isNeg = value < 0;
  return (
    <div className={`flex justify-between py-2.5 ${indent ? "pl-8" : ""} ${highlight ? "border-t-2 border-b-2 border-foreground/30 bg-secondary my-2" : "border-t border-foreground/10"}`}>
      <span className={`text-sm ${bold || highlight ? "font-bold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-mono ${highlight ? "font-black text-base" : bold ? "font-bold" : ""} ${isNeg ? "text-red-600" : (positive ? "text-green-700" : "")}`}>
        {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
      </span>
    </div>
  );
}

export default function BalanceSheet() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/business/balance-sheet")
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load balance sheet"))
      .finally(() => setLoading(false));
  }, []);

  const d = data;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <main className="max-w-3xl mx-auto px-4 py-8" data-testid="balance-sheet-page">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">BALANCE SHEET</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("balanceSheet")}</h1>
            <p className="text-sm text-muted-foreground mt-1">Your business net worth as of today.</p>
          </div>
          <button onClick={() => window.print()} className="border border-foreground/20 px-3 py-2 text-sm hover:bg-secondary no-print">
            <Printer size={14} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Calculating…</div>
        ) : d && (
          <>
            {/* Net Worth Hero */}
            <div className={`p-6 mb-6 border ${d.net_worth >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">NET WORTH (OWNER'S EQUITY)</div>
                  <div className={`text-4xl font-black ${d.net_worth >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {d.net_worth >= 0 ? fmt0(d.net_worth) : `(${fmt0(Math.abs(d.net_worth))})`}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {d.is_solvent ? "Your business is solvent ✅" : "⚠️ Liabilities exceed assets — review urgently"}
                  </div>
                </div>
                <div>
                  {d.net_worth >= 0
                    ? <TrendUp size={52} weight="duotone" className="text-green-500" />
                    : <TrendDown size={52} weight="duotone" className="text-red-400" />}
                </div>
              </div>
            </div>

            <div className="border border-foreground/15 p-6 mb-6">
              <div className="text-center mb-6">
                <div className="font-black text-lg uppercase tracking-widest">{t("balanceSheet")}</div>
                <div className="text-sm text-muted-foreground">As of {d.as_of}</div>
              </div>

              {/* ASSETS */}
              <div className="mb-6">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">ASSETS</div>
                <div className="text-xs text-muted-foreground mb-1 pl-8 uppercase tracking-wide">Current Assets</div>
                <BSRow label="Cash in Hand" value={d.assets.cash_in_hand} indent />
                <BSRow label="Trade Receivables (Khata Outstanding)" value={d.assets.trade_receivables} indent />
                <BSRow label="Stock / Inventory (at cost)" value={d.assets.stock_value} indent />
                <BSRow label="TOTAL ASSETS" value={d.assets.total} bold highlight />
              </div>

              {/* LIABILITIES */}
              <div className="mb-6">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">LIABILITIES</div>
                <div className="text-xs text-muted-foreground mb-1 pl-8 uppercase tracking-wide">Current Liabilities</div>
                <BSRow label="Supplier Payables (Credit Purchases)" value={d.liabilities.supplier_payables} indent />
                <BSRow label="GST Payable (Tax Collected This Month)" value={d.liabilities.gst_payable} indent />
                <BSRow label="TOTAL LIABILITIES" value={d.liabilities.total} bold highlight />
              </div>

              {/* NET WORTH */}
              <div className={`p-4 border-2 ${d.net_worth >= 0 ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "border-red-500 bg-red-50 dark:bg-red-950/30"}`}>
                <div className="flex justify-between items-center">
                  <div className="font-black">NET WORTH (Assets − Liabilities)</div>
                  <div className={`font-black text-2xl ${d.net_worth >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {d.net_worth >= 0 ? fmt(d.net_worth) : `(${fmt(Math.abs(d.net_worth))})`}
                  </div>
                </div>
              </div>
            </div>

            {/* What it means */}
            <div className="border border-foreground/15 p-5 bg-secondary/30">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">What This Means</div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="font-bold w-32 shrink-0">Cash in Hand</span>
                  <span>Money physically available in your shop/bank: <b>{fmt0(d.assets.cash_in_hand)}</b></span>
                </div>
                <div className="flex gap-3">
                  <span className="font-bold w-32 shrink-0">Receivables</span>
                  <span>Customers owe you: <b>{fmt0(d.assets.trade_receivables)}</b> — collect this to improve cash position</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-bold w-32 shrink-0">Stock Value</span>
                  <span>Value of all goods in your shop at cost price: <b>{fmt0(d.assets.stock_value)}</b></span>
                </div>
                {d.liabilities.supplier_payables > 0 && (
                  <div className="flex gap-3">
                    <span className="font-bold w-32 shrink-0">You Owe</span>
                    <span>Pay suppliers <b>{fmt0(d.liabilities.supplier_payables)}</b> for credit purchases</span>
                  </div>
                )}
                {d.liabilities.gst_payable > 0 && (
                  <div className="flex gap-3">
                    <span className="font-bold w-32 shrink-0">GST Due</span>
                    <span>Pay <b>{fmt0(d.liabilities.gst_payable)}</b> to government (collected from customers)</span>
                  </div>
                )}
                <div className={`flex gap-3 pt-2 border-t border-foreground/15 font-bold ${d.net_worth >= 0 ? "text-green-700" : "text-red-600"}`}>
                  <span className="w-32 shrink-0">Net Worth</span>
                  <span>Your business is worth <b>{fmt0(Math.abs(d.net_worth))}</b> {d.net_worth >= 0 ? "— you own more than you owe ✅" : "— you owe more than you own ⚠️"}</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 border border-foreground/15 p-4 text-xs text-muted-foreground">
              💡 <b>CA Tip:</b> A bank will look at this balance sheet when you apply for a business loan. High receivables (Khata) or low cash are red flags. Keep your Khata collections frequent and your inventory moving.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
