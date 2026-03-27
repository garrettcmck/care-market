"use client";
import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
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
      const quote = await quoteSolToJitosol(lamports);
      const jitosolAmount = BigInt(quote.outAmount);
      const userJitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, user);
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
        ...jupIxs.setupInstructions, jupIxs.swapInstruction,
        ...(jupIxs.cleanupInstruction ? [jupIxs.cleanupInstruction] : []),
        donateIx,
      ];
      const sig = await sendTx(allIxs, jupIxs.addressLookupTableAddresses);
      setTxSig(sig);
      return sig;
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [wallet, sendTx]);

  const earlyWithdraw = useCallback(async (campaignId: number, jitosolShare: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const user = wallet.publicKey!;
      const [careMarketPDA] = findCareMarketPDA();
      const [campaignPDA] = findCampaignPDA(campaignId);
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const [userStakePDA] = findUserStakePDA(user, campaignPDA);
      const userJitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, user);

      const withdrawIx = createEarlyWithdrawIx(
        user, careMarketPDA, campaignPDA, userStakePDA,
        vaultPDA, userJitoAta, FEE_JITOSOL_ATA,
      );

      const afterFee = Math.floor(jitosolShare * 99 / 100);
      const quote = await quoteJitosolToSol(afterFee);
      const jupIxs = await getSwapInstructions(quote, user);

      const allIxs = [
        withdrawIx, ...jupIxs.setupInstructions, jupIxs.swapInstruction,
        ...(jupIxs.cleanupInstruction ? [jupIxs.cleanupInstruction] : []),
      ];
      const sig = await sendTx(allIxs, jupIxs.addressLookupTableAddresses);
      setTxSig(sig);
      return sig;
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [wallet, sendTx]);

  const claim = useCallback(async (campaignId: number, jitosolShare: number) => {
    setLoading(true); setError(null); setTxSig(null);
    try {
      const user = wallet.publicKey!;
      const [campaignPDA] = findCampaignPDA(campaignId);
      const [vaultPDA] = findVaultPDA(campaignPDA);
      const [userStakePDA] = findUserStakePDA(user, campaignPDA);
      const userJitoAta = getAssociatedTokenAddressSync(JITOSOL_MINT, user);

      const claimIx = createClaimIx(user, campaignPDA, userStakePDA, vaultPDA, userJitoAta);
      const quote = await quoteJitosolToSol(jitosolShare);
      const jupIxs = await getSwapInstructions(quote, user);

      const allIxs = [
        claimIx, ...jupIxs.setupInstructions, jupIxs.swapInstruction,
        ...(jupIxs.cleanupInstruction ? [jupIxs.cleanupInstruction] : []),
      ];
      const sig = await sendTx(allIxs, jupIxs.addressLookupTableAddresses);
      setTxSig(sig);
      return sig;
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [wallet, sendTx]);

  return { donate, earlyWithdraw, claim, loading, error, txSig, setError };
}
