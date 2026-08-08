import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowRight, Receipt, TrendUp, BookOpen } from "@phosphor-icons/react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await signup(name, email, password);
      toast.success("Account created!");
      navigate("/onboarding");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr" }}>
      {/* Left — dark panel */}
      <div style={{
        background:"#030712", color:"white",
        padding:"48px", display:"flex", flexDirection:"column",
        justifyContent:"space-between",
      }} className="hidden lg:flex">
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            background:"#0A0A0A",
            borderRadius:10, padding:"6px 8px",
          }}>
            <svg width={20} height={20} viewBox="0 0 32 32" fill="none">
              <rect x="6" y="5" width="4.5" height="22" rx="2" fill="white"/>
              <rect x="6" y="5" width="18" height="4.5" rx="2" fill="white"/>
              <rect x="6" y="14" width="12" height="4" rx="2" fill="white"/>
              <rect x="22" y="20" width="3.5" height="7" rx="1.5" fill="rgba(255,255,255,0.55)"/>
              <rect x="27" y="15" width="3.5" height="12" rx="1.5" fill="rgba(255,255,255,0.8)"/>
            </svg>
          </div>
          <span style={{ fontWeight:900, fontSize:20, letterSpacing:-0.5 }}>
            Business<span style={{ color:"#0D9488" }}>Vahi</span>
          </span>
        </div>

        {/* Features */}
        <div>
          <h2 style={{ fontSize:32, fontWeight:900, lineHeight:1.1, marginBottom:32, letterSpacing:-1 }}>
            Run your business.<br />No CA needed.
          </h2>
          {[
            { icon:Receipt,  text:"GST invoices in 30 seconds"    },
            { icon:BookOpen, text:"Khata with WhatsApp reminders"  },
            { icon:TrendUp,  text:"P&L and Balance Sheet automatic"},
          ].map(({ icon:Icon, text }) => (
            <div key={text} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"rgba(249,115,22,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={16} color="#0D9488" weight="fill" />
              </div>
              <span style={{ fontSize:14, color:"rgba(255,255,255,0.75)" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>
          © 2026 Business Vahi · Made in Pune, India 🇮🇳
        </p>
      </div>

      {/* Right — form */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"48px 40px", background:"#FAFAFA",
      }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ marginBottom:8 }}>
            <span style={{ fontWeight:900, fontSize:22, letterSpacing:-0.5 }}>
              Business<span style={{ color:"#0D9488" }}>Vahi</span>
            </span>
          </div>
          <p className="lg:hidden" style={{ fontSize:11, color:"#94A3B8", margin:"0 0 24px", fontWeight:500 }}>
            आपकी दुकान का हिसाब-किताब — Your Shop's Accounts
          </p>

          <h1 style={{ fontSize:28, fontWeight:900, color:"#030712", marginBottom:6, letterSpacing:-0.5 }}>
            Create your account
          </h1>
          <p style={{ fontSize:14, color:"#64748B", marginBottom:32 }}>
            Free 30 days. No credit card required.
          </p>

          <form onSubmit={submit}>
            {[
              { label:"Full Name",       id:"name",     type:"text",     val:name,     set:setName,     ph:"Bunty Chavan"        },
              { label:"Email Address",   id:"email",    type:"email",    val:email,    set:setEmail,    ph:"bunty@gmail.com"      },
              { label:"Password",        id:"password", type:"password", val:password, set:setPassword, ph:"Minimum 6 characters" },
            ].map(({ label, id, type, val, set, ph }) => (
              <div key={id} style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6, letterSpacing:0.3 }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={ph}
                  required
                  style={{
                    width:"100%", padding:"11px 14px",
                    borderRadius:8, border:"1.5px solid #E2E8F0",
                    fontSize:14, color:"#030712", background:"white",
                    outline:"none", boxSizing:"border-box",
                    fontFamily:"inherit",
                  }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{
                width:"100%", padding:"13px",
                borderRadius:9, border:"none",
                background: loading ? "#94A3B8" : "#0A0A0A",
                color:"white", fontWeight:700, fontSize:15,
                cursor: loading ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                fontFamily:"inherit", marginTop:8,
                boxShadow:"0 4px 14px rgba(0,0,0,0.3)",
              }}
            >
              {loading ? "Creating account..." : "Create Account"}
              {!loading && <ArrowRight size={16} weight="bold" />}
            </button>
          </form>

          <p style={{ textAlign:"center", fontSize:13, color:"#64748B", marginTop:24 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color:"#0D9488", fontWeight:700, textDecoration:"none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
