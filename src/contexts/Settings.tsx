"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SettingsContextType {
  dark: boolean;
  toggleDark: () => void;
  currency: "SOL" | "USD";
  toggleCurrency: () => void;
  solPrice: number | null;
}

const SettingsContext = createContext<SettingsContextType>({
  dark: false, toggleDark: () => {}, currency: "SOL", toggleCurrency: () => {}, solPrice: null,
});

export function useSettings() { return useContext(SettingsContext); }

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [currency, setCurrency] = useState<"SOL" | "USD">("SOL");
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("care-market-theme");
      if (t === "dark") { setDark(true); document.documentElement.setAttribute("data-theme", "dark"); }
      const c = localStorage.getItem("care-market-currency");
      if (c === "USD") setCurrency("USD");
    } catch {}
    fetch("https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50")
      .then(r => r.json()).then(d => { if (d.outAmount) setSolPrice(Number(d.outAmount) / 1e6); }).catch(() => {});
  }, []);

  const toggleDark = useCallback(() => {
    setDark(p => { const n = !p; document.documentElement.setAttribute("data-theme", n ? "dark" : "light"); localStorage.setItem("care-market-theme", n ? "dark" : "light"); return n; });
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(p => { const n = p === "SOL" ? "USD" : "SOL"; localStorage.setItem("care-market-currency", n); return n; });
  }, []);

  return <SettingsContext.Provider value={{ dark, toggleDark, currency, toggleCurrency, solPrice }}>{children}</SettingsContext.Provider>;
}
