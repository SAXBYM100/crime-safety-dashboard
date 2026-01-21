import React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import "../App.css";
import { Icon } from "@iconify/react";
import mapPin from "@iconify/icons-lucide/map-pin";
import bookOpen from "@iconify/icons-lucide/book-open";
import building2 from "@iconify/icons-lucide/building-2";
import info from "@iconify/icons-lucide/info";
import mail from "@iconify/icons-lucide/mail";

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
            <img src={`${process.env.PUBLIC_URL}/brand/area-iq-mark.svg`} alt="" aria-hidden="true" />
            <span>Area IQ</span>
          </Link>
          <nav className="siteNav">
            <NavItem to="/app" label={<span className="navItem"><Icon icon={mapPin} />Dashboard</span>} />
            <NavItem to="/guides" label={<span className="navItem"><Icon icon={bookOpen} />Guides</span>} />
            <NavItem to="/areas" label={<span className="navItem"><Icon icon={building2} />Area Pages</span>} />
            <NavItem to="/city" label={<span className="navItem"><Icon icon={building2} />City Hubs</span>} />
            <NavItem to="/about" label={<span className="navItem"><Icon icon={info} />About</span>} />
            <NavItem to="/contact" label={<span className="navItem"><Icon icon={mail} />Contact</span>} />
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
