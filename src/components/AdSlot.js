import { useEffect, useMemo, useRef, useState } from "react";
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
  const existing = document.querySelector(
    `script[data-ad-client="${client}"], script[src*="pagead/js/adsbygoogle.js?client=${client}"]`
  );
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
  const placeholder = style?.minHeight ? undefined : { minHeight: 140 };
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!eligible || !contentReady) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setInView(true);
        });
      },
      { rootMargin: "200px 0px" }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [eligible, contentReady]);

  useEffect(() => {
    if (!eligible || !contentReady || !inView) return;
    ensureAdScript(client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore ad errors during load
    }
  }, [eligible, contentReady, slot, client, inView]);

  if (!eligible || !contentReady) return null;

  return (
    <div ref={containerRef} style={{ margin: "18px 0", position: "relative", ...placeholder }}>
      <div
        className="adPlaceholder"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #d7d9d7",
          borderRadius: 12,
          color: "#7a7f7e",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "#faf9f6",
          pointerEvents: "none",
        }}
      >
        Sponsored
      </div>
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
