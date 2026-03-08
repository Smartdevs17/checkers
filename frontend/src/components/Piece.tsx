import React from "react";
import { PieceType } from "../utils/constants";
import { isKing, getPieceColor } from "../utils/board";

interface PieceProps {
  type: PieceType;
  isSelected: boolean;
}

const CrownSvg: React.FC<{ color: string }> = ({ color }) => (
  <svg
    className="animate-crown"
    width="55%"
    height="55%"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M3 18L5 8L9 12L12 4L15 12L19 8L21 18H3Z"
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const Piece: React.FC<PieceProps> = ({ type, isSelected }) => {
  if (type === PieceType.EMPTY) return null;

  const color = getPieceColor(type);
  const king = isKing(type);
  const isRed = color === "red";
  const pieceColor = isRed ? "var(--piece-red)" : "var(--piece-black)";
  const borderColor = isRed ? "var(--piece-red-border)" : "var(--piece-black-border)";
  const cssClass = isRed ? "piece-red" : "piece-black";

  return (
    <div
      className={`piece-enter relative flex items-center justify-center rounded-full ${cssClass} ${isSelected ? "animate-pop" : ""}`}
      style={{
        width: "82%",
        height: "82%",
        background: `radial-gradient(circle at 35% 35%, ${lighten(pieceColor)}, ${pieceColor} 60%, ${darken(pieceColor)})`,
        border: `2px solid ${borderColor}`,
        boxShadow: isSelected
          ? "0 0 16px var(--selected-piece), 0 4px 8px rgba(0,0,0,0.4)"
          : "0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.15)",
        transform: isSelected ? "scale(1.08)" : "scale(1)",
        zIndex: isSelected ? 10 : 1,
      }}
    >
      {/* Inner highlight ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: "12%",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      />

      {/* Glossy reflection */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "55%",
          height: "28%",
          top: "12%",
          left: "18%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
          borderRadius: "50%",
        }}
      />

      {king && <CrownSvg color="var(--king-accent)" />}
    </div>
  );
};

function lighten(cssVar: string): string {
  return `color-mix(in srgb, ${cssVar} 70%, white)`;
}

function darken(cssVar: string): string {
  return `color-mix(in srgb, ${cssVar} 70%, black)`;
}

export default Piece;
