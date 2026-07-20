import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * REST half of the TxLINE devnet client: guest JWT, API-token activation
 * (backed by the on-chain subscribe in ./onchain.ts), and the data endpoints.
 * Endpoints used (also listed in README for the submission docs):
 *   POST /auth/guest/start
 *   POST /api/token/activate
 *   GET  /api/fixtures/snapshot?competitionId=&startEpochDay=
 *   GET  /api/scores/snapshot/{fixtureId}
 *   GET  /api/scores/stream            (SSE, see ./stream.ts)
 *
 * Everything here throws on failure; callers in ./index.ts wrap each call
 * with the recorded-replay fallback so the product never depends on the
 * network being up.
 */

const ORIGIN = process.env.TXLINE_API_ORIGIN ?? "https://txline-dev.txodds.com";
const API = `${ORIGIN}/api`;

/** World Cup competition id on the TxLINE feed. */
const COMPETITION_ID = Number(process.env.TXLINE_COMPETITION_ID ?? 72);

/** Long-lived API token cache, so one on-chain subscribe serves many runs. */
const CACHE_FILE = join(homedir(), ".cache", "groupcup", "txline.json");

const FETCH_TIMEOUT_MS = Number(process.env.TXLINE_FETCH_TIMEOUT_MS ?? 8000);

export class TxlineError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TxlineError";
  }
}

type AuthState = { jwt?: string; apiToken?: string };
const auth: AuthState = {
  jwt: process.env.TXLINE_JWT,
  apiToken: process.env.TXLINE_API_TOKEN,
};

function readCache(): { apiToken?: string } {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as { apiToken?: string };
  } catch {
    return {};
  }
}

function writeCache(apiToken: string): void {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ apiToken, origin: ORIGIN, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Cache is best effort; next run just re-activates.
  }
}

async function post(url: string, body?: unknown, headers?: Record<string, string>) {
  // Activation verifies our tx on-chain server-side; give writes a long leash.
  // accept-encoding pinned to deflate: the API's zstd responses break bun's
  // fetch decompression (the official examples pin it too).
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept-encoding": "deflate",
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 4),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new TxlineError(`POST ${url} failed: ${res.status} ${text}`, res.status);
  }
  // Some endpoints return a bare token string instead of JSON.
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { token: text.trim() };
  }
}

/** Start a guest session: short-lived JWT for all API calls. */
export async function guestJwt(): Promise<string> {
  const data = await post(`${ORIGIN}/auth/guest/start`);
  const token = data.token;
  if (typeof token !== "string" || !token) {
    throw new TxlineError("Guest session returned no token");
  }
  auth.jwt = token;
  return token;
}

let activating: Promise<string> | undefined;

/**
 * Ensure a usable API token: env override, disk cache, or the full on-chain
 * subscribe + /api/token/activate flow (one flight per process).
 */
async function ensureApiToken(): Promise<string> {
  if (auth.apiToken) return auth.apiToken;
  const cached = readCache().apiToken;
  if (cached) {
    auth.apiToken = cached;
    return cached;
  }
  activating ??= (async () => {
    const { subscribeOnChain } = await import("./onchain");
    const jwt = auth.jwt ?? (await guestJwt());
    const sub = await subscribeOnChain();
    // Free tier signs with an empty league list: `${txSig}::${jwt}`.
    const walletSignature = sub.signActivation(`${sub.txSig}::${jwt}`);
    const data = await post(
      `${API}/token/activate`,
      { txSig: sub.txSig, walletSignature, leagues: [] },
      { authorization: `Bearer ${jwt}` },
    );
    const apiToken =
      typeof data.token === "string" ? data.token : (data as unknown as string);
    if (typeof apiToken !== "string" || !apiToken) {
      throw new TxlineError("Token activation returned no token");
    }
    auth.apiToken = apiToken;
    writeCache(apiToken);
    console.log(
      `[txline] activated devnet API token (wallet ${sub.walletAddress}, tx ${sub.txSig})`,
    );
    return apiToken;
  })();
  try {
    return await activating;
  } catch (err) {
    activating = undefined; // allow a later retry
    throw err;
  }
}

/** Auth headers for data requests: guest JWT + activated API token. */
export async function authHeaders(): Promise<Record<string, string>> {
  const apiToken = await ensureApiToken();
  const jwt = auth.jwt ?? (await guestJwt());
  return {
    authorization: `Bearer ${jwt}`,
    "x-api-token": apiToken,
    "accept-encoding": "deflate",
  };
}

/** GET an API path with auth; renews the guest JWT once on 401/403. */
export async function txlineGet<T = unknown>(path: string): Promise<T> {
  const url = `${API}${path}`;
  let headers = await authHeaders();
  let res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 401 || res.status === 403) {
    await guestJwt();
    headers = await authHeaders();
    res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  }
  if (!res.ok) {
    throw new TxlineError(
      `GET ${path} failed: ${res.status} ${await res.text().catch(() => "")}`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

/** One fixture as the feed returns it, plus best-effort normalised fields. */
export type TxlineFixture = {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt?: Date;
  raw: Record<string, unknown>;
};

/** Current score of one fixture, normalised from a snapshot or SSE entry. */
export type TxlineScore = {
  fixtureId: string;
  home: number;
  away: number;
  minute?: number;
  finished?: boolean;
  /** Feed action mapped onto our event grammar, when it is one of ours. */
  kind?: "kickoff" | "goal" | "half_time" | "full_time" | "game_finalised";
  /** Feed sequence number, for picking the newest snapshot entry. */
  seq?: number;
  raw: unknown;
};

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v !== "" && Number.isFinite(Number(v))
      ? Number(v)
      : undefined;

/** First defined value among aliases, case-tolerant on the first letter. */
function field(raw: Record<string, unknown>, ...names: string[]): unknown {
  for (const n of names) {
    for (const key of [n, n[0].toUpperCase() + n.slice(1), n.toLowerCase()]) {
      if (key in raw && raw[key] != null) return raw[key];
    }
  }
  return undefined;
}

/**
 * Feed entry shapes, from live devnet responses. A fixtures-snapshot row:
 *   { FixtureId, Competition, Participant1, Participant2,
 *     Participant1IsHome, StartTime (ms), ... }
 * A scores entry (snapshot rows and SSE payloads share this shape):
 *   { FixtureId, Action ("kickoff" | "goal" | "game_finalised" |
 *     "halftime_finalised" | cards/possession/...), Seq, Ts,
 *     Clock: { Seconds }, Score: { Participant1: { Total: { Goals } },
 *     Participant2: {...} }, Participant1IsHome, ... }
 */
export function normaliseFixture(raw: Record<string, unknown>): TxlineFixture | undefined {
  const fixtureId = str(field(raw, "fixtureId", "fixture_id", "id"));
  const p1 = str(field(raw, "participant1", "homeTeam", "home"));
  const p2 = str(field(raw, "participant2", "awayTeam", "away"));
  if (!fixtureId || !p1 || !p2) return undefined;
  const p1Home = field(raw, "participant1IsHome") !== false;
  const kickoffNum = num(field(raw, "startTime", "start_time", "kickoff", "kickoffAt"));
  return {
    fixtureId,
    homeTeam: p1Home ? p1 : p2,
    awayTeam: p1Home ? p2 : p1,
    kickoffAt:
      kickoffNum != null
        ? new Date(kickoffNum < 10_000_000_000 ? kickoffNum * 1000 : kickoffNum)
        : undefined,
    raw,
  };
}

/** Feed Action values mapped onto our event grammar; others carry no kind. */
const ACTION_KINDS: Record<string, TxlineScore["kind"]> = {
  kickoff: "kickoff",
  goal: "goal",
  halftime_finalised: "half_time",
  game_finalised: "game_finalised",
};

/** `Score.ParticipantN.Total.Goals`, defaulting to 0 while absent. */
function totalGoals(score: unknown, participant: "Participant1" | "Participant2"): number {
  if (score == null || typeof score !== "object") return 0;
  const side = (score as Record<string, unknown>)[participant];
  if (side == null || typeof side !== "object") return 0;
  const total = (side as Record<string, unknown>).Total;
  if (total == null || typeof total !== "object") return 0;
  return num((total as Record<string, unknown>).Goals) ?? 0;
}

/**
 * Normalise one scores entry (snapshot row or SSE payload) into a running
 * score. Returns undefined when the payload is not about a fixture.
 */
export function extractScore(rawInput: unknown, fallbackFixtureId?: string): TxlineScore | undefined {
  if (rawInput == null || typeof rawInput !== "object") return undefined;
  const raw = rawInput as Record<string, unknown>;
  const fixtureId = str(field(raw, "fixtureId", "fixture_id")) ?? fallbackFixtureId;
  if (!fixtureId) return undefined;
  const p1Home = field(raw, "participant1IsHome") !== false;
  const p1Goals = totalGoals(raw.Score, "Participant1");
  const p2Goals = totalGoals(raw.Score, "Participant2");
  const clock = raw.Clock;
  const clockSeconds =
    clock != null && typeof clock === "object"
      ? num((clock as Record<string, unknown>).Seconds)
      : undefined;
  const action = str(field(raw, "action"))?.toLowerCase();
  const kind = action != null ? ACTION_KINDS[action] : undefined;
  return {
    fixtureId,
    home: p1Home ? p1Goals : p2Goals,
    away: p1Home ? p2Goals : p1Goals,
    minute: clockSeconds != null ? Math.floor(clockSeconds / 60) : undefined,
    finished: kind === "game_finalised",
    kind,
    seq: num(field(raw, "seq")),
    raw,
  };
}

/** Days since the unix epoch, the feed's date unit. */
export const epochDay = (at = Date.now()) => Math.floor(at / 86_400_000);

/** LIVE: World Cup fixtures snapshot. Throws when the feed is unreachable. */
export async function fetchFixtures(): Promise<TxlineFixture[]> {
  const startEpochDay = epochDay() - Number(process.env.TXLINE_LOOKBACK_DAYS ?? 30);
  const data = await txlineGet<unknown>(
    `/fixtures/snapshot?competitionId=${COMPETITION_ID}&startEpochDay=${startEpochDay}`,
  );
  const rows = Array.isArray(data) ? data : [];
  return rows
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map(normaliseFixture)
    .filter((f): f is TxlineFixture => f != null);
}

/** LIVE: latest score snapshot for a fixture. Throws when unreachable. */
export async function fetchScore(fixtureId: string | number): Promise<TxlineScore> {
  const data = await txlineGet<unknown>(`/scores/snapshot/${fixtureId}`);
  const entries = Array.isArray(data) ? data : [data];
  const scores = entries
    .map((e) => extractScore(e, String(fixtureId)))
    .filter((s): s is TxlineScore => s != null);
  if (scores.length === 0) {
    throw new TxlineError(`No score in snapshot for fixture ${fixtureId}`);
  }
  // Entries are unordered actions; the current score is the highest-Seq entry
  // that actually carries a Score object, and finished is sticky.
  const withGoals = scores.filter(
    (s) => (s.raw as Record<string, unknown>).Score != null,
  );
  const pool = withGoals.length > 0 ? withGoals : scores;
  const latest = pool.reduce((a, b) => ((b.seq ?? 0) >= (a.seq ?? 0) ? b : a));
  return { ...latest, finished: scores.some((s) => s.finished) };
}

export const txlineApiBase = API;
export const txlineOrigin = ORIGIN;
