"use client";
import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fetchAllCampaigns, fetchUserStake, Campaign } from "@/utils/accounts";
import { findCampaignPDA } from "@/utils/constants";
import styles from "./WalletProfile.module.css";

interface UserStats {
  totalSolDonated: number;
  activeSolStaked: number;
  claimableSol: number;
  totalJitosolEarned: number;
  campaignsSupported: number;
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
        let claimableSol = 0;
        let totalJitosolEarned = 0;
        let campaignsSupported = 0;

        const campaigns = await fetchAllCampaigns(connection, campaignCount);

        for (const camp of campaigns) {
          const [campPDA] = findCampaignPDA(camp.campaignId);
          const stake = await fetchUserStake(connection, wallet.publicKey!, campPDA);
          if (!stake) continue;

          campaignsSupported++;
          const solDep = Number(stake.solDeposited) / LAMPORTS_PER_SOL;
          const jitoHeld = Number(stake.jitosolShare) / 1e9;

          totalSolDonated += solDep;
          totalJitosolEarned += jitoHeld;

          if (camp.status === "Active") {
            activeSolStaked += solDep;
          } else if (camp.status === "Completed" || camp.status === "Cancelled") {
            claimableSol += solDep;
          }
        }

        setStats({ totalSolDonated, activeSolStaked, claimableSol, totalJitosolEarned, campaignsSupported });
      } catch (e) {
        console.error("Failed to load wallet stats:", e);
      }
      setLoading(false);
    };

    load();
  }, [wallet.publicKey, connection, campaignCount]);

  if (!wallet.connected || !stats) return null;
  if (loading) return <div className={styles.wrap}><div className={styles.loading}>Loading your profile...</div></div>;
  if (stats.campaignsSupported === 0) return null;

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
          <div className={styles.val}>{stats.claimableSol.toFixed(2)}</div>
          <div className={styles.sub}>SOL available to claim</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.val}>{stats.totalJitosolEarned.toFixed(4)}</div>
          <div className={styles.sub}>jitoSOL earned for charity</div>
        </div>
      </div>
      <div className={styles.campaigns}>{stats.campaignsSupported} campaign{stats.campaignsSupported !== 1 ? "s" : ""} supported</div>
    </div>
  );
}
