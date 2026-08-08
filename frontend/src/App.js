import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { BusinessProvider } from "@/context/BusinessContext";
import { LangProvider } from "@/context/LangContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallApp } from "@/components/InstallApp";

// Public pages
import Landing  from "@/pages/Landing";
import Login    from "@/pages/Login";
import Signup   from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Admin    from "@/pages/Admin";

// Business Vahi Business pages
import BizDashboard from "@/pages/BizDashboard";
import Sales        from "@/pages/Sales";
import Purchases    from "@/pages/Purchases";
import Inventory    from "@/pages/Inventory";
import Expenses     from "@/pages/Expenses";
import Customers    from "@/pages/Customers";
import Khata        from "@/pages/Khata";
import CashBook     from "@/pages/CashBook";
import GSTInvoice   from "@/pages/GSTInvoice";
import GSTReturns   from "@/pages/GSTReturns";
import ProfitLoss   from "@/pages/ProfitLoss";
import BalanceSheet from "@/pages/BalanceSheet";
import BizAI        from "@/pages/BizAI";

const HomeGuard = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
};

const PR = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <BusinessProvider>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/"        element={<HomeGuard />} />
                <Route path="/login"   element={<Login />} />
                <Route path="/signup"  element={<Signup />} />
                <Route path="/onboarding" element={<PR><Onboarding /></PR>} />
                <Route path="/admin"   element={<PR><Admin /></PR>} />

                {/* Business — all protected */}
                <Route path="/dashboard"    element={<PR><BizDashboard /></PR>} />
                <Route path="/sales"        element={<PR><Sales /></PR>} />
                <Route path="/purchases"    element={<PR><Purchases /></PR>} />
                <Route path="/inventory"    element={<PR><Inventory /></PR>} />
                <Route path="/expenses"     element={<PR><Expenses /></PR>} />
                <Route path="/customers"    element={<PR><Customers /></PR>} />
                <Route path="/khata"        element={<PR><Khata /></PR>} />
                <Route path="/cash-book"    element={<PR><CashBook /></PR>} />
                <Route path="/invoices"     element={<PR><GSTInvoice /></PR>} />
                <Route path="/gst-returns"  element={<PR><GSTReturns /></PR>} />
                <Route path="/profit-loss"  element={<PR><ProfitLoss /></PR>} />
                <Route path="/balance-sheet" element={<PR><BalanceSheet /></PR>} />
                <Route path="/biz-ai"       element={<PR><BizAI /></PR>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster richColors position="top-right" />
              <InstallApp />
            </BrowserRouter>
          </BusinessProvider>
        </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
