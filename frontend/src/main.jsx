import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { RealtimeProvider } from "@/components/common/RealtimeProvider";
import FullscreenNotice from "@/components/common/FullscreenNotice";

const qc = new QueryClient();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RealtimeProvider>
        <BrowserRouter>
          <FullscreenNotice />
          <App />
        </BrowserRouter>
      </RealtimeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
