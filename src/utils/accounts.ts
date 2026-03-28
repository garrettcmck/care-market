import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PROGRAM_ID, findCampaignPDA, findVaultPDA, findUserStakePDA, findCareMarketPDA } from "./constants";

// Anchor adds 8-byte discriminator at the start of every account
const DISCRIMINATOR_SIZE = 8;

export interface CareMarketState {
  admin: PublicKey;
  jitoSolMint: PublicKey;
  feeWallet: PublicKey;
  donationFeeBps: number;
  earlyWithdrawalFeeBps: number;
  campaignCount: number;
  bump: number;
}

export interface Campaign {
  id: number;
  careMarket: PublicKey;
  charityWallet: PublicKey;
  charityName: string;
  description: string;
  goalLamports: bigint;
  totalSolDeposited: bigint;
  totalJitosolInVault: bigint;
  contributorCount: number;
  status: "Active" | "Completed" | "Cancelled" | "Closed";
  vault: PublicKey;
  createdAt: bigint;
  completedAt: bigint | null;
  bump: number;
  vaultBump: number;
  // Derived
  pda: PublicKey;
  campaignId: number;
}

export interface UserStake {
  user: PublicKey;
  campaign: PublicKey;
  solDeposited: bigint;
  jitosolShare: bigint;
  depositedAt: bigint;
  bump: number;
}

const STATUS_MAP = ["Active", "Completed", "Cancelled", "Closed"] as const;

function readPublicKey(buf: Buffer, offset: number): [PublicKey, number] {
  return [new PublicKey(buf.subarray(offset, offset + 32)), offset + 32];
}

function readU16(buf: Buffer, offset: number): [number, number] {
  return [buf.readUInt16LE(offset), offset + 2];
}

function readU32(buf: Buffer, offset: number): [number, number] {
  return [buf.readUInt32LE(offset), offset + 4];
}

function readU64(buf: Buffer, offset: number): [bigint, number] {
  return [buf.readBigUInt64LE(offset), offset + 8];
}

function readI64(buf: Buffer, offset: number): [bigint, number] {
  return [buf.readBigInt64LE(offset), offset + 8];
}

function readU8(buf: Buffer, offset: number): [number, number] {
  return [buf[offset], offset + 1];
}

function readString(buf: Buffer, offset: number): [string, number] {
  const len = buf.readUInt32LE(offset);
  offset += 4;
  const str = buf.subarray(offset, offset + len).toString("utf8");
  return [str, offset + len];
}

function readOptionI64(buf: Buffer, offset: number): [bigint | null, number] {
  const hasValue = buf[offset];
  offset += 1;
  if (hasValue === 1) {
    const val = buf.readBigInt64LE(offset);
    return [val, offset + 8];
  }
  return [null, offset];
}

export function deserializeCareMarketState(data: Buffer): CareMarketState {
  let offset = DISCRIMINATOR_SIZE;
  let admin: PublicKey, jitoSolMint: PublicKey, feeWallet: PublicKey;
  let donationFeeBps: number, earlyWithdrawalFeeBps: number, campaignCount: number, bump: number;

  [admin, offset] = readPublicKey(data, offset);
  [jitoSolMint, offset] = readPublicKey(data, offset);
  [feeWallet, offset] = readPublicKey(data, offset);
  [donationFeeBps, offset] = readU16(data, offset);
  [earlyWithdrawalFeeBps, offset] = readU16(data, offset);
  const [cc, o] = readU64(data, offset); offset = o;
  campaignCount = Number(cc);
  [bump, offset] = readU8(data, offset);

  return { admin, jitoSolMint, feeWallet, donationFeeBps, earlyWithdrawalFeeBps, campaignCount, bump };
}

export function deserializeCampaign(data: Buffer, pda: PublicKey, campaignId: number): Campaign {
  let offset = DISCRIMINATOR_SIZE;

  let id: bigint, careMarket: PublicKey, charityWallet: PublicKey;
  let charityName: string, description: string;
  let goalLamports: bigint, totalSolDeposited: bigint, totalJitosolInVault: bigint;
  let contributorCount: number, statusIdx: number;
  let vault: PublicKey, createdAt: bigint, completedAt: bigint | null;
  let bump: number, vaultBump: number;

  [id, offset] = readU64(data, offset);
  [careMarket, offset] = readPublicKey(data, offset);
  [charityWallet, offset] = readPublicKey(data, offset);
  // Fixed-size fields: name = 4+64 bytes, desc = 4+256 bytes (Pinocchio v3 layout)
  [charityName, offset] = readString(data, offset);
  offset = 84 + 64; // skip to end of fixed name field (offset 148)
  [description, offset] = readString(data, offset);
  offset = 152 + 256; // skip to end of fixed desc field (offset 408)
  [goalLamports, offset] = readU64(data, offset);
  [totalSolDeposited, offset] = readU64(data, offset);
  [totalJitosolInVault, offset] = readU64(data, offset);
  [contributorCount, offset] = readU32(data, offset);
  [statusIdx, offset] = readU8(data, offset);
  [vault, offset] = readPublicKey(data, offset);
  [createdAt, offset] = readI64(data, offset);
  [completedAt, offset] = readOptionI64(data, offset);
  [bump, offset] = readU8(data, offset);
  [vaultBump, offset] = readU8(data, offset);

  return {
    id: Number(id), careMarket, charityWallet, charityName, description,
    goalLamports, totalSolDeposited, totalJitosolInVault, contributorCount,
    status: STATUS_MAP[statusIdx] || "Active",
    vault, createdAt, completedAt, bump, vaultBump, pda, campaignId,
  };
}

export function deserializeUserStake(data: Buffer): UserStake {
  let offset = DISCRIMINATOR_SIZE;
  let user: PublicKey, campaign: PublicKey;
  let solDeposited: bigint, jitosolShare: bigint, depositedAt: bigint;
  let bump: number;

  [user, offset] = readPublicKey(data, offset);
  [campaign, offset] = readPublicKey(data, offset);
  [solDeposited, offset] = readU64(data, offset);
  [jitosolShare, offset] = readU64(data, offset);
  [depositedAt, offset] = readI64(data, offset);
  [bump, offset] = readU8(data, offset);

  return { user, campaign, solDeposited, jitosolShare, depositedAt, bump };
}

// ============================================================
// Fetch helpers
// ============================================================

export async function fetchCareMarketState(conn: Connection): Promise<CareMarketState | null> {
  const [pda] = findCareMarketPDA();
  const info = await conn.getAccountInfo(pda);
  if (!info) return null;
  return deserializeCareMarketState(Buffer.from(info.data));
}

export async function fetchCampaign(conn: Connection, id: number): Promise<Campaign | null> {
  const [pda] = findCampaignPDA(id);
  const info = await conn.getAccountInfo(pda);
  if (!info) return null;
  return deserializeCampaign(Buffer.from(info.data), pda, id);
}

export async function fetchAllCampaigns(conn: Connection, count: number): Promise<Campaign[]> {
  const campaigns: Campaign[] = [];
  for (let i = 0; i < count; i++) {
    const c = await fetchCampaign(conn, i);
    if (c) campaigns.push(c);
  }
  return campaigns;
}

export async function fetchUserStake(conn: Connection, user: PublicKey, campaignPDA: PublicKey): Promise<UserStake | null> {
  const [pda] = findUserStakePDA(user, campaignPDA);
  const info = await conn.getAccountInfo(pda);
  if (!info) return null;
  return deserializeUserStake(Buffer.from(info.data));
}
