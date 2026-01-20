import React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import "../App.css";

function NavItem({ to, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? "active" : "")}>
      {label}
    </NavLink>
  );
}

export default function SiteLayout() {
  const { pathname } = useLocation();
  const isTool = pathname.startsWith("/app") || pathname.startsWith("/postcode") || pathname.startsWith("/place");

  return (
    <div className="layoutShell">
      <header className="siteHeader">
        <div className="siteHeaderInner">
          <Link to="/" className="brand">
            Crime &amp; Safety
          </Link>
          <nav className="siteNav">
            <NavItem to="/app" label="Dashboard" />
            <NavItem to="/guides" label="Guides" />
            <NavItem to="/areas" label="Area Pages" />
            <NavItem to="/about" label="About" />
            <NavItem to="/contact" label="Contact" />
          </nav>
        </div>
      </header>

      <main className="layoutMain" aria-live={isTool ? "polite" : "off"}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <span>Crime &amp; Safety Dashboard - UK crime data and safety context.</span>
          <div className="footerLinks">
            <Link to="/about">About</Link>
            <Link to="/privacy-policy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
