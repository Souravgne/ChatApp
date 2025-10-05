// src/ws.js
import { io } from "socket.io-client";

let socketInstance = null;

export function connectWS() {
  if (socketInstance) return socketInstance;

  socketInstance = io("https://chat-api.00004000.xyz", {
    transports: ["websocket"], // avoid polling reconnection quirks
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on("connect", () => {
    console.log("WS connected:", socketInstance.id);
  });

  socketInstance.on("connect_error", (err) => {
    console.error("WS connect_error:", err && err.message ? err.message : err);
  });

  socketInstance.on("disconnect", (reason) => {
    console.warn("WS disconnected:", reason);
  });

  return socketInstance;
}
