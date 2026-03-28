"use client";
import React, { useState } from "react";
import styles from "./HowItWorks.module.css";

export default function HowItWorks() {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(!open)}>
        <span className={styles.toggleText}>How it works</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.num}>1</div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>Stake SOL</div>
              <div className={styles.stepDesc}>Swapped to jitoSOL earning ~7.5% APY</div>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.num}>2</div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>Yield funds charity</div>
              <div className={styles.stepDesc}>Rewards accumulate toward the goal</div>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.num}>3</div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>Get SOL back</div>
              <div className={styles.stepDesc}>Full deposit returned when goal is met</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
