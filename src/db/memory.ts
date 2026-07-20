import type {
  LeaderboardInsertType,
  LeaderboardType,
  MatchInsertType,
  MatchType,
  GroupType,
  Pick,
  PollType,
  PredictionType,
  UserType,
  WalletType,
} from "@/types/db";
import type {
  LeaderboardJoinedRow,
  PredictionScoringRow,
  Store,
} from "./store";

/**
 * In-memory Store backend: the zero-config fallback when postgres is not
 * reachable. Rows use the exact drizzle $inferSelect shapes, ids are serial
 * per table, and every operation is synchronous under the hood, so behaviour
 * is deterministic. State lives for the process only.
 */

const users: UserType[] = [];
const groups: GroupType[] = [];
const wallets: WalletType[] = [];
const matches: MatchType[] = [];
const polls: PollType[] = [];
const predictions: PredictionType[] = [];
const leaderboard: LeaderboardType[] = [];

const ids = { users: 0, groups: 0, wallets: 0, matches: 0, polls: 0, predictions: 0, leaderboard: 0 };

/** Postgres sorts NULL last on ASC; mirror that for name ordering. */
const nameKey = (v: string | null) => v ?? "￿";

export const memoryStore: Store = {
  async findUserByTgId(tgId) {
    return users.find((u) => u.userId === tgId);
  },

  async createUser(tgId, firstName) {
    const existing = users.find((u) => u.userId === tgId);
    if (existing) return existing;
    const row: UserType = {
      id: ++ids.users,
      userId: tgId,
      username: null,
      firstName: firstName ?? null,
      lastName: null,
      languageCode: "en",
      role: "user",
      status: "active",
      canNotify: 1,
      createdAt: new Date(),
    };
    users.push(row);
    return row;
  },

  async setUserName(id, firstName) {
    const row = users.find((u) => u.id === id);
    if (!row) throw new Error(`Unknown user ${id}`);
    row.firstName = firstName;
    return row;
  },

  async findGroupByChatId(chatId) {
    return groups.find((g) => g.chatId === chatId);
  },

  async createGroup(chatId, title) {
    const existing = groups.find((g) => g.chatId === chatId);
    if (existing) return existing;
    const row: GroupType = {
      id: ++ids.groups,
      chatId,
      title: title ?? null,
      addedBy: null,
      potEnabled: 0,
      createdAt: new Date(),
    };
    groups.push(row);
    return row;
  },

  async setGroupTitle(id, title) {
    const row = groups.find((g) => g.id === id);
    if (!row) throw new Error(`Unknown group ${id}`);
    row.title = title;
    return row;
  },

  async findWallet(userId) {
    return wallets.find((w) => w.userId === userId);
  },

  async createWallet(userId, publicKey, encryptedSecret) {
    if (wallets.some((w) => w.userId === userId)) return;
    wallets.push({
      id: ++ids.wallets,
      userId,
      publicKey,
      encryptedSecret,
      createdAt: new Date(),
    });
  },

  async findMatchById(id) {
    return matches.find((m) => m.id === id);
  },

  async findMatchByFixture(fixtureId) {
    return matches.find((m) => m.fixtureId === fixtureId);
  },

  async upsertMatch(values: MatchInsertType) {
    const existing = matches.find((m) => m.fixtureId === values.fixtureId);
    const base = {
      homeTeam: values.homeTeam,
      awayTeam: values.awayTeam,
      homeFlag: values.homeFlag ?? null,
      awayFlag: values.awayFlag ?? null,
      kickoffAt: values.kickoffAt,
      status: values.status ?? "scheduled",
      homeScore: values.homeScore ?? 0,
      awayScore: values.awayScore ?? 0,
      finalizedAt: values.finalizedAt ?? null,
    };
    if (existing) {
      Object.assign(existing, base);
      return existing;
    }
    const row: MatchType = {
      id: ++ids.matches,
      fixtureId: values.fixtureId,
      ...base,
      createdAt: new Date(),
    };
    matches.push(row);
    return row;
  },

  async listScheduledMatches() {
    return matches
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
  },

  async lockMatch(matchId) {
    const match = matches.find((m) => m.id === matchId);
    if (match && match.status === "scheduled") match.status = "locked";
    for (const p of polls) {
      if (p.matchId === matchId && p.status === "open") p.status = "locked";
    }
  },

  async applyScore(fixtureId, home, away, finalised) {
    const match = matches.find((m) => m.fixtureId === fixtureId);
    if (!match) return undefined;
    match.homeScore = home;
    match.awayScore = away;
    match.status = finalised ? "finished" : "live";
    if (finalised) {
      match.finalizedAt = new Date();
      for (const p of polls) {
        if (p.matchId === match.id && p.status !== "settled") {
          p.status = "settled";
          p.settledAt = new Date();
        }
      }
    }
    return match;
  },

  async upsertOpenPoll(groupId, matchId, lockAt) {
    const existing = polls.find(
      (p) => p.groupId === groupId && p.matchId === matchId,
    );
    if (existing) return existing;
    const row: PollType = {
      id: ++ids.polls,
      groupId,
      matchId,
      chatMessageId: null,
      status: "open",
      lockAt,
      settledAt: null,
      createdAt: new Date(),
    };
    polls.push(row);
    return row;
  },

  async reopenPolls(matchIds) {
    const set = new Set(matchIds);
    for (const p of polls) {
      if (set.has(p.matchId)) {
        p.status = "open";
        p.settledAt = null;
      }
    }
  },

  async groupIdsWithPolls(matchId) {
    return [...new Set(polls.filter((p) => p.matchId === matchId).map((p) => p.groupId))];
  },

  async upsertPredictionPick(pollId, userId, pick: Pick) {
    const existing = predictions.find(
      (p) => p.pollId === pollId && p.userId === userId,
    );
    if (existing) {
      existing.pick = pick;
      return;
    }
    predictions.push({
      id: ++ids.predictions,
      pollId,
      userId,
      pick,
      exactHome: null,
      exactAway: null,
      points: 0,
      createdAt: new Date(),
    });
  },

  async setPredictionPoints(predictionId, points) {
    const row = predictions.find((p) => p.id === predictionId);
    if (row) row.points = points;
  },

  async predictionRowsForGroup(groupId): Promise<PredictionScoringRow[]> {
    const out: PredictionScoringRow[] = [];
    for (const pred of predictions) {
      const poll = polls.find((p) => p.id === pred.pollId);
      if (!poll || poll.groupId !== groupId) continue;
      const match = matches.find((m) => m.id === poll.matchId);
      const user = users.find((u) => u.id === pred.userId);
      if (!match || !user) continue;
      out.push({
        predictionId: pred.id,
        storedPoints: pred.points,
        pick: pred.pick,
        userId: user.id,
        firstName: user.firstName,
        username: user.username,
        matchStatus: match.status,
        home: match.homeScore,
        away: match.awayScore,
      });
    }
    return out;
  },

  async leaderboardRows(groupId) {
    return leaderboard.filter((l) => l.groupId === groupId);
  },

  async upsertLeaderboardRow(row: LeaderboardInsertType) {
    const existing = leaderboard.find(
      (l) => l.groupId === row.groupId && l.userId === row.userId,
    );
    const base = {
      points: row.points ?? 0,
      correctCount: row.correctCount ?? 0,
      exactCount: row.exactCount ?? 0,
      predictionsCount: row.predictionsCount ?? 0,
      rank: row.rank ?? 0,
      prevRank: row.prevRank ?? null,
      updatedAt: row.updatedAt ?? new Date(),
    };
    if (existing) {
      Object.assign(existing, base);
      return;
    }
    leaderboard.push({
      id: ++ids.leaderboard,
      groupId: row.groupId,
      userId: row.userId,
      ...base,
    });
  },

  async leaderboardJoined(groupId): Promise<LeaderboardJoinedRow[]> {
    const rows: Array<LeaderboardJoinedRow & { userDbId: number }> = [];
    for (const l of leaderboard) {
      if (l.groupId !== groupId) continue;
      const user = users.find((u) => u.id === l.userId);
      if (!user) continue;
      rows.push({
        points: l.points,
        rank: l.rank,
        prevRank: l.prevRank,
        firstName: user.firstName,
        username: user.username,
        userDbId: user.id,
      });
    }
    // Same order as the pg backend: rank, then name (nulls last), then id.
    rows.sort(
      (a, b) =>
        a.rank - b.rank ||
        nameKey(a.firstName).localeCompare(nameKey(b.firstName)) ||
        a.userDbId - b.userDbId,
    );
    return rows.map(({ userDbId: _ignored, ...row }) => row);
  },
};
