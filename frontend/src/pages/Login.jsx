import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F8FAFC" }}>
      <div style={{
        width:"100%", maxWidth:400, margin:"0 auto",
        background:"white", borderRadius:16, padding:"40px 36px",
        boxShadow:"0 4px 32px rgba(0,0,0,0.08)", border:"1px solid #E2E8F0",
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{
              background:"#0A0A0A",
              borderRadius:10, padding:"6px 8px",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 2px 8px rgba(0,0,0,0.3)",
            }}>
              <svg width={20} height={20} viewBox="0 0 32 32" fill="none">
                <rect x="6" y="5" width="4.5" height="22" rx="2" fill="#0D9488"/>
                <rect x="6" y="5" width="18" height="4.5" rx="2" fill="#0D9488"/>
                <rect x="6" y="14" width="12" height="4" rx="2" fill="#0D9488"/>
                <rect x="22" y="20" width="3.5" height="7" rx="1.5" fill="rgba(255,255,255,0.55)"/>
                <rect x="27" y="15" width="3.5" height="12" rx="1.5" fill="rgba(255,255,255,0.8)"/>
              </svg>
            </div>
            <span style={{ fontWeight:900, fontSize:22, letterSpacing:-0.5 }}>
              Business<span style={{ color:"#0D9488" }}>Vahi</span>
            </span>
          </div>
          <p style={{ fontSize:11, color:"#94A3B8", margin:"0 0 16px", fontWeight:500 }}>
            आपकी दुकान का हिसाब-किताब — Your Shop's Accounts
          </p>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#030712", margin:"0 0 4px", letterSpacing:-0.5 }}>
            Welcome back
          </h1>
          <p style={{ fontSize:13, color:"#64748B", margin:0 }}>
            Sign in to your Business Vahi account
          </p>
        </div>

        <form onSubmit={submit}>
          {[
            { label:"Email Address", id:"email",    type:"email",    val:email,    set:setEmail,    ph:"bunty@gmail.com"  },
            { label:"Password",      id:"password", type:"password", val:password, set:setPassword, ph:"Your password"    },
          ].map(({ label, id, type, val, set, ph }) => (
            <div key={id} style={{ marginBottom:18 }}>
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
                  fontSize:14, color:"#030712", background:"#FAFAFA",
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
              fontFamily:"inherit", marginTop:4,
              boxShadow:"0 4px 14px rgba(0,0,0,0.3)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <ArrowRight size={16} weight="bold" />}
          </button>
        </form>

        {/* Security note */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:20, padding:"10px 12px", borderRadius:8, background:"#F0FDFA", border:"1px solid #99F6E4" }}>
          <ShieldCheck size={14} color="#0D9488" weight="fill" />
          <span style={{ fontSize:11, color:"#0F766E" }}>Secured with JWT encryption and account lockout protection</span>
        </div>

        <p style={{ textAlign:"center", fontSize:13, color:"#64748B", marginTop:20 }}>
          New to Business Vahi?{" "}
          <Link to="/signup" style={{ color:"#0D9488", fontWeight:700, textDecoration:"none" }}>
            Create free account
          </Link>
        </p>
      </div>
    </div>
  );
}
