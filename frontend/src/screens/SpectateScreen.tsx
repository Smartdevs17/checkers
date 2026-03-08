import React from "react";
import { useGameStore } from "../store/gameStore";
import { getRatingTier, PieceColor } from "../utils/constants";
import Board from "../components/Board";
import CapturedPieces from "../components/CapturedPieces";
import { MoveLogPanel, MoveLogStrip } from "../components/MoveLog";
import { getSocket } from "../socket";

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */
const BackIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const EyeIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Compact Player Strip (mobile)                                     */
/* ------------------------------------------------------------------ */
const PlayerStrip: React.FC<{
  username: string;
  rating: number;
  color: PieceColor;
  capturedCount: number;
  capturedColor: PieceColor;
  isActive: boolean;
  wins?: number;
  losses?: number;
  draws?: number;
  position: "top" | "bottom";
}> = ({ username, rating, color, capturedCount, capturedColor, isActive, wins, losses, draws, position }) => {
  const tier = getRatingTier(rating);
  const pieceVar = color === "red" ? "var(--piece-red)" : "var(--piece-black)";
  const borderVar = color === "red" ? "var(--piece-red-border)" : "var(--piece-black-border)";

  return (
    <div
      className="flex items-center gap-2.5 px-3 w-full transition-all duration-200"
      style={{
        background: isActive ? "var(--surface-hover)" : "var(--surface)",
        height: 40,
        borderBottom: position === "top" ? "1px solid var(--surface-hover)" : "none",
        borderTop: position === "bottom" ? "1px solid var(--surface-hover)" : "none",
      }}
    >
      <div
        className="shrink-0 rounded-full"
        style={{
          width: 16,
          height: 16,
          background: pieceVar,
          border: `2px solid ${borderVar}`,
          boxShadow: isActive ? `0 0 8px ${pieceVar}` : "none",
        }}
      />
      <span className="text-sm font-semibold truncate" style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}>
        {username}
      </span>
      <span className="text-xs font-bold shrink-0" style={{ color: tier.color }}>
        {rating}
      </span>
      {wins !== undefined && (
        <span className="text-[9px] shrink-0" style={{ color: "var(--text-muted)" }}>
          {wins}W {losses}L {draws}D
        </span>
      )}
      <div className="flex-1" />
      <CapturedPieces color={capturedColor} count={capturedCount} />
      {isActive && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full shrink-0 animate-pulse-glow" style={{ background: "var(--accent)" }} />
          <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>Thinking...</span>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SpectatePlayerCard (desktop sidebar)                               */
/* ------------------------------------------------------------------ */
const SpectatePlayerCard: React.FC<{
  username: string;
  rating: number;
  color: PieceColor;
  capturedCount: number;
  capturedColor: PieceColor;
  isActive: boolean;
  wins?: number;
  losses?: number;
  draws?: number;
}> = ({ username, rating, color, capturedCount, capturedColor, isActive, wins, losses, draws }) => {
  const tier = getRatingTier(rating);
  const pieceVar = color === "red" ? "var(--piece-red)" : "var(--piece-black)";
  const borderVar = color === "red" ? "var(--piece-red-border)" : "var(--piece-black-border)";

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg transition-all duration-300"
      style={{
        background: isActive ? "var(--surface-hover)" : "var(--surface)",
        border: isActive ? "1px solid var(--accent)" : "1px solid var(--surface-hover)",
        boxShadow: isActive ? "0 0 12px var(--highlight)" : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="shrink-0 rounded-full"
          style={{ width: 18, height: 18, background: pieceVar, border: `2px solid ${borderVar}`, boxShadow: isActive ? `0 0 8px ${pieceVar}` : "none" }}
        />
        <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{username}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold" style={{ color: tier.color }}>{rating}</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tier.name}</span>
      </div>

      {wins !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold" style={{ color: "var(--success)" }}>{wins}W</span>
          <span className="text-[10px] font-semibold" style={{ color: "var(--danger)" }}>{losses}L</span>
          <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{draws}D</span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <CapturedPieces color={capturedColor} count={capturedCount} />
      </div>

      {isActive && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent)" }} />
          <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>Thinking...</span>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SpectateResultOverlay                                              */
/* ------------------------------------------------------------------ */
const SpectateResultOverlay: React.FC<{
  result: string;
  reason?: string;
  redName: string;
  blackName: string;
  eloChanges?: { red: number; black: number };
  onBack: () => void;
}> = ({ result, reason, redName, blackName, eloChanges, onBack }) => {
  let title = "Game Over";
  let titleColor = "var(--text)";

  if (result === "draw") {
    title = "Draw";
    titleColor = "var(--text-muted)";
  } else if (result === "red_win") {
    title = `${redName} wins!`;
    titleColor = "var(--piece-red)";
  } else {
    title = `${blackName} wins!`;
    titleColor = "var(--piece-black)";
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="flex flex-col items-center gap-4 p-6 rounded-2xl animate-slide-up max-w-xs w-full mx-4"
        style={{ background: "var(--surface)", border: "1px solid var(--surface-hover)" }}
      >
        <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: titleColor }}>{title}</h2>
        {reason && <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{reason}</p>}

        {eloChanges && (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{redName}</span>
              <span className="text-sm font-bold" style={{ color: eloChanges.red > 0 ? "var(--success)" : eloChanges.red < 0 ? "var(--danger)" : "var(--text-muted)" }}>
                {eloChanges.red > 0 ? "+" : ""}{eloChanges.red}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{blackName}</span>
              <span className="text-sm font-bold" style={{ color: eloChanges.black > 0 ? "var(--success)" : eloChanges.black < 0 ? "var(--danger)" : "var(--text-muted)" }}>
                {eloChanges.black > 0 ? "+" : ""}{eloChanges.black}
              </span>
            </div>
          </div>
        )}

        <button
          className="w-full rounded-xl font-semibold text-sm cursor-pointer mt-2"
          style={{ minHeight: 44, background: "var(--surface-hover)", color: "var(--text)" }}
          onClick={onBack}
        >
          BACK TO GAMES
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SpectateScreen                                                    */
/* ------------------------------------------------------------------ */
const SpectateScreen: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSpectating = useGameStore((s) => s.setSpectating);
  const setGame = useGameStore((s) => s.setGame);
  const moveLog = useGameStore((s) => s.moveLog);
  const clearMoveLog = useGameStore((s) => s.clearMoveLog);

  // Clear move log when entering spectate
  React.useEffect(() => {
    clearMoveLog();
  }, []);

  const handleLeave = () => {
    const socket = getSocket();
    if (game) socket.emit("stop-spectate", { gameId: game.id });
    clearMoveLog();
    setSpectating(false);
    setGame(null);
    setScreen("spectate-list");
  };

  if (!game) {
    return (
      <div className="screen-center animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <p style={{ color: "var(--text-muted)" }}>Game not found</p>
          <button
            className="px-4 rounded-xl text-sm font-semibold cursor-pointer btn-touch"
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--surface-hover)" }}
            onClick={() => { setSpectating(false); setScreen("spectate-list"); }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const board = game.board;
  const currentTurn = game.currentTurn;
  const lastMove = game.lastMove || null;
  const redName = game.redPlayer?.username || "Red";
  const redRating = game.redPlayer?.rating || 1200;
  const blackName = game.blackPlayer?.username || "Black";
  const blackRating = game.blackPlayer?.rating || 1200;
  const isFinished = game.status === "finished";

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in">
      {/* Thin header */}
      <div
        className="flex items-center px-2 shrink-0 lg:px-3"
        style={{ height: 36, background: "var(--surface)", borderBottom: "1px solid var(--surface-hover)" }}
      >
        <button
          className="p-1.5 rounded-md cursor-pointer transition-colors duration-150"
          style={{ color: "var(--text-muted)" }}
          onClick={handleLeave}
        >
          <BackIcon />
        </button>

        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-2"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          SPECTATING
        </span>

        {isFinished && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-1"
            style={{ background: "var(--surface-hover)", color: "var(--text-muted)" }}
          >
            ENDED
          </span>
        )}

        <div className="flex-1" />

        {/* Spectator count */}
        <div className="flex items-center gap-1 mr-2" style={{ color: "var(--text-muted)" }}>
          <EyeIcon />
          <span className="text-[10px] font-bold">{game.spectators.length}</span>
        </div>

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Move {game.moveCount}
        </span>
      </div>

      {/* ================================================================ */}
      {/*  GAME AREA — responsive layout                                   */}
      {/*  Mobile: vertical stack                                          */}
      {/*  Desktop (lg+): [players | board | move log]                     */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center overflow-hidden">

        {/* LEFT: Desktop player cards */}
        <div
          className="hidden lg:flex flex-col gap-3 justify-center px-3 shrink-0 self-stretch"
          style={{ width: 180 }}
        >
          <SpectatePlayerCard
            username={blackName}
            rating={blackRating}
            color="black"
            capturedCount={game.capturedBlack}
            capturedColor="black"
            isActive={currentTurn === "black" && !isFinished}
            wins={game.blackPlayer?.wins}
            losses={game.blackPlayer?.losses}
            draws={game.blackPlayer?.draws}
          />
          <div style={{ height: 1, background: "var(--surface-hover)" }} />
          <SpectatePlayerCard
            username={redName}
            rating={redRating}
            color="red"
            capturedCount={game.capturedRed}
            capturedColor="red"
            isActive={currentTurn === "red" && !isFinished}
            wins={game.redPlayer?.wins}
            losses={game.redPlayer?.losses}
            draws={game.redPlayer?.draws}
          />
        </div>

        {/* CENTER: Board + mobile strips */}
        <div className="flex flex-col items-center justify-center flex-1 w-full lg:w-auto overflow-hidden">
          {/* Mobile top strip */}
          <div className="lg:hidden w-full">
            <PlayerStrip
              username={blackName}
              rating={blackRating}
              color="black"
              capturedCount={game.capturedBlack}
              capturedColor="black"
              isActive={currentTurn === "black" && !isFinished}
              wins={game.blackPlayer?.wins}
              losses={game.blackPlayer?.losses}
              draws={game.blackPlayer?.draws}
              position="top"
            />
          </div>

          {/* Board */}
          <div className="board-container">
            <Board
              board={board}
              currentTurn={currentTurn}
              selectedSquare={null}
              validMoves={[]}
              lastMove={lastMove}
              onSquareClick={() => {}}
            />
          </div>

          {/* Mobile bottom strip */}
          <div className="lg:hidden w-full">
            <PlayerStrip
              username={redName}
              rating={redRating}
              color="red"
              capturedCount={game.capturedRed}
              capturedColor="red"
              isActive={currentTurn === "red" && !isFinished}
              wins={game.redPlayer?.wins}
              losses={game.redPlayer?.losses}
              draws={game.redPlayer?.draws}
              position="bottom"
            />
          </div>
        </div>

        {/* RIGHT: Desktop move log */}
        <div
          className="hidden lg:flex flex-col shrink-0 self-stretch"
          style={{
            width: 200,
            background: "var(--surface)",
            borderLeft: "1px solid var(--surface-hover)",
          }}
        >
          <MoveLogPanel entries={moveLog} />
        </div>
      </div>

      {/* Mobile move log strip (bottom) */}
      <div className="lg:hidden">
        <MoveLogStrip entries={moveLog} />
      </div>

      {/* ---- Result overlay ---- */}
      {isFinished && game.result && (
        <SpectateResultOverlay
          result={game.result}
          reason={game.resultReason}
          redName={redName}
          blackName={blackName}
          eloChanges={game.eloChanges}
          onBack={handleLeave}
        />
      )}
    </div>
  );
};

export default SpectateScreen;
