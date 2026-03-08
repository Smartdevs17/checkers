import { PieceType, PieceColor, BOARD_SIZE, Move } from "./constants";

// Square index (0-31) to row/col on 8x8 board
// Playable squares are dark squares. Row 0 is top (black's side).
export function indexToRowCol(index: number): { row: number; col: number } {
  const row = Math.floor(index / 4);
  const col = (index % 4) * 2 + (row % 2 === 0 ? 1 : 0);
  return { row, col };
}

// Row/col to square index, returns -1 if not a playable square
export function rowColToIndex(row: number, col: number): number {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return -1;
  // Playable squares: row even → odd cols, row odd → even cols
  if (row % 2 === 0 && col % 2 === 0) return -1;
  if (row % 2 === 1 && col % 2 === 1) return -1;
  return row * 4 + Math.floor(col / 2);
}

// Create initial board state
export function createInitialBoard(): number[] {
  const board = new Array(32).fill(PieceType.EMPTY);
  // Black pieces on top 3 rows (indices 0-11)
  for (let i = 0; i < 12; i++) {
    board[i] = PieceType.BLACK;
  }
  // Red pieces on bottom 3 rows (indices 20-31)
  for (let i = 20; i < 32; i++) {
    board[i] = PieceType.RED;
  }
  return board;
}

export function getPieceColor(piece: PieceType): PieceColor | null {
  if (piece === PieceType.RED || piece === PieceType.RED_KING) return "red";
  if (piece === PieceType.BLACK || piece === PieceType.BLACK_KING) return "black";
  return null;
}

export function isKing(piece: PieceType): boolean {
  return piece === PieceType.RED_KING || piece === PieceType.BLACK_KING;
}

export function isOwnPiece(piece: PieceType, color: PieceColor): boolean {
  if (color === "red")
    return piece === PieceType.RED || piece === PieceType.RED_KING;
  return piece === PieceType.BLACK || piece === PieceType.BLACK_KING;
}

export function isOpponentPiece(piece: PieceType, color: PieceColor): boolean {
  if (color === "red")
    return piece === PieceType.BLACK || piece === PieceType.BLACK_KING;
  return piece === PieceType.RED || piece === PieceType.RED_KING;
}

// Get all adjacent diagonal squares for a piece at given index
function getAdjacentSquares(
  index: number,
  piece: PieceType
): { index: number; row: number; col: number }[] {
  const { row, col } = indexToRowCol(index);
  const dirs: { dr: number; dc: number }[] = [];

  // Red moves up (decreasing row), Black moves down (increasing row)
  // Kings move both directions
  const color = getPieceColor(piece);
  if (color === "red" || isKing(piece)) {
    dirs.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 });
  }
  if (color === "black" || isKing(piece)) {
    dirs.push({ dr: 1, dc: -1 }, { dr: 1, dc: 1 });
  }

  const results: { index: number; row: number; col: number }[] = [];
  for (const { dr, dc } of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    const ni = rowColToIndex(nr, nc);
    if (ni !== -1) {
      results.push({ index: ni, row: nr, col: nc });
    }
  }
  return results;
}

// Get simple (non-capture) moves for a piece
export function getSimpleMoves(board: number[], index: number): number[] {
  const piece = board[index];
  if (piece === PieceType.EMPTY) return [];

  const moves: number[] = [];
  const adjacent = getAdjacentSquares(index, piece);

  for (const adj of adjacent) {
    if (board[adj.index] === PieceType.EMPTY) {
      moves.push(adj.index);
    }
  }
  return moves;
}

// Get capture moves for a piece (single jump)
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
  if (color === "red" || isKing(piece)) {
    dirs.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 });
  }
  if (color === "black" || isKing(piece)) {
    dirs.push({ dr: 1, dc: -1 }, { dr: 1, dc: 1 });
  }

  for (const { dr, dc } of dirs) {
    const midR = row + dr;
    const midC = col + dc;
    const midI = rowColToIndex(midR, midC);
    if (midI === -1) continue;

    const landR = row + dr * 2;
    const landC = col + dc * 2;
    const landI = rowColToIndex(landR, landC);
    if (landI === -1) continue;

    if (isOpponentPiece(board[midI], color) && board[landI] === PieceType.EMPTY) {
      captures.push({ to: landI, captured: midI });
    }
  }
  return captures;
}

// Get all capture chains (multi-jump) from a position
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
    if (alreadyCaptured.length > 0) {
      return [{ path: [index], captured: [...alreadyCaptured] }];
    }
    return [];
  }

  const piece = board[index];
  const chains: { path: number[]; captured: number[] }[] = [];

  for (const cap of captures) {
    const newCaptured = [...alreadyCaptured, cap.captured];

    // If this man would be promoted on landing, the chain must stop here
    if (shouldPromote(piece, cap.to)) {
      chains.push({
        path: [index, cap.to],
        captured: newCaptured,
      });
      continue;
    }

    // Temporarily make the jump
    const newBoard = [...board];
    newBoard[cap.to] = newBoard[index];
    newBoard[index] = PieceType.EMPTY;
    newBoard[cap.captured] = PieceType.EMPTY;

    const subChains = getCaptureChains(
      newBoard,
      cap.to,
      newCaptured
    );

    if (subChains.length === 0) {
      chains.push({
        path: [index, cap.to],
        captured: newCaptured,
      });
    } else {
      for (const sub of subChains) {
        chains.push({
          path: [index, ...sub.path],
          captured: sub.captured,
        });
      }
    }
  }

  return chains;
}

// Check if any piece of the given color has a capture available
export function hasAnyCapture(board: number[], color: PieceColor): boolean {
  for (let i = 0; i < 32; i++) {
    if (isOwnPiece(board[i], color)) {
      if (getCaptureMoves(board, i).length > 0) return true;
    }
  }
  return false;
}

// Get all valid moves for a piece
// WCDF rule: if ANY capture is available for the current player, captures are mandatory
export function getValidMoves(
  board: number[],
  index: number,
  currentTurn: PieceColor
): Move[] {
  const piece = board[index];
  if (piece === PieceType.EMPTY) return [];
  if (!isOwnPiece(piece, currentTurn)) return [];

  const moves: Move[] = [];

  // Capture moves
  const chains = getCaptureChains(board, index);
  for (const chain of chains) {
    moves.push({
      from: index,
      to: chain.path[chain.path.length - 1],
      captured: chain.captured,
      promoted: shouldPromote(piece, chain.path[chain.path.length - 1]),
    });
  }

  // Simple moves only if NO capture is available for any piece of this color
  if (!hasAnyCapture(board, currentTurn)) {
    for (const to of getSimpleMoves(board, index)) {
      moves.push({
        from: index,
        to,
        captured: [],
        promoted: shouldPromote(piece, to),
      });
    }
  }

  return moves;
}

function shouldPromote(piece: PieceType, toIndex: number): boolean {
  if (isKing(piece)) return false;
  const { row } = indexToRowCol(toIndex);
  if (getPieceColor(piece) === "red" && row === 0) return true;
  if (getPieceColor(piece) === "black" && row === 7) return true;
  return false;
}

// Apply a move to the board (returns new board)
export function applyMove(board: number[], move: Move): number[] {
  const newBoard = [...board];
  newBoard[move.to] = newBoard[move.from];
  newBoard[move.from] = PieceType.EMPTY;

  // Remove captured pieces
  if (move.captured) {
    for (const idx of move.captured) {
      newBoard[idx] = PieceType.EMPTY;
    }
  }

  // Promote to king
  if (move.promoted) {
    if (newBoard[move.to] === PieceType.RED) newBoard[move.to] = PieceType.RED_KING;
    if (newBoard[move.to] === PieceType.BLACK)
      newBoard[move.to] = PieceType.BLACK_KING;
  }

  return newBoard;
}

// Check if a player has any valid moves
export function hasValidMoves(board: number[], color: PieceColor): boolean {
  for (let i = 0; i < 32; i++) {
    if (!isOwnPiece(board[i], color)) continue;
    if (getSimpleMoves(board, i).length > 0) return true;
    if (getCaptureChains(board, i).length > 0) return true;
  }
  return false;
}

// Count pieces
export function countPieces(
  board: number[],
  color: PieceColor
): { normal: number; kings: number } {
  let normal = 0;
  let kings = 0;
  for (let i = 0; i < 32; i++) {
    if (color === "red") {
      if (board[i] === PieceType.RED) normal++;
      if (board[i] === PieceType.RED_KING) kings++;
    } else {
      if (board[i] === PieceType.BLACK) normal++;
      if (board[i] === PieceType.BLACK_KING) kings++;
    }
  }
  return { normal, kings };
}

// Get the valid move destinations for highlighting
export function getValidDestinations(
  board: number[],
  index: number,
  currentTurn: PieceColor
): number[] {
  return getValidMoves(board, index, currentTurn).map((m) => m.to);
}

// Find the specific move from source to destination
export function findMove(
  board: number[],
  from: number,
  to: number,
  currentTurn: PieceColor
): Move | null {
  const moves = getValidMoves(board, from, currentTurn);
  return moves.find((m) => m.to === to) || null;
}
