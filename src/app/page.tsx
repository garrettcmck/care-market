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
      <footer className={styles.footer}>
        <div className={styles.footerText}>Care Market — Lossless giving on Solana</div>
        <div className={styles.socials}>
          <a href="https://x.com/solcaremarket" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="X (Twitter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://t.me/SolanaCareMarket" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Telegram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
        </div>
      </footer>
    </>
  );
}
