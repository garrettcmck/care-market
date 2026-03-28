import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("Cb1uEFgjbGeWiEMRCTA2SXzbB3jrnK58yAkwPGPZbL84");
export const JITOSOL_MINT = new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const JUPITER_QUOTE_API = "https://lite-api.jup.ag/swap/v1";

export const FEE_WALLET = new PublicKey("9RYCn13NH2NC5ADt681VVpk5rcRL4jYm3zrcgojdqvhA");
export const FEE_JITOSOL_ATA = new PublicKey("DJf1BLj5SEQrjVhybBBQYDjS2Mh6mB5JoFKz5uqgrgd3");

export const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=ba8baf7e-88d6-4512-bb03-175b0dc9ff33";

export function findCareMarketPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("care_market")], PROGRAM_ID);
}

export function findCampaignPDA(id: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(id));
  return PublicKey.findProgramAddressSync([Buffer.from("campaign"), buf], PROGRAM_ID);
}

export function findVaultPDA(campaign: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), campaign.toBuffer()], PROGRAM_ID);
}

export function findUserStakePDA(user: PublicKey, campaign: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_stake"), user.toBuffer(), campaign.toBuffer()],
    PROGRAM_ID,
  );
}
