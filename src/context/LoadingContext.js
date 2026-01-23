import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const LoadingContext = createContext(null);

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 300;

let requestSeq = 0;

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const activeRequestIdRef = useRef(null);
  const pendingCountRef = useRef(0);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const shownAtRef = useRef(0);
  const previousBodyOverflowRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const finalizeLoading = useCallback(
    (requestId) => {
      if (requestId !== activeRequestIdRef.current) return;
      const doHide = () => {
        if (requestId !== activeRequestIdRef.current) return;
        clearTimers();
        setIsLoading(false);
        setLoadingLabel("");
        activeRequestIdRef.current = null;
        pendingCountRef.current = 0;
        shownAtRef.current = 0;
      };

      if (isLoading && shownAtRef.current) {
        const elapsed = Date.now() - shownAtRef.current;
        if (elapsed < MIN_VISIBLE_MS) {
          hideTimerRef.current = setTimeout(doHide, MIN_VISIBLE_MS - elapsed);
          return;
        }
      }
      doHide();
    },
    [clearTimers, isLoading]
  );

  const beginLoading = useCallback(
    (label, requestId) => {
      const id = requestId || `load_${Date.now()}_${++requestSeq}`;
      activeRequestIdRef.current = id;
      pendingCountRef.current = 1;
      shownAtRef.current = 0;
      clearTimers();
      setLoadingLabel(label);
      showTimerRef.current = setTimeout(() => {
        if (activeRequestIdRef.current !== id) return;
        setIsLoading(true);
        shownAtRef.current = Date.now();
      }, SHOW_DELAY_MS);
      return id;
    },
    [clearTimers]
  );

  const trackStart = useCallback(
    (requestId) => {
      if (requestId !== activeRequestIdRef.current) return;
      pendingCountRef.current += 1;
      if (!showTimerRef.current && !isLoading) {
        showTimerRef.current = setTimeout(() => {
          if (activeRequestIdRef.current !== requestId) return;
          setIsLoading(true);
          shownAtRef.current = Date.now();
        }, SHOW_DELAY_MS);
      }
    },
    [isLoading]
  );

  const trackEnd = useCallback(
    (requestId) => {
      if (requestId !== activeRequestIdRef.current) return;
      pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
      if (pendingCountRef.current === 0) {
        finalizeLoading(requestId);
      }
    },
    [finalizeLoading]
  );

  const cancelLoading = useCallback(
    (requestId) => {
      if (requestId !== activeRequestIdRef.current) return;
      finalizeLoading(requestId);
    },
    [finalizeLoading]
  );

  useEffect(() => {
    if (!isLoading) {
      if (previousBodyOverflowRef.current !== null) {
        document.body.style.overflow = previousBodyOverflowRef.current;
        previousBodyOverflowRef.current = null;
      }
      return;
    }
    if (previousBodyOverflowRef.current === null) {
      previousBodyOverflowRef.current = document.body.style.overflow || "";
    }
    document.body.style.overflow = "hidden";
    return () => {
      if (previousBodyOverflowRef.current !== null) {
        document.body.style.overflow = previousBodyOverflowRef.current;
        previousBodyOverflowRef.current = null;
      }
    };
  }, [isLoading]);

  const value = useMemo(
    () => ({
      isLoading,
      loadingLabel,
      beginLoading,
      trackStart,
      trackEnd,
      cancelLoading,
    }),
    [isLoading, loadingLabel, beginLoading, trackStart, trackEnd, cancelLoading]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider.");
  }
  return context;
}
