/**
 * ⚠️  LOCKED — DO NOT MODIFY without an explicit request to change the header/navigation.
 *
 * This file has been rewritten many times as accidental side-effects of unrelated
 * requests (color sweeps, language passes, layout fixes elsewhere). Bunty asked for
 * it to stay stable. If a future task touches colors/text/layout app-wide, SKIP this
 * file unless the person specifically asks to change the header, logo, or nav drawer.
 */
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LangContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GridFour, ShoppingCart, Package, Receipt, Users, FileText,
  TrendUp, BookOpen, CurrencyInr, SignOut,
  List, X, Moon, Sun, Sparkle, Shield, ChartPie, Translate,
} from "@phosphor-icons/react";

/* ── Logo ────────────────────────────────────────────────────── */
export const FintrLogo = ({ size = "md", dark = false }) => {
  const sz = { sm: 18, md: 22, lg: 28 }[size] || 22;
  const fs = { sm: "16px", md: "20px", lg: "26px" }[size] || "20px";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
      <div style={{
        background:"#0A0A0A",
        border: dark ? "1.5px solid #0D9488" : "none",
        borderRadius:10, padding:"6px 8px",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 3px 14px rgba(0,0,0,0.35)", flexShrink:0,
      }}>
        <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
          <rect x="5"  y="4"  width="5"  height="24" rx="2.5" fill="#0D9488"/>
          <rect x="5"  y="4"  width="20" height="5"  rx="2.5" fill="#0D9488"/>
          <rect x="5"  y="14" width="13" height="4.5" rx="2.5" fill="#0D9488"/>
          <rect x="22" y="20" width="4"  height="8"  rx="2"   fill="rgba(255,255,255,0.55)"/>
          <rect x="27" y="13" width="4"  height="15" rx="2"   fill="rgba(255,255,255,0.85)"/>
        </svg>
      </div>
      <span style={{ fontWeight:900, fontSize:fs, letterSpacing:-0.5, fontFamily:"Inter,system-ui,sans-serif", whiteSpace:"nowrap" }}>
        <span style={{ color: dark ? "#FFFFFF" : "#0A0A0A" }}>Business</span>
        <span style={{ color:"#0D9488" }}>Vahi</span>
      </span>
    </div>
  );
};

const NAV_ITEMS = [
  { to:"/dashboard",    en:"Dashboard",    hi:"होम",         icon:GridFour     },
  { to:"/sales",        en:"Sales",        hi:"बिक्री",      icon:ShoppingCart  },
  { to:"/purchases",    en:"Purchase",     hi:"खरीद",        icon:Package       },
  { to:"/inventory",    en:"Stock",        hi:"स्टॉक",       icon:Package       },
  { to:"/expenses",     en:"Spending",     hi:"खर्च",        icon:Receipt       },
  { to:"/customers",    en:"Customers",    hi:"ग्राहक",      icon:Users         },
  { to:"/khata",        en:"Credit Book",  hi:"उधार खाता",   icon:BookOpen      },
  { to:"/cash-book",    en:"Cash",         hi:"नकदी",        icon:CurrencyInr   },
  { to:"/invoices",     en:"Bill/Invoice", hi:"बिल",         icon:FileText      },
  { to:"/gst-returns",  en:"GST Filing",   hi:"GST भरें",    icon:Receipt       },
  { to:"/profit-loss",  en:"Profit & Loss",hi:"नफ़ा-नुकसान", icon:TrendUp       },
  { to:"/balance-sheet",en:"Balance",      hi:"बैलेंस",      icon:ChartPie      },
  { to:"/biz-ai",       en:"Ask AI",       hi:"AI पूछें",    icon:Sparkle       },
];

export const Header = () => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { lang, setLanguage, t, currentLang, LANGUAGES } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const getLabel = (item) => {
    const keyMap = {
      "/dashboard":"dashboard","/sales":"sales","/purchases":"purchases",
      "/inventory":"inventory","/expenses":"expenses","/customers":"customers",
      "/khata":"khata","/cash-book":"cashBook","/invoices":"gstInvoice",
      "/gst-returns":"gstReturns","/profit-loss":"profitLoss",
      "/balance-sheet":"balanceSheet","/biz-ai":"aiAdvisor",
    };
    return t(keyMap[item.to]) || item.en;
  };

  const active = (path) => location.pathname === path;
  const go = (path) => { navigate(path); setOpen(false); };

  return (
    <>
      {/* ── TOP BAR — identical on every screen size, no breakpoints ── */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid #E2E8F0",
      }}>
        <div style={{
          display:"flex", height:56, alignItems:"center",
          justifyContent:"space-between", padding:"0 12px",
          maxWidth:1280, margin:"0 auto", gap:8,
        }}>
          {/* Left: hamburger + logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
            <button onClick={() => setOpen(true)} aria-label="Open menu" style={{
              padding:8, borderRadius:8, border:"none",
              background:"transparent", color:"#0A0A0A", cursor:"pointer",
              display:"flex", flexShrink:0,
            }}>
              <List size={20} weight="bold" />
            </button>
            <Link to="/dashboard" style={{ textDecoration:"none", minWidth:0 }}>
              <FintrLogo size="sm" />
            </Link>
          </div>

          {/* Right: compact controls only */}
          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <button onClick={toggle} style={{
              padding:8, borderRadius:8, border:"none",
              background:"transparent", color:"#64748B", cursor:"pointer",
            }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button style={{
                  display:"flex", alignItems:"center", gap:4,
                  padding:"6px 8px", borderRadius:8,
                  border:"1.5px solid #E2E8F0",
                  background:"#F0FDFA", color:"#0D9488",
                  fontSize:14, fontWeight:700, cursor:"pointer",
                }}>
                  <span>{currentLang.flag}</span>
                  <span style={{ fontSize:9 }}>▾</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ minWidth:200, maxHeight:320, overflowY:"auto" }}>
                <DropdownMenuLabel style={{ fontSize:11, color:"#64748B" }}>
                  {t("selectLanguage")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LANGUAGES.map(l => (
                  <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)}
                    style={{
                      background: lang === l.code ? "#F0FDFA" : "transparent",
                      color: lang === l.code ? "#0D9488" : "#0F172A",
                      fontWeight: lang === l.code ? 700 : 400,
                      fontSize:13,
                    }}>
                    <span style={{ marginRight:10, fontSize:16 }}>{l.flag}</span>
                    <span>{l.native}</span>
                    <span style={{ marginLeft:"auto", fontSize:11, color:"#94A3B8" }}>{l.name}</span>
                    {lang === l.code && <span style={{ marginLeft:6, color:"#0D9488" }}>✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {user && (
              <button onClick={() => setOpen(true)} style={{
                width:30, height:30, borderRadius:8, border:"none",
                background:"#0A0A0A", color:"white", fontWeight:800, fontSize:12,
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
              }}>
                {user.name?.[0]?.toUpperCase() || "F"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Overlay behind the drawer ── */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
          zIndex:110,
        }} />
      )}

      {/* ── LEFT SIDE DRAWER — every nav item stacked in one column ── */}
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:270, maxWidth:"82vw",
        background:"white", zIndex:120,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.25s ease",
        display:"flex", flexDirection:"column",
        boxShadow: open ? "8px 0 30px rgba(0,0,0,0.15)" : "none",
      }}>
        {/* Drawer header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 16px", borderBottom:"1px solid #E2E8F0", flexShrink:0,
        }}>
          <FintrLogo size="sm" />
          <button onClick={() => setOpen(false)} style={{
            padding:6, borderRadius:8, border:"none",
            background:"#F8FAFC", color:"#64748B", cursor:"pointer",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #E2E8F0", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:10, background:"#0A0A0A",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"white", fontWeight:800, fontSize:14, flexShrink:0,
              }}>
                {user.name?.[0]?.toUpperCase() || "F"}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0A0A0A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user.name}
                </div>
                <div style={{ fontSize:11, color:"#64748B", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav column — scrolls if it overflows, never spills sideways */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 12px", borderRadius:10, textDecoration:"none",
                fontSize:14, fontWeight:600, marginBottom:2,
                background: active(item.to) ? "#F0FDFA" : "transparent",
                color: active(item.to) ? "#0D9488" : "#334155",
              }}>
              <item.icon size={18} weight={active(item.to) ? "fill" : "regular"} />
              {getLabel(item)}
            </Link>
          ))}

          {user?.is_admin && (
            <Link to="/admin" onClick={() => setOpen(false)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 12px", borderRadius:10, textDecoration:"none",
                fontSize:14, fontWeight:600, marginTop:6,
                background: active("/admin") ? "#F0FDFA" : "transparent",
                color: active("/admin") ? "#0D9488" : "#334155",
              }}>
              <Shield size={18} weight={active("/admin") ? "fill" : "regular"} />
              Admin
            </Link>
          )}
        </div>

        {/* Sign out — pinned to bottom */}
        {user && (
          <div style={{ padding:"12px", borderTop:"1px solid #E2E8F0", flexShrink:0 }}>
            <button onClick={() => { logout(); setOpen(false); navigate("/"); }} style={{
              display:"flex", alignItems:"center", gap:10,
              width:"100%", padding:"10px 12px", borderRadius:10,
              border:"none", background:"#FEF2F2", color:"#DC2626",
              fontSize:13, fontWeight:600, cursor:"pointer",
            }}>
              <SignOut size={16} /> {t("signOut")}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
