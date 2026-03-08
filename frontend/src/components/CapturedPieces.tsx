import React from "react";
import { PieceColor } from "../utils/constants";

interface CapturedPiecesProps {
  color: PieceColor;
  count: number;
}

const CapturedPieces: React.FC<CapturedPiecesProps> = ({ color, count }) => {
  if (count === 0) return null;

  const pieceColor = color === "red" ? "var(--piece-red)" : "var(--piece-black)";
  const borderColor = color === "red" ? "var(--piece-red-border)" : "var(--piece-black-border)";
  const display = Math.min(count, 6);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {Array.from({ length: display }, (_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 16,
              height: 16,
              background: pieceColor,
              border: `1.5px solid ${borderColor}`,
              opacity: 0.6 + i * 0.05,
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>
        {count > 0 ? `×${count}` : ""}
      </span>
    </div>
  );
};

export default CapturedPieces;
