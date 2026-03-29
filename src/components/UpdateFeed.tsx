"use client";
import React, { useState, useEffect } from "react";
import styles from "./UpdateFeed.module.css";

interface Update { date: string; text: string; }

export default function UpdateFeed({ campaignId }: { campaignId: number }) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch("/care-market/updates.json")
      .then(r => r.json())
      .then(data => { setUpdates(data[String(campaignId)] || []); })
      .catch(() => {});
  }, [campaignId]);

  if (updates.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(!open)}>
        <span className={styles.title}>Updates</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && updates.map((u, i) => (
        <div key={i} className={styles.post}>
          <div className={styles.date}>{u.date}</div>
          <div className={styles.text}>{u.text}</div>
        </div>
      ))}
    </div>
  );
}
