import React, { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { getRatingTier, ActiveGameInfo } from "../utils/constants";
import { getSocket } from "../socket";

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */
const BackArrow: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const EyeIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Game card                                                         */
/* ------------------------------------------------------------------ */
const GameCard: React.FC<{
  game: ActiveGameInfo;
  onWatch: () => void;
}> = ({ game, onWatch }) => {
  const redTier = getRatingTier(game.redRating);
  const blackTier = getRatingTier(game.blackRating);

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl transition-colors duration-200"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-hover)",
      }}
    >
      {/* Players row */}
      <div className="flex items-center justify-between gap-2">
        {/* Red player */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: "var(--piece-red)", border: "1.5px solid var(--piece-red-border)" }}
          />
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {game.redPlayer}
          </span>
          <span className="text-xs font-bold shrink-0" style={{ color: redTier.color }}>
            {game.redRating}
          </span>
        </div>

        <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-muted)" }}>
          VS
        </span>

        {/* Black player */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="text-xs font-bold shrink-0" style={{ color: blackTier.color }}>
            {game.blackRating}
          </span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {game.blackPlayer}
          </span>
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: "var(--piece-black)", border: "1.5px solid var(--piece-black-border)" }}
          />
        </div>
      </div>

      {/* Stats + watch row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {game.moveCount} moves
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <EyeIcon />
            {game.spectatorCount}
          </span>
        </div>

        <button
          className="px-4 rounded-lg text-xs font-bold cursor-pointer transition-colors duration-200"
          style={{
            minHeight: 36,
            background: "var(--accent)",
            color: "var(--bg)",
          }}
          onClick={onWatch}
        >
          WATCH
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SpectateListScreen                                                */
/* ------------------------------------------------------------------ */
const SpectateListScreen: React.FC = () => {
  const activeGames = useGameStore((s) => s.activeGames);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSpectating = useGameStore((s) => s.setSpectating);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("get-active-games");
  }, []);

  const handleWatch = (gameId: string) => {
    const socket = getSocket();
    socket.emit("spectate", { gameId });
    setSpectating(true);
    setScreen("spectate");
  };

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
          Live Games
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}
        >
          {activeGames.length}
        </span>
      </div>

      {/* Content */}
      <div className="screen-body">
        {activeGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-muted)", opacity: 0.4 }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15s1.5-2 4-2 4 2 4 2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No active games right now
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Check back later or start a game yourself!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto animate-slide-up">
            {activeGames.map((game) => (
              <GameCard key={game.id} game={game} onWatch={() => handleWatch(game.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpectateListScreen;
