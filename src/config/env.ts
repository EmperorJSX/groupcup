import { ZodError, z } from "zod/v4";
import { customBoolean } from "@/utils/zodHelpers";
import { fromError } from "zod-validation-error/v4";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Non-secret environment flags, always read from process.env. */
const CoreSchema = z.object({
  NEXT_PUBLIC_NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  IS_PROD: customBoolean(false),
  IS_DEV: customBoolean(true),
});

/**
 * Defines the schema for environment configuration. Provides type safety and
 * validation for every required setting. No Infisical, just process.env.
 */
const SecretsSchema = z.object({
  // ── App ──────────────────────────────────────────────────────────────────
  APP_NAME: z.string().default("groupcup"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  // ── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.url(),

  // ── Redis ────────────────────────────────────────────────────────────────
  REDIS_URL: z.string(),

  // ── Telegram ─────────────────────────────────────────────────────────────
  TG_BOT_TOKEN: z.string(),
  TG_API_ROOT_URL: z.url().default("https://api.telegram.org"),
  TG_WEBHOOK_URL: z.url(),
  TG_SECRET_TOKEN: z.string(),

  // ── Solana (devnet) ──────────────────────────────────────────────────────
  SOLANA_RPC: z.url().default("https://api.devnet.solana.com"),
  WALLET_ENCRYPTION_KEY: z.string().default("dev-insecure-wallet-key"),

  // ── TxLINE (devnet score data) ───────────────────────────────────────────
  TXLINE_API_ORIGIN: z.url().default("https://txline-dev.txodds.com"),
  TXLINE_PROGRAM_ID: z
    .string()
    .default("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
  TXLINE_TOKEN_MINT: z
    .string()
    .default("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  TXLINE_SERVICE_SECRET_KEY: z.string().optional(),
  TXLINE_API_TOKEN: z.string().optional(),

  // ── Pot (optional on-chain prize pool) ───────────────────────────────────
  POT_ENABLED: customBoolean(false),
  POT_RAKE_BPS: z.coerce.number().int().min(0).max(10_000).default(250),
  POT_MIN_ENTRY_LAMPORTS: z.coerce.number().int().min(0).default(50_000_000),
});

const EnvironmentSchema = CoreSchema.extend(SecretsSchema.shape);

// Export type definition for the environment schema
export type EnvSchema = z.infer<typeof EnvironmentSchema>;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/** Resolves and validates the full environment config from process.env. */
function initEnv(): Readonly<EnvSchema> {
  // Parse core flags first to determine environment
  const core = CoreSchema.parse(process.env);
  core.IS_PROD = core.NEXT_PUBLIC_NODE_ENV === "production";
  core.IS_DEV = !core.IS_PROD;

  try {
    const env = EnvironmentSchema.parse({ ...process.env });
    env.IS_PROD = core.IS_PROD;
    env.IS_DEV = core.IS_DEV;

    // Freeze to prevent accidental mutation
    return Object.freeze(env);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = fromError(error).message;
      const validationError = new Error(errorMessage);
      validationError.stack = "";
      throw validationError;
    }
    console.error("Unexpected error during environment validation:", error);
    throw error;
  }
}

// Top-level await keeps the shape identical to jomo even though parsing is sync.
const env = await Promise.resolve(initEnv());

export default env;
