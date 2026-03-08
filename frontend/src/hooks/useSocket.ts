import { useEffect } from "react";
import { getSocket } from "../socket";
import { useGameStore } from "../store/gameStore";
import { createGameOnChain, contractCallAsync, setChainGameId } from "../utils/contractBridge";

export function useSocket() {
  const setConnected = useGameStore((s) => s.setConnected);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setGame = useGameStore((s) => s.setGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const setInQueue = useGameStore((s) => s.setInQueue);
  const setMyColor = useGameStore((s) => s.setMyColor);
  const setActiveGames = useGameStore((s) => s.setActiveGames);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setOnline = useGameStore((s) => s.setOnline);
  const setOnChainGameId = useGameStore((s) => s.setOnChainGameId);

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      setConnected(true);
      // Re-register on reconnect if we already have a player with a wallet
      const store = useGameStore.getState();
      if (store.player && store.walletAddress) {
        socket.emit("register", { username: store.player.username, walletAddress: store.walletAddress });
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("registered", ({ player }) => {
      setPlayer(player);
    });

    socket.on("room-created", ({ gameId, roomCode }) => {
      setRoomCode(roomCode);
      setScreen("lobby");
    });

    socket.on("queue-joined", () => {
      setInQueue(true);
    });

    socket.on("game-start", ({ game, yourColor }) => {
      setGame(game);
      setMyColor(yourColor);
      setOnline(true);
      setInQueue(false);
      setOnChainGameId(null);
      setChainGameId(null);
      setScreen("game");

      // Red player creates the on-chain game and shares the ID
      if (yourColor === "red") {
        createGameOnChain(1).then((onChainId) => {
          if (onChainId) {
            useGameStore.getState().setOnChainGameId(onChainId);
            // Don't flush queue yet — wait for black to join first
            socket.emit("set-onchain-game-id", { gameId: game.id, onChainGameId: onChainId });
          }
        });
      }
    });

    // Receive on-chain game ID — black joins, then both sides flush queued calls
    socket.on("onchain-game-id", ({ onChainGameId }) => {
      useGameStore.getState().setOnChainGameId(onChainGameId);
      const store = useGameStore.getState();

      if (store.myColor === "black") {
        // Await join so the game is PLAYING on-chain before any moves fire
        contractCallAsync("joinGame", onChainGameId).then(() => {
          setChainGameId(onChainGameId);
          // Tell red we've joined so red can flush too
          const socket = getSocket();
          socket.emit("onchain-joined", { gameId: store.game?.id });
        });
      } else {
        // Red: don't flush yet, wait for black to confirm join
      }
    });

    // Black confirmed join — red can now flush queued on-chain calls
    socket.on("onchain-joined", () => {
      const store = useGameStore.getState();
      if (store.onChainGameId) {
        setChainGameId(store.onChainGameId);
      }
    });

    socket.on("game-state", ({ game }) => {
      setGame(game);
    });

    socket.on("move-made", ({ board, from, to, captured, promoted, currentTurn, capturedRed, capturedBlack, moveCount, movesSinceCapture }) => {
      const store = useGameStore.getState();
      if (store.game) {
        // Determine who just moved (it's the opposite of currentTurn since turn already switched)
        const movedColor = currentTurn === "red" ? "black" : "red";
        store.addMoveLog({
          color: movedColor as any,
          from,
          to,
          captured: captured || [],
          promoted: promoted || false,
        });

        setGame({
          ...store.game,
          board,
          currentTurn,
          lastMove: { from, to },
          capturedRed,
          capturedBlack,
          moveCount,
          movesSinceCapture,
          drawOffer: undefined,
        });
      }
    });

    socket.on("game-over", ({ winner, reason, eloChanges, result }) => {
      const store = useGameStore.getState();
      if (store.game) {
        setGame({
          ...store.game,
          status: "finished",
          result,
          resultReason: reason,
          eloChanges,
        });
      }
    });

    socket.on("draw-offered", ({ by }) => {
      const store = useGameStore.getState();
      if (store.game) {
        setGame({ ...store.game, drawOffer: by });
      }
    });

    socket.on("draw-declined", () => {
      const store = useGameStore.getState();
      if (store.game) {
        setGame({ ...store.game, drawOffer: undefined });
      }
    });

    socket.on("active-games", ({ games }) => {
      setActiveGames(games);
    });

    socket.on("spectate-update", ({ game }) => {
      const store = useGameStore.getState();
      const prevGame = store.game;
      // Detect new move by comparing lastMove and populate spectator move log
      if (
        game.lastMove &&
        prevGame &&
        (!prevGame.lastMove ||
          prevGame.lastMove.from !== game.lastMove.from ||
          prevGame.lastMove.to !== game.lastMove.to)
      ) {
        const movedColor = game.currentTurn === "red" ? "black" : "red";
        store.addMoveLog({
          color: movedColor as any,
          from: game.lastMove.from,
          to: game.lastMove.to,
          captured: [],
          promoted: false,
        });
      }
      setGame(game);
    });

    socket.on("error", ({ message }) => {
      console.error("Server error:", message);
      const store = useGameStore.getState();
      store.setError(message);
      // If registration was rejected, reset the locally-set player
      if (message === "Username already in use" && store.player?.id === "local") {
        store.setPlayer(null);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("registered");
      socket.off("room-created");
      socket.off("queue-joined");
      socket.off("game-start");
      socket.off("game-state");
      socket.off("move-made");
      socket.off("game-over");
      socket.off("draw-offered");
      socket.off("draw-declined");
      socket.off("active-games");
      socket.off("spectate-update");
      socket.off("onchain-game-id");
      socket.off("onchain-joined");
      socket.off("error");
    };
  }, []);
}
