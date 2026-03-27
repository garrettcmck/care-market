import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("3CQ9sfki5SgF4pdL7qZgFWGzf4h3HSfgNXwWS5usbUsz");
export const JITOSOL_MINT = new PublicKey("Fc45LwrnMeyrvADyescSCKotE47CUE8SzjARCXLGDvKm");
export const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";

export const FEE_WALLET = new PublicKey("9RYCn13NH2NC5ADt681VVpk5rcRL4jYm3zrcgojdqvhA");
export const FEE_JITOSOL_ATA = new PublicKey("F1Dn5ms8JS7Qy3CxH9dyxbiLobXefxcUuMuC9yGSWEWh");

export const RPC_ENDPOINT = "https://api.devnet.solana.com";

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
