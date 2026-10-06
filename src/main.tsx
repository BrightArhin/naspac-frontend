import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import "./index.css";
import "./lib/setup-network";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "Figtree, sans-serif",
          colorPrimary: "#3c2a22",
          colorInfo: "#3c2a22",
          colorText: "#2c241f",
          colorTextSecondary: "#6f655c",
          colorBorder: "#e0d8d0",
          colorBgLayout: "#f3f0eb",
          borderRadius: 8,
          controlHeight: 36,
        },
        components: {
          Table: {
            headerBg: "#f7f4f0",
            headerColor: "#5c534c",
            rowHoverBg: "#faf8f6",
            borderColor: "#e6dfd6",
          },
          Button: {
            primaryShadow: "none",
            defaultShadow: "none",
            dangerShadow: "none",
          },
          Modal: {
            borderRadiusLG: 14,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
