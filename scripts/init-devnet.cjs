const { execSync } = require("child_process");
const { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { createInitializeMintInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, MINT_SIZE, TOKEN_PROGRAM_ID, createMintToInstruction } = require("@solana/spl-token");
const { createHash } = require("crypto");
const fs = require("fs");
const bs58 = require("bs58");

const PROGRAM_ID = new PublicKey("3CQ9sfki5SgF4pdL7qZgFWGzf4h3HSfgNXwWS5usbUsz");
const RPC = "https://api.devnet.solana.com";

function disc(name) { return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8); }
function findPDA(seeds) { return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID); }

function rpc(method, params = []) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const result = execSync(`curl -s -m 30 -X POST "${RPC}" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`, { encoding: "utf8" });
  const parsed = JSON.parse(result);
  if (parsed.error) throw new Error(`RPC ${method}: ${JSON.stringify(parsed.error)}`);
  return parsed.result;
}

function getBalance(pubkey) {
  return rpc("getBalance", [pubkey.toBase58(), { commitment: "confirmed" }]).value;
}

function getRecentBlockhash() {
  return rpc("getLatestBlockhash", [{ commitment: "confirmed" }]).value.blockhash;
}

function sendTx(tx, signers) {
  const blockhash = getRecentBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = signers[0].publicKey;
  tx.sign(...signers);
  const raw = tx.serialize();
  const encoded = raw.toString("base64");
  const sig = rpc("sendTransaction", [encoded, { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" }]);
  console.log("   TX:", sig);
  // Wait for confirmation
  for (let i = 0; i < 30; i++) {
    execSync("sleep 1");
    try {
      const status = rpc("getSignatureStatuses", [[sig]]);
      if (status.value[0] && status.value[0].confirmationStatus) {
        console.log("   Status:", status.value[0].confirmationStatus);
        if (status.value[0].err) throw new Error("TX failed: " + JSON.stringify(status.value[0].err));
        return sig;
      }
    } catch (e) { if (!e.message.includes("null")) throw e; }
  }
  return sig;
}

function main() {
  const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("/root/.config/solana/id.json"))));
  console.log("Admin:", admin.publicKey.toBase58());
  console.log("Balance:", getBalance(admin.publicKey) / LAMPORTS_PER_SOL, "SOL\n");

  const jitoSolMint = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("keys/jitosol-mint.json"))));
  const feeWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("keys/fee-wallet.json"))));

  // 1. Create mock jitoSOL mint
  console.log("1) Create jitoSOL mint:", jitoSolMint.publicKey.toBase58());
  try {
    const rentResult = rpc("getMinimumBalanceForRentExemption", [MINT_SIZE]);
    const tx = new Transaction().add(
      SystemProgram.createAccount({ fromPubkey: admin.publicKey, newAccountPubkey: jitoSolMint.publicKey, lamports: rentResult, space: MINT_SIZE, programId: TOKEN_PROGRAM_ID }),
      createInitializeMintInstruction(jitoSolMint.publicKey, 9, admin.publicKey, null),
    );
    sendTx(tx, [admin, jitoSolMint]);
  } catch (e) { console.log("   " + (e.message.includes("already in use") || e.message.includes("0x0") ? "Exists" : e.message)); }

  // 2. Fee ATA
  const feeAta = getAssociatedTokenAddressSync(jitoSolMint.publicKey, feeWallet.publicKey);
  console.log("\n2) Fee ATA:", feeAta.toBase58());
  try {
    sendTx(new Transaction().add(createAssociatedTokenAccountInstruction(admin.publicKey, feeAta, feeWallet.publicKey, jitoSolMint.publicKey)), [admin]);
  } catch (e) { console.log("   " + (e.message.includes("0x0") || e.message.includes("already") ? "Exists" : e.message)); }

  // 3. Initialize
  const [cmPDA] = findPDA([Buffer.from("care_market")]);
  console.log("\n3) Initialize CareMarket:", cmPDA.toBase58());
  try {
    sendTx(new Transaction().add({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: cmPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([disc("initialize"), jitoSolMint.publicKey.toBuffer(), feeWallet.publicKey.toBuffer()]),
    }), [admin]);
  } catch (e) { console.log("   " + (e.message.includes("already in use") ? "Already initialized" : e.message)); }

  // 4. Create campaign 0
  const idBuf = Buffer.alloc(8); idBuf.writeBigUInt64LE(0n);
  const [campPDA] = findPDA([Buffer.from("campaign"), idBuf]);
  const [vaultPDA] = findPDA([Buffer.from("vault"), campPDA.toBuffer()]);
  const charity = Keypair.generate();
  fs.writeFileSync("keys/charity-0.json", JSON.stringify(Array.from(charity.secretKey)));
  console.log("\n4) Campaign 0:", campPDA.toBase58());
  const nm = Buffer.from("Feed a Child"), ds = Buffer.from("Provide meals to children in need");
  const nl = Buffer.alloc(4); nl.writeUInt32LE(nm.length);
  const dl = Buffer.alloc(4); dl.writeUInt32LE(ds.length);
  const gl = Buffer.alloc(8); gl.writeBigUInt64LE(BigInt(25 * LAMPORTS_PER_SOL));
  try {
    sendTx(new Transaction().add({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: cmPDA, isSigner: false, isWritable: true },
        { pubkey: campPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: jitoSolMint.publicKey, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([disc("create_campaign"), charity.publicKey.toBuffer(), nl, nm, dl, ds, gl]),
    }), [admin]);
  } catch (e) { console.log("   " + (e.message.includes("already in use") ? "Exists" : e.message)); }

  // 5. Admin ATA + Mint + Donate
  const adminAta = getAssociatedTokenAddressSync(jitoSolMint.publicKey, admin.publicKey);
  console.log("\n5) Mint 5 jitoSOL & donate");
  try { sendTx(new Transaction().add(createAssociatedTokenAccountInstruction(admin.publicKey, adminAta, admin.publicKey, jitoSolMint.publicKey)), [admin]); }
  catch (e) { console.log("   Admin ATA exists"); }

  sendTx(new Transaction().add(createMintToInstruction(jitoSolMint.publicKey, adminAta, admin.publicKey, 5_000_000_000)), [admin]);
  console.log("   Minted 5 jitoSOL");

  const [usPDA] = findPDA([Buffer.from("user_stake"), admin.publicKey.toBuffer(), campPDA.toBuffer()]);
  const sb = Buffer.alloc(8); sb.writeBigUInt64LE(BigInt(5 * LAMPORTS_PER_SOL));
  const jb = Buffer.alloc(8); jb.writeBigUInt64LE(5_000_000_000n);
  sendTx(new Transaction().add({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: cmPDA, isSigner: false, isWritable: false },
      { pubkey: campPDA, isSigner: false, isWritable: true },
      { pubkey: adminAta, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: feeAta, isSigner: false, isWritable: true },
      { pubkey: usPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("donate"), sb, jb]),
  }), [admin]);

  console.log("\n========================================");
  console.log("  CARE MARKET — DEVNET LIVE");
  console.log("========================================");
  console.log("Program:         " + PROGRAM_ID.toBase58());
  console.log("CareMarket PDA:  " + cmPDA.toBase58());
  console.log("jitoSOL mint:    " + jitoSolMint.publicKey.toBase58());
  console.log("Fee wallet:      " + feeWallet.publicKey.toBase58());
  console.log("Fee ATA:         " + feeAta.toBase58());
  console.log("Campaign 0:      " + campPDA.toBase58());
  console.log("Vault 0:         " + vaultPDA.toBase58());
  console.log("Charity 0:       " + charity.publicKey.toBase58());
  console.log("Balance:         " + getBalance(admin.publicKey) / LAMPORTS_PER_SOL + " SOL");
  console.log("========================================");
}
main();
