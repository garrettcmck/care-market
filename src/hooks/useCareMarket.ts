"use client";
import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import {
  JITOSOL_MINT, FEE_JITOSOL_ATA,
  findCareMarketPDA, findCampaignPDA, findVaultPDA, findUserStakePDA,
} from "@/utils/constants";
import { quoteSolToJitosol, quoteJitosolToSol, getSwapInstructions, loadALTs } from "@/sdk/jupiter";
import { createDonateIx, createEarlyWithdrawIx, createClaimIx } from "@/sdk/instructions";

export function useCareMarket() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const sendTx = useCallback(async (instructions: any[], altAddresses: string[]): Promise<string> => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
    const alts = await loadALTs(connection, altAddresses);
    const { blockhash } = await connection.getLatestBlockhash();
    const msg = new TransactionMessage({
      payerKey: wallet.publicKey, recentBlockhash: blockhash, instructions,
    }).compileToV0Message(alts);
    const tx = new VersionedTransaction(msg);
    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  }, [wallet, connection]);

  const donate = useCallback(async (campaignId: number, solAmount: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const user = wallet.publicKey!;
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      const userJitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, user);

      // Check if user has a jitoSOL ATA, create if not
      const prefixIxs: any[] = [];
      const ataInfo = await connection.getAccountInfo(userJitoAta);
      if (!ataInfo) {
        prefixIxs.push(createAssociatedTokenAccountInstruction(user, userJitoAta, user, JITOSOL_MINT));
      }

      const quote = await quoteSolToJitosol(lamports);
      // Use threshold amount (accounts for slippage) not the optimistic outAmount
      const jitosolAmount = BigInt(quote.otherAmountThreshold || quote.outAmount);
      const jupIxs = await getSwapInstructions(quote, user, userJitoAta);

      const [careMarketPDA] = findCareMarketPDA();
      const [campaignPDA] = findCampaignPDA(campaignId);
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const [userStakePDA] = findUserStakePDA(user, campaignPDA);

      const donateIx = createDonateIx(
        user, careMarketPDA, campaignPDA, userJitoAta,
        vaultPDA, FEE_JITOSOL_ATA, userStakePDA,
        BigInt(lamports), jitosolAmount,
      );

      const allIxs = [
        ...prefixIxs,
        ...jupIxs.setupInstructions, jupIxs.swapInstruction,
        ...(jupIxs.cleanupInstruction ? [jupIxs.cleanupInstruction] : []),
        donateIx,
      ];
      const sig = await sendTx(allIxs, jupIxs.addressLookupTableAddresses);
      setTxSig(sig);
      return sig;
    } catch (e: any) { console.error("Care Market error:", e); setError(e?.message || e?.toString() || JSON.stringify(e)); } finally { setLoading(false); }
  }, [wallet, connection, sendTx]);

  const earlyWithdraw = useCallback(async (campaignId: number, jitosolShare: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const user = wallet.publicKey!;
      const [careMarketPDA] = findCareMarketPDA();
      const [campaignPDA] = findCampaignPDA(campaignId);
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const [userStakePDA] = findUserStakePDA(user, campaignPDA);
      const userJitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, user);

      // Check if user has a jitoSOL ATA, create if not
      const prefixIxs: any[] = [];
      const ataInfo = await connection.getAccountInfo(userJitoAta);
      if (!ataInfo) {
        prefixIxs.push(createAssociatedTokenAccountInstruction(user, userJitoAta, user, JITOSOL_MINT));
      }

      const withdrawIx = createEarlyWithdrawIx(
        user, careMarketPDA, campaignPDA, userStakePDA,
        vaultPDA, userJitoAta, FEE_JITOSOL_ATA,
      );

      // Just withdraw jitoSOL — user can swap to SOL on Jupiter afterwards
      const allIxs = [...prefixIxs, withdrawIx];
      const sig = await sendTx(allIxs, []);
      setTxSig(sig);
      return sig;
    } catch (e: any) { console.error("Care Market error:", e); setError(e?.message || e?.toString() || JSON.stringify(e)); } finally { setLoading(false); }
  }, [wallet, connection, sendTx]);

  const claim = useCallback(async (campaignId: number, jitosolShare: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const user = wallet.publicKey!;
      const [campaignPDA] = findCampaignPDA(campaignId);
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const [userStakePDA] = findUserStakePDA(user, campaignPDA);
      const userJitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, user);

      // Check if user has a jitoSOL ATA, create if not
      const prefixIxs: any[] = [];
      const ataInfo = await connection.getAccountInfo(userJitoAta);
      if (!ataInfo) {
        prefixIxs.push(createAssociatedTokenAccountInstruction(user, userJitoAta, user, JITOSOL_MINT));
      }

      const claimIx = createClaimIx(user, campaignPDA, userStakePDA, vaultPDA, userJitoAta);

      // Just claim jitoSOL — user can swap to SOL on Jupiter afterwards
      const allIxs = [...prefixIxs, claimIx];
      const sig = await sendTx(allIxs, []);
      setTxSig(sig);
      return sig;
    } catch (e: any) { console.error("Care Market error:", e); setError(e?.message || e?.toString() || JSON.stringify(e)); } finally { setLoading(false); }
  }, [wallet, connection, sendTx]);

  return { donate, earlyWithdraw, claim, loading, error, txSig, setError };
}
