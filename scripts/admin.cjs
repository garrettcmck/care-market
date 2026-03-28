// Care Market Admin CLI
//
// Usage:
//   node scripts/admin.cjs --keypair <path_to_id.json> list
//   node scripts/admin.cjs --keypair <path_to_id.json> show <campaign_id>
//   node scripts/admin.cjs --keypair <path_to_id.json> update-goal <campaign_id> <sol_amount>
//   node scripts/admin.cjs --keypair <path_to_id.json> update-name <campaign_id> "New Name"
//   node scripts/admin.cjs --keypair <path_to_id.json> update-desc <campaign_id> "New description"
//   node scripts/admin.cjs --keypair <path_to_id.json> create <goal_sol> "Charity Name" "Description"
//
// The keypair file is your Solana wallet JSON (e.g. id.json from `solana-keygen new`).
// It never leaves your machine — transactions are signed locally.
//
// Optional: --rpc <url> to use a custom RPC (default: devnet)

const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");

const PROGRAM_ID = new PublicKey("Cb1uEFgjbGeWiEMRCTA2SXzbB3jrnK58yAkwPGPZbL84");
const JITOSOL_MINT = new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

function disc(name) { return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8); }
function findPDA(seeds) { return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID); }

function encodeOption(hasValue, encodeValue) {
  if (!hasValue) return Buffer.from([0]);
  return Buffer.concat([Buffer.from([1]), encodeValue()]);
}

// Parse args
function parseArgs() {
  const args = process.argv.slice(2);
  let keypairPath = null;
  let rpcUrl = DEFAULT_RPC;
  const rest = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--keypair" && args[i + 1]) {
      keypairPath = args[++i];
    } else if (args[i] === "--rpc" && args[i + 1]) {
      rpcUrl = args[++i];
    } else {
      rest.push(args[i]);
    }
  }

  return { keypairPath, rpcUrl, cmd: rest[0], args: rest.slice(1) };
}

function loadKeypair(kpPath) {
  const resolved = path.resolve(kpPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Keypair file not found: ${resolved}`);
    console.error("Generate one with: solana-keygen new --outfile my-wallet.json");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(resolved, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

// Deserialize campaign from raw account data
function parseCampaign(data) {
  let off = 8; // skip discriminator
  const id = Number(data.readBigUInt64LE(off)); off += 8;
  const careMarket = new PublicKey(data.subarray(off, off + 32)); off += 32;
  const charityWallet = new PublicKey(data.subarray(off, off + 32)); off += 32;
  const nl = data.readUInt32LE(off); off += 4;
  const name = data.subarray(off, off + nl).toString(); off += nl;
  const dl = data.readUInt32LE(off); off += 4;
  const desc = data.subarray(off, off + dl).toString(); off += dl;
  const goal = Number(data.readBigUInt64LE(off)) / LAMPORTS_PER_SOL; off += 8;
  const deposited = Number(data.readBigUInt64LE(off)) / LAMPORTS_PER_SOL; off += 8;
  const jitosol = Number(data.readBigUInt64LE(off)) / 1e9; off += 8;
  const contributors = data.readUInt32LE(off); off += 4;
  const status = ["Active", "Completed", "Cancelled", "Closed"][data[off]];
  return { id, name, desc, goal, deposited, jitosol, contributors, status, charityWallet: charityWallet.toBase58() };
}

async function main() {
  const { keypairPath, rpcUrl, cmd, args } = parseArgs();

  if (!cmd || cmd === "help") {
    console.log("Care Market Admin CLI\n");
    console.log("Usage: node scripts/admin.cjs --keypair <path> <command> [args]\n");
    console.log("Commands:");
    console.log("  list                                    Show all campaigns");
    console.log("  show <id>                               Show campaign details");
    console.log("  update-goal <id> <sol>                  Change yield goal");
    console.log("  update-name <id> \"Name\"                 Change campaign name");
    console.log("  update-desc <id> \"Description\"          Change description");
    console.log("  create <goal_sol> \"Name\" \"Description\"  Create new campaign");
    console.log("  update-fee-wallet                       Set fees to go to admin wallet");
    console.log("  transfer-admin <pubkey>                 Transfer admin to new wallet");
    console.log("\nOptions:");
    console.log("  --keypair <path>   Path to Solana keypair JSON file (required for writes)");
    console.log("  --rpc <url>        RPC endpoint (default: devnet)");
    return;
  }

  const conn = new Connection(rpcUrl, "confirmed");
  const [cmPDA] = findPDA([Buffer.from("care_market")]);

  // Read-only commands don't need a keypair
  if (cmd === "list") {
    const cmInfo = await conn.getAccountInfo(cmPDA);
    if (!cmInfo) { console.log("CareMarket not initialized"); return; }
    const count = Number(cmInfo.data.readBigUInt64LE(8 + 32 + 32 + 32 + 2 + 2));
    console.log(`${count} campaign(s)\n`);
    for (let i = 0; i < count; i++) {
      const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(i));
      const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);
      const info = await conn.getAccountInfo(campPDA);
      if (!info) continue;
      const c = parseCampaign(Buffer.from(info.data));
      console.log(`  #${c.id}  "${c.name}" | Goal: ${c.goal} SOL | Staked: ${c.deposited} SOL | ${c.contributors} contributors | ${c.status}`);
    }
    return;
  }

  if (cmd === "show") {
    const id = parseInt(args[0]);
    const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(id));
    const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);
    const info = await conn.getAccountInfo(campPDA);
    if (!info) { console.log("Campaign not found"); return; }
    const c = parseCampaign(Buffer.from(info.data));
    console.log(`Campaign #${c.id}`);
    console.log(`  Name:          ${c.name}`);
    console.log(`  Description:   ${c.desc}`);
    console.log(`  Goal:          ${c.goal} SOL (yield target)`);
    console.log(`  Total staked:  ${c.deposited} SOL`);
    console.log(`  jitoSOL:       ${c.jitosol}`);
    console.log(`  Contributors:  ${c.contributors}`);
    console.log(`  Status:        ${c.status}`);
    console.log(`  Charity:       ${c.charityWallet}`);
    console.log(`  PDA:           ${campPDA.toBase58()}`);
    return;
  }

  // Write commands need a keypair
  if (!keypairPath) {
    console.error("Error: --keypair <path> is required for write commands");
    console.error("Example: node scripts/admin.cjs --keypair ./my-wallet.json update-goal 0 10");
    process.exit(1);
  }

  const admin = loadKeypair(keypairPath);
  console.log(`Admin: ${admin.publicKey.toBase58()}`);
  console.log(`Balance: ${(await conn.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL} SOL\n`);

  if (cmd === "update-goal" || cmd === "update-name" || cmd === "update-desc") {
    const campaignId = parseInt(args[0]);
    const value = args.slice(1).join(" ");
    const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(campaignId));
    const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);

    let goalOpt, nameOpt, descOpt, walletOpt;

    if (cmd === "update-goal") {
      const lamports = BigInt(Math.floor(parseFloat(value) * LAMPORTS_PER_SOL));
      goalOpt = encodeOption(true, () => { const b = Buffer.alloc(8); b.writeBigUInt64LE(lamports); return b; });
      nameOpt = encodeOption(false);
      descOpt = encodeOption(false);
      walletOpt = encodeOption(false);
      console.log(`Updating campaign #${campaignId} goal to ${value} SOL`);
    } else if (cmd === "update-name") {
      goalOpt = encodeOption(false);
      const nb = Buffer.from(value);
      nameOpt = encodeOption(true, () => { const lb = Buffer.alloc(4); lb.writeUInt32LE(nb.length); return Buffer.concat([lb, nb]); });
      descOpt = encodeOption(false);
      walletOpt = encodeOption(false);
      console.log(`Updating campaign #${campaignId} name to "${value}"`);
    } else {
      goalOpt = encodeOption(false);
      nameOpt = encodeOption(false);
      const db = Buffer.from(value);
      descOpt = encodeOption(true, () => { const lb = Buffer.alloc(4); lb.writeUInt32LE(db.length); return Buffer.concat([lb, db]); });
      walletOpt = encodeOption(false);
      console.log(`Updating campaign #${campaignId} description to "${value}"`);
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
    console.log(`TX: ${sig}`);
    console.log("Done!");
    return;
  }

  if (cmd === "create") {
    const goalSol = parseFloat(args[0]);
    const name = args[1];
    const desc = args[2] || "";

    // Read current campaign count
    const cmInfo = await conn.getAccountInfo(cmPDA);
    const count = Number(cmInfo.data.readBigUInt64LE(8 + 32 + 32 + 32 + 2 + 2));
    const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(BigInt(count));
    const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);
    const [vaultPDA] = findPDA([Buffer.from("vault"), campPDA.toBuffer()]);
    const charityWallet = Keypair.generate();

    console.log(`Creating campaign #${count}: "${name}" (${goalSol} SOL goal)`);
    console.log(`Charity wallet: ${charityWallet.publicKey.toBase58()}`);

    const nm = Buffer.from(name), ds = Buffer.from(desc);
    const nl = Buffer.alloc(4); nl.writeUInt32LE(nm.length);
    const dl = Buffer.alloc(4); dl.writeUInt32LE(ds.length);
    const gl = Buffer.alloc(8); gl.writeBigUInt64LE(BigInt(Math.floor(goalSol * LAMPORTS_PER_SOL)));

    const tx = new Transaction().add({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: cmPDA, isSigner: false, isWritable: true },
        { pubkey: campPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: JITOSOL_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([disc("create_campaign"), charityWallet.publicKey.toBuffer(), nl, nm, dl, ds, gl]),
    });

    const sig = await sendAndConfirmTransaction(conn, tx, [admin]);
    console.log(`TX: ${sig}`);
    console.log("Done!");
    return;
  }

  if (cmd === "update-fee-wallet") {
    // Set the fee wallet to the admin's own address so fees come to you
    console.log(`Setting fee wallet to admin address: ${admin.publicKey.toBase58()}`);
    const data = Buffer.concat([disc("update_fee_wallet"), admin.publicKey.toBuffer()]);
    const tx = new Transaction().add({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: cmPDA, isSigner: false, isWritable: true },
      ],
      data,
    });
    const sig = await sendAndConfirmTransaction(conn, tx, [admin]);
    console.log(`TX: ${sig}`);
    console.log("All future fees will be sent to your admin wallet's jitoSOL ATA.");
    return;
  }

  if (cmd === "transfer-admin") {
    const newAdmin = new PublicKey(args[0]);
    console.log(`Transferring admin to: ${newAdmin.toBase58()}`);
    const data = Buffer.concat([disc("transfer_admin"), newAdmin.toBuffer()]);
    const tx = new Transaction().add({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: cmPDA, isSigner: false, isWritable: true },
      ],
      data,
    });
    const sig = await sendAndConfirmTransaction(conn, tx, [admin]);
    console.log(`TX: ${sig}`);
    console.log("Admin transferred! The old keypair can no longer manage campaigns.");
    return;
  }

  console.log(`Unknown command: ${cmd}. Run without arguments for help.`);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
