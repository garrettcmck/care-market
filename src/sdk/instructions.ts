import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createHash } from "crypto";
import { PROGRAM_ID } from "@/utils/constants";

function disc(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

export function createDonateIx(
  user: PublicKey, careMarket: PublicKey, campaign: PublicKey,
  userJitosolAta: PublicKey, vault: PublicKey, feeJitosolAta: PublicKey,
  userStake: PublicKey, solAmount: bigint, jitosolAmount: bigint,
): TransactionInstruction {
  const solBuf = Buffer.alloc(8); solBuf.writeBigUInt64LE(solAmount);
  const jitoBuf = Buffer.alloc(8); jitoBuf.writeBigUInt64LE(jitosolAmount);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: careMarket, isSigner: false, isWritable: false },
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: userJitosolAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: feeJitosolAta, isSigner: false, isWritable: true },
      { pubkey: userStake, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("donate"), solBuf, jitoBuf]),
  });
}

export function createEarlyWithdrawIx(
  user: PublicKey, careMarket: PublicKey, campaign: PublicKey,
  userStake: PublicKey, vault: PublicKey, userJitosolAta: PublicKey,
  feeJitosolAta: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: careMarket, isSigner: false, isWritable: false },
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: userStake, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: userJitosolAta, isSigner: false, isWritable: true },
      { pubkey: feeJitosolAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: disc("early_withdraw"),
  });
}

export function createClaimIx(
  user: PublicKey, campaign: PublicKey, userStake: PublicKey,
  vault: PublicKey, userJitosolAta: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: userStake, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: userJitosolAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: disc("claim"),
  });
}

export function createCompleteCampaignIx(
  caller: PublicKey, careMarket: PublicKey, campaign: PublicKey,
  vault: PublicKey, callerJitosolAta: PublicKey, charityWallet: PublicKey,
  jitosolForGoal: bigint,
): TransactionInstruction {
  const buf = Buffer.alloc(8); buf.writeBigUInt64LE(jitosolForGoal);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: careMarket, isSigner: false, isWritable: false },
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: callerJitosolAta, isSigner: false, isWritable: true },
      { pubkey: charityWallet, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("complete_campaign"), buf]),
  });
}
