"use client";
import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
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
  const [txs, setTxs] = useState<TxEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const campKey = new PublicKey(campaignPDA);
        // Get recent signatures for the campaign PDA
        const sigs = await connection.getSignaturesForAddress(campKey, { limit: 20 });

        const entries: TxEntry[] = [];
        for (const sig of sigs) {
          try {
            const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
            if (!tx || !tx.meta) continue;

            // Look at pre/post token balances to detect deposits vs withdrawals
            // The vault ATA will have balance changes
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            const accounts = tx.transaction.message.accountKeys;

            // Find the signer (first account)
            const signer = accounts[0].pubkey.toBase58();

            // Check if our program was invoked
            const programInvoked = tx.meta.logMessages?.some(l => l.includes(PROGRAM_ID.toBase58()));
            if (!programInvoked) continue;

            // Detect type from log messages
            const logs = tx.meta.logMessages || [];
            const isDonate = logs.some(l => l.includes("Program log: Instruction: Transfer") && l.includes("success"));

            // Calculate SOL amount from signer balance change
            const signerIdx = accounts.findIndex(a => a.pubkey.toBase58() === signer);
            if (signerIdx < 0) continue;
            const balChange = (preBalances[signerIdx] - postBalances[signerIdx]) / LAMPORTS_PER_SOL;

            // If signer lost SOL (> 0.005 to exclude just fees), it's a deposit
            // If signer gained SOL, it's a withdrawal
            let type: "deposit" | "withdraw";
            let solAmount: number;

            if (balChange > 0.005) {
              type = "deposit";
              solAmount = Math.round(balChange * 100) / 100;
            } else if (balChange < -0.005) {
              type = "withdraw";
              solAmount = Math.round(Math.abs(balChange) * 100) / 100;
            } else {
              continue; // Skip tiny balance changes (just fees)
            }

            // Calculate time saved: how many days faster the goal is reached with this deposit
            const weeklyYieldBefore = Math.max(0, (totalStaked - (type === "deposit" ? solAmount : 0))) * APY / 52;
            const weeklyYieldAfter = totalStaked * APY / 52;
            const remaining = goalSol;
            let timeSavedDays = 0;
            if (type === "deposit" && weeklyYieldBefore > 0 && weeklyYieldAfter > 0) {
              const weeksBefore = remaining / weeklyYieldBefore;
              const weeksAfter = remaining / weeklyYieldAfter;
              timeSavedDays = Math.max(0, Math.round((weeksBefore - weeksAfter) * 7));
            }

            entries.push({
              signature: sig.signature,
              type,
              wallet: signer,
              solAmount,
              timeSavedDays,
              timestamp: sig.blockTime || 0,
            });
          } catch {
            continue;
          }
        }

        setTxs(entries);
      } catch (e) {
        console.error("Failed to load transactions:", e);
      }
      setLoading(false);
    };

    load();
  }, [connection, campaignPDA, goalSol, totalStaked]);

  if (loading) return <div className={styles.wrap}><div className={styles.loading}>Loading transactions...</div></div>;
  if (txs.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Transaction log</div>
      {txs.map((tx, i) => (
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
      ))}
    </div>
  );
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}
