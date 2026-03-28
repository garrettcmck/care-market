"use client";
import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PROGRAM_ID } from "@/utils/constants";
import { CampaignData } from "./CampaignCard";
import styles from "./ProtocolStats.module.css";

export default function ProtocolStats({ campaigns }: { campaigns: CampaignData[] }) {
  const { connection } = useConnection();
  const [open, setOpen] = useState(true);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [totalDonors, setTotalDonors] = useState(0);

  const totalSolDeployed = campaigns.reduce((s, c) => s + c.totalStaked, 0);
  const activeDonors = campaigns.filter(c => c.status === "Active").reduce((s, c) => s + c.contributors, 0);
  const activeSol = campaigns.filter(c => c.status === "Active").reduce((s, c) => s + c.totalStaked, 0);
  const completedCampaigns = campaigns.filter(c => c.status === "Completed").length;

  useEffect(() => {
    // Fetch SOL price
    fetch("https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50")
      .then(r => r.json())
      .then(d => { if (d.outAmount) setSolPrice(Number(d.outAmount) / 1e6); })
      .catch(() => {});

    // Count unique donors
    connection.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: 97 }], dataSlice: { offset: 8, length: 32 } })
      .then(accounts => {
        const wallets = new Set<string>();
        for (const { account } of accounts) {
          wallets.add(Buffer.from(account.data).toString("hex"));
        }
        setTotalDonors(wallets.size);
      })
      .catch(() => {});
  }, [connection]);

  if (campaigns.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(!open)}>
        <span className={styles.toggleText}>Protocol stats</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className={styles.grid}>
          <div className={styles.stat}>
            <div className={styles.val}>{totalSolDeployed.toFixed(2)}</div>
            {solPrice && <div className={styles.usd}>${(totalSolDeployed * solPrice).toFixed(2)}</div>}
            <div className={styles.sub}>Total SOL deployed</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.val}>{activeSol.toFixed(2)}</div>
            {solPrice && <div className={styles.usd}>${(activeSol * solPrice).toFixed(2)}</div>}
            <div className={styles.sub}>Active SOL staked</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.val}>{totalDonors || activeDonors}</div>
            <div className={styles.subActive}>{activeDonors} active</div>
            <div className={styles.sub}>Total donors</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.val}>{completedCampaigns}</div>
            <div className={styles.sub}>Campaigns completed</div>
          </div>
        </div>
      )}
    </div>
  );
}
