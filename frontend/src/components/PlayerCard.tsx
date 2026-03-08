import React from "react";
import { PieceColor, Player, getRatingTier } from "../utils/constants";
import CapturedPieces from "./CapturedPieces";

interface PlayerCardProps {
  player: { username: string; rating: number };
  color: PieceColor;
  isActive: boolean;
  capturedCount: number;
  isTop: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  color,
  isActive,
  capturedCount,
  isTop,
}) => {
  const tier = getRatingTier(player.rating);
  const initial = player.username.charAt(0).toUpperCase();

  const pieceColor = color === "red" ? "var(--piece-red)" : "var(--piece-black)";
  const borderColor =
    color === "red" ? "var(--piece-red-border)" : "var(--piece-black-border)";

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-xl
        transition-all duration-300
        ${isTop ? "" : ""}
      `}
      style={{
        background: isActive
          ? "var(--surface-hover)"
          : "var(--surface)",
        border: isActive
          ? "1.5px solid var(--accent)"
          : "1.5px solid transparent",
        boxShadow: isActive
          ? "0 0 12px var(--highlight)"
          : "none",
      }}
    >
      {/* Avatar */}
      <div
        className={`
          flex items-center justify-center rounded-full
          text-sm font-bold shrink-0
          ${isActive ? "animate-pulse-glow" : ""}
        `}
        style={{
          width: 40,
          height: 40,
          background: pieceColor,
          border: `2px solid ${borderColor}`,
          color: color === "red" ? "var(--piece-black)" : "var(--piece-red)",
        }}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text)" }}
          >
            {player.username}
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              color: tier.color,
              background: `${tier.color}18`,
              border: `1px solid ${tier.color}33`,
            }}
          >
            {player.rating}
          </span>
        </div>

        {/* Captured pieces */}
        <div className="mt-0.5">
          <CapturedPieces
            color={color === "red" ? "black" : "red"}
            count={capturedCount}
          />
        </div>
      </div>

      {/* Active turn indicator */}
      {isActive && (
        <div
          className="ml-auto shrink-0 rounded-full"
          style={{
            width: 8,
            height: 8,
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
          }}
        />
      )}
    </div>
  );
};

export default PlayerCard;
