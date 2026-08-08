import { useState, useEffect } from "react";
import { X, DeviceMobile, ArrowDown } from "@phosphor-icons/react";

export function InstallApp() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Android Chrome — catch the install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 30 seconds
      setTimeout(() => setShow(true), 30000);
    });

    // iOS — show after 60 seconds if not dismissed before
    if (ios && !localStorage.getItem("fintr-install-dismissed")) {
      setTimeout(() => setShow(true), 60000);
    }

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("fintr-install-dismissed", "1");
  };

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (installed || !show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0A0A0A",
        color: "white",
        padding: "16px 20px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <DeviceMobile size={28} weight="fill" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Install Business Vahi on your phone
          </div>
          {isIOS ? (
            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
              Tap the <b>Share</b> button (□↑) at the bottom of Safari, then tap{" "}
              <b>"Add to Home Screen"</b> → Business Vahi opens like an app.
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
              Add Business Vahi to your home screen — works like a real app, even offline.
            </div>
          )}
          {!isIOS && deferredPrompt && (
            <button
              onClick={install}
              style={{
                marginTop: 10,
                background: "white",
                color: "#0A0A0A",
                border: "none",
                padding: "8px 20px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ArrowDown size={14} weight="bold" />
              Install App — Free
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.7, padding: 4 }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
