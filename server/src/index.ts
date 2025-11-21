/**
 * Main server entry point.
 * This file should ONLY:
 * - Create Express app
 * - Create HTTP server
 * - Attach Socket.IO
 * - Register handlers
 * 
 * All business logic lives in separate modules.
 */

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

// Import our lobby handlers
import { registerLobbyHandlers } from "./handlers/lobbyHandlers";

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Simple health endpoint for deployment checks
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Create Socket.IO server attached to the same HTTP server
const io = new Server(httpServer, {
  cors: { origin: "*" }, // restrict in production
});

// Handle new Socket.IO connections
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Register all lobby/event handlers for this socket
  registerLobbyHandlers(io, socket);

  // Placeholder for future modules:
  // registerVotingHandlers(io, socket)
  // registerDisconnectHandlers(io, socket)

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start listening
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
