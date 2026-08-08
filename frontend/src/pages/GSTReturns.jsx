import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { DownloadSimple, Warning, CheckCircle } from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];


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

export default function GSTReturns() {
  const { t } = useLang();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (y = year, m = month) => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        api.get(`/gst/summary?year=${y}&month=${m}`),
        api.get("/gst/history"),
      ]);
      setData(s.data);
      setHistory(h.data);
    } catch { toast.error("Failed to load GST data"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => { load(); }, []);

  const downloadGSTR1 = () => {
    if (!data) return;
    const rows = [["GSTR-1", data.period?.month_name || ""], []];

    rows.push(["B2B INVOICES"]);
    rows.push(["GSTIN of Recipient","Invoice Number","Invoice Date","Invoice Value","Place of Supply","Rate (%)","Taxable Value","CGST","SGST","IGST"]);
    (data.b2b_invoices || []).forEach((inv) => {
      rows.push([
        inv.buyer?.gstin || "", inv.invoice_no, inv.date, inv.grand_total,
        inv.seller?.state || "27-Maharashtra", inv.items?.[0]?.gst_rate ?? 18,
        inv.taxable_value ?? "", inv.cgst ?? "", inv.sgst ?? "", inv.igst ?? "",
      ]);
    });

    rows.push([], ["B2C INVOICES"]);
    rows.push(["Invoice Number","Invoice Date","Invoice Value","Rate (%)","Taxable Value","CGST","SGST","IGST"]);
    (data.b2c_invoices || []).forEach((inv) => {
      rows.push([
        inv.invoice_no, inv.date, inv.grand_total, inv.items?.[0]?.gst_rate ?? 18,
        inv.taxable_value ?? "", inv.cgst ?? "", inv.sgst ?? "", inv.igst ?? "",
      ]);
    });

    downloadCSV(rows, `GSTR1_${(data.period?.month_name || "report").replace(/ /g, "_")}.csv`);
    toast.success("Downloaded");
  };

  const downloadGSTR3B = () => {
    if (!data) return;
    const s = data.summary || {};
    const rows = [
      ["GSTR-3B", data.period?.month_name || ""],
      [],
      ["Description", "Amount"],
      ["Total Taxable Value", s.taxable_value ?? 0],
      ["CGST", s.cgst ?? 0],
      ["SGST", s.sgst ?? 0],
      ["IGST", s.igst ?? 0],
      ["Total Tax Payable", s.total_tax ?? 0],
      ["Total Invoice Value", s.grand_total ?? 0],
    ];
    downloadCSV(rows, `GSTR3B_${(data.period?.month_name || "report").replace(/ /g, "_")}.csv`);
    toast.success("Downloaded");
  };

  const d = data;
  const urgent = d?.days_until_deadline !== undefined && d.days_until_deadline <= 5;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8" data-testid="gst-page">
        <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">GST RETURNS</div>
        <h1 className="text-3xl font-black tracking-tighter mb-6">{t("gstReturns")}</h1>

        {/* Period selector */}
        <div className="flex gap-3 mb-6 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Month</label>
            <select className="border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
              value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Year</label>
            <select className="border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
              value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => load(year, month)} className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
            Load
          </button>
        </div>

        {loading && <div className="text-center py-12 text-muted-foreground">Calculating…</div>}

        {d && !loading && (
          <>
            {/* Deadline warning */}
            {d.days_until_deadline <= 10 && (
              <div className={`border p-4 mb-6 flex items-center gap-3 ${urgent ? "border-red-300 bg-red-50 text-red-700" : "border-teal-300 bg-teal-50 text-teal-700"}`}>
                <Warning size={20} />
                <div>
                  <div className="font-bold">
                    {urgent ? `🚨 GST due in ${d.days_until_deadline} days!` : `GST due in ${d.days_until_deadline} days`}
                  </div>
                  <div className="text-sm">GSTR-1 and GSTR-3B deadline: {d.gstr3b_deadline}. File at gst.gov.in</div>
                </div>
              </div>
            )}

            {/* GSTR-3B Summary */}
            <div className="border border-foreground/15 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">GSTR-3B Summary · {d.period.month_name}</div>
                  <div className="text-3xl font-black">₹{(d.total_tax_payable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total GST to pay · Due: {d.gstr3b_deadline}</div>
                </div>
                <button onClick={downloadGSTR3B} className="flex items-center gap-2 bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-800">
                  <DownloadSimple size={16} /> GSTR-3B Excel
                </button>
              </div>

              <div className="border-t border-foreground/15 pt-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Tax Breakdown by Rate</div>
                {Object.keys(d.by_rate || {}).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No taxable invoices this period.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left py-2">GST Rate</th>
                        <th className="text-right py-2">Taxable Value</th>
                        <th className="text-right py-2">IGST</th>
                        <th className="text-right py-2">CGST</th>
                        <th className="text-right py-2">SGST</th>
                        <th className="text-right py-2 font-bold">Tax Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(d.by_rate).map(([rate, v]) => (
                        <tr key={rate} className="border-t border-foreground/10">
                          <td className="py-2 font-medium">{rate}%</td>
                          <td className="py-2 text-right">{fmt(v.taxable)}</td>
                          <td className="py-2 text-right text-muted-foreground">{v.igst > 0 ? fmt(v.igst) : "—"}</td>
                          <td className="py-2 text-right text-muted-foreground">{v.cgst > 0 ? fmt(v.cgst) : "—"}</td>
                          <td className="py-2 text-right text-muted-foreground">{v.sgst > 0 ? fmt(v.sgst) : "—"}</td>
                          <td className="py-2 text-right font-bold">{fmt(v.total_tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-foreground/20">
                        <td className="py-2 font-black">Total</td>
                        <td className="py-2 text-right font-bold">{fmt(d.total_taxable)}</td>
                        <td className="py-2 text-right font-bold">{fmt(d.total_igst)}</td>
                        <td className="py-2 text-right font-bold">{fmt(d.total_cgst)}</td>
                        <td className="py-2 text-right font-bold">{fmt(d.total_sgst)}</td>
                        <td className="py-2 text-right font-black text-lg">{fmt(d.total_tax_payable)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            {/* GSTR-1 */}
            <div className="border border-foreground/15 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">GSTR-1 Invoice Details · {d.period.month_name}</div>
                  <div className="font-bold text-xl">{d.invoice_count} invoice(s) — ₹{(d.total_invoice_value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  <div className="text-sm text-muted-foreground mt-1">B2B: {d.b2b_count} invoices (buyer has GSTIN) · B2C: {d.b2c_count} invoices</div>
                </div>
                <button onClick={downloadGSTR1} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-800">
                  <DownloadSimple size={16} /> GSTR-1 Excel
                </button>
              </div>

              {(d.b2b_invoices || []).length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">B2B Invoices (Buyer has GSTIN)</div>
                  <div className="border border-foreground/15 mb-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary">
                        <tr>
                          {["Invoice No", "Date", "Buyer", "GSTIN", "Value", "Tax"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {d.b2b_invoices.map((inv, i) => (
                          <tr key={i} className="border-t border-foreground/10">
                            <td className="px-3 py-2 font-medium">{inv.invoice_no}</td>
                            <td className="px-3 py-2 text-muted-foreground">{inv.date}</td>
                            <td className="px-3 py-2">{inv.buyer?.name}</td>
                            <td className="px-3 py-2 text-muted-foreground font-mono">{inv.buyer?.gstin}</td>
                            <td className="px-3 py-2 font-medium">{fmt(inv.grand_total)}</td>
                            <td className="px-3 py-2">{fmt(inv.total_tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {(d.b2c_invoices || []).length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">B2C Invoices (Consumer / no GSTIN)</div>
                  <div className="border border-foreground/15 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary">
                        <tr>
                          {["Invoice No", "Date", "Buyer", "Value", "Tax"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {d.b2c_invoices.map((inv, i) => (
                          <tr key={i} className="border-t border-foreground/10">
                            <td className="px-3 py-2 font-medium">{inv.invoice_no}</td>
                            <td className="px-3 py-2 text-muted-foreground">{inv.date}</td>
                            <td className="px-3 py-2">{inv.buyer?.name}</td>
                            <td className="px-3 py-2 font-medium">{fmt(inv.grand_total)}</td>
                            <td className="px-3 py-2">{fmt(inv.total_tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* How to file */}
            <div className="border border-foreground/15 p-5 bg-secondary/30">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">How to File (Step by Step)</div>
              <div className="space-y-2">
                {[
                  ["1", "Download GSTR-1 Excel and GSTR-3B Excel above"],
                  ["2", "Go to gst.gov.in → Login with your GSTIN"],
                  ["3", "Click Returns → GSTR-1 → Upload the Excel file"],
                  ["4", "Click Returns → GSTR-3B → Enter the tax amounts from the summary"],
                  ["5", `Pay ₹${(d.total_tax_payable || 0).toLocaleString("en-IN")} via Net Banking or UPI`],
                  ["6", "Submit and file both returns before " + d.gstr3b_deadline],
                ].map(([step, text]) => (
                  <div key={step} className="flex gap-3 text-sm">
                    <span className="w-5 h-5 bg-black text-white text-xs flex items-center justify-center shrink-0 font-bold">{step}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">GST History — Last 6 Months</div>
            <div className="border border-foreground/15">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Period</th>
                    <th className="text-right px-4 py-2">Invoices</th>
                    <th className="text-right px-4 py-2">Total Billed</th>
                    <th className="text-right px-4 py-2">Tax Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-t border-foreground/10">
                      <td className="px-4 py-2 font-medium">{h.period}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{h.invoices}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(h.total_billed)}</td>
                      <td className="px-4 py-2 text-right font-bold">{fmt(h.tax_collected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
