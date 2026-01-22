import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import "../App.css";
import { Icon } from "@iconify/react";
import mapPin from "@iconify/icons-lucide/map-pin";
import building2 from "@iconify/icons-lucide/building-2";
import fileText from "@iconify/icons-lucide/file-text";
import shield from "@iconify/icons-lucide/shield";
import menu from "@iconify/icons-lucide/menu";
import x from "@iconify/icons-lucide/x";
import ScrollToTop from "./ScrollToTop";

function NavItem({ to, label, onClick }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => (isActive ? "active" : "")}>
      {label}
    </NavLink>
  );
}

export default function SiteLayout() {
  const { pathname } = useLocation();
  const isTool = pathname.startsWith("/app") || pathname.startsWith("/postcode") || pathname.startsWith("/place");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="layoutShell">
      <ScrollToTop />
      <header className="siteHeader">
        <div className="siteHeaderInner">
          <Link to="/" className="brand">
            <img src={`${process.env.PUBLIC_URL}/brand/area-iq-mark.svg`} alt="" aria-hidden="true" />
            <span>Area IQ</span>
          </Link>
          <button
            type="button"
            className="navToggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon icon={menuOpen ? x : menu} />
          </button>
          <nav className={`siteNav ${menuOpen ? "siteNavOpen" : ""}`}>
            <NavItem
              to="/city"
              onClick={() => setMenuOpen(false)}
              label={<span className="navItem"><Icon icon={mapPin} />Explore</span>}
            />
            <NavItem
              to="/app"
              onClick={() => setMenuOpen(false)}
              label={<span className="navItem"><Icon icon={building2} />Intelligence</span>}
            />
            <NavItem
              to="/reports"
              onClick={() => setMenuOpen(false)}
              label={<span className="navItem"><Icon icon={fileText} />Reports</span>}
            />
            <NavItem
              to="/pro"
              onClick={() => setMenuOpen(false)}
              label={<span className="navItem"><Icon icon={shield} />Pro</span>}
            />
          </nav>
        </div>
        {menuOpen && <div className="navScrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      </header>

      <main className="layoutMain" aria-live={isTool ? "polite" : "off"}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footerInner">
          <span>Crime &amp; Safety Dashboard - UK crime data and safety context.</span>
          <div className="footerLinks">
            <Link to="/about">About</Link>
            <Link to="/methodology">Methodology</Link>
            <Link to="/data-sources">Data sources</Link>
            <Link to="/pro">Pro</Link>
            <Link to="/privacy-policy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
