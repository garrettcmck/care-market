// Mainnet initialization for Care Market
// Run ONCE after deploying the program to mainnet:
//   node scripts/init-mainnet.cjs --keypair ./admin-wallet.json
//
// This will:
//   1. Create the admin's jitoSOL ATA (fee collection)
//   2. Initialize the CareMarket PDA (sets admin, jitoSOL mint, fee wallet)

const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");

const PROGRAM_ID = new PublicKey("Cb1uEFgjbGeWiEMRCTA2SXzbB3jrnK58yAkwPGPZbL84");
const JITOSOL_MINT = new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
const RPC = "https://api.mainnet-beta.solana.com";

function disc(name) { return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8); }

// Parse --keypair argument
let keypairPath = null;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--keypair" && process.argv[i + 1]) {
    keypairPath = process.argv[++i];
  }
}
if (!keypairPath) {
  console.error("Usage: node scripts/init-mainnet.cjs --keypair <path_to_admin_wallet.json>");
  process.exit(1);
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const resolved = path.resolve(keypairPath);
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(resolved))));

  console.log("=== Care Market Mainnet Initialization ===");
  console.log("Program:  ", PROGRAM_ID.toBase58());
  console.log("Admin:    ", admin.publicKey.toBase58());
  console.log("jitoSOL:  ", JITOSOL_MINT.toBase58());
  console.log("Balance:  ", (await conn.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL, "SOL");
  console.log("");

  // Step 1: Create admin's jitoSOL ATA (for fee collection)
  const feeAta = getAssociatedTokenAddressSync(JITOSOL_MINT, admin.publicKey);
  console.log("1) Fee ATA:", feeAta.toBase58());
  try {
    const ataInfo = await conn.getAccountInfo(feeAta);
    if (ataInfo) {
      console.log("   Already exists\n");
    } else {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(admin.publicKey, feeAta, admin.publicKey, JITOSOL_MINT)
      );
      const sig = await sendAndConfirmTransaction(conn, tx, [admin]);
      console.log("   Created. TX:", sig, "\n");
    }
  } catch (e) {
    console.log("   Error:", e.message, "\n");
  }

  // Step 2: Initialize CareMarket PDA
  const [cmPDA] = PublicKey.findProgramAddressSync([Buffer.from("care_market")], PROGRAM_ID);
  console.log("2) Initialize CareMarket:", cmPDA.toBase58());
  try {
    const cmInfo = await conn.getAccountInfo(cmPDA);
    if (cmInfo) {
      console.log("   Already initialized\n");
    } else {
      const data = Buffer.concat([
        disc("initialize"),
        JITOSOL_MINT.toBuffer(),
        admin.publicKey.toBuffer(), // fee_wallet = admin
      ]);
      const tx = new Transaction().add({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: admin.publicKey, isSigner: true, isWritable: true },
          { pubkey: cmPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });
      const sig = await sendAndConfirmTransaction(conn, tx, [admin]);
      console.log("   Initialized. TX:", sig, "\n");
    }
  } catch (e) {
    console.log("   Error:", e.message, "\n");
  }

  console.log("=== Done ===");
  console.log("Fee ATA:        ", feeAta.toBase58());
  console.log("CareMarket PDA: ", cmPDA.toBase58());
  console.log("Balance:        ", (await conn.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL, "SOL");
  console.log("");
  console.log("Next: Create your first campaign with:");
  console.log('  node scripts/admin.cjs --keypair ./admin-wallet.json create 25 "Feed a Child" "Provide meals to children in need"');
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
