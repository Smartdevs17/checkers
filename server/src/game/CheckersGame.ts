import { GameState, PieceType, PieceColor, Move, Player } from "../types.js";
import {
  createInitialBoard,
  getPieceColor,
  isOwnPiece,
  hasAnyCapture,
  getCaptureChains,
  getSimpleMoves,
  hasValidMoves,
  shouldPromote,
  isKing,
} from "./Board.js";

let gameIdCounter = 0;

export function createGame(
  redPlayer?: Player,
  blackPlayer?: Player,
  roomCode?: string
): GameState {
  gameIdCounter++;
  return {
    id: `game_${gameIdCounter}_${Date.now()}`,
    board: createInitialBoard(),
    currentTurn: "red",
    status: redPlayer && blackPlayer ? "playing" : "waiting",
    redPlayer,
    blackPlayer,
    roomCode,
    moveCount: 0,
    movesSinceCapture: 0,
    capturedRed: 0,
    capturedBlack: 0,
    spectators: [],
    createdAt: Date.now(),
  };
}

export interface MoveResult {
  valid: boolean;
  error?: string;
  board?: number[];
  from?: number;
  to?: number;
  captured?: number[];
  promoted?: boolean;
  gameOver?: boolean;
  result?: "red_win" | "black_win" | "draw";
  resultReason?: string;
}

export function validateAndApplyMove(
  game: GameState,
  from: number,
  to: number,
  playerColor: PieceColor
): MoveResult {
  // Check turn
  if (game.currentTurn !== playerColor) {
    return { valid: false, error: "Not your turn" };
  }

  if (game.status !== "playing") {
    return { valid: false, error: "Game is not in progress" };
  }

  // Check piece ownership
  const piece = game.board[from];
  if (!isOwnPiece(piece, playerColor)) {
    return { valid: false, error: "Not your piece" };
  }

  // Check if target is empty
  if (game.board[to] !== PieceType.EMPTY) {
    return { valid: false, error: "Target square is not empty" };
  }

  // Try capture move first
  const chains = getCaptureChains(game.board, from);
  let chain = chains.find((c) => c.path[c.path.length - 1] === to);
  if (!chain) chain = chains.find((c) => c.path[1] === to);

  if (chain) {
    // Apply capture chain
    const newBoard = [...game.board];
    const finalPos = chain.path[chain.path.length - 1];
    newBoard[finalPos] = newBoard[from];
    newBoard[from] = PieceType.EMPTY;
    for (const capturedIdx of chain.captured) {
      newBoard[capturedIdx] = PieceType.EMPTY;
    }

    const promoted = shouldPromote(newBoard[finalPos], finalPos);
    if (promoted) {
      if (newBoard[finalPos] === PieceType.RED) newBoard[finalPos] = PieceType.RED_KING;
      if (newBoard[finalPos] === PieceType.BLACK) newBoard[finalPos] = PieceType.BLACK_KING;
    }

    const capturedRedCount = chain.captured.filter((i) => {
      const p = game.board[i];
      return p === PieceType.RED || p === PieceType.RED_KING;
    }).length;
    const capturedBlackCount = chain.captured.filter((i) => {
      const p = game.board[i];
      return p === PieceType.BLACK || p === PieceType.BLACK_KING;
    }).length;

    game.board = newBoard;
    game.lastMove = { from, to: finalPos };
    game.moveCount++;
    game.movesSinceCapture = 0;
    game.capturedRed += capturedRedCount;
    game.capturedBlack += capturedBlackCount;
    game.drawOffer = undefined;

    const nextTurn: PieceColor = playerColor === "red" ? "black" : "red";
    game.currentTurn = nextTurn;

    const gameOverResult = checkGameOver(game);

    return {
      valid: true,
      board: newBoard,
      from,
      to: finalPos,
      captured: chain.captured,
      promoted,
      ...gameOverResult,
    };
  }

  // WCDF rule: if any capture is available, simple moves are not allowed
  if (hasAnyCapture(game.board, playerColor)) {
    return { valid: false, error: "Capture is mandatory" };
  }

  // Try simple move
  const simpleMoves = getSimpleMoves(game.board, from);
  if (!simpleMoves.includes(to)) {
    return { valid: false, error: "Invalid move" };
  }

  const newBoard = [...game.board];
  newBoard[to] = newBoard[from];
  newBoard[from] = PieceType.EMPTY;

  const promoted = shouldPromote(newBoard[to], to);
  if (promoted) {
    if (newBoard[to] === PieceType.RED) newBoard[to] = PieceType.RED_KING;
    if (newBoard[to] === PieceType.BLACK) newBoard[to] = PieceType.BLACK_KING;
  }

  // WCDF 40-move rule: resets on capture OR man (non-king) movement
  const isManMove = !isKing(piece);

  game.board = newBoard;
  game.lastMove = { from, to };
  game.moveCount++;
  game.movesSinceCapture = isManMove ? 0 : game.movesSinceCapture + 1;
  game.drawOffer = undefined;

  const nextTurn: PieceColor = playerColor === "red" ? "black" : "red";
  game.currentTurn = nextTurn;

  const gameOverResult = checkGameOver(game);

  return {
    valid: true,
    board: newBoard,
    from,
    to,
    captured: [],
    promoted,
    ...gameOverResult,
  };
}

function checkGameOver(game: GameState): {
  gameOver?: boolean;
  result?: "red_win" | "black_win" | "draw";
  resultReason?: string;
} {
  // Check if current player has no valid moves
  if (!hasValidMoves(game.board, game.currentTurn)) {
    const winner = game.currentTurn === "red" ? "black_win" : "red_win";
    game.status = "finished";
    game.result = winner as any;
    game.resultReason = "No valid moves";
    return { gameOver: true, result: winner as any, resultReason: "No valid moves" };
  }

  // WCDF 40-move draw rule: 40 moves each (80 half-moves) with no captures and no man movement
  if (game.movesSinceCapture >= 80) {
    game.status = "finished";
    game.result = "draw";
    game.resultReason = "40-move rule (no progress)";
    return { gameOver: true, result: "draw", resultReason: "40-move rule" };
  }

  return {};
}

export function resignGame(
  game: GameState,
  playerColor: PieceColor
): { result: "red_win" | "black_win"; reason: string } {
  game.status = "finished";
  const result = playerColor === "red" ? "black_win" : "red_win";
  game.result = result;
  game.resultReason = "Resignation";
  return { result, reason: "Resignation" };
}
