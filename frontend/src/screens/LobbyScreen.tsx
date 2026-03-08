import React, { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { getSocket } from "../socket";

/* ------------------------------------------------------------------ */
/*  Room Code Display                                                 */
/* ------------------------------------------------------------------ */
const RoomCodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex items-center gap-2 cursor-pointer transition-all duration-200"
        onClick={handleCopy}
        title="Click to copy"
      >
        {code.split("").map((char, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-lg text-2xl font-bold"
            style={{
              width: 40,
              height: 48,
              fontFamily: "var(--font-mono)",
              color: "var(--accent)",
              background: "var(--bg)",
              border: "2px solid var(--accent)",
            }}
          >
            {char}
          </div>
        ))}
      </div>
      <span className="text-xs" style={{ color: copied ? "var(--accent)" : "var(--text-muted)" }}>
        {copied ? "Copied!" : "Tap code to copy"}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Pulsing dots                                                      */
/* ------------------------------------------------------------------ */
const PulsingDots: React.FC = () => (
  <div className="flex items-center gap-2">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2.5 h-2.5 rounded-full"
        style={{
          background: "var(--accent)",
          animation: `searching-dots 1.4s ${i * 0.3}s ease-in-out infinite`,
        }}
      />
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/*  LobbyScreen                                                       */
/* ------------------------------------------------------------------ */
const LobbyScreen: React.FC = () => {
  const roomCode = useGameStore((s) => s.roomCode);
  const setScreen = useGameStore((s) => s.setScreen);
  const setRoomCode = useGameStore((s) => s.setRoomCode);

  const handleCancel = () => {
    const socket = getSocket();
    socket.emit("leave-room");
    setRoomCode(null);
    setScreen("menu");
  };

  return (
    <div className="screen-center animate-fade-in">
      <div className="card flex flex-col items-center gap-6 animate-slide-up">
        {/* Title */}
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
        >
          Waiting for Opponent
        </h2>

        {/* Room code */}
        {roomCode && <RoomCodeBlock code={roomCode} />}

        {/* Share text */}
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Share this code with a friend
        </p>

        {/* Pulsing dots */}
        <PulsingDots />

        {/* Cancel button */}
        <button
          className="w-full rounded-xl font-semibold text-sm cursor-pointer transition-colors duration-200 btn-touch"
          style={{
            background: "var(--surface-hover)",
            color: "var(--text-muted)",
          }}
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LobbyScreen;
