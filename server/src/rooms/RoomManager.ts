import { Player, GameState } from "../types.js";
import { createGame } from "../game/CheckersGame.js";

export class RoomManager {
  games: Map<string, GameState> = new Map();
  roomCodes: Map<string, string> = new Map(); // roomCode → gameId
  queue: { player: Player; socketId: string }[] = [];
  playerGames: Map<string, string> = new Map(); // playerId → gameId

  createRoom(player: Player, roomCode: string): GameState {
    const game = createGame(undefined, undefined, roomCode);
    // Randomly assign creator to red or black
    if (Math.random() < 0.5) {
      game.redPlayer = player;
    } else {
      game.blackPlayer = player;
    }
    this.games.set(game.id, game);
    this.roomCodes.set(roomCode.toUpperCase(), game.id);
    this.playerGames.set(player.id, game.id);
    return game;
  }

  joinRoom(
    player: Player,
    roomCode: string
  ): { game: GameState; success: boolean; error?: string } {
    const gameId = this.roomCodes.get(roomCode.toUpperCase());
    if (!gameId) {
      return { game: null as any, success: false, error: "Room not found" };
    }

    const game = this.games.get(gameId);
    if (!game) {
      return { game: null as any, success: false, error: "Game not found" };
    }

    if (game.status !== "waiting") {
      return { game: null as any, success: false, error: "Game already in progress" };
    }

    // Assign to empty slot
    if (!game.redPlayer) {
      game.redPlayer = player;
    } else if (!game.blackPlayer) {
      game.blackPlayer = player;
    } else {
      return { game: null as any, success: false, error: "Room is full" };
    }

    if (game.redPlayer && game.blackPlayer) {
      game.status = "playing";
    }

    this.playerGames.set(player.id, game.id);
    return { game, success: true };
  }

  addToQueue(player: Player, socketId: string): GameState | null {
    // Check if already in queue
    if (this.queue.find((q) => q.player.id === player.id)) return null;

    if (this.queue.length > 0) {
      // Match with first player in queue
      const opponent = this.queue.shift()!;
      const game = createGame();

      // Random color assignment
      if (Math.random() < 0.5) {
        game.redPlayer = player;
        game.blackPlayer = opponent.player;
      } else {
        game.redPlayer = opponent.player;
        game.blackPlayer = player;
      }
      game.status = "playing";

      this.games.set(game.id, game);
      this.playerGames.set(player.id, game.id);
      this.playerGames.set(opponent.player.id, game.id);

      return game;
    }

    // Add to queue
    this.queue.push({ player, socketId });
    return null;
  }

  removeFromQueue(playerId: string): boolean {
    const idx = this.queue.findIndex((q) => q.player.id === playerId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getPlayerGame(playerId: string): GameState | undefined {
    const gameId = this.playerGames.get(playerId);
    if (gameId) return this.games.get(gameId);
    return undefined;
  }

  removeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (game) {
      if (game.roomCode) this.roomCodes.delete(game.roomCode.toUpperCase());
      if (game.redPlayer) this.playerGames.delete(game.redPlayer.id);
      if (game.blackPlayer) this.playerGames.delete(game.blackPlayer.id);
      this.games.delete(gameId);
    }
  }

  getActiveGames(): GameState[] {
    return Array.from(this.games.values()).filter((g) => g.status === "playing");
  }

  addSpectator(gameId: string, socketId: string): GameState | undefined {
    const game = this.games.get(gameId);
    if (game && !game.spectators.includes(socketId)) {
      game.spectators.push(socketId);
    }
    return game;
  }

  removeSpectator(gameId: string, socketId: string): void {
    const game = this.games.get(gameId);
    if (game) {
      game.spectators = game.spectators.filter((s) => s !== socketId);
    }
  }

  getQueueEntry(playerId: string): { player: Player; socketId: string } | undefined {
    return this.queue.find((q) => q.player.id === playerId);
  }
}
