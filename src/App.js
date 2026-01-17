import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";

import HomeRoute from "./pages/HomeRoute";
import PostcodePage from "./pages/PostcodePage";
import PlacePage from "./pages/PlacePage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";

export default function App() {
  return (
    <>
      <header style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", gap: 14, alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: 800, textDecoration: "none" }}>
            Crime & Safety
          </Link>

          <nav style={{ display: "flex", gap: 12, opacity: 0.85 }}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/postcode/:postcode" element={<PostcodePage />} />
        <Route path="/place/:placeName" element={<PlacePage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />

        {/* Catch-all: prevents dead/blank pages if a URL doesn't match */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
