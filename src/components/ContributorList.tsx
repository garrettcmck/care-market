"use client";
import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PROGRAM_ID } from "@/utils/constants";
import { getJitosolRate } from "@/sdk/jupiter";
import SolIcon from "./SolIcon";
import styles from "./ContributorList.module.css";

interface Contributor {
  wallet: string;
  solDeposited: number;
  jitosolShare: number;
  yieldEarnedSol: number;
}

export default function ContributorList({ campaignPDA }: { campaignPDA: string }) {
  const { connection } = useConnection();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const campKey = new PublicKey(campaignPDA);
        const rate = await getJitosolRate();

        // Find all UserStake accounts for this campaign
        // UserStake layout: 8 disc + 32 user + 32 campaign + 8 sol + 8 jitosol + 8 deposited_at + 1 bump = 97
        // Filter by: owned by program, data size = 97, campaign pubkey at offset 40
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { dataSize: 97 },
            { memcmp: { offset: 40, bytes: campKey.toBase58() } },
          ],
        });

        const list: Contributor[] = [];
        for (const { account } of accounts) {
          const data = Buffer.from(account.data);
          const wallet = new PublicKey(data.subarray(8, 40)).toBase58();
          const solDeposited = Number(data.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
          const jitosolShare = Number(data.readBigUInt64LE(80)) / 1e9;
          const currentValueSol = jitosolShare * rate;
          const yieldEarnedSol = Math.max(0, currentValueSol - solDeposited);

          list.push({ wallet, solDeposited, jitosolShare, yieldEarnedSol });
        }

        // Sort by SOL deposited descending
        list.sort((a, b) => b.solDeposited - a.solDeposited);
        setContributors(list);
      } catch (e) {
        console.error("Failed to load contributors:", e);
      }
      setLoading(false);
    };

    load();
  }, [connection, campaignPDA]);

  if (loading) return <div className={styles.wrap}><div className={styles.loading}>Loading contributors...</div></div>;
  if (contributors.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Contributors</div>
      {contributors.map((c, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.rowLeft}>
            <div className={styles.rank}>#{i + 1}</div>
            <div className={styles.walletInfo}>
              <div className={styles.wallet}>{c.wallet.slice(0, 4)}...{c.wallet.slice(-4)}</div>
              <div className={styles.walletFull}>{c.wallet}</div>
            </div>
          </div>
          <div className={styles.rowRight}>
            <div className={styles.amount}><SolIcon />{c.solDeposited.toFixed(2)}</div>
            <div className={styles.yield}>+<SolIcon />{c.yieldEarnedSol.toFixed(4)} earned</div>
          </div>
        </div>
      ))}
    </div>
  );
}
