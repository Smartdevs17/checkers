import React, { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { getRatingTier, LeaderboardEntry } from "../utils/constants";
import { getAllPlayers, getPlayer, PlayerData } from "../utils/contractReader";
import {
  computeAchievements,
  countUnlocked,
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  AchievementCategory,
  AchievementStatus,
  PlayerStats,
} from "../utils/achievements";

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                         */
/* ------------------------------------------------------------------ */
const BackArrow: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const TrophyIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const AchievementIcon: React.FC<{ icon: string; size?: number; color?: string }> = ({
  icon,
  size = 20,
  color = "currentColor",
}) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (icon) {
    case "trophy":
      return (
        <svg {...props} fill={color}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...props} fill={color}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props} fill={color}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "crown":
      return (
        <svg {...props} fill={color}>
          <path d="M2 4l3 12h14l3-12-5 4-5-4-5 4-5-4z" />
          <path d="M5 16h14v2H5z" />
        </svg>
      );
    case "fire":
      return (
        <svg {...props} fill={color}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props} fill={color}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "gamepad":
      return (
        <svg {...props}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M12 12h.01" />
          <path d="M17 12h.01" />
          <path d="M7 10v4" />
          <path d="M5 12h4" />
        </svg>
      );
    case "handshake":
      return (
        <svg {...props}>
          <path d="M11 17a4 4 0 0 0 8 0" />
          <path d="M5 17a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4" />
          <path d="M7 7l5 5 5-5" />
        </svg>
      );
    default:
      return (
        <svg {...props} fill={color}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" stroke={color === "currentColor" ? "currentColor" : "#fff"} fill="none" />
        </svg>
      );
  }
};

const LockIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Rank helpers                                                      */
/* ------------------------------------------------------------------ */
function getRankBorderColor(rank: number): string | null {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return null;
}

function getTrophyColor(rank: number): string {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return "transparent";
}

/* ------------------------------------------------------------------ */
/*  Player card & row (unchanged)                                     */
/* ------------------------------------------------------------------ */
const PlayerCard: React.FC<{
  entry: LeaderboardEntry;
  rank: number;
  isCurrentPlayer: boolean;
}> = ({ entry, rank, isCurrentPlayer }) => {
  const tier = getRatingTier(entry.rating);
  const borderColor = getRankBorderColor(rank);
  const initial = entry.username.charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-200"
      style={{
        background: "var(--surface)",
        border: isCurrentPlayer
          ? "1px solid var(--accent)"
          : "1px solid var(--surface-hover)",
        borderLeft: borderColor
          ? `3px solid ${borderColor}`
          : isCurrentPlayer
            ? "3px solid var(--accent)"
            : "1px solid var(--surface-hover)",
      }}
    >
      <div className="flex items-center justify-center shrink-0" style={{ width: 24 }}>
        {rank <= 3 ? (
          <TrophyIcon color={getTrophyColor(rank)} />
        ) : (
          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            {rank}
          </span>
        )}
      </div>
      <div
        className="flex items-center justify-center rounded-full font-bold text-sm shrink-0"
        style={{
          width: 40,
          height: 40,
          background: isCurrentPlayer ? "var(--accent)" : "var(--surface-hover)",
          color: isCurrentPlayer ? "var(--bg)" : "var(--text)",
        }}
      >
        {initial}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: isCurrentPlayer ? "var(--accent)" : "var(--text)" }}
          >
            {entry.username}
          </span>
          {isCurrentPlayer && (
            <span
              className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              YOU
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: tier.color }}>
          {tier.name}
        </span>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm font-bold" style={{ color: tier.color }}>
          {entry.rating}
        </span>
        <div className="flex items-center gap-1 text-[10px]">
          <span style={{ color: "var(--success)" }}>{entry.wins}W</span>
          <span style={{ color: "var(--danger)" }}>{entry.losses}L</span>
          <span style={{ color: "var(--text-muted)" }}>{entry.draws}D</span>
        </div>
      </div>
    </div>
  );
};

const PlayerRow: React.FC<{
  entry: LeaderboardEntry;
  rank: number;
  isCurrentPlayer: boolean;
}> = ({ entry, rank, isCurrentPlayer }) => {
  const tier = getRatingTier(entry.rating);
  const borderColor = getRankBorderColor(rank);

  return (
    <div
      className="grid gap-2 px-4 py-2.5 rounded-lg mb-1 items-center transition-colors duration-200"
      style={{
        gridTemplateColumns: "2.5rem 1fr 5rem 6rem 3rem",
        background: borderColor
          ? `${borderColor}15`
          : isCurrentPlayer
            ? "var(--surface-hover)"
            : "transparent",
        border: isCurrentPlayer
          ? "1px solid var(--accent)"
          : borderColor
            ? `1px solid ${borderColor}22`
            : "1px solid transparent",
      }}
    >
      <div className="flex items-center">
        {rank <= 3 ? (
          <TrophyIcon color={getTrophyColor(rank)} />
        ) : (
          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            {rank}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-sm font-semibold truncate"
          style={{ color: isCurrentPlayer ? "var(--accent)" : "var(--text)" }}
        >
          {entry.username}
        </span>
        {isCurrentPlayer && (
          <span
            className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            YOU
          </span>
        )}
      </div>
      <div className="text-right">
        <span className="text-sm font-bold" style={{ color: tier.color }}>
          {entry.rating}
        </span>
      </div>
      <div className="flex items-center justify-center gap-1 text-xs">
        <span style={{ color: "var(--success)" }}>{entry.wins}</span>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--danger)" }}>{entry.losses}</span>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--text-muted)" }}>{entry.draws}</span>
      </div>
      <div className="text-right">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {entry.gamesPlayed}
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AchievementCard                                                   */
/* ------------------------------------------------------------------ */
const AchievementCard: React.FC<{ achievement: AchievementStatus }> = ({ achievement }) => {
  const { def, unlocked, progress, currentValue } = achievement;
  const goldColor = "#FFD700";

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl transition-colors duration-200"
      style={{
        background: "var(--surface)",
        border: unlocked ? `1px solid ${goldColor}44` : "1px solid var(--surface-hover)",
        opacity: unlocked ? 1 : 0.65,
      }}
    >
      {/* Icon circle */}
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 40,
          height: 40,
          background: unlocked ? `${goldColor}22` : "var(--surface-hover)",
        }}
      >
        <AchievementIcon
          icon={def.icon}
          size={20}
          color={unlocked ? goldColor : "var(--text-muted)"}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: unlocked ? "var(--text)" : "var(--text-muted)" }}
          >
            {def.name}
          </span>
          {unlocked && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0"
              style={{ background: goldColor, color: "#000" }}
            >
              UNLOCKED
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {def.description}
        </span>

        {/* Progress bar for locked achievements with numeric target */}
        {!unlocked && def.target != null && (
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 4, background: "var(--surface-hover)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(progress * 100, 100)}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
              {currentValue}/{def.target}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AchievementsView                                                  */
/* ------------------------------------------------------------------ */
const AchievementsView: React.FC = () => {
  const walletAddress = useGameStore((s) => s.walletAddress);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    getPlayer(walletAddress)
      .then((p: PlayerData) => {
        setStats({
          rating: p.rating,
          wins: p.wins,
          losses: p.losses,
          draws: p.draws,
          gamesPlayed: p.gamesPlayed,
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load player data");
        setLoading(false);
      });
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48">
        <LockIcon />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Connect wallet to view achievements
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--accent)",
                animation: `searching-dots 1.4s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const achievements = computeAchievements(stats);
  const unlocked = countUnlocked(stats);
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked / total) * 100);

  // Group by category
  const grouped = (["wins", "games", "rating", "special"] as AchievementCategory[]).map(
    (cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: achievements.filter((a) => a.def.category === cat),
    }),
  );

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      {/* Summary header */}
      <div
        className="flex items-center justify-between p-4 rounded-xl mb-4"
        style={{ background: "var(--surface)", border: "1px solid var(--surface-hover)" }}
      >
        <div>
          <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {unlocked}
            <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>
              /{total}
            </span>
          </span>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            achievements unlocked
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            {pct}%
          </span>
          <div
            className="rounded-full overflow-hidden"
            style={{ width: 80, height: 6, background: "var(--surface-hover)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      </div>

      {/* Grouped achievement cards */}
      {grouped.map((group) => (
        <div key={group.category} className="mb-5">
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
            style={{ color: "var(--text-muted)" }}
          >
            {group.label}
          </h3>
          <div className="flex flex-col gap-2">
            {group.items.map((a) => (
              <AchievementCard key={a.def.id} achievement={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  LeaderboardScreen                                                 */
/* ------------------------------------------------------------------ */
const LeaderboardScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const player = useGameStore((s) => s.player);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const setLeaderboard = useGameStore((s) => s.setLeaderboard);

  const [activeTab, setActiveTab] = useState<"leaderboard" | "achievements">("leaderboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getAllPlayers()
      .then((players: PlayerData[]) => {
        const sorted = [...players].sort((a, b) => b.rating - a.rating);
        const entries: LeaderboardEntry[] = sorted.map((p) => ({
          username: p.username,
          rating: p.rating,
          wins: p.wins,
          losses: p.losses,
          draws: p.draws,
          gamesPlayed: p.gamesPlayed,
        }));
        setLeaderboard(entries);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch leaderboard");
        setLoading(false);
      });
  }, [setLeaderboard]);

  return (
    <div className="screen animate-fade-in">
      {/* Header */}
      <div className="screen-header">
        <button
          className="p-2 -ml-1 rounded-lg transition-colors duration-200 btn-touch"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setScreen("menu")}
        >
          <BackArrow />
        </button>
        <h2
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
        >
          {activeTab === "leaderboard" ? "Rankings" : "Achievements"}
        </h2>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-0 mx-4 mb-3 rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--surface-hover)" }}
      >
        {(
          [
            { key: "leaderboard", label: "Rankings" },
            { key: "achievements", label: "Achievements" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            className="flex-1 py-2.5 text-sm font-semibold transition-colors duration-200"
            style={{
              color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
              background: activeTab === tab.key ? "var(--surface-hover)" : "transparent",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="screen-body">
        {activeTab === "leaderboard" && (
          <>
            {loading && (
              <div className="flex items-center justify-center h-32">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "var(--accent)",
                        animation: `searching-dots 1.4s ${i * 0.2}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              </div>
            )}

            {!loading && !error && leaderboard.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No rankings available yet
                </p>
              </div>
            )}

            {!loading && !error && leaderboard.length > 0 && (
              <div className="max-w-lg mx-auto animate-slide-up">
                {/* Mobile: card layout (< 640px) */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {leaderboard.map((entry: LeaderboardEntry, i: number) => (
                    <PlayerCard
                      key={entry.username}
                      entry={entry}
                      rank={i + 1}
                      isCurrentPlayer={!!player && player.username === entry.username}
                    />
                  ))}
                </div>

                {/* Desktop: grid table (>= 640px) */}
                <div className="hidden sm:block">
                  <div
                    className="grid gap-2 px-4 py-2 text-xs font-semibold mb-1"
                    style={{
                      gridTemplateColumns: "2.5rem 1fr 5rem 6rem 3rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>#</span>
                    <span>Player</span>
                    <span className="text-right">Rating</span>
                    <span className="text-center">W / L / D</span>
                    <span className="text-right">Games</span>
                  </div>
                  {leaderboard.map((entry: LeaderboardEntry, i: number) => (
                    <PlayerRow
                      key={entry.username}
                      entry={entry}
                      rank={i + 1}
                      isCurrentPlayer={!!player && player.username === entry.username}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "achievements" && <AchievementsView />}
      </div>
    </div>
  );
};

export default LeaderboardScreen;
