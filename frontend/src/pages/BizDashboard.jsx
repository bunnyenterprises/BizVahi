/**
 * ⚠️  LOCKED — DO NOT MODIFY the layout/structure without an explicit request.
 * Bunty asked for the dashboard to stop changing as a side-effect of unrelated
 * requests. Translation-key additions inside t() calls are fine; restructuring
 * the layout, cards, or nav is not, unless specifically asked for.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useLang } from "@/context/LangContext";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  CurrencyInr, ShoppingCart, Receipt, Users,
  Package, Warning, Sparkle, ArrowRight, TrendUp, TrendDown,
} from "@phosphor-icons/react";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const INSIGHT_COLORS = {
  warning: "border-l-4 border-l-teal-400 bg-teal-50",
  opportunity: "border-l-4 border-l-green-400 bg-green-50",
  tip: "border-l-4 border-l-blue-400 bg-blue-50",
};

export default function BizDashboard() {
  const { user } = useAuth();
  const { category, settings } = useBusiness();
  const { t, isHindi } = useLang();
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/business/dashboard"),
      api.get("/business/chart-data"),
      api.get("/business/health-score"),
      api.get("/business/alerts"),
    ]).then(([d, c, h, a]) => {
      setData(d.data);
      setChartData(c.data);
      setHealthScore(h.data);
      setAlerts(a.data.alerts || []);
    }).catch(() => toast.error("Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const getInsights = async () => {
    setInsightsLoading(true);
    try {
      const { data: d } = await api.post("/business/insights");
      setInsights(d.insights);
    } catch {
      toast.error("AI insights unavailable right now");
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const profit = data?.profit_estimate ?? 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />
      <main className="w-full max-w-5xl mx-auto px-4 py-8" data-testid="biz-dashboard">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide text-teal-600 mb-1">{t("businessDashboard")}</div>
            <div className="flex items-center gap-2">
              {category && <span className="text-2xl">{category.icon}</span>}
              <h1 className="text-3xl font-black tracking-tighter">
                {settings?.business_name || "Dashboard"}
              </h1>
            </div>
            {category && (
              <div className="text-xs text-muted-foreground mt-1">
                {category.label} · {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </div>
            )}
          </div>
          <button
            onClick={getInsights}
            disabled={insightsLoading}
            data-testid="get-ai-insights-btn"
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Sparkle size={15} weight="fill" />
            {insightsLoading ? t("analysing") : t("aiInsights")}
          </button>
        </div>

        {/* P&L Quick Card */}
        <Link to="/profit-loss" className="block border border-foreground/15 p-5 mb-8 hover:bg-secondary transition-colors" data-testid="pl-quick-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-1 uppercase">{t("thisMonth")}</div>
              <div className="text-sm text-muted-foreground mb-1">{t("estimatedPL")}</div>
              <div className={`text-3xl font-black ${(data?.profit_estimate ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                {(data?.profit_estimate ?? 0) >= 0 ? "+" : ""}{fmt(data?.profit_estimate)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("revenue")} {fmt(data?.sales_total)} − {t("expenses")} {fmt(data?.expenses_total)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {(data?.profit_estimate ?? 0) >= 0
                ? <TrendUp size={40} weight="duotone" className="text-green-500" />
                : <TrendDown size={40} weight="duotone" className="text-red-400" />}
              <span className="text-xs font-bold text-teal-600 flex items-center gap-1">{t("fullPL")} <ArrowRight size={10} weight="bold" /></span>
            </div>
          </div>
        </Link>

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2" data-testid="smart-alerts">
            {alerts.map((alert, i) => {
              const styles = {
                warning: "border-teal-200 bg-teal-50 text-teal-800",
                danger: "border-red-200 bg-red-50 text-red-800",
                success: "border-green-200 bg-green-50 text-green-800",
                info: "border-blue-200 bg-blue-50 text-blue-800",
              };
              return (
                <div key={i} className={`border p-3 flex items-start justify-between gap-3 ${styles[alert.type] || styles.info}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0">{alert.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{alert.title}</div>
                      <div className="text-xs mt-0.5 opacity-80">{alert.message}</div>
                    </div>
                  </div>
                  {alert.action && (
                    <Link to={alert.action} className="text-xs font-bold underline shrink-0 whitespace-nowrap">{alert.action_label} →</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Health Score */}
        {healthScore && (
          <div className="border border-foreground/15 p-5 mb-6" data-testid="health-score">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black">{healthScore.score}</span>
                <span className="text-muted-foreground text-sm mb-1">/100</span>
                <span className={`ml-1 font-black text-lg ${
                  healthScore.color === "green" ? "text-green-600" :
                  healthScore.color === "blue" ? "text-blue-600" :
                  healthScore.color === "yellow" ? "text-yellow-500" :
                  healthScore.color === "orange" ? "text-teal-500" : "text-red-600"
                }`}>{healthScore.grade} · {healthScore.label}</span>
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{t("healthScore")}</div>
            </div>
            <div className="h-2 bg-secondary mb-4">
              <div className="h-2 bg-black transition-all" style={{ width: `${healthScore.score}%` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {healthScore.breakdown.map((b, i) => (
                <div key={i} className="text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-bold">{b.score}/{b.max}</span>
                  </div>
                  <div className="text-muted-foreground">{b.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-l border-t border-foreground/15 mb-8">
          {[
            { label: t("salesThisMonth"), value: fmt(data?.sales_total), sub: `${data?.sales_count ?? 0} ${t("transactionsWord")}`, icon: ShoppingCart, color: "text-green-600" },
            { label: t("expenses"), value: fmt(data?.expenses_total), sub: t("thisMonthSub"), icon: Receipt, color: "text-teal-500" },
            { label: t("estProfit"), value: fmt(profit), sub: profit >= 0 ? `${t("inProfitMsg")} 🎉` : t("notProfitMsg"), icon: profit >= 0 ? TrendUp : TrendDown, color: profit >= 0 ? "text-green-600" : "text-red-500" },
            { label: t("customers"), value: data?.total_customers ?? 0, sub: `${data?.inventory_count ?? 0} ${t("stockItemsWord")}`, icon: Users, color: "text-blue-600" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="border-r border-b border-foreground/15 p-5">
              <Icon size={20} className={`mb-3 ${color}`} />
              <div className="text-2xl font-black">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>

        {/* Low Stock Alert */}
        {data?.low_stock_count > 0 && (
          <div className="border border-teal-300 bg-teal-50 dark:bg-teal-950/30 p-4 mb-6 flex items-start gap-3" data-testid="low-stock-alert">
            <Warning size={18} className="text-teal-500 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">{t("lowStockMsg")}: {data.low_stock_count}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.low_stock_items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(" · ")}
              </div>
            </div>
            <Link to="/inventory" className="ml-auto text-xs underline shrink-0">{t("view")} →</Link>
          </div>
        )}

        {/* AI Insights */}
        {insights && (
          <div className="mb-8" data-testid="ai-insights-panel">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-3 uppercase">{t("aiInsights")}</div>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`p-4 ${INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.tip}`}>
                  <div className="font-semibold text-sm mb-1">{ins.title}</div>
                  <div className="text-sm text-muted-foreground">{ins.insight}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-l border-t border-foreground/15 mb-8">
          {[
            { to: "/sales", label: t("newSale"), icon: ShoppingCart },
            { to: "/inventory", label: t("updateStock"), icon: Package },
            { to: "/expenses", label: t("logExpense"), icon: Receipt },
            { to: "/customers", label: t("addCustomer"), icon: Users },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="border-r border-b border-foreground/15 p-5 hover:bg-secondary transition-colors flex items-center gap-3">
              <Icon size={20} />
              <span className="font-medium text-sm">{label}</span>
              <ArrowRight size={13} className="ml-auto text-muted-foreground" />
            </Link>
          ))}
        </div>

        {/* Recent Sales */}
        {data?.recent_sales?.length > 0 && (
          <div>
            <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-3 uppercase">{t("recentSales")}</div>
            <div className="border border-foreground/15">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground text-xs">
                  <tr>
                    <th className="text-left px-4 py-2">{t("customer")}</th>
                    <th className="text-left px-4 py-2 hidden sm:table-cell">{t("date")}</th>
                    <th className="text-left px-4 py-2 hidden sm:table-cell">{t("payment")}</th>
                    <th className="text-right px-4 py-2">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_sales.map((s, i) => (
                    <tr key={s.id || i} className="border-t border-foreground/10">
                      <td className="px-4 py-3 font-medium">{s.customer_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.date}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.payment_mode}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/sales" className="text-xs font-bold text-teal-600 flex items-center gap-2 mt-3 hover:underline">
              {t("allSales")}
            </Link>
          </div>
        )}

        {/* Top Products */}
        {data?.top_products?.length > 0 && (
          <div className="mt-8">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-3 uppercase">{t("topProducts")}</div>
            <div className="border border-foreground/15">
              {data.top_products.map((p, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-foreground/10" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="font-medium text-sm">{p.name}</span>
                  </div>
                  <span className="font-semibold text-sm">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Charts */}
        {chartData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* 30-day sales trend */}
            <div className="border border-foreground/15 p-5">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-4 uppercase">{t("salesChart")}</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData.daily_sales} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }}
                    tickFormatter={(d) => d.slice(5)} interval={6} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} width={45} />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, isHindi ? "बिक्री" : "Sales"]}
                    labelFormatter={(l) => l} />
                  <Area type="monotone" dataKey="sales" stroke="#0D9488" strokeWidth={2}
                    fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Expense breakdown */}
            <div className="border border-foreground/15 p-5">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-4 uppercase">{t("expensesChart")}</div>
              {chartData.expense_breakdown.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">{t("noExpenses")}</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData.expense_breakdown} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} width={45} />
                    <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, isHindi ? "राशि" : "Amount"]} />
                    <Bar dataKey="amount" fill="#000000" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Monthly sales trend */}
            {chartData.monthly_sales?.length > 0 && (
              <div className="border border-foreground/15 p-5 md:col-span-2">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground mb-4 uppercase">{t("monthlySales")}</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData.monthly_sales} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} width={50} />
                    <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, isHindi ? "बिक्री" : "Sales"]} />
                    <Bar dataKey="sales" fill="#0D9488" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
