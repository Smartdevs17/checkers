export const BOARD_SIZE = 8;
export const SQUARES = 32; // playable squares on 8x8 board

export enum PieceType {
  EMPTY = 0,
  RED = 1,
  BLACK = 2,
  RED_KING = 3,
  BLACK_KING = 4,
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: number; // square index 0-31
  to: number; // square index 0-31
  captured?: number[]; // indices of captured pieces
  promoted?: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  walletAddress?: string;
}

export type GameStatus = "waiting" | "playing" | "finished";
export type GameResult = "red_win" | "black_win" | "draw";
export type PieceColor = "red" | "black";

export interface GameState {
  id: string;
  board: number[]; // 32-element array, each is PieceType
  currentTurn: PieceColor;
  status: GameStatus;
  result?: GameResult;
  resultReason?: string;
  redPlayer?: Player;
  blackPlayer?: Player;
  roomCode?: string;
  moveCount: number;
  movesSinceCapture: number;
  lastMove?: { from: number; to: number };
  capturedRed: number;
  capturedBlack: number;
  spectators: string[];
  createdAt: number;
  drawOffer?: PieceColor;
  eloChanges?: { red: number; black: number };
  onChainGameId?: number;
}

export interface ActiveGameInfo {
  id: string;
  redPlayer: string;
  blackPlayer: string;
  redRating: number;
  blackRating: number;
  moveCount: number;
  capturedRed: number;
  capturedBlack: number;
  spectatorCount: number;
}

export interface LeaderboardEntry {
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}
