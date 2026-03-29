"use client";
import React from "react";
import Amt from "./Amt";
import styles from "./CampaignCard.module.css";

const APY = 0.075;

export interface CampaignData {
  id: number;
  name: string;
  desc: string;
  goalSol: number;         // yield target in SOL (e.g. 25 SOL to feed a child)
  totalStaked: number;     // total SOL staked by all contributors
  contributors: number;
  status: "Active" | "Completed" | "Cancelled" | "Closed";
  charityWallet: string;
  jitosolInVault: number;
  createdAt: number;       // unix timestamp
}

// Estimate yield earned so far based on time staked and APY
export function estimateYieldEarned(totalStaked: number, createdAt: number): number {
  const now = Date.now() / 1000;
  const elapsed = Math.max(0, now - createdAt);
  const years = elapsed / (365.25 * 24 * 3600);
  return totalStaked * APY * years;
}

// Estimate weeks remaining to reach goal
export function estimateWeeksLeft(goalSol: number, totalStaked: number, yieldEarned: number): number {
  if (totalStaked <= 0) return Infinity;
  const remaining = Math.max(0, goalSol - yieldEarned);
  const weeklyYield = totalStaked * APY / 52;
  if (weeklyYield <= 0) return Infinity;
  return Math.ceil(remaining / weeklyYield);
}

export default function CampaignCard({ campaign, onClick }: { campaign: CampaignData; onClick: () => void }) {
  const yieldEarned = campaign.status === "Completed"
    ? campaign.goalSol
    : estimateYieldEarned(campaign.totalStaked, campaign.createdAt);
  const progressPct = campaign.goalSol > 0
    ? Math.min(Math.round((yieldEarned / campaign.goalSol) * 100), 100)
    : 0;
  const weeks = estimateWeeksLeft(campaign.goalSol, campaign.totalStaked, yieldEarned);

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.top}>
        <span className={styles.title}>{campaign.name}</span>
        <span className={`${styles.badge} ${styles[`badge_${campaign.status}`]}`}>{campaign.status}</span>
      </div>
      <p className={styles.desc}>{campaign.desc}</p>
      <div className={styles.cardStats}>
        <div className={styles.cardStat}>
          <div className={styles.cardStatVal}><Amt sol={campaign.totalStaked} /></div>
          <div className={styles.cardStatSub}>SOL staked</div>
        </div>
        <div className={styles.cardStat}>
          <div className={styles.cardStatVal}>{campaign.contributors}</div>
          <div className={styles.cardStatSub}>Contributors</div>
        </div>
        <div className={styles.cardStat}>
          <div className={styles.cardStatVal}>{campaign.status === "Completed" ? "Done" : weeks < 9999 ? `~${weeks}w` : "—"}</div>
          <div className={styles.cardStatSub}>{campaign.status === "Completed" ? "Goal reached" : "Est. remaining"}</div>
        </div>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${progressPct}%`,
            background: progressPct >= 100 ? "var(--green)" : "var(--green)",
          }}
        />
      </div>
      <div className={styles.yieldLine}>
        <span><Amt sol={yieldEarned} decimals={4} /> / <Amt sol={campaign.goalSol} /> earned</span>
      </div>
    </div>
  );
}
