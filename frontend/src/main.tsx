import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { applyTheme, themes, getStoredThemeId } from "./themes";
import { ToastContainer } from "react-toastify";
import { StarknetProvider } from "./dojo/StarknetProvider";
import { init } from "@dojoengine/sdk";
import { DojoSdkProvider } from "@dojoengine/sdk/react";
import { setupWorld } from "./dojo/contracts.gen";
import type { SchemaType } from "./dojo/models.gen";
import { dojoConfig } from "./dojo/dojoConfig";
import { DojoContractBridge } from "./components/DojoContractBridge";

// Apply stored theme on load
const themeId = getStoredThemeId();
applyTheme(themes[themeId] || themes.luxeDark);

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

async function main() {
  let sdk;
  try {
    sdk = await init<SchemaType>({
      client: {
        worldAddress: dojoConfig.manifest.world.address,
        toriiUrl: dojoConfig.toriiUrl || "http://localhost:8080",
      },
      domain: {
        name: "checkers",
        version: "1.0",
        chainId: "SN_SEPOLIA",
        revision: "1",
      },
    });
  } catch (err) {
    console.warn("[Dojo] SDK init failed (contract not deployed?):", err);
    // Render app without Dojo SDK — local play still works
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <StarknetProvider>
          <App />
          <ToastContainer
            position="bottom-center"
            theme="dark"
            autoClose={3000}
            hideProgressBar
          />
        </StarknetProvider>
      </React.StrictMode>,
    );
    return;
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <StarknetProvider>
        <DojoSdkProvider
          sdk={sdk}
          dojoConfig={dojoConfig}
          clientFn={setupWorld}
        >
          <DojoContractBridge />
          <App />
          <ToastContainer
            position="bottom-center"
            theme="dark"
            autoClose={3000}
            hideProgressBar
          />
        </DojoSdkProvider>
      </StarknetProvider>
    </React.StrictMode>,
  );
}

main();
