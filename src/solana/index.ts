import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createKeyPairSignerFromPrivateKeyBytes } from "gill";
import { store } from "@/db/store";

/** AES-256-GCM key derived from the env secret (dev default is fine on devnet). */
const ENC_KEY = createHash("sha256")
  .update(process.env.WALLET_ENCRYPTION_KEY ?? "dev-insecure-wallet-key")
  .digest();

/** nonce:ciphertext+tag, both base64: the wallets.encryptedSecret format. */
function encryptSeed(seed: Uint8Array): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, nonce);
  const ct = Buffer.concat([cipher.update(seed), cipher.final(), cipher.getAuthTag()]);
  return `${nonce.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Custodial Solana wallet per player (gill / Solana Kit v2). userId is the db
 * users.id. Returns the base58 public key that is the player's on-chain
 * identity.
 *
 * ponytail: mock custody. The ed25519 seed is sha256(userId), so getOrCreate
 * is idempotent by construction and the demo needs no key ceremony. Swap the
 * seed for randomBytes(32) before real funds ever touch these wallets.
 */
export async function getOrCreateWallet(
  userId: number,
): Promise<{ pubkey: string }> {
  const existing = await store.findWallet(userId);
  if (existing) return { pubkey: existing.publicKey };

  const seed = new Uint8Array(
    createHash("sha256").update(`groupcup:wallet:${userId}`).digest(),
  );
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed);
  const pubkey = signer.address as string;
  // Deterministic derivation: a concurrent-insert race produces the same key,
  // so the conflict-ignoring insert is safe.
  await store.createWallet(userId, pubkey, encryptSeed(seed));
  return { pubkey };
}
