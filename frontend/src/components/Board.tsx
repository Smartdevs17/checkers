import React from "react";
import { PieceType, PieceColor } from "../utils/constants";
import { rowColToIndex } from "../utils/board";
import Square from "./Square";
import Piece from "./Piece";

interface BoardProps {
  board: number[];
  currentTurn: PieceColor;
  selectedSquare: number | null;
  validMoves: number[];
  lastMove: { from: number; to: number } | null;
  onSquareClick: (index: number) => void;
}

const Board: React.FC<BoardProps> = ({
  board,
  selectedSquare,
  validMoves,
  lastMove,
  onSquareClick,
}) => {
  const rows = Array.from({ length: 8 }, (_, r) => r);
  const cols = Array.from({ length: 8 }, (_, c) => c);

  return (
    /* Outer frame — edge-to-edge on mobile, subtle border on desktop */
    <div
      className="w-full aspect-square select-none lg:rounded-md"
      style={{
        padding: 2,
        background: "linear-gradient(145deg, color-mix(in srgb, var(--board-dark) 35%, black), color-mix(in srgb, var(--board-dark) 55%, black))",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Inner grid */}
      <div
        className="w-full h-full overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.2)",
        }}
      >
        {rows.map((row) =>
          cols.map((col) => {
            const index = rowColToIndex(row, col);
            const isPlayable = index !== -1;
            const piece = isPlayable ? (board[index] as PieceType) : PieceType.EMPTY;
            const hasPiece = isPlayable && piece !== PieceType.EMPTY;

            const isSelected = isPlayable && selectedSquare === index;
            const isValidMove = isPlayable && validMoves.includes(index);
            const isLastMove =
              isPlayable &&
              lastMove !== null &&
              (lastMove.from === index || lastMove.to === index);

            return (
              <Square
                key={`${row}-${col}`}
                row={row}
                col={col}
                isPlayable={isPlayable}
                isSelected={isSelected}
                isValidMove={isValidMove && !hasPiece}
                isLastMove={isLastMove}
                onClick={() => {
                  if (isPlayable) onSquareClick(index);
                }}
              >
                {hasPiece && <Piece type={piece} isSelected={isSelected} />}
              </Square>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Board;
