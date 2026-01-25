import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const ignoredLocalizationErrors = [
  /RegisterClientLocalizationsError/i,
  /reading ['"]translations['"]/i,
];

function shouldIgnoreLocalizationError(error) {
  if (!error) return false;
  const message = String(error.message || error);
  return ignoredLocalizationErrors.some((pattern) => pattern.test(message));
}

window.addEventListener("unhandledrejection", (event) => {
  if (shouldIgnoreLocalizationError(event.reason)) {
    console.warn("[localization] Ignored localization bootstrap error.", event.reason);
    event.preventDefault();
  }
});

window.addEventListener("error", (event) => {
  if (shouldIgnoreLocalizationError(event.error || event.message)) {
    console.warn("[localization] Ignored localization bootstrap error.", event.error || event.message);
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
