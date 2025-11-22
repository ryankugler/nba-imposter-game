// ===============================
// 1. Import Dependencies
// ===============================

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

// Register lobby event handlers
import { registerLobbyHandlers } from "./handlers/lobbyHandlers";

// Register disconnect logic
import { handlePlayerDisconnect } from "./handlers/disconnectHandlers";


// ===============================
// 2. Basic Server Configuration
// ===============================

// PORT will use environment variable if deployed,
// otherwise default to 3001 locally.
const PORT = process.env.PORT || 3001;


// ===============================
// 3. Create Express Application
// ===============================

// Express is a minimal HTTP server that also provides
// routing, middleware, and JSON parsing.
const app = express();

// Enable CORS so our frontend (on a different port) can talk to this backend.
app.use(cors());

// Parse incoming JSON bodies automatically.
app.use(express.json());


// ===============================
// 4. HTTP Server
// ===============================
//
// Socket.IO cannot attach directly to the Express app.
// It must attach to a *raw* HTTP server, so we create one here.

const httpServer = http.createServer(app);


// ===============================
// 5. Socket.IO Server
// ===============================
//
// - `io` is our real-time event system.
// - We pass the HTTP server because WebSockets upgrade
//   from HTTP → WS.
// - CORS config ensures browsers allow connections.

const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace with your frontend URL.
  },
});


// ===============================
// 6. Express Routes (Optional)
// ===============================
//
// Simple health-check route for deployment platforms.

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});


// ===============================
// 7. Socket.IO Connection Handling
// ===============================
//
// Every time a client connects, Socket.IO assigns them a unique `socket.id`.
// Each browser tab = one socket.

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Register all lobby-related events for this connected socket
  registerLobbyHandlers(io, socket);

  // Handle client disconnections (closing tab, losing internet, etc.)
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // This function:
    // - Finds the lobby the player was in
    // - Removes them from that lobby
    // - Reassigns host if necessary
    // - Deletes empty lobbies
    // - Notifies remaining players
    handlePlayerDisconnect(io, socket.id);
  });
});


// ===============================
// 8. Start Server
// ===============================

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
