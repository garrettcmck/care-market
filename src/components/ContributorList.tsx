"use client";
import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PROGRAM_ID } from "@/utils/constants";
import { getJitosolRate } from "@/sdk/jupiter";
import { displayName, getXLink } from "@/utils/sns";
import Amt from "./Amt";
import styles from "./ContributorList.module.css";

interface Contributor { wallet: string; solDeposited: number; yieldEarnedSol: number; }

export default function ContributorList({ campaignPDA }: { campaignPDA: string }) {
  const { connection } = useConnection();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const campKey = new PublicKey(campaignPDA);
        const rate = await getJitosolRate();
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ dataSize: 97 }, { memcmp: { offset: 40, bytes: campKey.toBase58() } }],
        });
        const list: Contributor[] = [];
        for (const { account } of accounts) {
          const data = Buffer.from(account.data);
          const wallet = new PublicKey(data.subarray(8, 40)).toBase58();
          const solDeposited = Number(data.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
          const jitosolShare = Number(data.readBigUInt64LE(80)) / 1e9;
          const yieldEarnedSol = Math.max(0, jitosolShare * rate - solDeposited);
          list.push({ wallet, solDeposited, yieldEarnedSol });
        }
        list.sort((a, b) => b.solDeposited - a.solDeposited);
        setContributors(list);
      } catch (e) { console.error("Failed to load contributors:", e); }
      setLoading(false);
    };
    load();
  }, [connection, campaignPDA]);

  if (loading) return <div className={styles.wrap}><div className={styles.loading}>Loading contributors...</div></div>;
  if (contributors.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen(!open)}>
        <span className={styles.title}>Contributors ({contributors.length})</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && contributors.map((c, i) => {
        const xLink = getXLink(c.wallet);
        return (
          <div key={i} className={styles.row}>
            <div className={styles.rowLeft}>
              <div className={styles.rank}>#{i + 1}</div>
              <div className={styles.wallet}>
                {displayName(c.wallet)}
                {xLink && (
                  <a href={xLink} target="_blank" rel="noopener noreferrer" className={styles.xIcon} onClick={e => e.stopPropagation()}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div className={styles.rowRight}>
              <div className={styles.amount}><Amt sol={c.solDeposited} /></div>
              <div className={styles.yield}>+<Amt sol={c.yieldEarnedSol} decimals={4} /> earned</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
