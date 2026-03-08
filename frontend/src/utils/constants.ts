export const BOARD_SIZE = 8;
export const SQUARES = 32;

export enum PieceType {
  EMPTY = 0,
  RED = 1,
  BLACK = 2,
  RED_KING = 3,
  BLACK_KING = 4,
}

export type PieceColor = "red" | "black";
export type GameStatus = "waiting" | "playing" | "finished";
export type GameResult = "red_win" | "black_win" | "draw";

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: number;
  to: number;
  captured?: number[];
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
}

export interface GameState {
  id: string;
  board: number[];
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

export interface MoveLogEntry {
  color: PieceColor;
  from: number;
  to: number;
  captured: number[];
  promoted: boolean;
}

// Rating tiers
export function getRatingTier(rating: number): {
  name: string;
  color: string;
} {
  if (rating >= 2000) return { name: "Grandmaster", color: "#ff4444" };
  if (rating >= 1800) return { name: "Master", color: "#ff8800" };
  if (rating >= 1600) return { name: "Expert", color: "#aa44ff" };
  if (rating >= 1400) return { name: "Advanced", color: "#4488ff" };
  if (rating >= 1200) return { name: "Intermediate", color: "#44bb44" };
  if (rating >= 1000) return { name: "Beginner", color: "#888888" };
  return { name: "Novice", color: "#666666" };
}
