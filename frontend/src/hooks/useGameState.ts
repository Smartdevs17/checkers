import { useGameStore } from "../store/gameStore";
import { PieceColor, PieceType } from "../utils/constants";
import { countPieces } from "../utils/board";

export function useGameState() {
  const game = useGameStore((s) => s.game);
  const isOnline = useGameStore((s) => s.isOnline);
  const myColor = useGameStore((s) => s.myColor);
  const localBoard = useGameStore((s) => s.localBoard);
  const localTurn = useGameStore((s) => s.localTurn);
  const localStatus = useGameStore((s) => s.localStatus);
  const localCapturedRed = useGameStore((s) => s.localCapturedRed);
  const localCapturedBlack = useGameStore((s) => s.localCapturedBlack);

  const board = isOnline && game ? game.board : localBoard;
  const currentTurn = isOnline && game ? game.currentTurn : localTurn;
  const status = isOnline && game ? game.status : localStatus;
  const capturedRed = isOnline && game ? game.capturedRed : localCapturedRed;
  const capturedBlack = isOnline && game ? game.capturedBlack : localCapturedBlack;

  const isMyTurn = isOnline ? myColor === currentTurn : true;

  const redPieces = countPieces(board, "red");
  const blackPieces = countPieces(board, "black");

  return {
    board,
    currentTurn,
    status,
    capturedRed,
    capturedBlack,
    isMyTurn,
    isOnline,
    myColor,
    redPieces,
    blackPieces,
    game,
  };
}
