"use client";
import React, { useState } from "react";
import styles from "./HowItWorks.module.css";

export default function HowItWorks() {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(!open)}>
        <span className={styles.toggleText}>How it works</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.iconWrap}>
              {/* Hand placing coin into jar */}
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="14" y="22" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M14 28h20" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                <path d="M14 34h20" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                <circle cx="24" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                <path d="M24 9.5v5M21.5 12h5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M24 17v5" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/>
                <path d="M8 14c0-3 2-5 4-6" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                <path d="M40 14c0-3-2-5-4-6" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
              </svg>
            </div>
            <div className={styles.stepTitle}>Stake SOL</div>
          </div>
          <div className={styles.step}>
            <div className={styles.iconWrap}>
              {/* Growing plant with heart-shaped leaves and sparkles */}
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 40V22" stroke="currentColor" strokeWidth="2"/>
                <path d="M24 22c-2-6-8-8-14-7 1 7 5 11 14 7z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1"/>
                <path d="M24 28c2-5 7-7 13-6-1 6-5 10-13 6z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1"/>
                <path d="M18 40h12" stroke="currentColor" strokeWidth="2"/>
                <circle cx="36" cy="12" r="1.5" fill="currentColor" opacity="0.5"/>
                <circle cx="12" cy="16" r="1" fill="currentColor" opacity="0.4"/>
                <circle cx="38" cy="20" r="1" fill="currentColor" opacity="0.3"/>
                <path d="M33 8l1-2M35 9l2-1" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                <path d="M10 10l-1-2M8 11l-2-1" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
              </svg>
            </div>
            <div className={styles.stepTitle}>Yield funds charity</div>
          </div>
          <div className={styles.step}>
            <div className={styles.iconWrap}>
              {/* Shield with checkmark and coin returning */}
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 6L10 13v9c0 11 6 17 14 20 8-3 14-9 14-20v-9L24 6z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05"/>
                <path d="M18 24l4 4 8-8" stroke="currentColor" strokeWidth="2.5"/>
                <circle cx="38" cy="36" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                <path d="M38 34v4M36 36h4" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                <path d="M34 32l-4-3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.4"/>
              </svg>
            </div>
            <div className={styles.stepTitle}>Get SOL back</div>
          </div>
        </div>
      )}
    </div>
  );
}
