import React from "react";

export default function SolIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size || undefined} height={size || undefined}
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={className}
      style={{
        display: "inline",
        width: size ? `${size}px` : "0.85em",
        height: size ? `${size}px` : "0.85em",
        verticalAlign: "-0.05em",
        marginRight: "1px",
      }}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
