"use client";
import React from "react";
import { useSettings } from "@/contexts/Settings";
import SolIcon from "./SolIcon";

export default function Amt({ sol, decimals = 2 }: { sol: number; decimals?: number }) {
  const { currency, solPrice } = useSettings();
  if (currency === "USD" && solPrice) {
    return <>${(sol * solPrice).toFixed(decimals)}</>;
  }
  return <><SolIcon />{sol.toFixed(decimals)}</>;
}
