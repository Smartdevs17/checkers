import { create } from "zustand";
import {
  PieceColor,
  GameState,
  GameStatus,
  GameResult,
  Player,
  ActiveGameInfo,
  LeaderboardEntry,
  MoveLogEntry,
} from "../utils/constants";
import {
  createInitialBoard,
  getValidDestinations,
  findMove,
  isOwnPiece,
} from "../utils/board";

export type Screen =
  | "menu"
  | "game"
  | "lobby"
  | "spectate-list"
  | "spectate"
  | "leaderboard"
  | "settings";

interface GameStore {
  // Navigation
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // Player
  player: Player | null;
  setPlayer: (player: Player | null) => void;

  // Game state
  game: GameState | null;
  setGame: (game: GameState | null) => void;
  myColor: PieceColor | null;
  setMyColor: (color: PieceColor | null) => void;

  // Local play state
  localBoard: number[];
  localTurn: PieceColor;
  localStatus: GameStatus;
  localResult: GameResult | null;
  localResultReason: string | null;
  localMovesSinceProgress: number;
  selectedSquare: number | null;
  validMoves: number[];
  lastMove: { from: number; to: number } | null;
  localCapturedRed: number;
  localCapturedBlack: number;

  // Move log
  moveLog: MoveLogEntry[];
  addMoveLog: (entry: MoveLogEntry) => void;
  clearMoveLog: () => void;

  // UI State
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
  isInQueue: boolean;
  setInQueue: (inQueue: boolean) => void;
  roomCode: string | null;
  setRoomCode: (code: string | null) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isSpectating: boolean;
  setSpectating: (spectating: boolean) => void;

  // Error toast
  errorMessage: string | null;
  setError: (msg: string | null) => void;

  // Lists
  activeGames: ActiveGameInfo[];
  setActiveGames: (games: ActiveGameInfo[]) => void;
  leaderboard: LeaderboardEntry[];
  setLeaderboard: (entries: LeaderboardEntry[]) => void;

  // Local game actions
  initLocalGame: () => void;
  selectSquare: (index: number) => void;
  resetSelection: () => void;

  // Wallet
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;

  // Online game state
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // On-chain game tracking
  onChainGameId: number | null;
  setOnChainGameId: (id: number | null) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "menu",
  setScreen: (screen) => set({ screen }),

  player: null,
  setPlayer: (player) => set({ player }),

  game: null,
  setGame: (game) => set({ game }),
  myColor: null,
  setMyColor: (color) => set({ myColor: color }),

  localBoard: createInitialBoard(),
  localTurn: "red",
  localStatus: "playing",
  localResult: null,
  localResultReason: null,
  localMovesSinceProgress: 0,
  selectedSquare: null,
  validMoves: [],
  lastMove: null,
  localCapturedRed: 0,
  localCapturedBlack: 0,

  moveLog: [],
  addMoveLog: (entry) => set((s) => ({ moveLog: [...s.moveLog, entry] })),
  clearMoveLog: () => set({ moveLog: [] }),

  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
  isInQueue: false,
  setInQueue: (inQueue) => set({ isInQueue: inQueue }),
  roomCode: null,
  setRoomCode: (code) => set({ roomCode: code }),
  soundEnabled: true,
  setSoundEnabled: (enabled) => {
    localStorage.setItem("checkers-sound", enabled ? "1" : "0");
    set({ soundEnabled: enabled });
  },
  isSpectating: false,
  setSpectating: (spectating) => set({ isSpectating: spectating }),

  errorMessage: null,
  setError: (msg) => {
    set({ errorMessage: msg });
    if (msg) setTimeout(() => set({ errorMessage: null }), 3500);
  },

  activeGames: [],
  setActiveGames: (games) => set({ activeGames: games }),
  leaderboard: [],
  setLeaderboard: (entries) => set({ leaderboard: entries }),

  walletAddress: null,
  setWalletAddress: (address) => set({ walletAddress: address }),

  isOnline: false,
  setOnline: (online) => set({ isOnline: online }),

  onChainGameId: null,
  setOnChainGameId: (id) => set({ onChainGameId: id }),

  initLocalGame: () =>
    set({
      localBoard: createInitialBoard(),
      localTurn: "red",
      localStatus: "playing",
      localResult: null,
      localResultReason: null,
      localMovesSinceProgress: 0,
      selectedSquare: null,
      validMoves: [],
      lastMove: null,
      localCapturedRed: 0,
      localCapturedBlack: 0,
      moveLog: [],
      isOnline: false,
    }),

  selectSquare: (index: number) => {
    const state = get();
    if (!state.game) return;
    const board = state.game.board;
    const turn = state.game.currentTurn;

    // Only allow selecting own pieces on your turn
    if (state.myColor && state.myColor !== turn) return;

    const piece = board[index];

    // If a piece is already selected and we clicked a valid move destination
    if (state.selectedSquare !== null && state.validMoves.includes(index)) {
      const move = findMove(board, state.selectedSquare, index, turn);
      if (move) {
        // Online mode: reset selection — move is handled in GameScreen via socket + contract
        set({ selectedSquare: null, validMoves: [] });
        return;
      }
    }

    // Select own piece
    if (isOwnPiece(piece, turn)) {
      const destinations = getValidDestinations(board, index, turn);
      set({ selectedSquare: index, validMoves: destinations });
    } else {
      set({ selectedSquare: null, validMoves: [] });
    }
  },

  resetSelection: () => set({ selectedSquare: null, validMoves: [] }),
}));
