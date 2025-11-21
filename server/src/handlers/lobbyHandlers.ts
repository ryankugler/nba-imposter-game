/**
 * This file contains all Socket.IO event handlers
 * related to lobby creation, joining, and starting the game.
 * 
 * The goal is to keep index.ts clean and only focused on wiring.
 */

import { Server, Socket } from "socket.io";
import { Lobby, Player } from "../types";
import { generateLobbyCode } from "../utils/generateLobbyCode";
import { getRandomNbaPlayer } from "../utils/getRandomNbaPlayer";

/**
 * A shared in-memory store of all active lobbies.
 * We export it here so both handlers and future logic
 * (disconnect handling, voting, etc.) can access the same data.
 */
export const lobbies = new Map<string, Lobby>();

// Limit number of players per lobby.
const MAX_PLAYERS = 10;

/**
 * Registers all lobby-related event listeners for a given socket.
 * 
 * @param io - The Socket.IO server instance (used for broadcasting)
 * @param socket - The specific client's socket connection
 */
export function registerLobbyHandlers(io: Server, socket: Socket) {
  /**
   * EVENT: createLobby
   * Client payload: { nickname: string }
   */
  socket.on("createLobby", (payload: { nickname: string }) => {
    const nickname = payload?.nickname?.trim();

    if (!nickname) {
      socket.emit("errorMessage", { message: "Nickname is required." });
      return;
    }

    // Generate a unique lobby code.
    const lobbyCode = generateLobbyCode(new Set(lobbies.keys()));

    // Create a Player object for the host.
    const player: Player = {
      id: socket.id,
      nickname,
      isHost: true,
    };

    // Create a new lobby.
    const lobby: Lobby = {
      code: lobbyCode,
      players: [player],
      hostId: socket.id,
      phase: "waiting",
    };

    // Save to server memory.
    lobbies.set(lobbyCode, lobby);

    // Join the socket to its lobby room.
    socket.join(lobbyCode);

    // Respond directly to creator.
    socket.emit("lobbyCreated", {
      lobbyCode,
      yourPlayerId: socket.id,
      players: lobby.players,
      hostId: lobby.hostId,
    });

    // Broadcast lobby update (currently only to host).
    io.to(lobbyCode).emit("lobbyUpdated", {
      lobbyCode,
      players: lobby.players,
      hostId: lobby.hostId,
    });
  });

  /**
   * EVENT: joinLobby
   * Client payload: { lobbyCode: string, nickname: string }
   */
  socket.on(
    "joinLobby",
    (payload: { lobbyCode: string; nickname: string }) => {
      const lobbyCode = payload?.lobbyCode?.trim().toUpperCase();
      const nickname = payload?.nickname?.trim();

      if (!lobbyCode || !nickname) {
        socket.emit("errorMessage", {
          message: "Lobby code and nickname are required.",
        });
        return;
      }

      const lobby = lobbies.get(lobbyCode);

      if (!lobby) {
        socket.emit("errorMessage", { message: "Lobby not found." });
        return;
      }

      if (lobby.players.length >= MAX_PLAYERS) {
        socket.emit("errorMessage", { message: "Lobby is full." });
        return;
      }

      const player: Player = {
        id: socket.id,
        nickname,
        isHost: false,
      };

      lobby.players.push(player);

      socket.join(lobbyCode);

      socket.emit("lobbyJoined", {
        lobbyCode,
        yourPlayerId: socket.id,
        players: lobby.players,
        hostId: lobby.hostId,
      });

      io.to(lobbyCode).emit("lobbyUpdated", {
        lobbyCode,
        players: lobby.players,
        hostId: lobby.hostId,
      });
    }
  );

  /**
   * EVENT: startGame
   * Client payload: { lobbyCode: string }
   */
  socket.on("startGame", (payload: { lobbyCode: string }) => {
    const lobbyCode = payload?.lobbyCode?.trim().toUpperCase();

    if (!lobbyCode) {
      socket.emit("errorMessage", { message: "Lobby code is required." });
      return;
    }

    const lobby = lobbies.get(lobbyCode);

    if (!lobby) {
      socket.emit("errorMessage", { message: "Lobby not found." });
      return;
    }

    if (socket.id !== lobby.hostId) {
      socket.emit("errorMessage", {
        message: "Only the host can start the game.",
      });
      return;
    }

    if (lobby.players.length < 3) {
      socket.emit("errorMessage", {
        message: "At least 3 players are required.",
      });
      return;
    }

    const nbaPlayer = getRandomNbaPlayer();
    const imposter =
      lobby.players[Math.floor(Math.random() * lobby.players.length)];

    lobby.currentRound = {
      nbaPlayer,
      imposterId: imposter.id,
      votes: {},
    };

    lobby.phase = "roles";

    lobby.players.forEach((player) => {
      const isImposter = player.id === imposter.id;

      if (isImposter) {
        io.to(player.id).emit("roleAssignment", {
          role: "imposter",
        });
      } else {
        io.to(player.id).emit("roleAssignment", {
          role: "player",
          nbaPlayer,
        });
      }
    });

    io.to(lobbyCode).emit("phaseUpdated", { phase: lobby.phase });
  });
}
