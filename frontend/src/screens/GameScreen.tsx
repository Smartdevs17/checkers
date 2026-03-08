import React, { useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { useGameState } from "../hooks/useGameState";
import { getRatingTier, PieceColor } from "../utils/constants";
import { findMove } from "../utils/board";
import Board from "../components/Board";
import CapturedPieces from "../components/CapturedPieces";
import { MoveLogPanel, MoveLogStrip } from "../components/MoveLog";
import { getSocket } from "../socket";
import { gameContractCall, setChainGameId } from "../utils/contractBridge";

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */
const BackIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const MenuIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);

const HandshakeIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Player Strip — compact bar (mobile)                                */
/* ------------------------------------------------------------------ */
const PlayerStrip: React.FC<{
  name: string;
  rating: number;
  color: PieceColor;
  capturedCount: number;
  capturedColor: PieceColor;
  isActive: boolean;
  isYou?: boolean;
  eloChange?: number;
  position: "top" | "bottom";
}> = ({ name, rating, color, capturedCount, capturedColor, isActive, isYou, eloChange, position }) => {
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
      {/* Piece color dot */}
      <div
        className="shrink-0 rounded-full"
        style={{
          width: 20,
          height: 20,
          background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${pieceVar} 70%, white), ${pieceVar})`,
          border: `2px solid ${borderVar}`,
          boxShadow: isActive
            ? `0 0 8px ${pieceVar}, 0 1px 3px rgba(0,0,0,0.3)`
            : "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />

      {/* Name */}
      <span className="text-sm font-semibold truncate" style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}>{name}</span>
      {isYou && (
        <span className="text-[9px] px-1 py-0.5 rounded-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "var(--bg)" }}>YOU</span>
      )}

      {/* Rating */}
      <span className="text-xs font-bold shrink-0" style={{ color: tier.color }}>({rating})</span>
      {eloChange !== undefined && eloChange !== 0 && (
        <span className="text-xs font-bold shrink-0" style={{ color: eloChange > 0 ? "var(--success)" : "var(--danger)" }}>
          {eloChange > 0 ? "+" : ""}{eloChange}
        </span>
      )}

      <div className="flex-1" />

      {/* Captured pieces */}
      <CapturedPieces color={capturedColor} count={capturedCount} />

      {/* Active turn indicator */}
      {isActive && <div className="w-2 h-2 rounded-full shrink-0 animate-pulse-glow" style={{ background: "var(--accent)" }} />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Player Card — vertical card (desktop sidebar)                      */
/* ------------------------------------------------------------------ */
const PlayerCard: React.FC<{
  name: string;
  rating: number;
  color: PieceColor;
  capturedCount: number;
  capturedColor: PieceColor;
  isActive: boolean;
  isYou?: boolean;
  eloChange?: number;
}> = ({ name, rating, color, capturedCount, capturedColor, isActive, isYou, eloChange }) => {
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
        <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{name}</span>
        {isYou && (
          <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0" style={{ background: "var(--accent)", color: "var(--bg)" }}>YOU</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold" style={{ color: tier.color }}>{rating}</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{tier.name}</span>
        {eloChange !== undefined && eloChange !== 0 && (
          <span className="text-xs font-bold" style={{ color: eloChange > 0 ? "var(--success)" : "var(--danger)" }}>
            {eloChange > 0 ? "+" : ""}{eloChange}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <CapturedPieces color={capturedColor} count={capturedCount} />
      </div>

      {isActive && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "var(--accent)" }} />
          <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>Playing</span>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Game Result Overlay                                                */
/* ------------------------------------------------------------------ */
const GameResultOverlay: React.FC<{
  result: string;
  reason?: string;
  myColor: PieceColor | null;
  myEloChange?: number;
  oppEloChange?: number;
  onRematch?: () => void;
  onMenu: () => void;
}> = ({ result, reason, myColor, myEloChange, oppEloChange, onRematch, onMenu }) => {
  let title = "Game Over";
  let subtitle = reason || "";
  let titleColor = "var(--text)";

  if (result === "draw") {
    title = "Draw";
    titleColor = "var(--text-muted)";
  } else if (myColor) {
    const winnerColor = result === "red_win" ? "red" : "black";
    title = winnerColor === myColor ? "Victory!" : "Defeat";
    titleColor = winnerColor === myColor ? "var(--success)" : "var(--danger)";
  } else {
    title = result === "red_win" ? "Red Wins!" : "Black Wins!";
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
        {subtitle && <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
        {(myEloChange !== undefined || oppEloChange !== undefined) && (
          <div className="flex items-center gap-4">
            {myEloChange !== undefined && myEloChange !== 0 && (
              <span className="text-sm font-bold" style={{ color: myEloChange > 0 ? "var(--success)" : "var(--danger)" }}>
                You: {myEloChange > 0 ? "+" : ""}{myEloChange}
              </span>
            )}
            {oppEloChange !== undefined && oppEloChange !== 0 && (
              <span className="text-sm font-bold" style={{ color: oppEloChange > 0 ? "var(--success)" : "var(--danger)" }}>
                Opp: {oppEloChange > 0 ? "+" : ""}{oppEloChange}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 w-full mt-2">
          {onRematch && (
            <button className="w-full rounded-xl font-semibold text-sm cursor-pointer" style={{ minHeight: 44, background: "var(--accent)", color: "var(--bg)" }} onClick={onRematch}>
              REMATCH
            </button>
          )}
          <button className="w-full rounded-xl font-semibold text-sm cursor-pointer" style={{ minHeight: 44, background: "var(--surface-hover)", color: "var(--text)" }} onClick={onMenu}>
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  GameScreen                                                         */
/* ------------------------------------------------------------------ */
const GameScreen: React.FC = () => {
  const {
    board, currentTurn, status, capturedRed, capturedBlack,
    isMyTurn, isOnline, myColor, game,
  } = useGameState();

  const selectedSquare = useGameStore((s) => s.selectedSquare);
  const validMoves = useGameStore((s) => s.validMoves);
  const lastMove = game ? game.lastMove || null : null;
  const selectSquare = useGameStore((s) => s.selectSquare);
  const setScreen = useGameStore((s) => s.setScreen);
  const setGame = useGameStore((s) => s.setGame);
  const setOnline = useGameStore((s) => s.setOnline);
  const resetSelection = useGameStore((s) => s.resetSelection);
  const moveLog = useGameStore((s) => s.moveLog);
  const setOnChainGameId = useGameStore((s) => s.setOnChainGameId);

  const [showControls, setShowControls] = React.useState(false);
  const [resignConfirm, setResignConfirm] = React.useState(false);
  const [drawConfirmState, setDrawConfirmState] = React.useState<"idle" | "confirming" | "pending">("idle");

  // Reset drawConfirmState when draw offer is declined (drawOffer becomes falsy)
  React.useEffect(() => {
    if (!game?.drawOffer && drawConfirmState === "pending") {
      setDrawConfirmState("idle");
    }
  }, [game?.drawOffer, drawConfirmState]);

  const closeDropdown = () => {
    setShowControls(false);
    setResignConfirm(false);
    setDrawConfirmState((prev) => (prev === "pending" ? prev : "idle"));
  };

  const handleSquareClick = useCallback(
    (index: number) => {
      if (selectedSquare !== null && validMoves.includes(index)) {
        const move = findMove(board, selectedSquare, index, currentTurn);
        if (move && game) {
          // 1. Fire contract call (queued if on-chain ID not ready yet)
          gameContractCall("makeMove", move.from, move.to);
          // 2. Emit socket for real-time relay to opponent
          const socket = getSocket();
          socket.emit("move", { gameId: game.id, from: move.from, to: move.to });
          resetSelection();
          return;
        }
      }
      selectSquare(index);
    },
    [selectedSquare, validMoves, board, currentTurn, game, selectSquare, resetSelection],
  );

  const handleResign = () => {
    if (game) {
      gameContractCall("resign");
      const socket = getSocket();
      socket.emit("resign", { gameId: game.id });
    }
    closeDropdown();
  };
  const handleOfferDraw = () => {
    if (game) {
      gameContractCall("offerDraw");
      const socket = getSocket();
      socket.emit("offer-draw", { gameId: game.id });
    }
    setDrawConfirmState("pending");
    setShowControls(false);
  };
  const handleAcceptDraw = () => {
    if (game) {
      gameContractCall("acceptDraw");
      const socket = getSocket();
      socket.emit("accept-draw", { gameId: game.id });
    }
  };
  const handleDeclineDraw = () => {
    if (game) {
      gameContractCall("declineDraw");
      const socket = getSocket();
      socket.emit("decline-draw", { gameId: game.id });
    }
  };
  const handleBackToMenu = () => {
    setGame(null); setOnline(false); setOnChainGameId(null); setChainGameId(null); resetSelection(); setScreen("menu");
  };

  /* ---- Player info ---- */
  const topName = game
    ? (myColor === "red" ? game.blackPlayer?.username : game.redPlayer?.username) || "Opponent"
    : "Opponent";
  const topRating = game
    ? (myColor === "red" ? game.blackPlayer?.rating : game.redPlayer?.rating) || 1200
    : 1200;
  const bottomName = game
    ? (myColor === "red" ? game.redPlayer?.username : game.blackPlayer?.username) || "You"
    : "You";
  const bottomRating = game
    ? (myColor === "red" ? game.redPlayer?.rating : game.blackPlayer?.rating) || 1200
    : 1200;

  const topColor: PieceColor = myColor === "red" ? "black" : "red";
  const bottomColor: PieceColor = myColor || "red";
  const topCapturedCount = topColor === "red" ? capturedRed : capturedBlack;
  const bottomCapturedCount = bottomColor === "red" ? capturedRed : capturedBlack;

  const myEloChange = game?.eloChanges ? (myColor === "red" ? game.eloChanges.red : game.eloChanges.black) : undefined;
  const oppEloChange = game?.eloChanges ? (myColor === "red" ? game.eloChanges.black : game.eloChanges.red) : undefined;
  const drawOfferedByOpponent = game?.drawOffer && game.drawOffer !== myColor;
  const isFinished = status === "finished";

  return (
    <div className="w-full h-full flex flex-col relative animate-fade-in">
      {/* ---- Header ---- */}
      <div
        className="flex items-center px-2 shrink-0 lg:px-3"
        style={{ height: 40, background: "var(--surface)", borderBottom: "1px solid var(--surface-hover)" }}
      >
        <button
          className="p-1.5 rounded-md cursor-pointer transition-colors duration-150"
          style={{ color: "var(--text-muted)" }}
          onClick={handleBackToMenu}
        >
          <BackIcon />
        </button>
        <div className="flex items-center gap-2 ml-1.5">
          {!isFinished && (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: currentTurn === "red" ? "var(--piece-red)" : "var(--piece-black)",
                boxShadow: `0 0 6px ${currentTurn === "red" ? "var(--piece-red)" : "var(--piece-black)"}`,
              }}
            />
          )}
          <span className="text-xs font-semibold" style={{ color: isFinished ? "var(--text-muted)" : "var(--text)" }}>
            {isFinished ? "Game Over" : isMyTurn ? "Your turn" : "Waiting..."}
          </span>
        </div>
        <div className="flex-1" />
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          Online
        </span>
        {status === "playing" && (
          <button
            className="p-1.5 ml-1 rounded-md cursor-pointer"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setShowControls(!showControls)}
          >
            <MenuIcon />
          </button>
        )}
      </div>

      {/* Dropdown click-outside backdrop */}
      {showControls && (
        <div className="fixed inset-0 z-30" onClick={closeDropdown} />
      )}

      {/* Dropdown controls */}
      {showControls && status === "playing" && (
        <div
          className="absolute top-9 right-2 z-40 flex flex-col gap-1 p-2 rounded-lg animate-slide-up"
          style={{ background: "var(--surface)", border: "1px solid var(--surface-hover)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
        >
          {resignConfirm ? (
            <div className="flex flex-col gap-1 px-2 py-1">
              <span className="text-xs font-semibold" style={{ color: "var(--danger)" }}>Are you sure?</span>
              <div className="flex gap-2 mt-1">
                <button className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer" style={{ background: "var(--danger)", color: "white" }} onClick={handleResign}>Yes</button>
                <button className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer" style={{ background: "var(--surface-hover)", color: "var(--text)" }} onClick={() => setResignConfirm(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="px-4 py-2 rounded-md text-xs font-semibold text-left cursor-pointer" style={{ color: "var(--danger)" }} onClick={() => setResignConfirm(true)}>Resign</button>
          )}

          {drawConfirmState === "confirming" ? (
            <div className="flex flex-col gap-1 px-2 py-1">
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Offer a draw?</span>
              <div className="flex gap-2 mt-1">
                <button className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer" style={{ background: "var(--accent)", color: "var(--bg)" }} onClick={handleOfferDraw}>Yes</button>
                <button className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer" style={{ background: "var(--surface-hover)", color: "var(--text)" }} onClick={() => setDrawConfirmState("idle")}>No</button>
              </div>
            </div>
          ) : (
            <button
              className="px-4 py-2 rounded-md text-xs font-semibold text-left cursor-pointer"
              style={{ color: "var(--text-muted)", opacity: game?.drawOffer || drawConfirmState === "pending" ? 0.4 : 1 }}
              onClick={() => setDrawConfirmState("confirming")}
              disabled={!!game?.drawOffer || drawConfirmState === "pending"}
            >
              Offer Draw
            </button>
          )}
        </div>
      )}

      {/* Pending draw offer bar */}
      {drawConfirmState === "pending" && game?.drawOffer === myColor && status === "playing" && (
        <div className="flex items-center gap-2 px-3 shrink-0 animate-slide-up" style={{ background: "var(--surface)", borderBottom: "1px solid var(--surface-hover)", height: 36 }}>
          <div className="w-2 h-2 rounded-full shrink-0 animate-pulse-glow" style={{ background: "var(--accent)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Draw offer sent — waiting for response...</span>
        </div>
      )}

      {/* Incoming draw offer bar */}
      {drawOfferedByOpponent && status === "playing" && (
        <div
          className="flex items-center gap-3 px-3 shrink-0 animate-slide-up"
          style={{
            background: "var(--surface)",
            borderBottom: "2px solid var(--accent)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            height: 52,
          }}
        >
          <span style={{ color: "var(--accent)" }}><HandshakeIcon /></span>
          <span className="text-xs font-semibold flex-1" style={{ color: "var(--text)" }}>Your opponent is offering a draw</span>
          <button
            className="flex items-center gap-1.5 px-4 rounded-lg text-xs font-bold cursor-pointer"
            style={{ background: "var(--success)", color: "white", height: 36 }}
            onClick={handleAcceptDraw}
          >
            <CheckIcon />
            Accept
          </button>
          <button
            className="flex items-center gap-1.5 px-4 rounded-lg text-xs font-bold cursor-pointer"
            style={{ background: "var(--danger)", color: "white", height: 36 }}
            onClick={handleDeclineDraw}
          >
            <XIcon />
            Decline
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/*  GAME AREA — responsive layout                                   */}
      {/*  Mobile: vertical stack, board fills width                       */}
      {/*  Desktop (lg+): [players | board | move log]                     */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center overflow-hidden">

        {/* LEFT: Desktop player cards */}
        <div
          className="hidden lg:flex flex-col gap-3 justify-center px-3 shrink-0 self-stretch"
          style={{ width: 180 }}
        >
          <PlayerCard
            name={topName} rating={topRating} color={topColor}
            capturedCount={topCapturedCount} capturedColor={topColor}
            isActive={currentTurn === topColor && !isFinished}
            eloChange={oppEloChange}
          />
          <div style={{ height: 1, background: "var(--surface-hover)" }} />
          <PlayerCard
            name={bottomName} rating={bottomRating} color={bottomColor}
            capturedCount={bottomCapturedCount} capturedColor={bottomColor}
            isActive={currentTurn === bottomColor && !isFinished}
            isYou
            eloChange={myEloChange}
          />
        </div>

        {/* CENTER: Board + mobile strips — no gaps, strips glued to board */}
        <div className="flex flex-col items-center justify-center flex-1 w-full lg:w-auto overflow-hidden">
          {/* Mobile top strip */}
          <div className="lg:hidden w-full">
            <PlayerStrip
              name={topName} rating={topRating} color={topColor}
              capturedCount={topCapturedCount} capturedColor={topColor}
              isActive={currentTurn === topColor && !isFinished}
              eloChange={oppEloChange}
              position="top"
            />
          </div>

          {/* Board — full width on mobile, constrained on desktop */}
          <div className="board-container">
            <Board
              board={board}
              currentTurn={currentTurn}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              lastMove={lastMove}
              onSquareClick={handleSquareClick}
            />
          </div>

          {/* Mobile bottom strip */}
          <div className="lg:hidden w-full">
            <PlayerStrip
              name={bottomName} rating={bottomRating} color={bottomColor}
              capturedCount={bottomCapturedCount} capturedColor={bottomColor}
              isActive={currentTurn === bottomColor && !isFinished}
              isYou
              eloChange={myEloChange}
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
      {isFinished && game?.result && (
        <GameResultOverlay
          result={game.result} reason={game.resultReason} myColor={myColor}
          myEloChange={myEloChange} oppEloChange={oppEloChange}
          onMenu={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default GameScreen;
