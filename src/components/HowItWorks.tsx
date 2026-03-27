"use client";
import React from "react";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a7c5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Stake SOL",
    sub: "Swapped to jitoSOL, earning ~7.5% APY",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a7c5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Yield funds charity",
    sub: "Rewards accumulate toward the goal",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a7c5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M16 14h.01" />
        <path d="M2 10h20" />
      </svg>
    ),
    title: "Get SOL back",
    sub: "Full deposit returned when goal is met",
  },
];

export default function HowItWorks() {
  return (
    <div className={styles.container}>
      <p className={styles.title}>How it works</p>
      <div className={styles.grid}>
        {steps.map((s, i) => (
          <div key={i} className={styles.step}>
            <div className={styles.icon}>{s.icon}</div>
            <p className={styles.stepTitle}>{s.title}</p>
            <p className={styles.stepSub}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
