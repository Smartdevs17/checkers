/* ------------------------------------------------------------------ */
/*  Achievement system – pure client-side computation from on-chain   */
/*  player stats.                                                     */
/* ------------------------------------------------------------------ */

export type AchievementCategory = "wins" | "games" | "rating" | "special";

export interface PlayerStats {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  target?: number;
  progress: (stats: PlayerStats) => number;
  isUnlocked: (stats: PlayerStats) => boolean;
  currentValue?: (stats: PlayerStats) => number;
}

export interface AchievementStatus {
  def: AchievementDef;
  unlocked: boolean;
  progress: number;
  currentValue: number;
}

/* ------------------------------------------------------------------ */
/*  Category labels                                                   */
/* ------------------------------------------------------------------ */

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  wins: "Victories",
  games: "Games Played",
  rating: "Rating Milestones",
  special: "Special",
};

/* ------------------------------------------------------------------ */
/*  Achievement definitions (22 total)                                */
/* ------------------------------------------------------------------ */

const win = (target: number, id: string, name: string, desc: string): AchievementDef => ({
  id,
  name,
  description: desc,
  category: "wins",
  icon: "trophy",
  target,
  progress: (s) => Math.min(s.wins / target, 1),
  isUnlocked: (s) => s.wins >= target,
  currentValue: (s) => s.wins,
});

const game = (target: number, id: string, name: string, desc: string): AchievementDef => ({
  id,
  name,
  description: desc,
  category: "games",
  icon: "gamepad",
  target,
  progress: (s) => Math.min(s.gamesPlayed / target, 1),
  isUnlocked: (s) => s.gamesPlayed >= target,
  currentValue: (s) => s.gamesPlayed,
});

const rating = (target: number, id: string, name: string, desc: string, icon: string): AchievementDef => ({
  id,
  name,
  description: desc,
  category: "rating",
  icon,
  target,
  progress: (s) => Math.min(s.rating / target, 1),
  isUnlocked: (s) => s.rating >= target,
  currentValue: (s) => s.rating,
});

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Wins ──
  win(1, "first_victory", "First Victory", "Win your first game"),
  win(5, "rising_star", "Rising Star", "Win 5 games"),
  win(10, "champion", "Champion", "Win 10 games"),
  win(25, "veteran", "Veteran", "Win 25 games"),
  win(50, "legend", "Legend", "Win 50 games"),
  win(100, "unstoppable", "Unstoppable", "Win 100 games"),

  // ── Games ──
  game(1, "newcomer", "Newcomer", "Play your first game"),
  game(10, "regular", "Regular", "Play 10 games"),
  game(25, "dedicated", "Dedicated", "Play 25 games"),
  game(50, "hardcore", "Hardcore", "Play 50 games"),
  game(100, "addict", "Addict", "Play 100 games"),

  // ── Rating (default is 1200, so start above that) ──
  rating(1300, "competitor", "Competitor", "Reach 1300 rating", "star"),
  rating(1400, "advanced", "Advanced", "Reach 1400 rating", "star"),
  rating(1500, "skilled", "Skilled", "Reach 1500 rating", "shield"),
  rating(1600, "expert", "Expert", "Reach 1600 rating", "shield"),
  rating(1800, "master", "Master", "Reach 1800 rating", "crown"),
  rating(2000, "grandmaster", "Grandmaster", "Reach 2000 rating", "crown"),

  // ── Special ──
  {
    id: "perfect_record",
    name: "Perfect Record",
    description: "Win all games (min 5 played)",
    category: "special",
    icon: "fire",
    target: 5,
    progress: (s) =>
      s.gamesPlayed < 5
        ? Math.min(s.gamesPlayed / 5, 1) * (s.losses === 0 && s.draws === 0 ? 1 : 0.5)
        : s.losses === 0 && s.draws === 0
          ? 1
          : 0,
    isUnlocked: (s) => s.gamesPlayed >= 5 && s.wins === s.gamesPlayed,
    currentValue: (s) => s.wins,
  },
  {
    id: "draw_master",
    name: "Draw Master",
    description: "Draw 5 games",
    category: "special",
    icon: "handshake",
    target: 5,
    progress: (s) => Math.min(s.draws / 5, 1),
    isUnlocked: (s) => s.draws >= 5,
    currentValue: (s) => s.draws,
  },
  {
    id: "unbreakable",
    name: "Unbreakable",
    description: "Play 10+ games with 0 losses",
    category: "special",
    icon: "shield",
    target: 10,
    progress: (s) =>
      s.losses > 0 ? 0 : Math.min(s.gamesPlayed / 10, 1),
    isUnlocked: (s) => s.gamesPlayed >= 10 && s.losses === 0,
    currentValue: (s) => s.gamesPlayed,
  },
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    description: "Win rate > 60% after 20+ games",
    category: "special",
    icon: "bolt",
    target: 20,
    progress: (s) => {
      if (s.gamesPlayed < 20) return Math.min(s.gamesPlayed / 20, 1) * 0.5;
      const rate = s.wins / s.gamesPlayed;
      return rate > 0.6 ? 1 : rate / 0.6;
    },
    isUnlocked: (s) => s.gamesPlayed >= 20 && s.wins / s.gamesPlayed > 0.6,
    currentValue: (s) =>
      s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0,
  },
];

/* ------------------------------------------------------------------ */
/*  Compute helpers                                                   */
/* ------------------------------------------------------------------ */

export function computeAchievements(stats: PlayerStats): AchievementStatus[] {
  return ACHIEVEMENTS.map((def) => ({
    def,
    unlocked: def.isUnlocked(stats),
    progress: def.progress(stats),
    currentValue: def.currentValue ? def.currentValue(stats) : 0,
  }));
}

export function countUnlocked(stats: PlayerStats): number {
  return ACHIEVEMENTS.filter((a) => a.isUnlocked(stats)).length;
}
