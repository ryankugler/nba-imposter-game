// client/src/socket.ts

import { io, Socket } from "socket.io-client";

// For now, hard-code the backend URL.
// In production, we can move this to an environment variable.
const URL = "http://localhost:3001";

// Create a single Socket.IO client instance.
// This connection is established once and reused.
export const socket: Socket = io(URL, {
  autoConnect: true, // automatically connect on import
});

// Optional: you can hook into basic events for debugging
socket.on("connect", () => {
  console.log("Connected to server with id:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
