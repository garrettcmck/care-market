"use client";
import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PROGRAM_ID } from "@/utils/constants";
import { displayName } from "@/utils/sns";
import Amt from "./Amt";
import styles from "./TransactionLog.module.css";

const APY = 0.075;

interface TxEntry {
  signature: string;
  type: "deposit" | "withdraw";
  wallet: string;
  solAmount: number;
  timeSavedDays: number;
  timestamp: number;
}

export default function TransactionLog({ campaignPDA, goalSol, totalStaked }: { campaignPDA: string; goalSol: number; totalStaked: number }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [txs, setTxs] = useState<TxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const campKey = new PublicKey(campaignPDA);
        const sigs = await connection.getSignaturesForAddress(campKey, { limit: 20 });
        const entries: TxEntry[] = [];

        for (const sig of sigs) {
          try {
            const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
            if (!tx || !tx.meta) continue;

            const accounts = tx.transaction.message.accountKeys;
            const signer = accounts[0].pubkey.toBase58();
            const programInvoked = tx.meta.logMessages?.some(l => l.includes(PROGRAM_ID.toBase58()));
            if (!programInvoked) continue;

            const signerIdx = accounts.findIndex(a => a.pubkey.toBase58() === signer);
            if (signerIdx < 0) continue;
            const balChange = (tx.meta.preBalances[signerIdx] - tx.meta.postBalances[signerIdx]) / LAMPORTS_PER_SOL;

            let type: "deposit" | "withdraw";
            let solAmount: number;
            if (balChange > 0.005) {
              type = "deposit";
              solAmount = Math.round(balChange * 100) / 100;
            } else if (balChange < -0.005) {
              type = "withdraw";
              solAmount = Math.round(Math.abs(balChange) * 100) / 100;
            } else { continue; }

            let timeSavedDays = 0;
            if (type === "deposit") {
              const weeklyBefore = Math.max(0, (totalStaked - solAmount)) * APY / 52;
              const weeklyAfter = totalStaked * APY / 52;
              if (weeklyBefore > 0 && weeklyAfter > 0) {
                timeSavedDays = Math.max(0, Math.round((goalSol / weeklyBefore - goalSol / weeklyAfter) * 7));
              }
            }

            entries.push({ signature: sig.signature, type, wallet: signer, solAmount, timeSavedDays, timestamp: sig.blockTime || 0 });
          } catch { continue; }
        }
        setTxs(entries);
      } catch (e) { console.error("Failed to load transactions:", e); }
      setLoading(false);
    };
    load();
  }, [connection, campaignPDA, goalSol, totalStaked]);

  if (loading) return <div className={styles.wrap}><div className={styles.loading}>Loading transactions...</div></div>;
  if (txs.length === 0) return null;

  const myWallet = wallet.publicKey?.toBase58();
  const filtered = filter === "mine" && myWallet ? txs.filter(t => t.wallet === myWallet) : txs;
  const displayed = filtered.slice(0, 3);

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <button className={styles.toggle} onClick={() => setOpen(!open)}>
          <span className={styles.title}>Transactions</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {open && myWallet && (
          <div className={styles.filterBtns}>
            <button className={`${styles.filterBtn} ${filter === "all" ? styles.filterActive : ""}`} onClick={() => setFilter("all")}>All</button>
            <button className={`${styles.filterBtn} ${filter === "mine" ? styles.filterActive : ""}`} onClick={() => setFilter("mine")}>Mine</button>
          </div>
        )}
      </div>
      {open && (displayed.length === 0 ? (
        <div className={styles.empty}>No transactions found</div>
      ) : displayed.map((tx, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.rowLeft}>
            <div className={`${styles.typeBadge} ${tx.type === "deposit" ? styles.deposit : styles.withdraw}`}>
              {tx.type === "deposit" ? "↓" : "↑"}
            </div>
            <div className={styles.txInfo}>
              <div className={styles.txWallet}>{displayName(tx.wallet)}</div>
              <div className={styles.txTime}>{formatTime(tx.timestamp)}</div>
            </div>
          </div>
          <div className={styles.rowRight}>
            <div className={`${styles.txAmount} ${tx.type === "deposit" ? styles.amountGreen : styles.amountOrange}`}>
              {tx.type === "deposit" ? "+" : "-"}<Amt sol={tx.solAmount} />
            </div>
            {tx.type === "deposit" && tx.timeSavedDays > 0 && (
              <div className={styles.timeSaved}>
                -{tx.timeSavedDays >= 7 ? `${Math.floor(tx.timeSavedDays / 7)}w` : `${tx.timeSavedDays}d`} off goal
              </div>
            )}
          </div>
        </div>
      )))}
    </div>
  );
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const diff = (Date.now() / 1000 - ts);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}
