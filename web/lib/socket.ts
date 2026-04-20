import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketBaseUrl(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  // Strip trailing /api since Socket.IO is at root
  return apiUrl.replace(/\/api\/?$/, "");
}

export function getSwapSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(`${getSocketBaseUrl()}/swap`, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function disconnectSwapSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}