import React from "react";
import { Link } from "react-router-dom";
import { FintrLogo } from "@/components/Header";
import {
  Receipt, BookOpen, TrendUp, ChartPie, Package,
  CurrencyInr, Sparkle, ArrowRight, DeviceMobile,
  Desktop, Globe, AndroidLogo,
} from "@phosphor-icons/react";

const FEATURES = [
  { icon: Receipt,      title: "GST Invoice",     desc: "Professional invoices in 30 seconds. Auto CGST/SGST/IGST." },
  { icon: BookOpen,     title: "Khata Book",       desc: "Track credit. Send WhatsApp reminders in one tap." },
  { icon: CurrencyInr,  title: "Cash Book",        desc: "Daily cash in/out. Opening & closing balance." },
  { icon: TrendUp,      title: "P&L Statement",    desc: "Profit & loss auto-generated from your data." },
  { icon: ChartPie,     title: "Balance Sheet",    desc: "Assets, liabilities, net worth — real time." },
  { icon: Receipt,      title: "GST Returns",      desc: "GSTR-1 + GSTR-3B ready to upload to portal." },
  { icon: Package,      title: "Inventory",        desc: "Stock levels, low stock alerts, margins." },
  { icon: Sparkle,      title: "AI Advisor",       desc: "Ask anything. AI answers from YOUR data." },
];

const COMPARE = [
  ["GST Invoices",          true,  true,  true ],
  ["P&L + Balance Sheet",   true,  true,  true ],
  ["Works on Mobile",       false, false, true ],
  ["Works 100% Offline",    true,  false, true ],
  ["Khata + WhatsApp",      false, false, true ],
  ["AI Business Advisor",   false, false, true ],
  ["Monthly Cost",          "₹1,500+", "₹5,000+", "FREE"],
];
const COMPARE_COLS = ["Feature", "Old Software", "Hiring Help", "Business Vahi"];

// Dark surfaces used throughout — matches the promo poster's palette
const BG      = "#0A0A0A";
const SURFACE = "#161616";
const BORDER  = "rgba(255,255,255,0.10)";
const MUTED   = "#94A3B8";
const ORANGE  = "#0D9488";

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: `1px solid ${BORDER}`,
        background: "rgba(10,10,10,0.9)", backdropFilter: "blur(10px)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FintrLogo size="md" dark />
          <div style={{ display: "flex", gap: 32 }} className="hidden md:flex">
            {["Features", "Pricing", "Download", "Why Business Vahi"].map(n => (
              <span key={n} style={{ fontSize: 13, color: MUTED, cursor: "pointer", fontWeight: 500 }}>{n}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/login" style={{ padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: "transparent", color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Login</Link>
            <Link to="/signup" style={{ padding: "8px 18px", borderRadius: 8, background: ORANGE, color: "#0A0A0A", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 14px rgba(249,115,22,0.4)" }}>Start Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1200, margin: "0 auto", padding: "80px 24px 64px", textAlign: "center",
        background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(249,115,22,0.14), transparent 70%)",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(249,115,22,0.12)", border: `1px solid rgba(249,115,22,0.35)`, color: ORANGE, fontSize: 12, fontWeight: 700, marginBottom: 28 }}>
          Made for Indian Small Businesses
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, color: "white", margin: "0 0 20px" }}>
          Finance.<br />
          <span style={{ color: ORANGE }}>Tracked.</span><br />
          Simple.
        </h1>
        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: MUTED, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.65 }}>
          GST invoices, Khata, P&L, Cash Book — all automatic.
          Works offline. No CA needed. Free to start.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
          <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 10, background: ORANGE, color: "#0A0A0A", fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 6px 24px rgba(249,115,22,0.4)" }}>
            Start Free — No Credit Card <ArrowRight size={16} weight="bold" />
          </Link>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: "transparent", color: "white", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
            Login to Account
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 0, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", maxWidth: 500, margin: "0 auto" }}>
          {[["₹0","to start"],["100%","offline"],["5 min","setup"],["₹15K+","saved/year"]].map(([n,l],i) => (
            <div key={l} style={{ flex: 1, padding: "16px 8px", textAlign: "center", borderRight: i<3 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ fontSize: "clamp(16px,2.5vw,20px)", fontWeight: 900, color: "white" }}>{n}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DOWNLOAD SECTION ─────────────────────────────────── */}
      <section style={{ background: SURFACE, padding: "64px 24px", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 900, color: "white", letterSpacing: -1, margin: "0 0 10px" }}>
            Available on all platforms
          </h2>
          <p style={{ fontSize: 15, color: MUTED, marginBottom: 48 }}>
            One app. Works on phone, tablet, laptop, desktop.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 960, margin: "0 auto" }}>
            {[
              { icon: AndroidLogo, label: "Android APK", sub: "Direct download", href: "#", color: "#34D399", action: "Download APK" },
              { icon: DeviceMobile, label: "iOS — Safari", sub: "Share → Add to Home Screen", href: "#", color: "#60A5FA", action: "View Guide" },
              { icon: Globe, label: "Web Browser", sub: "Works on any browser", href: "https://fintr1.vercel.app", color: ORANGE, action: "Open App" },
              { icon: Desktop, label: "Windows Desktop", sub: "Offline .exe coming soon", href: "#", color: "#C084FC", action: "Coming Soon" },
            ].map(({ icon: Icon, label, sub, href, color, action }) => (
              <a key={label} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 28, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, textDecoration: "none" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon size={26} color={color} weight="fill" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>{sub}</div>
                <div style={{ padding: "7px 18px", borderRadius: 7, background: color, color: "#0A0A0A", fontSize: 12, fontWeight: 700 }}>{action}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ height: 2, width: 24, background: ORANGE, borderRadius: 99 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: ORANGE, textTransform: "uppercase" }}>Features</span>
              <div style={{ height: 2, width: 24, background: ORANGE, borderRadius: 99 }} />
            </div>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "white", letterSpacing: -1, margin: 0 }}>
              Everything your business needs.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: SURFACE, borderRadius: 14, padding: 22, border: `1px solid ${BORDER}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={20} color="#0A0A0A" weight="fill" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARE ─────────────────────────────────────────── */}
      <section style={{ padding: "72px 24px", background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ height: 2, width: 24, background: ORANGE, borderRadius: 99 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: ORANGE, textTransform: "uppercase" }}>Comparison</span>
              <div style={{ height: 2, width: 24, background: ORANGE, borderRadius: 99 }} />
            </div>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "white", letterSpacing: -1, margin: 0 }}>
              Simple software. Real savings.
            </h2>
          </div>
          <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(11px,1.5vw,13px)" }}>
              <thead>
                <tr>
                  {COMPARE_COLS.map((h,i) => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: i===0?"left":"center", fontWeight: 700, fontSize: 11, color: i===3?ORANGE:MUTED, background: i===3?"rgba(249,115,22,0.1)":"rgba(255,255,255,0.03)", borderBottom: `2px solid ${i===3?ORANGE:BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([f,...vs],ri) => (
                  <tr key={f} style={{ background: ri%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 500, color: "white", borderBottom: `1px solid ${BORDER}` }}>{f}</td>
                    {vs.map((v,j) => (
                      <td key={j} style={{ padding: "11px 14px", textAlign: "center", background: j===2?"rgba(249,115,22,0.06)":"transparent", borderBottom: `1px solid ${BORDER}` }}>
                        {v===true  ? <span style={{ color: "#34D399", fontWeight: 800 }}>✓</span>
                        :v===false ? <span style={{ color: "rgba(255,255,255,0.2)" }}>✗</span>
                        :<span style={{ fontSize: 11, fontWeight: j===2?900:500, color: j===2?ORANGE:MUTED }}>{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ───────────────────────────────────── */}
      <section style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 900, color: "white", letterSpacing: -1, margin: "0 0 12px" }}>Simple pricing.</h2>
          <p style={{ fontSize: 15, color: MUTED, marginBottom: 40 }}>Pay once. Use forever. No monthly surprises.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {[
              { plan: "Free Trial", price: "₹0", period: "30 days full access", features: ["Every feature included", "No credit card", "Unlimited invoices"], featured: false },
              { plan: "Basic", price: "₹1,999", period: "Pay once, use forever", features: ["Every feature included", "1 team member", "WhatsApp support"], featured: true },
              { plan: "Professional", price: "₹3,999", period: "Pay once, use forever", features: ["Every feature included", "Up to 3 team members", "Priority support"], featured: false },
            ].map(({ plan, price, period, features, featured }) => (
              <div key={plan} style={{ background: SURFACE, borderRadius: 16, padding: 28, border: featured ? `1.5px solid ${ORANGE}` : `1px solid ${BORDER}`, boxShadow: featured ? "0 8px 30px rgba(249,115,22,0.15)" : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{plan}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "white", marginBottom: 4 }}>{price}</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>{period}</div>
                {features.map(f => <div key={f} style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>✓ {f}</div>)}
                <Link to="/signup" style={{ display: "block", marginTop: 20, padding: "10px", borderRadius: 9, textAlign: "center", background: featured ? ORANGE : "white", color: "#0A0A0A", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{featured ? "Buy Now" : "Start Free"}</Link>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 24 }}>Every plan includes every feature — no locked tiers, ever.</p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{
        padding: "72px 24px", textAlign: "center",
        background: "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(249,115,22,0.12), transparent 70%)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: "white", letterSpacing: -1.5, margin: "0 0 12px" }}>
            Ready to run your<br /><span style={{ color: ORANGE }}>business smarter?</span>
          </h2>
          <p style={{ fontSize: 15, color: MUTED, marginBottom: 32 }}>Free 30 days. No credit card. Setup in 5 minutes.</p>
          <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px", borderRadius: 12, background: ORANGE, color: "#0A0A0A", fontWeight: 700, fontSize: 16, textDecoration: "none", boxShadow: "0 8px 30px rgba(249,115,22,0.45)" }}>
            Start Free Today <ArrowRight size={18} weight="bold" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <FintrLogo size="sm" dark />
          <p style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>© 2026 Business Vahi. Made in Pune, Maharashtra</p>
          <div style={{ display: "flex", gap: 24 }}>
            {[["Login","/login"],["Sign Up","/signup"]].map(([l,h]) => (
              <Link key={l} to={h} style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
