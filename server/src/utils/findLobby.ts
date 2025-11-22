// utils/findLobby.ts

import { Lobby } from "../types";
import { lobbies } from "../handlers/lobbyHandlers";

/**
 * Finds the lobby a player belongs to, given their socketId.
 *
 * We scan through all lobbies and return the first one
 * where the player's ID matches the disconnected socket.
 *
 * @param socketId - The Socket.IO ID of the player
 * @returns The lobby if found, otherwise null
 */
export function findLobbyBySocketId(socketId: string): Lobby | null {
  /**
   * `lobbies.values()` returns an iterator over all lobby objects.
   * We turn it into an array so we can use `.find()`, which:
   *  - runs your predicate callback on each element
   *  - stops as soon as it finds a match
   *  - returns that element (or undefined if none match)
   */
  const lobby = Array.from(lobbies.values()).find((lobby) =>
    lobby.players.some((player) => player.id === socketId)
  );

  // Normalize undefined → null for cleaner handling.
  return lobby ?? null;
}
