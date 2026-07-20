import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import nacl from "tweetnacl";
import {
  AccountRole,
  airdropFactory,
  createSolanaClient,
  createTransaction,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  lamports,
  signTransactionMessageWithSigners,
  address,
  type Address,
  type Instruction,
} from "gill";
import { DEFAULT_CLI_KEYPAIR_PATH, loadKeypairSignerFromFile } from "gill/node";
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  getAssociatedTokenAccountAddress,
  getCreateAssociatedTokenIdempotentInstructionAsync,
} from "gill/programs";

/**
 * On-chain half of TxLINE access (Solana devnet): invoke the txoracle
 * `subscribe` instruction for the free World Cup tier, paying only tx fees.
 * The resulting signature plus a wallet-signed message unlocks an API token
 * via POST /api/token/activate (see ./client.ts).
 *
 * Program id, discriminator, and account order come from the official IDL
 * (github.com/txodds/tx-on-chain, examples/devnet/idl/txoracle.json).
 */

/** txoracle program on devnet. */
const PROGRAM = address("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
/** TxL token mint (Token-2022) on devnet. */
const TOKEN_MINT = address("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");

/** anchor discriminator for `subscribe(service_level_id: u16, weeks: u8)`. */
const SUBSCRIBE_DISCRIMINATOR = [254, 28, 191, 138, 156, 179, 183, 53];

/** Free World Cup tier: service level 1, minimum 4-week duration. */
const SERVICE_LEVEL_ID = 1;
const DURATION_WEEKS = 4;

function walletPath(): string {
  const p = process.env.TXLINE_WALLET ?? DEFAULT_CLI_KEYPAIR_PATH;
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

export type OnchainSubscription = {
  txSig: string;
  walletAddress: string;
  /** Sign an activation message with the wallet key; returns base64. */
  signActivation: (message: string) => string;
};

function subscribeInstructionData(): Uint8Array {
  const data = new Uint8Array(11);
  data.set(SUBSCRIBE_DISCRIMINATOR, 0);
  new DataView(data.buffer).setUint16(8, SERVICE_LEVEL_ID, true);
  data[10] = DURATION_WEEKS;
  return data;
}

/**
 * Send the free-tier `subscribe` transaction from the local Solana CLI wallet
 * (TXLINE_WALLET or ~/.config/solana/id.json), airdropping devnet SOL for
 * fees when the wallet is empty. Throws on any failure; the caller falls
 * back to replay mode.
 */
export async function subscribeOnChain(): Promise<OnchainSubscription> {
  const signer = await loadKeypairSignerFromFile(walletPath());
  const { rpc, rpcSubscriptions, sendAndConfirmTransaction } =
    createSolanaClient({ urlOrMoniker: "devnet" });

  // BigInt() calls, not literals: tsconfig targets ES2017.
  const { value: balance } = await rpc.getBalance(signer.address).send();
  if (balance < BigInt(10_000_000)) {
    await airdropFactory({ rpc, rpcSubscriptions })({
      commitment: "confirmed",
      lamports: lamports(BigInt(1_000_000_000)),
      recipientAddress: signer.address,
    });
  }

  const [pricingMatrix] = await getProgramDerivedAddress({
    programAddress: PROGRAM,
    seeds: ["pricing_matrix"],
  });
  const [treasuryPda] = await getProgramDerivedAddress({
    programAddress: PROGRAM,
    seeds: ["token_treasury_v2"],
  });
  const userAta = await getAssociatedTokenAccountAddress(
    TOKEN_MINT,
    signer.address,
    TOKEN_2022_PROGRAM_ADDRESS,
  );
  const treasuryVault = await getAssociatedTokenAccountAddress(
    TOKEN_MINT,
    treasuryPda,
    TOKEN_2022_PROGRAM_ADDRESS,
  );

  const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
    payer: signer,
    owner: signer.address,
    mint: TOKEN_MINT,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  // Account order mirrors the IDL exactly.
  const accounts: Array<{ address: Address; role: AccountRole }> = [
    { address: signer.address, role: AccountRole.WRITABLE_SIGNER },
    { address: pricingMatrix, role: AccountRole.READONLY },
    { address: TOKEN_MINT, role: AccountRole.READONLY },
    { address: userAta, role: AccountRole.WRITABLE },
    { address: treasuryVault, role: AccountRole.WRITABLE },
    { address: treasuryPda, role: AccountRole.READONLY },
    { address: TOKEN_2022_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
  ];
  const subscribeIx: Instruction = {
    programAddress: PROGRAM,
    accounts,
    data: subscribeInstructionData(),
  };

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const transaction = createTransaction({
    version: "legacy",
    feePayer: signer,
    instructions: [createAtaIx, subscribeIx],
    latestBlockhash,
  });
  const signed = await signTransactionMessageWithSigners(transaction);
  await sendAndConfirmTransaction(signed, { commitment: "confirmed" });
  const txSig = getSignatureFromTransaction(signed);

  // Activation signs `${txSig}:${leagues}:${jwt}` with the raw ed25519 key;
  // the CLI id.json is the 64-byte nacl secret key (seed + public key).
  const secretKey = Uint8Array.from(
    JSON.parse(readFileSync(walletPath(), "utf8")) as number[],
  );
  const signActivation = (message: string) =>
    Buffer.from(
      nacl.sign.detached(new TextEncoder().encode(message), secretKey),
    ).toString("base64");

  return { txSig, walletAddress: signer.address, signActivation };
}
