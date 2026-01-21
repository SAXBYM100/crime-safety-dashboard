import React, { useEffect, useMemo, useRef, useState } from "react";

type HeroTypeHeadlineProps = {
  prefix: string;
  typed: string;
  typingSpeedMs?: number;
  typingJitterMs?: number;
  cursorHideDelayMs?: number;
  className?: string;
};

export default function HeroTypeHeadline({
  prefix,
  typed,
  typingSpeedMs = 100,
  typingJitterMs = 40,
  cursorHideDelayMs = 1500,
  className = "",
}: HeroTypeHeadlineProps) {
  const characters = useMemo(() => typed.split(""), [typed]);
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let idx = 0;

    const tick = () => {
      idx += 1;
      setDisplayed(characters.slice(0, idx).join(""));
      if (idx < characters.length) {
        const jitter = Math.floor(Math.random() * (typingJitterMs + 1));
        timeoutRef.current = window.setTimeout(tick, typingSpeedMs + jitter);
      } else {
        setDone(true);
        timeoutRef.current = window.setTimeout(
          () => setShowCursor(false),
          cursorHideDelayMs
        );
      }
    };

    const initialDelay = typingSpeedMs;
    timeoutRef.current = window.setTimeout(tick, initialDelay);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [characters, typingSpeedMs, typingJitterMs, cursorHideDelayMs]);

  return (
    <h1 className={`heroType ${className}`}>
      <span>{prefix} </span>
      <span className="heroTypeEmphasis heroTypePill">{displayed}</span>
      {showCursor && (
        <span className={`heroCursor ${done ? "heroCursorFade" : ""}`} aria-hidden="true">
          |
        </span>
      )}
    </h1>
  );
}
