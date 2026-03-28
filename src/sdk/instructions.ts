import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PROGRAM_ID } from "@/utils/constants";

// Hardcoded discriminators: sha256("global:<name>")[..8]
// These never change — no need for runtime crypto
const DISC_DONATE = new Uint8Array([121,186,218,211,73,70,196,180]);
const DISC_EARLY_WITHDRAW = new Uint8Array([19,147,103,62,98,55,65,249]);
const DISC_CLAIM = new Uint8Array([62,198,214,193,213,159,108,210]);
const DISC_COMPLETE = new Uint8Array([238,164,40,81,211,55,55,26]);

function u64le(val: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, val, true);
  return buf;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

export function createDonateIx(
  user: PublicKey, careMarket: PublicKey, campaign: PublicKey,
  userJitosolAta: PublicKey, vault: PublicKey, feeJitosolAta: PublicKey,
  userStake: PublicKey, solAmount: bigint, jitosolAmount: bigint,
): TransactionInstruction {
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
    data: Buffer.from(concat(DISC_DONATE, u64le(solAmount), u64le(jitosolAmount))),
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
    data: Buffer.from(DISC_EARLY_WITHDRAW),
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
    data: Buffer.from(DISC_CLAIM),
  });
}

export function createCompleteCampaignIx(
  caller: PublicKey, careMarket: PublicKey, campaign: PublicKey,
  vault: PublicKey, callerJitosolAta: PublicKey, charityWallet: PublicKey,
  jitosolForGoal: bigint,
): TransactionInstruction {
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
    data: Buffer.from(concat(DISC_COMPLETE, u64le(jitosolForGoal))),
  });
}
