// Usage:
//   node scripts/admin.cjs update-goal <campaign_id> <new_goal_sol>
//   node scripts/admin.cjs update-name <campaign_id> "New Name"
//   node scripts/admin.cjs update-desc <campaign_id> "New description"
//   node scripts/admin.cjs show <campaign_id>
//   node scripts/admin.cjs list

const nodeFetch = require("node-fetch");
const https = require("https");
const agent = new https.Agent({ rejectUnauthorized: false });
globalThis.fetch = (url, opts = {}) => nodeFetch(url, { ...opts, agent });

const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { createHash } = require("crypto");
const fs = require("fs");

const PROGRAM_ID = new PublicKey("3CQ9sfki5SgF4pdL7qZgFWGzf4h3HSfgNXwWS5usbUsz");
const RPC = "https://api.devnet.solana.com";

function disc(name) { return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8); }
function findPDA(seeds) { return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID); }

function encodeOption(hasValue, encodeValue) {
  if (!hasValue) return Buffer.from([0]);
  return Buffer.concat([Buffer.from([1]), encodeValue()]);
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("/root/.config/solana/id.json"))));
  const [cmPDA] = findPDA([Buffer.from("care_market")]);

  const cmd = process.argv[2];
  const campaignId = parseInt(process.argv[3]);

  if (cmd === "list") {
    // Read CareMarketState to get campaign count
    const cmInfo = await conn.getAccountInfo(cmPDA);
    const count = cmInfo.data.readBigUInt64LE(8 + 32 + 32 + 32 + 2 + 2);
    console.log(`${count} campaigns\n`);
    for (let i = 0; i < Number(count); i++) {
      const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(i));
      const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);
      const info = await conn.getAccountInfo(campPDA);
      if (!info) continue;
      const d = info.data;
      let off = 8; // skip discriminator
      const id = d.readBigUInt64LE(off); off += 8;
      off += 32; // care_market
      off += 32; // charity_wallet
      const nameLen = d.readUInt32LE(off); off += 4;
      const name = d.subarray(off, off + nameLen).toString(); off += nameLen;
      const descLen = d.readUInt32LE(off); off += 4;
      const desc = d.subarray(off, off + descLen).toString(); off += descLen;
      const goal = Number(d.readBigUInt64LE(off)) / LAMPORTS_PER_SOL; off += 8;
      const deposited = Number(d.readBigUInt64LE(off)) / LAMPORTS_PER_SOL; off += 8;
      off += 8; // jitosol
      const contributors = d.readUInt32LE(off); off += 4;
      const status = ["Active", "Completed", "Cancelled", "Closed"][d[off]];
      console.log(`Campaign ${id}: "${name}" | Goal: ${goal} SOL | Staked: ${deposited} SOL | ${contributors} contributors | ${status}`);
    }
    return;
  }

  if (cmd === "show") {
    const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(campaignId));
    const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);
    const info = await conn.getAccountInfo(campPDA);
    if (!info) { console.log("Campaign not found"); return; }
    const d = info.data;
    let off = 8;
    console.log("ID:", d.readBigUInt64LE(off).toString()); off += 8;
    console.log("CareMarket:", new PublicKey(d.subarray(off, off+32)).toBase58()); off += 32;
    console.log("Charity:", new PublicKey(d.subarray(off, off+32)).toBase58()); off += 32;
    const nl = d.readUInt32LE(off); off += 4;
    console.log("Name:", d.subarray(off, off+nl).toString()); off += nl;
    const dl = d.readUInt32LE(off); off += 4;
    console.log("Desc:", d.subarray(off, off+dl).toString()); off += dl;
    console.log("Goal:", Number(d.readBigUInt64LE(off)) / LAMPORTS_PER_SOL, "SOL"); off += 8;
    console.log("Deposited:", Number(d.readBigUInt64LE(off)) / LAMPORTS_PER_SOL, "SOL"); off += 8;
    console.log("jitoSOL:", Number(d.readBigUInt64LE(off)) / 1e9); off += 8;
    console.log("Contributors:", d.readUInt32LE(off)); off += 4;
    console.log("Status:", ["Active", "Completed", "Cancelled", "Closed"][d[off]]);
    return;
  }

  if (!["update-goal", "update-name", "update-desc"].includes(cmd)) {
    console.log("Usage:");
    console.log("  node scripts/admin.cjs list");
    console.log("  node scripts/admin.cjs show <id>");
    console.log("  node scripts/admin.cjs update-goal <id> <sol_amount>");
    console.log("  node scripts/admin.cjs update-name <id> \"New Name\"");
    console.log("  node scripts/admin.cjs update-desc <id> \"New description\"");
    return;
  }

  const value = process.argv.slice(4).join(" ");
  const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(campaignId));
  const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);

  // Build update_campaign data
  // Args: Option<u64>, Option<String>, Option<String>, Option<Pubkey>
  let goalOpt, nameOpt, descOpt, walletOpt;

  if (cmd === "update-goal") {
    const lamports = BigInt(Math.floor(parseFloat(value) * LAMPORTS_PER_SOL));
    goalOpt = encodeOption(true, () => { const b = Buffer.alloc(8); b.writeBigUInt64LE(lamports); return b; });
    nameOpt = encodeOption(false);
    descOpt = encodeOption(false);
    walletOpt = encodeOption(false);
    console.log(`Updating campaign ${campaignId} goal to ${value} SOL (${lamports} lamports)`);
  } else if (cmd === "update-name") {
    goalOpt = encodeOption(false);
    const nameBytes = Buffer.from(value);
    nameOpt = encodeOption(true, () => { const lb = Buffer.alloc(4); lb.writeUInt32LE(nameBytes.length); return Buffer.concat([lb, nameBytes]); });
    descOpt = encodeOption(false);
    walletOpt = encodeOption(false);
    console.log(`Updating campaign ${campaignId} name to "${value}"`);
  } else if (cmd === "update-desc") {
    goalOpt = encodeOption(false);
    nameOpt = encodeOption(false);
    const descBytes = Buffer.from(value);
    descOpt = encodeOption(true, () => { const lb = Buffer.alloc(4); lb.writeUInt32LE(descBytes.length); return Buffer.concat([lb, descBytes]); });
    walletOpt = encodeOption(false);
    console.log(`Updating campaign ${campaignId} description to "${value}"`);
  }

  const data = Buffer.concat([disc("update_campaign"), goalOpt, nameOpt, descOpt, walletOpt]);

  const tx = new Transaction().add({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: cmPDA, isSigner: false, isWritable: false },
      { pubkey: campPDA, isSigner: false, isWritable: true },
    ],
    data,
  });

  const sig = await sendAndConfirmTransaction(conn, tx, [admin]);
  console.log("TX:", sig);
  console.log("Done!");
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
