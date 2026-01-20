import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const ELIGIBLE_PREFIXES = ["/guides", "/areas", "/about", "/privacy-policy", "/terms", "/contact"];
const DEFAULT_CLIENT = "ca-pub-9609565860798349";

let adsenseLoaded = false;

function isEligiblePath(pathname) {
  if (pathname === "/") return true;
  return ELIGIBLE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function ensureAdScript(client) {
  if (adsenseLoaded) return;
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`script[data-ad-client="${client}"]`);
  if (existing) {
    adsenseLoaded = true;
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = "anonymous";
  script.dataset.adClient = client;
  document.head.appendChild(script);
  adsenseLoaded = true;
}

export default function AdSlot({ slot, contentReady = true, style = {} }) {
  const { pathname } = useLocation();
  const eligible = useMemo(() => isEligiblePath(pathname), [pathname]);
  const client = process.env.REACT_APP_ADSENSE_CLIENT || DEFAULT_CLIENT;

  useEffect(() => {
    if (!eligible || !contentReady) return;
    ensureAdScript(client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore ad errors during load
    }
  }, [eligible, contentReady, slot, client]);

  if (!eligible || !contentReady) return null;

  return (
    <div style={{ margin: "18px 0" }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
