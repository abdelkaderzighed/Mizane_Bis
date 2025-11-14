import { createRoot } from "react-dom/client";
import App from "./App_refactored";
import "./index.css";
import { loadTranslations } from "./locales/loadTranslations";
import { loadChatInputTranslations } from "./constants/chatInputTranslations";

const rootElement = document.getElementById("root");

if (rootElement) {
  (async () => {
    try {
      await Promise.all([
        loadTranslations('fr'),
        loadChatInputTranslations('fr')
      ]);
    } catch (error) {
      console.warn("Failed to preload default translations", error);
    } finally {
      createRoot(rootElement).render(<App />);
    }
  })();
}
