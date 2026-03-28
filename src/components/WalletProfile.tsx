"use client";
import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fetchAllCampaigns, fetchUserStake } from "@/utils/accounts";
import { findCampaignPDA, PROGRAM_ID } from "@/utils/constants";
import { getJitosolRate } from "@/sdk/jupiter";
import styles from "./WalletProfile.module.css";

interface UserStats {
  totalSolDonated: number;
  activeSolStaked: number;
  yieldEarnedSol: number;
  activeCampaigns: number;
  inactiveCampaigns: number;
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  earned: boolean;
}

interface LeaderEntry {
  wallet: string;
  totalSol: number;
}

export default function WalletProfile({ campaignCount }: { campaignCount: number }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tab, setTab] = useState<"profile" | "achievements" | "leaderboard">("profile");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lbLoading, setLbLoading] = useState(false);

  // Load profile stats + achievements
  useEffect(() => {
    if (!wallet.publicKey || campaignCount === 0) { setStats(null); setAchievements([]); return; }

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

          if (camp.status === "Active") { activeSolStaked += solDep; activeCampaigns++; }
          else { inactiveCampaigns++; }
        }

        const currentValueSol = totalJitosolHeld * rate;
        const yieldEarnedSol = Math.max(0, currentValueSol - totalSolDonated);
        const s = { totalSolDonated, activeSolStaked, yieldEarnedSol, activeCampaigns, inactiveCampaigns };
        setStats(s);

        // Build achievements
        const a: Achievement[] = [
          { id: "noob", name: "Noob", desc: "Made your first donation", earned: totalSolDonated > 0 },
          { id: "generous", name: "Generous", desc: "Donated to 3+ campaigns", earned: (activeCampaigns + inactiveCampaigns) >= 3 },
          { id: "whale", name: "Whale", desc: "Donated 10+ SOL total", earned: totalSolDonated >= 10 },
          { id: "diamond", name: "Diamond Hands", desc: "Donated 1+ SOL to a single campaign", earned: activeSolStaked >= 1 },
          { id: "og", name: "OG", desc: "Supported the first campaign", earned: (activeCampaigns + inactiveCampaigns) > 0 },
        ];
        setAchievements(a);
      } catch (e) {
        console.error("Failed to load wallet stats:", e);
      }
      setLoading(false);
    };

    load();
  }, [wallet.publicKey, connection, campaignCount]);

  // Load leaderboard when tab selected
  useEffect(() => {
    if (tab !== "leaderboard" || leaderboard.length > 0) return;

    const loadLb = async () => {
      setLbLoading(true);
      try {
        // Fetch all UserStake accounts (97 bytes each)
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ dataSize: 97 }],
        });

        // Aggregate by wallet
        const walletMap = new Map<string, number>();
        for (const { account } of accounts) {
          const data = Buffer.from(account.data);
          const w = new PublicKey(data.subarray(8, 40)).toBase58();
          const sol = Number(data.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
          walletMap.set(w, (walletMap.get(w) || 0) + sol);
        }

        const entries: LeaderEntry[] = [];
        for (const [wallet, totalSol] of walletMap) {
          entries.push({ wallet, totalSol });
        }
        entries.sort((a, b) => b.totalSol - a.totalSol);
        setLeaderboard(entries);
      } catch (e) {
        console.error("Failed to load leaderboard:", e);
      }
      setLbLoading(false);
    };

    loadLb();
  }, [tab, connection, leaderboard.length]);

  if (!wallet.connected) return null;
  if (loading) return <div className={styles.wrap}><div className={styles.loadingText}>Loading...</div></div>;

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "profile" ? styles.tabActive : ""}`} onClick={() => setTab("profile")}>Profile</button>
        <button className={`${styles.tab} ${tab === "achievements" ? styles.tabActive : ""}`} onClick={() => setTab("achievements")}>
          Achievements{earnedCount > 0 ? ` (${earnedCount})` : ""}
        </button>
        <button className={`${styles.tab} ${tab === "leaderboard" ? styles.tabActive : ""}`} onClick={() => setTab("leaderboard")}>Leaderboard</button>
      </div>

      {tab === "profile" && stats && (
        <div className={styles.content}>
          <div className={styles.address}>{wallet.publicKey!.toBase58().slice(0, 4)}...{wallet.publicKey!.toBase58().slice(-4)}</div>
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
            <div className={styles.info}>{stats.inactiveCampaigns} completed/closed campaign{stats.inactiveCampaigns !== 1 ? "s" : ""}</div>
          )}
        </div>
      )}

      {tab === "profile" && !stats && (
        <div className={styles.content}>
          <div className={styles.empty}>Donate to a campaign to see your stats</div>
        </div>
      )}

      {tab === "achievements" && (
        <div className={styles.content}>
          {achievements.map((a) => (
            <div key={a.id} className={`${styles.achRow} ${a.earned ? styles.achEarned : styles.achLocked}`}>
              <div className={styles.achIcon}>{a.earned ? "✓" : "○"}</div>
              <div className={styles.achInfo}>
                <div className={styles.achName}>{a.name}</div>
                <div className={styles.achDesc}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className={styles.content}>
          {lbLoading ? (
            <div className={styles.loadingText}>Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.empty}>No donations yet</div>
          ) : (
            leaderboard.map((entry, i) => {
              const isYou = wallet.publicKey?.toBase58() === entry.wallet;
              return (
                <div key={i} className={`${styles.lbRow} ${isYou ? styles.lbYou : ""}`}>
                  <div className={styles.lbRank}>#{i + 1}</div>
                  <div className={styles.lbWallet}>
                    {entry.wallet.slice(0, 4)}...{entry.wallet.slice(-4)}
                    {isYou && <span className={styles.lbYouTag}>You</span>}
                  </div>
                  <div className={styles.lbAmount}>{entry.totalSol.toFixed(2)} SOL</div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
