import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCategoryById } from "@/lib/categories";
import { useAuth } from "@/context/AuthContext";

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get("/business/settings")
      .then((r) => {
        const s = r.data || {};
        setSettings(s);
        setCategory(getCategoryById(s.business_category || "other"));
      })
      .catch(() => setCategory(getCategoryById("other")))
      .finally(() => setLoading(false));
  }, [user]);

  const refreshSettings = async () => {
    if (!user) return;
    const r = await api.get("/business/settings");
    const s = r.data || {};
    setSettings(s);
    setCategory(getCategoryById(s.business_category || "other"));
  };

  return (
    <BusinessContext.Provider value={{ settings, category, loading, refreshSettings }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
};
