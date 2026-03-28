"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Header from "@/components/Header";
import HowItWorks from "@/components/HowItWorks";
import ProtocolStats from "@/components/ProtocolStats";
import CampaignCard, { CampaignData } from "@/components/CampaignCard";
import CampaignDetail from "@/components/CampaignDetail";
import WalletProfile from "@/components/WalletProfile";
import { fetchCareMarketState, fetchAllCampaigns, Campaign } from "@/utils/accounts";
import styles from "./page.module.css";

function campaignToCardData(c: Campaign): CampaignData {
  return {
    id: c.id,
    name: c.charityName,
    desc: c.description,
    goalSol: Number(c.goalLamports) / LAMPORTS_PER_SOL,
    totalStaked: Number(c.totalSolDeposited) / LAMPORTS_PER_SOL,
    contributors: c.contributorCount,
    status: c.status,
    charityWallet: c.charityWallet.toBase58(),
    jitosolInVault: Number(c.totalJitosolInVault),
    createdAt: Number(c.createdAt),
  };
}

export default function HomePage() {
  const { connection } = useConnection();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const state = await fetchCareMarketState(connection);
      if (!state) { setError("CareMarket not initialized on this network"); return; }
      const raw = await fetchAllCampaigns(connection, state.campaignCount);
      setCampaigns(raw.map(campaignToCardData));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [connection]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const active = campaigns.filter((c) => c.status === "Active");
  const completed = campaigns.filter((c) => c.status !== "Active");

  return (
    <>
      <Header />
      {selectedCampaign ? (
        <CampaignDetail campaign={selectedCampaign} onBack={() => { setSelectedCampaign(null); loadCampaigns(); }} />
      ) : (
        <div className={styles.content}>
          <div className={styles.sectionWrap}><HowItWorks /></div>
          <div className={styles.sectionWrap}><ProtocolStats campaigns={campaigns} /></div>
          {loading && <div className={styles.loadingMsg}>Loading campaigns...</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}
          {!loading && active.length > 0 && (
            <><div className={styles.sectionLabel}>Active campaigns</div>
            <div className={styles.cardList}>{active.map((c) => <CampaignCard key={c.id} campaign={c} onClick={() => setSelectedCampaign(c)} />)}</div></>
          )}
          {!loading && completed.length > 0 && (
            <><div className={styles.sectionLabel}>Completed</div>
            <div className={styles.cardList}>{completed.map((c) => <CampaignCard key={c.id} campaign={c} onClick={() => setSelectedCampaign(c)} />)}</div></>
          )}
          {!loading && campaigns.length === 0 && !error && (
            <div className={styles.emptyMsg}>No campaigns yet</div>
          )}
          {!loading && <WalletProfile campaignCount={campaigns.length} campaigns={campaigns} onSelectCampaign={setSelectedCampaign} />}
        </div>
      )}
      <footer className={styles.footer}>Care Market — Lossless giving on Solana</footer>
    </>
  );
}
