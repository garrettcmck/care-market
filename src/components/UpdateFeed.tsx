"use client";
import React, { useState, useEffect } from "react";
import styles from "./UpdateFeed.module.css";

interface Update {
  date: string;
  text: string;
}

export default function UpdateFeed({ campaignId }: { campaignId: number }) {
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    fetch("/care-market/updates.json")
      .then((r) => r.json())
      .then((data) => {
        const entries = data[String(campaignId)] || [];
        setUpdates(entries);
      })
      .catch(() => {});
  }, [campaignId]);

  if (updates.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Updates</div>
      {updates.map((u, i) => (
        <div key={i} className={styles.post}>
          <div className={styles.date}>{u.date}</div>
          <div className={styles.text}>{u.text}</div>
        </div>
      ))}
    </div>
  );
}
