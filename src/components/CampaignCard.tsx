"use client";
import React from "react";
import styles from "./CampaignCard.module.css";

export interface CampaignData {
  id: number;
  name: string;
  desc: string;
  goal: number;
  deposited: number;
  contributors: number;
  status: "Active" | "Completed" | "Cancelled" | "Closed";
  yieldPct: number;
  charityWallet: string;
  jitosolInVault: number;
}

export default function CampaignCard({ campaign, onClick }: { campaign: CampaignData; onClick: () => void }) {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.top}>
        <span className={styles.title}>{campaign.name}</span>
        <span className={`${styles.badge} ${styles[`badge_${campaign.status}`]}`}>{campaign.status}</span>
      </div>
      <p className={styles.desc}>{campaign.desc}</p>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${Math.min(campaign.yieldPct, 100)}%`,
            background: campaign.yieldPct >= 100 ? "#2d8659" : "#0a7c5a",
          }}
        />
      </div>
      <div className={styles.stats}>
        <span>{campaign.deposited} / {campaign.goal} SOL</span>
        <span>{campaign.contributors} contributors</span>
      </div>
    </div>
  );
}
