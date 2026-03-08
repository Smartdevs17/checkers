import React from "react";

interface SquareProps {
  row: number;
  col: number;
  isPlayable: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  isLastMove: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

const Square: React.FC<SquareProps> = ({
  row,
  col,
  isPlayable,
  isSelected,
  isValidMove,
  isLastMove,
  onClick,
  children,
}) => {
  const isDark = (row + col) % 2 !== 0;

  let background = isDark ? "var(--board-dark)" : "var(--board-light)";
  let boxShadow = isDark
    ? "inset 0 0 6px rgba(0,0,0,0.2)"
    : "inset 0 0 4px rgba(0,0,0,0.06)";

  if (isPlayable && isSelected) {
    background = "var(--selected-piece)";
    boxShadow = "inset 0 0 12px rgba(0,0,0,0.3)";
  } else if (isPlayable && isLastMove) {
    background = "var(--last-move)";
  }

  return (
    <div
      className={`relative flex items-center justify-center aspect-square ${isPlayable ? "cursor-pointer" : ""}`}
      style={{ background, boxShadow }}
      onClick={isPlayable ? onClick : undefined}
    >
      {children}

      {isValidMove && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full"
            style={{
              width: "34%",
              height: "34%",
              minWidth: 8,
              minHeight: 8,
              background: "var(--valid-move)",
              boxShadow: "0 0 8px var(--valid-move), 0 0 2px var(--accent)",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Square;
