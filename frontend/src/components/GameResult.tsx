import React from "react";
import { GameResult as GameResultType } from "../utils/constants";

interface GameResultProps {
  result: GameResultType;
  eloChanges?: { red: number; black: number };
  onRematch: () => void;
  onBack: () => void;
}

function getResultText(result: GameResultType): string {
  switch (result) {
    case "red_win":
      return "Red Wins!";
    case "black_win":
      return "Black Wins!";
    case "draw":
      return "Draw!";
  }
}

function getResultColor(result: GameResultType): string {
  switch (result) {
    case "red_win":
      return "var(--piece-red)";
    case "black_win":
      return "var(--piece-black)";
    case "draw":
      return "var(--text-muted)";
  }
}

function formatElo(change: number): { text: string; color: string } {
  if (change > 0) return { text: `+${change}`, color: "var(--success)" };
  if (change < 0) return { text: `${change}`, color: "var(--danger)" };
  return { text: "0", color: "var(--text-muted)" };
}

const GameResult: React.FC<GameResultProps> = ({
  result,
  eloChanges,
  onRematch,
  onBack,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="animate-slide-up flex flex-col items-center gap-6 px-10 py-8 rounded-2xl max-w-sm w-full mx-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-hover)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Trophy icon */}
        <div
          className="text-5xl"
          style={{ lineHeight: 1 }}
        >
          {result === "draw" ? (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 12h8M12 8v8"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="10" stroke="var(--text-muted)" strokeWidth="2" />
            </svg>
          ) : (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 3h12v4a6 6 0 01-12 0V3z"
                fill={getResultColor(result)}
                stroke={getResultColor(result)}
                strokeWidth="1.5"
              />
              <path d="M12 13v3M8 19h8M10 16h4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18 3h2a1 1 0 011 1v2a4 4 0 01-4 4h-1" stroke={getResultColor(result)} strokeWidth="1.5" />
              <path d="M6 3H4a1 1 0 00-1 1v2a4 4 0 004 4h1" stroke={getResultColor(result)} strokeWidth="1.5" />
            </svg>
          )}
        </div>

        {/* Result text */}
        <h2
          className="text-2xl font-bold font-display"
          style={{ color: getResultColor(result) }}
        >
          {getResultText(result)}
        </h2>

        {/* ELO changes */}
        {eloChanges && (
          <div
            className="flex gap-6 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs uppercase tracking-wider">Red</span>
              <span
                className="text-lg font-bold"
                style={{ color: formatElo(eloChanges.red).color }}
              >
                {formatElo(eloChanges.red).text}
              </span>
            </div>
            <div
              className="w-px"
              style={{ background: "var(--surface-hover)" }}
            />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs uppercase tracking-wider">Black</span>
              <span
                className="text-lg font-bold"
                style={{ color: formatElo(eloChanges.black).color }}
              >
                {formatElo(eloChanges.black).text}
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col w-full gap-2.5 mt-2">
          <button
            onClick={onRematch}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-hover)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Rematch
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--surface-hover)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-hover)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResult;
