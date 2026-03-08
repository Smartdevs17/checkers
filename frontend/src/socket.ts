import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
