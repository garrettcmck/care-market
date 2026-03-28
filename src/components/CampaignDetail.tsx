"use client";
import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useCareMarket } from "@/hooks/useCareMarket";
import { getJitosolRate } from "@/sdk/jupiter";
import { fetchUserStake, UserStake } from "@/utils/accounts";
import { findCampaignPDA } from "@/utils/constants";
import { CampaignData, estimateYieldEarned, estimateWeeksLeft } from "./CampaignCard";
import UpdateFeed from "./UpdateFeed";
import styles from "./CampaignDetail.module.css";

const APY = 0.075;

export default function CampaignDetail({ campaign, onBack }: { campaign: CampaignData; onBack: () => void }) {
  const [tab, setTab] = useState<"stake" | "manage">("stake");
  const [amount, setAmount] = useState("1");
  const [rate, setRate] = useState(1.083);
  const [userStake, setUserStake] = useState<UserStake | null>(null);
  const [stakeLoading, setStakeLoading] = useState(false);
  const { donate, earlyWithdraw, claim, loading, error, txSig, setError } = useCareMarket();
  const { connection } = useConnection();
  const wallet = useWallet();

  useEffect(() => { getJitosolRate().then(setRate).catch(() => {}); }, []);

  useEffect(() => {
    if (!wallet.publicKey) { setUserStake(null); return; }
    setStakeLoading(true);
    const [campPDA] = findCampaignPDA(campaign.id);
    fetchUserStake(connection, wallet.publicKey, campPDA)
      .then(setUserStake)
      .catch(() => setUserStake(null))
      .finally(() => setStakeLoading(false));
  }, [wallet.publicKey, connection, campaign.id, txSig]);

  const sol = parseFloat(amount) || 0;
  const fee = sol * 0.0001;

  // Yield calculations
  const yieldEarned = campaign.status === "Completed"
    ? campaign.goalSol
    : estimateYieldEarned(campaign.totalStaked, campaign.createdAt);
  const progressPct = campaign.goalSol > 0
    ? Math.min(Math.round((yieldEarned / campaign.goalSol) * 100), 100)
    : 0;
  const weeksLeft = estimateWeeksLeft(campaign.goalSol, campaign.totalStaked, yieldEarned);

  // What this new stake adds
  const newWeeklyYield = sol * APY / 52;
  const totalWeeklyYield = campaign.totalStaked * APY / 52;
  const remaining = Math.max(0, campaign.goalSol - yieldEarned);

  return (
    <div>
      <div className={styles.back} onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a7c5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
        Campaigns
      </div>

      <div className={styles.header}>
        <h2>{campaign.name}</h2>
        <p>{campaign.desc}</p>
      </div>

      {/* Progress toward YIELD GOAL, not stake amount */}
      <div className={styles.progress}>
        <div className={styles.progressTop}>
          <span className={styles.pct}>{yieldEarned.toFixed(2)} / {campaign.goalSol} SOL</span>
          <span className={`${styles.badge} ${styles[`badge_${campaign.status}`]}`}>{campaign.status}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.progressBottom}>
          <span>Yield earned toward goal</span>
          <span>{campaign.status === "Completed" ? "Goal reached" : weeksLeft < 9999 ? `~${weeksLeft} weeks left` : "Needs more stakes"}</span>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.statVal}>{campaign.totalStaked.toFixed(1)}</div>
          <div className={styles.statLabel}>SOL staked</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{campaign.contributors}</div>
          <div className={styles.statLabel}>Contributors</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{totalWeeklyYield.toFixed(3)}</div>
          <div className={styles.statLabel}>SOL / week</div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "stake" ? styles.tabActive : ""}`} onClick={() => { setTab("stake"); setError(null); }}>Stake SOL</button>
        <button className={`${styles.tab} ${tab === "manage" ? styles.tabActive : ""}`} onClick={() => { setTab("manage"); setError(null); }}>My stake</button>
      </div>

      <div className={styles.tabContent}>
        {error && <div className={styles.errorMsg}>{error}</div>}
        {txSig && <div className={styles.successMsg}>TX: {txSig.slice(0, 32)}...</div>}

        {tab === "stake" && campaign.status === "Active" && (
          <>
            {!wallet.connected ? (
              <p className={styles.connectHint}>Connect your wallet above to stake SOL</p>
            ) : (
              <>
                <div className={styles.inputWrap}>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.1" className={styles.input} />
                  <span className={styles.inputUnit}>SOL</span>
                </div>
                <div className={styles.fees}>
                  <div className={styles.feeRow}><span>Fee (0.01%)</span><span>{fee.toFixed(6)} SOL</span></div>
                  <div className={styles.feeRow}><span>Your weekly yield</span><span className={styles.green}>{newWeeklyYield.toFixed(4)} SOL</span></div>
                  <div className={styles.feeRow}><span>Remaining to goal</span><span>{remaining.toFixed(2)} SOL</span></div>
                  <div className={`${styles.feeRow} ${styles.feeDivider}`}>
                    <span className={styles.bold}>You get back</span>
                    <span className={`${styles.green} ${styles.bold}`}>{sol.toFixed(2)} SOL</span>
                  </div>
                </div>
                <button className={styles.primaryBtn} onClick={() => donate(campaign.id, sol)} disabled={loading || sol <= 0}>
                  {loading ? "Swapping SOL to jitoSOL..." : `Stake ${sol} SOL`}
                </button>
                <p className={styles.note}>Your SOL earns yield for the charity, then returns to you in full</p>
              </>
            )}
          </>
        )}

        {tab === "stake" && campaign.status === "Completed" && (
          <div className={styles.completedMsg}>
            <p className={styles.bold}>Campaign completed!</p>
            <p>The yield goal has been reached and the charity has been paid. Switch to &quot;My stake&quot; to claim your SOL back.</p>
          </div>
        )}

        {tab === "manage" && (
          <>
            {!wallet.connected ? (
              <p className={styles.connectHint}>Connect your wallet to view your stake</p>
            ) : stakeLoading ? (
              <p className={styles.connectHint}>Loading your stake...</p>
            ) : !userStake ? (
              <p className={styles.connectHint}>You have no stake in this campaign</p>
            ) : (
              <>
                <div className={styles.manageBox}>
                  <div className={styles.manageRow}><span>Your stake</span><span className={styles.bold}>{(Number(userStake.solDeposited) / LAMPORTS_PER_SOL).toFixed(2)} SOL</span></div>
                  <div className={styles.manageRow}><span>jitoSOL held</span><span className={styles.bold}>{(Number(userStake.jitosolShare) / 1e9).toFixed(4)} jitoSOL</span></div>
                  <div className={styles.manageRow}><span>Current value</span><span className={`${styles.bold} ${styles.green}`}>{(Number(userStake.jitosolShare) / 1e9 * rate).toFixed(2)} SOL</span></div>
                </div>
                {campaign.status === "Active" && (
                  <button className={styles.withdrawBtn} onClick={() => earlyWithdraw(campaign.id, Number(userStake.jitosolShare))} disabled={loading}>
                    {loading ? "Processing..." : "Early withdraw (1% fee)"}
                  </button>
                )}
                {campaign.status === "Completed" && (
                  <button className={styles.claimBtn} onClick={() => claim(campaign.id, Number(userStake.jitosolShare))} disabled={loading}>
                    {loading ? "Processing..." : "Claim SOL back"}
                  </button>
                )}
                {campaign.status === "Cancelled" && (
                  <button className={styles.cancelClaimBtn} onClick={() => claim(campaign.id, Number(userStake.jitosolShare))} disabled={loading}>
                    {loading ? "Processing..." : "Claim SOL + interest"}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      <UpdateFeed campaignId={campaign.id} />
    </div>
  );
}
