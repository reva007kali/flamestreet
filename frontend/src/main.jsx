import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { RealtimeProvider } from "@/components/common/RealtimeProvider";
import FullscreenNotice from "@/components/common/FullscreenNotice";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const qc = new QueryClient();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch(() => {});
  });

  navigator.serviceWorker.addEventListener("message", (e) => {
    const d = e?.data ?? {};
    if (d?.type !== "navigate") return;
    const raw = d?.url ? String(d.url) : "";
    if (!raw) return;
    try {
      const u = new URL(raw, window.location.origin);
      if (u.origin !== window.location.origin) return;
      const next = `${u.pathname}${u.search}${u.hash}`;
      if (
        next ===
        window.location.pathname + window.location.search + window.location.hash
      )
        return;
      window.history.pushState({}, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } catch {}
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ErrorBoundary>
        <RealtimeProvider>
          <BrowserRouter>
            <FullscreenNotice />
            <App />
          </BrowserRouter>
        </RealtimeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
