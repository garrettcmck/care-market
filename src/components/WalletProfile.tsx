"use client";
import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fetchAllCampaigns, fetchUserStake } from "@/utils/accounts";
import { findCampaignPDA } from "@/utils/constants";
import { getJitosolRate } from "@/sdk/jupiter";
import styles from "./WalletProfile.module.css";

interface UserStats {
  totalSolDonated: number;
  activeSolStaked: number;
  yieldEarnedSol: number;
  activeCampaigns: number;
  inactiveCampaigns: number;
}

export default function WalletProfile({ campaignCount }: { campaignCount: number }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey || campaignCount === 0) { setStats(null); return; }

    const load = async () => {
      setLoading(true);
      try {
        let totalSolDonated = 0;
        let activeSolStaked = 0;
        let totalJitosolHeld = 0;
        let activeCampaigns = 0;
        let inactiveCampaigns = 0;

        const campaigns = await fetchAllCampaigns(connection, campaignCount);
        const rate = await getJitosolRate();

        for (const camp of campaigns) {
          const [campPDA] = findCampaignPDA(camp.campaignId);
          const stake = await fetchUserStake(connection, wallet.publicKey!, campPDA);
          if (!stake) continue;

          const solDep = Number(stake.solDeposited) / LAMPORTS_PER_SOL;
          const jitoHeld = Number(stake.jitosolShare) / 1e9;

          totalSolDonated += solDep;
          totalJitosolHeld += jitoHeld;

          if (camp.status === "Active") {
            activeSolStaked += solDep;
            activeCampaigns++;
          } else {
            inactiveCampaigns++;
          }
        }

        // Yield = current SOL value of jitoSOL holdings minus original SOL deposited
        // rate = SOL per jitoSOL (e.g. 1.27 means 1 jitoSOL = 1.27 SOL)
        const currentValueSol = totalJitosolHeld * rate;
        const yieldEarnedSol = Math.max(0, currentValueSol - totalSolDonated);

        setStats({ totalSolDonated, activeSolStaked, yieldEarnedSol, activeCampaigns, inactiveCampaigns });
      } catch (e) {
        console.error("Failed to load wallet stats:", e);
      }
      setLoading(false);
    };

    load();
  }, [wallet.publicKey, connection, campaignCount]);

  if (!wallet.connected || !stats) return null;
  if (loading) return <div className={styles.wrap}><div className={styles.loading}>Loading your profile...</div></div>;
  if (stats.activeCampaigns + stats.inactiveCampaigns === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Your profile</span>
        <span className={styles.address}>{wallet.publicKey!.toBase58().slice(0, 4)}...{wallet.publicKey!.toBase58().slice(-4)}</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <div className={styles.val}>{stats.totalSolDonated.toFixed(2)}</div>
          <div className={styles.sub}>SOL donated (all time)</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.val}>{stats.activeSolStaked.toFixed(2)}</div>
          <div className={styles.sub}>SOL in active campaigns</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.val}>{stats.activeCampaigns}</div>
          <div className={styles.sub}>Active campaign{stats.activeCampaigns !== 1 ? "s" : ""}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.val}>{stats.yieldEarnedSol.toFixed(4)}</div>
          <div className={styles.sub}>SOL earned for charity</div>
        </div>
      </div>
      {stats.inactiveCampaigns > 0 && (
        <div className={styles.campaigns}>{stats.inactiveCampaigns} completed/closed campaign{stats.inactiveCampaigns !== 1 ? "s" : ""}</div>
      )}
    </div>
  );
}
