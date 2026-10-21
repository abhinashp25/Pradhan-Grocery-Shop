import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/baloo-bhaina-2/800.css";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "@fontsource/noto-sans-oriya/400.css";
import "@fontsource/noto-sans-oriya/700.css";
import "./styles.css";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { initTheme } from "./lib/theme";
import { logVisit } from "./lib/visits";

initTheme();
logVisit();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
