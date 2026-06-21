"use client";

import { createContext, useContext, useState } from "react";

/**
 * Portfolio mode shared across the shell. "sample" shows the demo portfolio
 * (mock data); "mine" represents the user's own (empty until imported). Mirrors
 * the wireframe's portfolio switcher behaviour.
 */
export type PortfolioMode = "sample" | "mine";

interface PortfolioContextValue {
  mode: PortfolioMode;
  setMode: (mode: PortfolioMode) => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PortfolioMode>("sample");
  return (
    <PortfolioContext.Provider value={{ mode, setMode }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioMode(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolioMode must be used within PortfolioProvider");
  }
  return ctx;
}
