import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Player, PieceColor, ActiveGameInfo } from "./types.js";
import { validateAndApplyMove, resignGame } from "./game/CheckersGame.js";
import { calculateElo } from "./game/EloRating.js";
import { RoomManager } from "./rooms/RoomManager.js";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5174", "http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"],
  },
});

// In-memory state
const players: Map<string, Player> = new Map(); // socketId → Player
const playersByName: Map<string, Player> = new Map(); // username → Player
const roomManager = new RoomManager();

// Helper to get player color in a game
function getPlayerColor(gameId: string, playerId: string): PieceColor | null {
  const game = roomManager.getGame(gameId);
  if (!game) return null;
  if (game.redPlayer?.id === playerId) return "red";
  if (game.blackPlayer?.id === playerId) return "black";
  return null;
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Socket.io
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  // Register player
  socket.on("register", ({ username, walletAddress }: { username: string; walletAddress?: string }) => {
    const trimmed = username.trim().slice(0, 20);
    if (!trimmed) {
      socket.emit("error", { message: "Username is required" });
      return;
    }

    // Check for existing player with same username (reconnect)
    let player = playersByName.get(trimmed.toLowerCase());
    if (player) {
      // Check if old socket is still connected (different tab with same name)
      const oldSocket = io.sockets.sockets.get(player.socketId);
      if (oldSocket && oldSocket.connected && player.socketId !== socket.id) {
        socket.emit("error", { message: "Username already in use" });
        return;
      }
      // Old socket disconnected — this is a reconnection
      players.delete(player.socketId);
      player.socketId = socket.id;
      players.set(socket.id, player);

      // Rejoin active game room if any
      const activeGame = roomManager.getPlayerGame(player.id);
      if (activeGame && activeGame.status === "playing") {
        socket.join(activeGame.id);
        socket.emit("game-start", {
          game: sanitizeGame(activeGame),
          yourColor: activeGame.redPlayer?.id === player.id ? "red" : "black",
        });
      }
    } else {
      player = {
        id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        socketId: socket.id,
        username: trimmed,
        rating: 1200,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        walletAddress: walletAddress || undefined,
      };
      playersByName.set(trimmed.toLowerCase(), player);
      players.set(socket.id, player);
    }

    socket.emit("registered", { player });
    console.log(`Registered: ${player.username} (${player.rating})`);
  });

  // Create room
  socket.on("create-room", ({ roomCode }: { roomCode: string }) => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("error", { message: "Not registered" });
      return;
    }

    const code = roomCode.toUpperCase().slice(0, 6);
    if (roomManager.roomCodes.has(code)) {
      socket.emit("error", { message: "Room code already in use" });
      return;
    }

    const game = roomManager.createRoom(player, code);
    socket.join(game.id);
    socket.emit("room-created", { gameId: game.id, roomCode: code });
    console.log(`Room created: ${code} by ${player.username}`);
  });

  // Join room
  socket.on("join-room", ({ roomCode }: { roomCode: string }) => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("error", { message: "Not registered" });
      return;
    }

    const { game, success, error } = roomManager.joinRoom(player, roomCode);
    if (!success) {
      socket.emit("error", { message: error });
      return;
    }

    socket.join(game.id);

    if (game.status === "playing") {
      // Notify both players
      const redSocketId = game.redPlayer?.socketId;
      const blackSocketId = game.blackPlayer?.socketId;

      if (redSocketId) {
        io.to(redSocketId).emit("game-start", {
          game: sanitizeGame(game),
          yourColor: "red",
        });
      }
      if (blackSocketId) {
        io.to(blackSocketId).emit("game-start", {
          game: sanitizeGame(game),
          yourColor: "black",
        });
      }
      console.log(
        `Game started: ${game.redPlayer?.username} vs ${game.blackPlayer?.username}`
      );
    }
  });

  // Leave room (cancel from lobby)
  socket.on("leave-room", () => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getPlayerGame(player.id);
    if (game && game.status === "waiting") {
      socket.leave(game.id);
      roomManager.removeGame(game.id);
      console.log(`Room cancelled by ${player.username}`);
    }
  });

  // Queue for auto-match
  socket.on("queue", () => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("error", { message: "Not registered" });
      return;
    }

    const game = roomManager.addToQueue(player, socket.id);

    if (game) {
      // Match found
      socket.join(game.id);

      const opponentSocketId =
        game.redPlayer?.id === player.id
          ? game.blackPlayer?.socketId
          : game.redPlayer?.socketId;

      if (opponentSocketId) {
        const opponentSocket = io.sockets.sockets.get(opponentSocketId);
        if (opponentSocket) opponentSocket.join(game.id);

        const opponentColor =
          game.redPlayer?.id === player.id ? "black" : "red";
        const myColor = game.redPlayer?.id === player.id ? "red" : "black";

        io.to(opponentSocketId).emit("game-start", {
          game: sanitizeGame(game),
          yourColor: opponentColor,
        });
        socket.emit("game-start", {
          game: sanitizeGame(game),
          yourColor: myColor,
        });
      }

      console.log(
        `Auto-match: ${game.redPlayer?.username} vs ${game.blackPlayer?.username}`
      );
    } else {
      socket.emit("queue-joined", {});
      console.log(`Queued: ${player.username}`);
    }
  });

  // Cancel queue
  socket.on("cancel-queue", () => {
    const player = players.get(socket.id);
    if (player) {
      roomManager.removeFromQueue(player.id);
      socket.emit("queue-left", {});
    }
  });

  // Move
  socket.on("move", ({ gameId, from, to }: { gameId: string; from: number; to: number }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getGame(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    const color = getPlayerColor(gameId, player.id);
    if (!color) {
      socket.emit("error", { message: "Not in this game" });
      return;
    }

    const result = validateAndApplyMove(game, from, to, color);

    if (!result.valid) {
      socket.emit("error", { message: result.error });
      return;
    }

    // Broadcast move to both players and spectators
    io.to(gameId).emit("move-made", {
      from: result.from,
      to: result.to,
      captured: result.captured,
      promoted: result.promoted,
      board: result.board,
      currentTurn: game.currentTurn,
      capturedRed: game.capturedRed,
      capturedBlack: game.capturedBlack,
      moveCount: game.moveCount,
      movesSinceCapture: game.movesSinceCapture,
    });

    // Broadcast to spectators
    for (const spectatorId of game.spectators) {
      io.to(spectatorId).emit("spectate-update", { game: sanitizeGame(game) });
    }

    if (result.gameOver) {
      handleGameOver(game, result.result!, result.resultReason!);
    }
  });

  // Resign
  socket.on("resign", ({ gameId }: { gameId: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getGame(gameId);
    if (!game || game.status !== "playing") return;

    const color = getPlayerColor(gameId, player.id);
    if (!color) return;

    const { result, reason } = resignGame(game, color);
    handleGameOver(game, result, reason);
  });

  // Draw offer
  socket.on("offer-draw", ({ gameId }: { gameId: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getGame(gameId);
    if (!game || game.status !== "playing") return;

    const color = getPlayerColor(gameId, player.id);
    if (!color) return;

    game.drawOffer = color;

    // Notify opponent
    const opponentSocketId =
      color === "red" ? game.blackPlayer?.socketId : game.redPlayer?.socketId;
    if (opponentSocketId) {
      io.to(opponentSocketId).emit("draw-offered", { by: color });
    }
  });

  // Accept draw
  socket.on("accept-draw", ({ gameId }: { gameId: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getGame(gameId);
    if (!game || game.status !== "playing" || !game.drawOffer) return;

    const color = getPlayerColor(gameId, player.id);
    if (!color || color === game.drawOffer) return; // Can't accept own draw

    game.status = "finished";
    game.result = "draw";
    game.resultReason = "Draw by agreement";
    handleGameOver(game, "draw", "Draw by agreement");
  });

  // Decline draw
  socket.on("decline-draw", ({ gameId }: { gameId: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getGame(gameId);
    if (!game || !game.drawOffer) return;

    game.drawOffer = undefined;
    io.to(gameId).emit("draw-declined", {});
  });

  // Get active games list
  socket.on("get-active-games", () => {
    const games: ActiveGameInfo[] = roomManager.getActiveGames().map((g) => ({
      id: g.id,
      redPlayer: g.redPlayer?.username || "?",
      blackPlayer: g.blackPlayer?.username || "?",
      redRating: g.redPlayer?.rating || 1200,
      blackRating: g.blackPlayer?.rating || 1200,
      moveCount: g.moveCount,
      capturedRed: g.capturedRed,
      capturedBlack: g.capturedBlack,
      spectatorCount: g.spectators.length,
    }));
    socket.emit("active-games", { games });
  });

  // Spectate
  socket.on("spectate", ({ gameId }: { gameId: string }) => {
    const game = roomManager.addSpectator(gameId, socket.id);
    if (game) {
      socket.join(gameId);
      socket.emit("spectate-update", { game: sanitizeGame(game) });
    } else {
      socket.emit("error", { message: "Game not found" });
    }
  });

  // Stop spectating
  socket.on("stop-spectate", ({ gameId }: { gameId: string }) => {
    roomManager.removeSpectator(gameId, socket.id);
    socket.leave(gameId);
  });

  // Relay on-chain game ID between players
  socket.on("set-onchain-game-id", ({ gameId, onChainGameId }: { gameId: string; onChainGameId: number }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const game = roomManager.getGame(gameId);
    if (!game) return;

    game.onChainGameId = onChainGameId;
    io.to(gameId).emit("onchain-game-id", { onChainGameId });
    console.log(`On-chain game ID set: ${onChainGameId} for game ${gameId}`);
  });

  // Black player confirms on-chain join — relay to red so both can start recording
  socket.on("onchain-joined", ({ gameId }: { gameId: string }) => {
    if (!gameId) return;
    io.to(gameId).emit("onchain-joined", {});
    console.log(`On-chain join confirmed for game ${gameId}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const player = players.get(socket.id);
    if (player) {
      roomManager.removeFromQueue(player.id);
      // Don't remove player from playersByName (allow reconnect)
      players.delete(socket.id);
    }
    console.log(`Disconnected: ${socket.id}`);
  });
});

function handleGameOver(
  game: any,
  result: "red_win" | "black_win" | "draw",
  reason: string
) {
  game.status = "finished";
  game.result = result;
  game.resultReason = reason;

  // Calculate ELO changes
  let eloChanges = { red: 0, black: 0 };
  if (game.redPlayer && game.blackPlayer) {
    const redScore = result === "red_win" ? 1 : result === "draw" ? 0.5 : 0;
    const elo = calculateElo(
      game.redPlayer.rating,
      game.blackPlayer.rating,
      redScore
    );

    eloChanges = { red: elo.deltaA, black: elo.deltaB };

    // Update player ratings
    game.redPlayer.rating = elo.newRatingA;
    game.blackPlayer.rating = elo.newRatingB;
    game.redPlayer.gamesPlayed++;
    game.blackPlayer.gamesPlayed++;

    if (result === "red_win") {
      game.redPlayer.wins++;
      game.blackPlayer.losses++;
    } else if (result === "black_win") {
      game.blackPlayer.wins++;
      game.redPlayer.losses++;
    } else {
      game.redPlayer.draws++;
      game.blackPlayer.draws++;
    }

    game.eloChanges = eloChanges;
  }

  io.to(game.id).emit("game-over", {
    winner: result === "draw" ? null : result === "red_win" ? "red" : "black",
    result,
    reason,
    eloChanges,
  });

  // Notify spectators
  for (const spectatorId of game.spectators) {
    io.to(spectatorId).emit("spectate-update", { game: sanitizeGame(game) });
  }

  console.log(`Game over: ${result} — ${reason}`);
}

function sanitizeGame(game: any) {
  return {
    id: game.id,
    board: game.board,
    currentTurn: game.currentTurn,
    status: game.status,
    result: game.result,
    resultReason: game.resultReason,
    redPlayer: game.redPlayer
      ? {
          id: game.redPlayer.id,
          username: game.redPlayer.username,
          rating: game.redPlayer.rating,
          wins: game.redPlayer.wins,
          losses: game.redPlayer.losses,
          draws: game.redPlayer.draws,
          gamesPlayed: game.redPlayer.gamesPlayed,
          socketId: game.redPlayer.socketId,
        }
      : undefined,
    blackPlayer: game.blackPlayer
      ? {
          id: game.blackPlayer.id,
          username: game.blackPlayer.username,
          rating: game.blackPlayer.rating,
          wins: game.blackPlayer.wins,
          losses: game.blackPlayer.losses,
          draws: game.blackPlayer.draws,
          gamesPlayed: game.blackPlayer.gamesPlayed,
          socketId: game.blackPlayer.socketId,
        }
      : undefined,
    roomCode: game.roomCode,
    moveCount: game.moveCount,
    lastMove: game.lastMove,
    capturedRed: game.capturedRed,
    capturedBlack: game.capturedBlack,
    spectators: game.spectators,
    createdAt: game.createdAt,
    drawOffer: game.drawOffer,
    eloChanges: game.eloChanges,
  };
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Checkers server running on port ${PORT}`);
});
