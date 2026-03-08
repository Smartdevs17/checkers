import { PieceType, Position, BOARD_SIZE } from "../types.js";

export function indexToRowCol(index: number): Position {
  const row = Math.floor(index / 4);
  const col = (index % 4) * 2 + (row % 2 === 0 ? 1 : 0);
  return { row, col };
}

export function rowColToIndex(row: number, col: number): number {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return -1;
  if (row % 2 === 0 && col % 2 === 0) return -1;
  if (row % 2 === 1 && col % 2 === 1) return -1;
  return row * 4 + Math.floor(col / 2);
}

export function createInitialBoard(): number[] {
  const board = new Array(32).fill(PieceType.EMPTY);
  for (let i = 0; i < 12; i++) board[i] = PieceType.BLACK;
  for (let i = 20; i < 32; i++) board[i] = PieceType.RED;
  return board;
}

export function getPieceColor(piece: number): "red" | "black" | null {
  if (piece === PieceType.RED || piece === PieceType.RED_KING) return "red";
  if (piece === PieceType.BLACK || piece === PieceType.BLACK_KING) return "black";
  return null;
}

export function isKing(piece: number): boolean {
  return piece === PieceType.RED_KING || piece === PieceType.BLACK_KING;
}

export function isOwnPiece(piece: number, color: "red" | "black"): boolean {
  if (color === "red") return piece === PieceType.RED || piece === PieceType.RED_KING;
  return piece === PieceType.BLACK || piece === PieceType.BLACK_KING;
}

export function isOpponentPiece(piece: number, color: "red" | "black"): boolean {
  if (color === "red") return piece === PieceType.BLACK || piece === PieceType.BLACK_KING;
  return piece === PieceType.RED || piece === PieceType.RED_KING;
}

export function getCaptureMoves(
  board: number[],
  index: number
): { to: number; captured: number }[] {
  const piece = board[index];
  if (piece === PieceType.EMPTY) return [];
  const color = getPieceColor(piece)!;
  const { row, col } = indexToRowCol(index);
  const captures: { to: number; captured: number }[] = [];

  const dirs: { dr: number; dc: number }[] = [];
  if (color === "red" || isKing(piece)) dirs.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 });
  if (color === "black" || isKing(piece)) dirs.push({ dr: 1, dc: -1 }, { dr: 1, dc: 1 });

  for (const { dr, dc } of dirs) {
    const midR = row + dr, midC = col + dc;
    const midI = rowColToIndex(midR, midC);
    if (midI === -1) continue;
    const landR = row + dr * 2, landC = col + dc * 2;
    const landI = rowColToIndex(landR, landC);
    if (landI === -1) continue;
    if (isOpponentPiece(board[midI], color) && board[landI] === PieceType.EMPTY) {
      captures.push({ to: landI, captured: midI });
    }
  }
  return captures;
}

export function getSimpleMoves(board: number[], index: number): number[] {
  const piece = board[index];
  if (piece === PieceType.EMPTY) return [];
  const color = getPieceColor(piece)!;
  const { row, col } = indexToRowCol(index);
  const moves: number[] = [];

  const dirs: { dr: number; dc: number }[] = [];
  if (color === "red" || isKing(piece)) dirs.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 });
  if (color === "black" || isKing(piece)) dirs.push({ dr: 1, dc: -1 }, { dr: 1, dc: 1 });

  for (const { dr, dc } of dirs) {
    const nr = row + dr, nc = col + dc;
    const ni = rowColToIndex(nr, nc);
    if (ni !== -1 && board[ni] === PieceType.EMPTY) moves.push(ni);
  }
  return moves;
}

// WCDF rule: if a man reaches king row during a multi-jump, the turn ends
// (promotion stops the chain — the piece becomes a king but cannot continue jumping)
export function getCaptureChains(
  board: number[],
  index: number,
  alreadyCaptured: number[] = []
): { path: number[]; captured: number[] }[] {
  const captures = getCaptureMoves(board, index).filter(
    (c) => !alreadyCaptured.includes(c.captured)
  );

  if (captures.length === 0) {
    if (alreadyCaptured.length > 0) return [{ path: [index], captured: [...alreadyCaptured] }];
    return [];
  }

  const piece = board[index];
  const chains: { path: number[]; captured: number[] }[] = [];
  for (const cap of captures) {
    const newCaptured = [...alreadyCaptured, cap.captured];

    // If this man would be promoted on landing, the chain must stop here
    if (shouldPromote(piece, cap.to)) {
      chains.push({ path: [index, cap.to], captured: newCaptured });
      continue;
    }

    const newBoard = [...board];
    newBoard[cap.to] = newBoard[index];
    newBoard[index] = PieceType.EMPTY;
    newBoard[cap.captured] = PieceType.EMPTY;

    const subChains = getCaptureChains(newBoard, cap.to, newCaptured);
    if (subChains.length === 0) {
      chains.push({ path: [index, cap.to], captured: newCaptured });
    } else {
      for (const sub of subChains) {
        chains.push({ path: [index, ...sub.path], captured: sub.captured });
      }
    }
  }
  return chains;
}

export function hasAnyCapture(board: number[], color: "red" | "black"): boolean {
  for (let i = 0; i < 32; i++) {
    if (isOwnPiece(board[i], color) && getCaptureMoves(board, i).length > 0) return true;
  }
  return false;
}

export function hasValidMoves(board: number[], color: "red" | "black"): boolean {
  for (let i = 0; i < 32; i++) {
    if (!isOwnPiece(board[i], color)) continue;
    if (getSimpleMoves(board, i).length > 0) return true;
    if (getCaptureChains(board, i).length > 0) return true;
  }
  return false;
}

export function shouldPromote(piece: number, toIndex: number): boolean {
  if (isKing(piece)) return false;
  const { row } = indexToRowCol(toIndex);
  if (getPieceColor(piece) === "red" && row === 0) return true;
  if (getPieceColor(piece) === "black" && row === 7) return true;
  return false;
}
