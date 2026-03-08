import { useEffect, useRef, useState } from "react";
import { useGameStore } from "./store/gameStore";
import MainMenu from "./screens/MainMenu";
import GameScreen from "./screens/GameScreen";
import LobbyScreen from "./screens/LobbyScreen";
import SpectateListScreen from "./screens/SpectateListScreen";
import SpectateScreen from "./screens/SpectateScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { useSocket } from "./hooks/useSocket";
import { useAccount, useConnect } from "@starknet-react/core";
import { isPlayerRegistered } from "./utils/contractReader";
import { contractCallAsync } from "./utils/contractBridge";
import { getSocket } from "./socket";
import { toast } from "react-toastify";
import { shortString } from "starknet";
import type { AccountInterface } from "starknet";

interface Wallet {
  IsConnected: boolean;
  Account: AccountInterface | undefined;
}

declare global {
  interface Window {
    Wallet: Wallet;
  }
}

function ErrorToast() {
  const errorMessage = useGameStore((s) => s.errorMessage);
  if (!errorMessage) return null;
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-semibold animate-slide-up"
      style={{
        background: "var(--danger)",
        color: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {errorMessage}
    </div>
  );
}

export default function App() {
  useSocket();
  const screen = useGameStore((s) => s.screen);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setWalletAddress = useGameStore((s) => s.setWalletAddress);

  const { account, connector } = useAccount();
  const registrationAttempted = useRef(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Set global window.Wallet when account connects
  useEffect(() => {
    if (!account) {
      registrationAttempted.current = false;
      return;
    }
    if (window.Wallet?.Account) return;
    window.Wallet = {
      Account: account,
      IsConnected: true,
    };
  }, [account]);

  // Auto-register player on wallet connect
  useEffect(() => {
    if (!account || !connector || !window.Wallet?.Account) return;
    if (registrationAttempted.current) return;
    registrationAttempted.current = true;

    (async () => {
      setIsRegistering(true);
      try {
        const alreadyRegistered = await isPlayerRegistered(account.address);

        let username = "player";
        try {
          const ctrl = connector as any;
          if (typeof ctrl.username === "function") {
            const result = ctrl.username();
            if (result && typeof result.then === "function") {
              username = await result;
            } else if (typeof result === "string") {
              username = result;
            }
          }
        } catch {
          // fallback to 'player'
        }

        if (!alreadyRegistered) {
          const encodedName = shortString.encodeShortString(username);
          await contractCallAsync("registerPlayer", encodedName);
          toast.success("Welcome! Player registered.");
        }

        // Set local player from wallet
        setPlayer({
          id: account.address,
          socketId: "",
          username,
          rating: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
        });
        setWalletAddress(account.address);

        // Register with socket server for real-time relay
        const socket = getSocket();
        socket.emit("register", { username, walletAddress: account.address });
      } finally {
        setIsRegistering(false);
      }
    })();
  }, [account, connector]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="w-full h-full overflow-hidden relative"
      style={{ background: "var(--bg-gradient)" }}
    >
      {screen === "menu" && <MainMenu />}
      {screen === "game" && <GameScreen />}
      {screen === "lobby" && <LobbyScreen />}
      {screen === "spectate-list" && <SpectateListScreen />}
      {screen === "spectate" && <SpectateScreen />}
      {screen === "leaderboard" && <LeaderboardScreen />}
      {screen === "settings" && <SettingsScreen />}
      <ErrorToast />

      {/* Registration loader overlay */}
      {isRegistering && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{
                border: "3px solid var(--surface-hover)",
                borderTopColor: "var(--accent)",
              }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Registering player...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
