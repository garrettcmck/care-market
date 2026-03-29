"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fetchAllCampaigns, fetchUserStake } from "@/utils/accounts";
import { findCampaignPDA, PROGRAM_ID } from "@/utils/constants";
import { getJitosolRate } from "@/sdk/jupiter";
import { displayName, getXLink, getUserProfile, saveUserProfile } from "@/utils/sns";
import { CampaignData } from "./CampaignCard";
import Amt from "./Amt";
import styles from "./WalletProfile.module.css";

interface UserStats { totalSolDonated: number; activeSolStaked: number; yieldEarnedSol: number; activeCampaigns: number; inactiveCampaigns: number; }
interface Achievement { id: string; name: string; desc: string; earned: boolean; }
interface LeaderEntry { wallet: string; totalSol: number; }
interface MyCampaign { id: number; name: string; status: string; solDeposited: number; }

export default function WalletProfile({ campaignCount, campaigns, onSelectCampaign }: { campaignCount: number; campaigns: CampaignData[]; onSelectCampaign: (c: CampaignData) => void; }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"profile" | "achievements" | "leaderboard" | "campaigns">("profile");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<MyCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [lbLoading, setLbLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editX, setEditX] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) return;
    const p = getUserProfile(wallet.publicKey.toBase58());
    setEditName(p.name); setEditX(p.x);
  }, [wallet.publicKey]);

  useEffect(() => {
    if (!wallet.publicKey || campaignCount === 0) { setStats(null); setAchievements([]); setMyCampaigns([]); return; }
    const load = async () => {
      setLoading(true);
      try {
        let totalSolDonated = 0, activeSolStaked = 0, totalJitosolHeld = 0, activeCampaigns = 0, inactiveCampaigns = 0;
        const myC: MyCampaign[] = [];
        const allCampaigns = await fetchAllCampaigns(connection, campaignCount);
        const rate = await getJitosolRate();
        for (const camp of allCampaigns) {
          const [campPDA] = findCampaignPDA(camp.campaignId);
          const stake = await fetchUserStake(connection, wallet.publicKey!, campPDA);
          if (!stake) continue;
          const solDep = Number(stake.solDeposited) / LAMPORTS_PER_SOL;
          const jitoHeld = Number(stake.jitosolShare) / 1e9;
          totalSolDonated += solDep; totalJitosolHeld += jitoHeld;
          myC.push({ id: camp.campaignId, name: camp.charityName, status: camp.status, solDeposited: solDep });
          if (camp.status === "Active") { activeSolStaked += solDep; activeCampaigns++; } else { inactiveCampaigns++; }
        }
        const yieldEarnedSol = Math.max(0, totalJitosolHeld * rate - totalSolDonated);
        setStats({ totalSolDonated, activeSolStaked, yieldEarnedSol, activeCampaigns, inactiveCampaigns });
        setMyCampaigns(myC);
        setAchievements([
          { id: "noob", name: "Noob", desc: "Made your first donation", earned: totalSolDonated > 0 },
          { id: "generous", name: "Generous", desc: "Donated to 3+ campaigns", earned: (activeCampaigns + inactiveCampaigns) >= 3 },
          { id: "whale", name: "Whale", desc: "Donated 10+ SOL total", earned: totalSolDonated >= 10 },
          { id: "diamond", name: "Diamond Hands", desc: "1+ SOL in a single campaign", earned: myC.some(c => c.solDeposited >= 1) },
          { id: "og", name: "OG", desc: "Supported the first campaign", earned: myC.some(c => c.id === 0) },
        ]);
      } catch (e) { console.error("Failed to load wallet stats:", e); }
      setLoading(false);
    };
    load();
  }, [wallet.publicKey, connection, campaignCount]);

  useEffect(() => {
    if (tab !== "leaderboard" || leaderboard.length > 0) return;
    const loadLb = async () => {
      setLbLoading(true);
      try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: 97 }] });
        const wm = new Map<string, number>();
        for (const { account } of accounts) {
          const data = Buffer.from(account.data);
          const w = new PublicKey(data.subarray(8, 40)).toBase58();
          wm.set(w, (wm.get(w) || 0) + Number(data.readBigUInt64LE(72)) / LAMPORTS_PER_SOL);
        }
        const entries: LeaderEntry[] = [];
        for (const [w, s] of wm) entries.push({ wallet: w, totalSol: s });
        entries.sort((a, b) => b.totalSol - a.totalSol);
        setLeaderboard(entries);
      } catch (e) { console.error("Failed to load leaderboard:", e); }
      setLbLoading(false);
    };
    loadLb();
  }, [tab, connection, leaderboard.length]);

  const handleSave = useCallback(() => {
    if (!wallet.publicKey) return;
    saveUserProfile(wallet.publicKey.toBase58(), editName, editX);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }, [wallet.publicKey, editName, editX]);

  if (!wallet.connected) return null;
  if (loading) return <div className={styles.wrap}><div className={styles.loadingText}>Loading...</div></div>;

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.toggleRow}>
        <button className={styles.editBtn} onClick={() => { if (!open) setOpen(true); setEditing(!editing); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <button className={styles.toggle} onClick={() => setOpen(!open)}>
          <span className={styles.toggleText}>My profile</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>

      {open && (<>
        {editing && (
          <div className={styles.editBanner}>
            <div className={styles.editField}><label className={styles.editLabel}>Display name</label><input className={styles.editInput} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Enter a name..." maxLength={32} /></div>
            <div className={styles.editField}><label className={styles.editLabel}>X (Twitter) link</label><input className={styles.editInput} value={editX} onChange={e => setEditX(e.target.value)} placeholder="https://x.com/yourhandle" maxLength={100} /></div>
            <button className={styles.saveBtn} onClick={() => { handleSave(); setEditing(false); }}>{saved ? "Saved!" : "Save profile"}</button>
          </div>
        )}

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "profile" ? styles.tabActive : ""}`} onClick={() => setTab("profile")}>Stats</button>
          <button className={`${styles.tab} ${tab === "campaigns" ? styles.tabActive : ""}`} onClick={() => setTab("campaigns")}>Active Campaigns</button>
          <button className={`${styles.tab} ${tab === "achievements" ? styles.tabActive : ""}`} onClick={() => setTab("achievements")}>Achievements</button>
          <button className={`${styles.tab} ${tab === "leaderboard" ? styles.tabActive : ""}`} onClick={() => setTab("leaderboard")}>Leaderboard</button>
        </div>

        <div className={styles.content}>
          {tab === "profile" && stats && (<>
            <div className={styles.address}>{wallet.publicKey!.toBase58().slice(0, 4)}...{wallet.publicKey!.toBase58().slice(-4)}</div>
            <div className={styles.grid}>
              <div className={styles.stat}><div className={styles.val}><Amt sol={stats.totalSolDonated} /></div><div className={styles.sub}>SOL donated (all time)</div></div>
              <div className={styles.stat}><div className={styles.val}><Amt sol={stats.activeSolStaked} /></div><div className={styles.sub}>SOL in active campaigns</div></div>
              <div className={styles.stat}><div className={styles.val}>{stats.activeCampaigns}</div><div className={styles.sub}>Active campaign{stats.activeCampaigns !== 1 ? "s" : ""}</div></div>
              <div className={styles.stat}><div className={styles.val}><Amt sol={stats.yieldEarnedSol} decimals={4} /></div><div className={styles.sub}>SOL earned for charity</div></div>
            </div>
          </>)}
          {tab === "profile" && !stats && <div className={styles.empty}>Donate to a campaign to see your stats</div>}

          {tab === "campaigns" && (<>
            {myCampaigns.length === 0 ? <div className={styles.empty}>No campaigns yet</div> : (<>
              {myCampaigns.filter(c => c.status === "Active").length > 0 && (
                <div className={styles.mcSection}><div className={styles.mcLabel}>Active</div>
                  {myCampaigns.filter(c => c.status === "Active").map(mc => {
                    const camp = campaigns.find(c => c.id === mc.id);
                    return <div key={mc.id} className={styles.mcRow} onClick={() => camp && onSelectCampaign(camp)}><div className={styles.mcName}>{mc.name}</div><div className={styles.mcAmount}><Amt sol={mc.solDeposited} /></div></div>;
                  })}
                </div>
              )}
              {myCampaigns.filter(c => c.status !== "Active").length > 0 && (
                <div className={styles.mcSection}><div className={styles.mcLabel}>History</div>
                  {myCampaigns.filter(c => c.status !== "Active").map(mc => (
                    <div key={mc.id} className={`${styles.mcRow} ${styles.mcRowInactive}`}><div className={styles.mcName}>{mc.name} <span className={styles.mcBadge}>{mc.status}</span></div><div className={styles.mcAmount}><Amt sol={mc.solDeposited} /></div></div>
                  ))}
                </div>
              )}
            </>)}
          </>)}

          {tab === "achievements" && achievements.map(a => (
            <div key={a.id} className={`${styles.achRow} ${a.earned ? styles.achEarned : styles.achLocked}`}>
              <div className={styles.achIcon}>{a.earned ? "✓" : "○"}</div>
              <div className={styles.achInfo}><div className={styles.achName}>{a.name}</div><div className={styles.achDesc}>{a.desc}</div></div>
            </div>
          ))}

          {tab === "leaderboard" && (<>
            {lbLoading ? <div className={styles.loadingText}>Loading leaderboard...</div> : leaderboard.length === 0 ? <div className={styles.empty}>No donations yet</div> : leaderboard.map((entry, i) => {
              const isYou = wallet.publicKey?.toBase58() === entry.wallet;
              const xLink = getXLink(entry.wallet);
              return (
                <div key={i} className={`${styles.lbRow} ${isYou ? styles.lbYou : ""}`}>
                  <div className={styles.lbRank}>#{i + 1}</div>
                  <div className={styles.lbWallet}>
                    {displayName(entry.wallet)}
                    {isYou && <span className={styles.lbYouTag}>You</span>}
                  </div>
                  <div className={styles.lbRight}>
                    {xLink && <a href={xLink} target="_blank" rel="noopener noreferrer" className={styles.lbX} onClick={e => e.stopPropagation()}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>}
                    <div className={styles.lbAmount}><Amt sol={entry.totalSol} /></div>
                  </div>
                </div>
              );
            })}
          </>)}
        </div>
      </>)}
    </div>
  );
}
