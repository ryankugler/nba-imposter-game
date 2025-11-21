/**
 * This file defines all domain-level TypeScript interfaces and types.
 * 
 * By separating these out:
 * - We avoid circular dependencies
 * - Multiple files can import the same shared shapes
 * - The project becomes easier to maintain as it grows
 */

// GamePhase describes the "state machine" of a lobby.
// These are the phases of a round.
export type GamePhase = "waiting" | "roles" | "voting" | "results";

/**
 * Player represents a single connected client participating in a lobby.
 * This mirrors the shape we send back to the client.
 */
export interface Player {
  id: string;         // Socket.IO connection ID
  nickname: string;   // Name chosen by the player
  isHost: boolean;    // Whether this player is the lobby creator
}

/**
 * CurrentRound stores information about a single round of the game.
 * It will grow later when we implement voting, timing, etc.
 */
export interface CurrentRound {
  nbaPlayer: string;                     // The secret NBA player for non-imposters
  imposterId: string;                    // The chosen imposter’s socket.id
  votes: Record<string, string>;         // Mapping of voterId -> votedPlayerId
}

/**
 * Lobby stores all information associated with one active game lobby.
 * Each lobby is keyed by lobbyCode in an in-memory Map.
 */
export interface Lobby {
  code: string;          // e.g., "8KQZ"
  players: Player[];     // List of players in this lobby
  hostId: string;        // socket.id of the host
  phase: GamePhase;      // Current game phase
  currentRound?: CurrentRound;  // Only present after the host starts the game
}
