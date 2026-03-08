import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGameStore } from "../store/gameStore";
import { getRatingTier } from "../utils/constants";
import { getSocket } from "../socket";
import { useAccount, useConnect } from "@starknet-react/core";

/* ------------------------------------------------------------------ */
/*  Floating checker SVG — decorative background piece                */
/* ------------------------------------------------------------------ */
const FloatingPiece: React.FC<{
  size: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  opacity: number;
  crowned?: boolean;
}> = ({ size, left, top, delay, duration, opacity, crowned }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className="absolute pointer-events-none"
    style={{
      left,
      top,
      opacity,
      animation: `float ${duration} ease-in-out ${delay} infinite`,
    }}
  >
    <circle
      cx="24"
      cy="24"
      r="22"
      fill="var(--accent)"
      fillOpacity={0.12}
      stroke="var(--accent)"
      strokeWidth="2"
      strokeOpacity={0.25}
    />
    <circle
      cx="24"
      cy="24"
      r="16"
      stroke="var(--accent)"
      strokeWidth="1"
      strokeOpacity={0.15}
      fill="none"
    />
    {crowned && (
      <path
        d="M14 30L16 22L20 25L24 18L28 25L32 22L34 30H14Z"
        fill="var(--accent)"
        fillOpacity={0.3}
      />
    )}
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Decorative mini 4x4 board                                        */
/* ------------------------------------------------------------------ */
const MiniBoard: React.FC = () => {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const dark = (r + c) % 2 !== 0;
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            background: dark ? "var(--board-dark)" : "var(--board-light)",
          }}
        >
          {dark &&
            ((r === 0 && c === 1) ||
              (r === 0 && c === 3) ||
              (r === 3 && c === 0) ||
              (r === 3 && c === 2)) && (
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="rounded-full"
                  style={{
                    width: "60%",
                    height: "60%",
                    background:
                      r === 0 ? "var(--piece-black)" : "var(--piece-red)",
                    border: `1.5px solid ${r === 0 ? "var(--piece-black-border)" : "var(--piece-red-border)"}`,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            )}
        </div>,
      );
    }
  }

  return (
    <div
      className="rounded-lg overflow-hidden mx-auto"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        width: 80,
        height: 80,
        boxShadow: "var(--board-shadow)",
        border: "2px solid var(--surface-hover)",
        animation: "float 5s ease-in-out infinite",
      }}
    >
      {cells}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Gear icon                                                         */
/* ------------------------------------------------------------------ */
const GearIcon: React.FC = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Wallet icon                                                       */
/* ------------------------------------------------------------------ */
const WalletIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Pending action types                                              */
/* ------------------------------------------------------------------ */
type PendingAction =
  | { type: "play-online" }
  | { type: "create-room" }
  | { type: "join-room"; code: string };

/* ------------------------------------------------------------------ */
/*  MainMenu Screen                                                   */
/* ------------------------------------------------------------------ */
const MainMenu: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const setScreen = useGameStore((s) => s.setScreen);
  const setInQueue = useGameStore((s) => s.setInQueue);
  const isInQueue = useGameStore((s) => s.isInQueue);
  const isConnected = useGameStore((s) => s.isConnected);

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomInput, setRoomInput] = useState("");

  const { account } = useAccount();
  const { connect, connectors } = useConnect();

  const pendingAction = useRef<PendingAction | null>(null);

  // Execute a pending action once player is registered
  const executePendingAction = useCallback((action: PendingAction) => {
    const socket = getSocket();
    switch (action.type) {
      case "play-online":
        socket.emit("queue");
        setInQueue(true);
        break;
      case "create-room": {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        socket.emit("create-room", { roomCode: code });
        break;
      }
      case "join-room":
        socket.emit("join-room", { roomCode: action.code });
        break;
    }
  }, [setInQueue]);

  // When player becomes available and there's a pending action, execute it
  useEffect(() => {
    if (player && pendingAction.current) {
      const action = pendingAction.current;
      pendingAction.current = null;
      executePendingAction(action);
    }
  }, [player, executePendingAction]);

  // Require wallet: if connected, run action immediately. Otherwise connect first.
  const requireWallet = useCallback(
    (action: PendingAction) => {
      if (player) {
        executePendingAction(action);
        return;
      }
      // Store action and trigger wallet connect — App.tsx auto-registers on connect
      pendingAction.current = action;
      if (connectors.length > 0) {
        connect({ connector: connectors[0] });
      }
    },
    [player, connectors, connect, executePendingAction],
  );

  const handlePlayOnline = () => requireWallet({ type: "play-online" });
  const handleCreateRoom = () => requireWallet({ type: "create-room" });
  const handleJoinRoom = () => {
    if (!roomInput.trim()) return;
    requireWallet({ type: "join-room", code: roomInput.trim().toUpperCase() });
  };

  const handleSpectate = () => {
    const socket = getSocket();
    socket.emit("get-active-games");
    setScreen("spectate-list");
  };

  const tier = player ? getRatingTier(player.rating) : null;

  /* ---- Shared floating pieces background ---- */
  const floatingPieces = (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <FloatingPiece size={40} left="5%" top="12%" delay="0s" duration="7s" opacity={0.4} crowned />
      <FloatingPiece size={28} left="88%" top="8%" delay="1.2s" duration="8.5s" opacity={0.3} />
      <FloatingPiece size={48} left="78%" top="65%" delay="0.4s" duration="6s" opacity={0.2} crowned />
      <FloatingPiece size={24} left="10%" top="75%" delay="2s" duration="9s" opacity={0.35} />
      <FloatingPiece size={32} left="50%" top="5%" delay="0.8s" duration="7.5s" opacity={0.25} />
      <FloatingPiece size={28} left="30%" top="85%" delay="1.6s" duration="8s" opacity={0.3} crowned />
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Queue searching overlay                                         */
  /* ---------------------------------------------------------------- */
  if (isInQueue && player) {
    return (
      <div
        className="w-full h-full flex items-center justify-center relative animate-fade-in"
        style={{
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        {floatingPieces}

        <div
          className="relative z-10 flex flex-col items-center gap-6 px-6 py-8 rounded-xl max-w-sm w-full mx-4 animate-slide-up"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--surface-hover)",
          }}
        >
          <div
            className="flex items-center gap-1 text-lg font-semibold"
            style={{ color: "var(--text)" }}
          >
            <span>Searching for opponent</span>
            <span className="flex gap-0.5 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "var(--accent)",
                    animation: `searching-dots 1.4s ${i * 0.2}s ease-in-out infinite`,
                  }}
                />
              ))}
            </span>
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {player.username} ({player.rating} ELO)
          </p>

          <button
            className="w-full rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer select-none"
            style={{
              minHeight: 44,
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--surface-hover)",
            }}
            onClick={() => {
              const socket = getSocket();
              socket.emit("cancel-queue");
              setInQueue(false);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main menu — always visible                                      */
  /* ---------------------------------------------------------------- */
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative animate-fade-in"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      {/* Floating checker pieces (background decoration) */}
      {floatingPieces}

      {/* Settings gear — top-right, 40px touch target */}
      <button
        className="absolute top-4 right-4 z-20 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer"
        style={{
          width: 40,
          height: 40,
          color: "var(--text-muted)",
          background: "transparent",
        }}
        onClick={() => setScreen("settings")}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text)";
          e.currentTarget.style.background = "var(--surface)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <GearIcon />
      </button>

      {/* Center content column */}
      <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[300px] px-4">
        {/* Mini decorative board */}
        <MiniBoard />

        {/* Title block */}
        <div className="text-center flex flex-col items-center gap-1 mb-2">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text)",
            }}
          >
            CHECKERS
          </h1>
          <div
            className="rounded-full"
            style={{ width: 40, height: 3, background: "var(--accent)" }}
          />
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Real-time multiplayer
          </p>
        </div>

        {/* Action buttons */}
        <div
          className="flex flex-col gap-3 w-full animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          {/* PLAY ONLINE — primary */}
          <button
            className="w-full rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer select-none"
            style={{
              minHeight: 48,
              background: "var(--accent)",
              color: "var(--bg)",
              boxShadow:
                "0 0 12px var(--accent), 0 4px 12px rgba(0,0,0,0.3)",
            }}
            onClick={handlePlayOnline}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-hover)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            PLAY ONLINE
          </button>

          {/* CREATE ROOM — secondary */}
          <button
            className="w-full rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer select-none"
            style={{
              minHeight: 44,
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--surface-hover)",
            }}
            onClick={handleCreateRoom}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            CREATE ROOM
          </button>

          {/* JOIN ROOM — toggles expanded input */}
          {showJoinInput ? (
            <div className="flex flex-col gap-2 w-full animate-slide-up">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter room code"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                className="w-full rounded-xl px-4 text-center uppercase outline-none transition-all duration-200"
                style={{
                  minHeight: 48,
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--accent)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.2em",
                  fontSize: "1.1rem",
                }}
                autoFocus
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 8px var(--highlight)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    minHeight: 44,
                    background: roomInput.trim() ? "var(--accent)" : "var(--surface-hover)",
                    color: roomInput.trim() ? "var(--bg)" : "var(--text-muted)",
                    opacity: roomInput.trim() ? 1 : 0.6,
                  }}
                  onClick={handleJoinRoom}
                  disabled={!roomInput.trim()}
                >
                  JOIN GAME
                </button>
                <button
                  className="rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer px-5"
                  style={{
                    minHeight: 44,
                    background: "var(--surface)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--surface-hover)",
                  }}
                  onClick={() => {
                    setShowJoinInput(false);
                    setRoomInput("");
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer select-none"
              style={{
                minHeight: 44,
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--surface-hover)",
              }}
              onClick={() => setShowJoinInput(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              JOIN ROOM
            </button>
          )}

          {/* SPECTATE + RANKINGS row */}
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer select-none"
              style={{
                minHeight: 44,
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid transparent",
              }}
              onClick={handleSpectate}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.borderColor = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              SPECTATE
            </button>
            <button
              className="flex-1 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer select-none"
              style={{
                minHeight: 44,
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid transparent",
              }}
              onClick={() => setScreen("leaderboard")}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.borderColor = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              RANKINGS
            </button>
          </div>
        </div>
      </div>

      {/* Player bar — pinned to bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--surface-hover)",
        }}
      >
        {player ? (
          <>
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full font-bold text-sm shrink-0"
              style={{
                width: 40,
                height: 40,
                background: "var(--accent)",
                color: "var(--bg)",
              }}
            >
              {player.username.charAt(0).toUpperCase()}
            </div>

            <div className="flex flex-col">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                {player.username}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-bold"
                  style={{ color: tier!.color }}
                >
                  {tier!.name}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {player.rating} ELO
                </span>
              </div>
            </div>

            {/* Wallet connected indicator */}
            {account && (
              <div className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {account.address.slice(0, 6)}..{account.address.slice(-4)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <WalletIcon />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Connect wallet to play
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainMenu;
