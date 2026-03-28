import { PublicKey, TransactionInstruction, Connection, AddressLookupTableAccount } from "@solana/web3.js";
import { JITOSOL_MINT, SOL_MINT, JUPITER_QUOTE_API } from "@/utils/constants";

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  slippageBps: number;
  routePlan: any[];
}

export async function quoteSolToJitosol(lamports: number, slippageBps = 50): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint: SOL_MINT.toBase58(),
    outputMint: JITOSOL_MINT.toBase58(),
    amount: lamports.toString(),
    slippageBps: slippageBps.toString(),
  });
  const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.statusText}`);
  return res.json();
}

export async function quoteJitosolToSol(amount: number, slippageBps = 50): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint: JITOSOL_MINT.toBase58(),
    outputMint: SOL_MINT.toBase58(),
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
  });
  const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.statusText}`);
  return res.json();
}

export async function getSwapInstructions(quote: JupiterQuote, userPubkey: PublicKey, destinationAta?: PublicKey) {
  const body: any = {
    quoteResponse: quote,
    userPublicKey: userPubkey.toBase58(),
  };
  if (destinationAta) body.destinationTokenAccount = destinationAta.toBase58();

  const res = await fetch(`${JUPITER_QUOTE_API}/swap-instructions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Jupiter swap-instructions failed: ${res.statusText}`);
  const data = await res.json();

  return {
    setupInstructions: (data.setupInstructions || []).map(deserializeIx),
    swapInstruction: deserializeIx(data.swapInstruction),
    cleanupInstruction: data.cleanupInstruction ? deserializeIx(data.cleanupInstruction) : null,
    addressLookupTableAddresses: (data.addressLookupTableAddresses || []) as string[],
  };
}

export async function loadALTs(connection: Connection, addresses: string[]): Promise<AddressLookupTableAccount[]> {
  const tables: AddressLookupTableAccount[] = [];
  for (const addr of addresses) {
    const result = await connection.getAddressLookupTable(new PublicKey(addr));
    if (result.value) tables.push(result.value);
  }
  return tables;
}

export async function getJitosolRate(): Promise<number> {
  try {
    const quote = await quoteSolToJitosol(1_000_000_000);
    return 1_000_000_000 / parseInt(quote.outAmount);
  } catch {
    return 1.083;
  }
}

function deserializeIx(ix: any): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((a: any) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
    data: Buffer.from(ix.data, "base64"),
  });
}
