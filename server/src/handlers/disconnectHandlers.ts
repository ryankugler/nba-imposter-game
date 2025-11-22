// handlers/disconnectHandlers.ts

import { Server } from "socket.io";
import { lobbies } from "./lobbyHandlers";
import { findLobbyBySocketId } from "../utils/findLobby";

/**
 * Handles cleanup when a player disconnects from the server.
 *
 * @param io - The Socket.IO server instance (used to broadcast updates)
 * @param socketId - The ID of the disconnected player's socket
 */
export function handlePlayerDisconnect(io: Server, socketId: string) {
  // STEP 1 — Ask helper to find the lobby this socket belonged to.
  const targetLobby = findLobbyBySocketId(socketId);

  // If player wasn’t in any lobby, nothing to do.
  if (!targetLobby) return;

  // STEP 2 — Remove the player from the lobby’s player list.
  targetLobby.players = targetLobby.players.filter(
    (p) => p.id !== socketId
  );

  // STEP 3 — If the lobby is now empty, delete the entire lobby.
  if (targetLobby.players.length === 0) {
    lobbies.delete(targetLobby.code);
    return;
  }

  // STEP 4 — If the disconnected player was the host, reassign host.
  if (targetLobby.hostId === socketId) {
    const newHost = targetLobby.players[0]; // first remaining player
    if (!newHost) {
      // Fallback: if something went wrong and no players remain, remove the lobby.
      lobbies.delete(targetLobby.code);
      return;
    }

    targetLobby.hostId = newHost.id;

    // Update each player's isHost flag.
    targetLobby.players = targetLobby.players.map((player) => ({
      ...player,
      isHost: player.id === newHost.id,
    }));
  }

  // STEP 5 — Notify remaining players that the lobby changed.
  io.to(targetLobby.code).emit("lobbyUpdated", {
    lobbyCode: targetLobby.code,
    players: targetLobby.players,
    hostId: targetLobby.hostId,
  });
}
