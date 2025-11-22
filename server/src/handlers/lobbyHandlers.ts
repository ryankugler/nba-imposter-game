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

    if (!imposter) {
      socket.emit("errorMessage", { message: "Could not pick an imposter." });
      return;
    }

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

  socket.on("startVoting", (payload: { lobbyCode: string }) => {
  /**
   * EVENT: startVoting
   * -------------------
   * Called by the host when they want to begin the voting phase
   * after players have given their verbal clues in person.
   *
   * Payload: { lobbyCode: string }
   */
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

    // Inside registerLobbyHandlers(io, socket) in lobbyHandlers.ts

  /**
   * EVENT: startVoting
   * -------------------
   * Called by the host when they want to begin the voting phase
   * after players have given their verbal clues in person.
   *
   * Payload: { lobbyCode: string }
   */
  socket.on("startVoting", (payload: { lobbyCode: string }) => {
    // Normalize + validate lobby code.
    const lobbyCode = payload?.lobbyCode?.trim().toUpperCase();

    if (!lobbyCode) {
      socket.emit("errorMessage", { message: "Lobby code is required." });
      return;
    }

    // Find the lobby in our in-memory store.
    const lobby = lobbies.get(lobbyCode);

    if (!lobby) {
      socket.emit("errorMessage", { message: "Lobby not found." });
      return;
    }

    // Only the host can start the voting phase.
    if (socket.id !== lobby.hostId) {
      socket.emit("errorMessage", {
        message: "Only the host can start voting.",
      });
      return;
    }

    // We must already have a current round to vote on.
    if (!lobby.currentRound) {
      socket.emit("errorMessage", {
        message: "Cannot start voting: no active round.",
      });
      return;
    }

    // Set game phase to "voting" for this lobby.
    lobby.phase = "voting";

    // Reset votes for this round, in case we reuse the same round.
    lobby.currentRound.votes = {};

    // Notify all players in this lobby that the phase has changed.
    io.to(lobbyCode).emit("phaseUpdated", {
      phase: lobby.phase,
    });
  });

  /**
   * EVENT: submitVote
   * -------------------
   * Called by each player once to vote for who they think the imposter is.
   *
   * Payload: { lobbyCode: string, votedPlayerId: string }
   */
  socket.on(
    "submitVote",
    (payload: { lobbyCode: string; votedPlayerId: string }) => {
      // Extract and normalize the lobby code from the payload.
      const lobbyCode = payload?.lobbyCode?.trim().toUpperCase();
      const votedPlayerId = payload?.votedPlayerId?.trim();

      if (!lobbyCode || !votedPlayerId) {
        socket.emit("errorMessage", {
          message: "Lobby code and voted player are required.",
        });
        return;
      }

      // Look up the lobby.
      const lobby = lobbies.get(lobbyCode);

      if (!lobby) {
        socket.emit("errorMessage", { message: "Lobby not found." });
        return;
      }

      // Voting only makes sense during the "voting" phase.
      if (lobby.phase !== "voting") {
        socket.emit("errorMessage", {
          message: "Voting is not active in this lobby.",
        });
        return;
      }

      // Ensure there is an active round.
      if (!lobby.currentRound) {
        socket.emit("errorMessage", {
          message: "No active round to vote on.",
        });
        return;
      }

      // Ensure that the voter (this socket) is actually a player in the lobby.
      const voterIsInLobby = lobby.players.some(
        (p) => p.id === socket.id
      );

      if (!voterIsInLobby) {
        socket.emit("errorMessage", {
          message: "You are not part of this lobby.",
        });
        return;
      }

      // Ensure the voted player exists in the lobby as well.
      const votedPlayerExists = lobby.players.some(
        (p) => p.id === votedPlayerId
      );

      if (!votedPlayerExists) {
        socket.emit("errorMessage", {
          message: "Voted player is not in this lobby.",
        });
        return;
      }

      // Record the vote in the current round's votes object.
      // Key = voterId (socket.id), Value = votedPlayerId.
      lobby.currentRound.votes[socket.id] = votedPlayerId;

      // TODO: Update in real-time who has voted and who is still yet to vote.

      // Check if all players in the lobby have voted.
      const totalPlayers = lobby.players.length;
      const totalVotes = Object.keys(lobby.currentRound.votes).length;

      if (totalVotes === totalPlayers) {
        // All votes are in → time to compute results.

        // Tally votes: count how many votes each player received.
        const tally: Record<string, number> = {};

        for (const votedId of Object.values(lobby.currentRound.votes)) {
          if (!tally[votedId]) {
            tally[votedId] = 0;
          }
          tally[votedId] += 1;
        }

        // Find the player(s) with the maximum number of votes.
        let maxVotes = 0;
        let mostVotedPlayerIds: string[] = [];

        for (const [playerId, count] of Object.entries(tally)) {
          if (count > maxVotes) {
            maxVotes = count;
            mostVotedPlayerIds = [playerId];
          } else if (count === maxVotes) {
            mostVotedPlayerIds.push(playerId);
          }
        }

        // Handle ties: for now, pick the first in the list.
        // You could randomize this if desired.
        const ejectedPlayerId = mostVotedPlayerIds[0];

        // Determine whether the ejected player was actually the imposter.
        const wasImposter =
          ejectedPlayerId === lobby.currentRound.imposterId;

        // Update phase to "results" now that voting is done.
        lobby.phase = "results";

        // Emit voting results to everyone in the lobby.
        io.to(lobbyCode).emit("votingResults", {
          ejectedPlayerId,
          wasImposter,
          votes: lobby.currentRound.votes, // optionally expose full mapping
        });

        // Also emit the new phase.
        io.to(lobbyCode).emit("phaseUpdated", {
          phase: lobby.phase,
        });
      }
    }
  );
  });

}
