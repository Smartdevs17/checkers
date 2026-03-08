import { useDojoSDK } from "@dojoengine/sdk/react";
import { toast } from "react-toastify";

/** Map raw contract errors to friendly messages */
const ERROR_MAP: Record<string, string> = {
  ALREADY_REGISTERED: "Player already registered",
  NOT_REGISTERED: "Please connect your wallet first",
  GAME_NOT_FOUND: "Game not found",
  GAME_NOT_WAITING: "Game is not available to join",
  GAME_NOT_PLAYING: "Game is not in progress",
  NOT_YOUR_TURN: "It's not your turn",
  INVALID_MOVE: "Invalid move",
  NOT_IN_GAME: "You are not a player in this game",
  CANNOT_JOIN_OWN_GAME: "Cannot join your own game",
};

function friendlyError(error: any): string {
  const msg = error?.message || String(error);
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return friendly;
  }
  if (msg.includes("Failed to fetch") || msg.includes("network")) {
    return "Network error, check your connection";
  }
  if (msg.includes("rejected") || msg.includes("User abort")) {
    return "Transaction rejected";
  }
  return "Something went wrong";
}

type CallResult = { success: boolean; error?: string };

const useContract = () => {
  const { client } = useDojoSDK();

  /** Call with toast on error — for user-initiated actions */
  async function call(method: string, ...args: any[]): Promise<boolean> {
    try {
      const account = window.Wallet?.Account;
      if (!account) return false;
      const tx = await (client.actions as any)[method](account, ...args);
      await account.waitForTransaction(tx.transaction_hash);
      return true;
    } catch (error: any) {
      toast.error(friendlyError(error));
      return false;
    }
  }

  /** Call silently — for background/gameplay actions */
  async function callSilent(method: string, ...args: any[]): Promise<CallResult> {
    try {
      const account = window.Wallet?.Account;
      if (!account) return { success: false, error: "No wallet" };
      const tx = await (client.actions as any)[method](account, ...args);
      await account.waitForTransaction(tx.transaction_hash);
      return { success: true };
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.warn(`[contract] ${method} failed:`, msg);
      return { success: false, error: msg };
    }
  }

  // ── User-facing actions (toast on error) ──────────────────────────

  /** Register a new player with a username */
  const registerPlayer = (username: string) =>
    call("registerPlayer", username);

  /** Resign from a game */
  const resign = (gameId: number) =>
    call("resign", gameId);

  /** Offer a draw */
  const offerDraw = (gameId: number) =>
    call("offerDraw", gameId);

  /** Accept a draw offer */
  const acceptDraw = (gameId: number) =>
    call("acceptDraw", gameId);

  /** Decline a draw offer */
  const declineDraw = (gameId: number) =>
    call("declineDraw", gameId);

  // ── Gameplay actions (silent, non-blocking feedback) ───────────────

  /** Create a new game */
  const createGame = (mode: number) =>
    callSilent("createGame", mode);

  /** Join an existing game */
  const joinGame = (gameId: number) =>
    callSilent("joinGame", gameId);

  /** Make a move */
  const makeMove = (gameId: number, from: number, to: number) =>
    callSilent("makeMove", gameId, from, to);

  return {
    // User-facing
    registerPlayer,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,

    // Gameplay
    createGame,
    joinGame,
    makeMove,

    // Generic (escape hatch)
    call,
    callSilent,
  };
};

export default useContract;
