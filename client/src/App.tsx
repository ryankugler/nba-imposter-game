import React, { useEffect, useState } from "react";
// Import the shared Socket.IO client instance, which manages our WebSocket connection.
import { socket } from "./socket";

// Define a TypeScript interface that mirrors the Player shape sent by the server.
// This keeps our front-end strongly typed.
interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
}

// Define the different "views" (screens) our app can show.
// - "home": initial screen to choose nickname, create/join lobby.
// - "lobby": show lobby details and players.
// - "role": show the player's role (imposter or regular).
type View = "home" | "lobby" | "role";

// Define the possible role assignments the server might send us.
// - role: "imposter" → user is the imposter, no player name.
// - role: "player" → user is a regular player, gets an nbaPlayer name.
type RoleAssignment =
  | { role: "imposter" }
  | { role: "player"; nbaPlayer: string };

type GamePhase = "voting" | "waiting" | "roles" | "results";

function App() {
  // ----- Local UI state -----

  // Which screen is currently displayed.
  const [view, setView] = useState<View>("home");

  // The nickname the user types in.
  const [nickname, setNickname] = useState("");

  // The lobby code the user enters when joining an existing lobby.
  const [lobbyCodeInput, setLobbyCodeInput] = useState("");

  // The ID of this player as known by the server (Socket.IO id).
  const [yourPlayerId, setYourPlayerId] = useState<string | null>(null);

  // The code of the lobby we've created or joined.
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);

  // The list of players currently in the lobby.
  const [players, setPlayers] = useState<Player[]>([]);

  // The socket.id of the lobby host.
  const [hostId, setHostId] = useState<string | null>(null);

  // Any error message that we want to display to the user.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The most recent role assignment for this client (when a game starts).
  const [roleAssignment, setRoleAssignment] = useState<RoleAssignment | null>(
    null
  );

  // Tracks the current phase of the game for this lobby.
  // We start with null because we haven't joined/created a lobby yet.
 const [phase, setPhase] = useState<GamePhase | null>(null);

  // ----- Socket event handlers -----
  useEffect(() => {
    // Handle "lobbyCreated" event:
    // This is sent only to the host when the lobby is successfully created.
    socket.on("lobbyCreated", (payload: {
      lobbyCode: string;
      yourPlayerId: string;
      players: Player[];
      hostId: string;
    }) => {
      // Save the lobby code provided by the server.
      setLobbyCode(payload.lobbyCode);

      // Save our player ID as assigned by the server.
      setYourPlayerId(payload.yourPlayerId);

      // Save the initial list of players (should contain only us at this point).
      setPlayers(payload.players);

      // Save the host's ID (should be us for "lobbyCreated").
      setHostId(payload.hostId);

      // Switch the UI from the home screen to the lobby view.
      setView("lobby");

      setPhase("waiting");

      // Clear any previous error messages.
      setErrorMessage(null);
    });

    // Handle "lobbyJoined" event:
    // This is sent only to the client that has just joined a lobby.
    socket.on("lobbyJoined", (payload: {
      lobbyCode: string;
      yourPlayerId: string;
      players: Player[];
      hostId: string;
    }) => {
      // Record the lobby code we joined.
      setLobbyCode(payload.lobbyCode);

      // Record our own player ID.
      setYourPlayerId(payload.yourPlayerId);

      // Record the list of all players currently in the lobby.
      setPlayers(payload.players);

      // Record the host ID, as told by the server.
      setHostId(payload.hostId);

      // Move to the lobby view.
      setView("lobby");

      setPhase("waiting");

      // Clear any error messages on successful join.
      setErrorMessage(null);
    });

    // Handle "lobbyUpdated" event:
    // This is broadcast to all players in a lobby whenever someone joins (and later, leaves).
    socket.on("lobbyUpdated", (payload: {
      lobbyCode: string;
      players: Player[];
      hostId: string;
    }) => {
      // Update our lobby code (should match what we already have).
      setLobbyCode(payload.lobbyCode);

      // Replace the local players array with the latest from the server.
      setPlayers(payload.players);

      // Update host ID in case it ever changes.
      setHostId(payload.hostId);
    });

    // Handle "errorMessage" event:
    // The server uses this to send validation errors or other issues.
    socket.on("errorMessage", (payload: { message: string }) => {
      // Display the error message in the UI.
      setErrorMessage(payload.message);
    });

    // Handle "roleAssignment" event:
    // This is sent privately to each player when the game starts.
    socket.on("roleAssignment", (payload: RoleAssignment) => {
      // Save the role assignment in state (imposter vs player with nbaPlayer).
      setRoleAssignment(payload);

      // Switch view to the role screen so the user can see their role.
      setView("role");

      setPhase("roles");

      // Clear any old errors.
      setErrorMessage(null);
    });

    // OPTIONAL: listen for "phaseUpdated" if you want to inspect phase changes.
    socket.on("phaseUpdated", (payload: { phase: GamePhase }) => {
      setPhase(payload.phase);
      console.log("Phase updated:", payload.phase);

      // We can also switch views based on the phase.
      // - When phase becomes "voting", show the voting screen (later).
      // - When phase becomes "results", show results screen (later).
      //
      // For now, let's just prepare the logic and we'll build
      // the actual Voting/Results UI in the next steps.
      if (payload.phase === "voting") {
        // We will create this view soon.
        // For now, we stay on whatever view we're on.
        // setView("voting");
      } else if (payload.phase === "results") {
        // Similarly, results view comes later.
        // setView("results");
      }
    });

    // Cleanup function:
    // When this component unmounts, remove all these event handlers
    // to avoid memory leaks or multiple bindings.
    return () => {
      socket.off("lobbyCreated");
      socket.off("lobbyJoined");
      socket.off("lobbyUpdated");
      socket.off("errorMessage");
      socket.off("roleAssignment");
      socket.off("phaseUpdated");
    };
  }, []); // Empty dependency array means this runs only once, on mount.

  // ----- Actions: emit events to server -----

  // Called when the user clicks "Create Lobby".
  const handleCreateLobby = () => {
    // Trim whitespace from nickname input.
    const trimmed = nickname.trim();

    // If the nickname is empty, show an error and do nothing.
    if (!trimmed) {
      setErrorMessage("Please enter a nickname first.");
      return;
    }

    // Emit "createLobby" to the server, passing the nickname.
    socket.emit("createLobby", { nickname: trimmed });
  };

  // Called when the user clicks "Join Lobby".
  const handleJoinLobby = () => {
    // Trim both nickname and lobby code inputs.
    const trimmedName = nickname.trim();
    const trimmedCode = lobbyCodeInput.trim().toUpperCase();

    // If either is missing, show an error.
    if (!trimmedName || !trimmedCode) {
      setErrorMessage("Nickname and lobby code are required.");
      return;
    }

    // Emit "joinLobby" to the server with the nickname and lobby code.
    socket.emit("joinLobby", {
      nickname: trimmedName,
      lobbyCode: trimmedCode,
    });
  };

  // Called when the host clicks "Start Game" in the lobby.
  const handleStartGame = () => {
    // We need a lobby code to start the game.
    if (!lobbyCode) {
      setErrorMessage("Lobby code missing.");
      return;
    }

    // Emit "startGame" to the server with the lobbyCode.
    socket.emit("startGame", { lobbyCode });
  };

  // Called when the user is on the Role view and wants to
  // go back to the lobby view (since the actual gameplay is done in person).
  const handleBackToLobby = () => {
    // Simply switch the current view back to the lobby screen.
    setView("lobby");
  };

  const handleStartVoting = () => {

    if (!lobbyCode){
      setErrorMessage("Lobby code missing, cannot start voting!");
      return;
    }

    // Emit "startVoting" to the server.
    // The server will:
    //  - validate that we are the host
    //  - ensure there's an active round
    //  - set phase to "voting"
    //  - emit "phaseUpdated" to everyone
    socket.emit("startVoting", {lobbyCode});
  }

  // ----- Render helpers: Different views -----

  // Render the "Home" view where the user can create or join a lobby.
  const renderHomeView = () => (
    <div style={styles.container}>
      <h1>NBA Imposter Game</h1>

      <div style={styles.card}>
        <label>
          Nickname:
          <input
            style={styles.input}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
          />
        </label>

        <div style={{ marginTop: "1rem" }}>
          <button style={styles.button} onClick={handleCreateLobby}>
            Create Lobby
          </button>
        </div>

        <hr style={{ margin: "1.5rem 0" }} />

        <label>
          Lobby Code:
          <input
            style={styles.input}
            type="text"
            value={lobbyCodeInput}
            onChange={(e) => setLobbyCodeInput(e.target.value)}
            placeholder="e.g. AB9X"
          />
        </label>
        <div style={{ marginTop: "1rem" }}>
          <button style={styles.buttonSecondary} onClick={handleJoinLobby}>
            Join Lobby
          </button>
        </div>

        {errorMessage && <p style={styles.error}>{errorMessage}</p>}
      </div>
    </div>
  );

  // Render the "Lobby" view where players wait before starting the game.
  const renderLobbyView = () => (
    <div style={styles.container}>
      <h1>Lobby</h1>

      {/* Show current phase for debugging/understanding. */}
      <p>
        Current phase:{" "}
        <strong>{phase ?? "unknown"}</strong>
      </p>


      {/* Display the lobby code so players can share it. */}
      {lobbyCode && (
        <p>
          Lobby Code: <strong>{lobbyCode}</strong>
        </p>
      )}

      {/* Display the current player name for clarity. */}
      {yourPlayerId && (
        <p>
          You are:{" "}
          <strong>
            {players.find((p) => p.id === yourPlayerId)?.nickname ?? "Unknown"}
          </strong>
        </p>
      )}

      <div style={styles.card}>
        <h2>Players</h2>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              {player.nickname}
              {/* Mark the host visually. */}
              {player.id === hostId && " (Host)"}
              {/* Mark the current client visually. */}
              {player.id === yourPlayerId && " (You)"}
            </li>
          ))}
        </ul>
      </div>

      {/* Only show "Start Game" if we know we are the host. */}
      {yourPlayerId && hostId === yourPlayerId && (
        <div style={{ marginTop: "1rem" }}>
          <button style={styles.button} onClick={handleStartGame}>
            Start Game
          </button>
        </div>
      )}

 {/* TODO: Make start voting button be available after the game has been started rather than have to go back to the lobby to initiate the voting */}
      {/* Show "Start Voting" for host only when in roles phase.
          This implies:
          - The game has started
          - Roles have been assigned
          - Players have presumably given their clues in person
      */}
      {yourPlayerId &&
        hostId === yourPlayerId &&
        phase === "roles" && (
          <div style={{ marginTop: "1rem" }}>
            <button style={styles.buttonSecondary} onClick={handleStartVoting}>
              Start Voting
            </button>
          </div>
        )}

      {errorMessage && <p style={styles.error}>{errorMessage}</p>}
    </div>
  );

  // Render the "Role" view, which shows the user whether they are
  // the imposter or a regular player, and the NBA player if applicable.
  const renderRoleView = () => (
    <div style={styles.container}>
      <h1>Your Role</h1>

      {/* Show phase here too so you can see when it moves to "voting". */}
      <p>
        Current phase:{" "}
        <strong>{phase ?? "unknown"}</strong>
      </p> 

      <div style={styles.card}>
        {/* If we haven't received a roleAssignment yet, inform the user. */}
        {!roleAssignment && <p>Waiting for role assignment...</p>}

        {/* If we have a roleAssignment, branch on the role type. */}
        {roleAssignment?.role === "imposter" && (
          <>
            <h2>You are the Imposter 👀</h2>
            <p>
              Everyone else sees the same NBA player name. You don't. Listen
              carefully to their clues and try to blend in!
            </p>
          </>
        )}

        {roleAssignment?.role === "player" && "nbaPlayer" in roleAssignment && (
          <>
            <h2>You are a Player 🏀</h2>
            <p>
              Your NBA player is:{" "}
              <strong>{roleAssignment.nbaPlayer}</strong>
            </p>
            <p>
              Give clues that relate to this player without being too obvious,
              so you don't make it easy for the imposter.
            </p>
          </>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button style={styles.buttonSecondary} onClick={handleBackToLobby}>
          Back to Lobby
        </button>
      </div>

      {errorMessage && <p style={styles.error}>{errorMessage}</p>}
    </div>
  );

  // Decide which view to render based on the current 'view' state.
  if (view === "home") {
    return renderHomeView();
  } else if (view === "lobby") {
    return renderLobbyView();
  } else {
    // view === "role"
    return renderRoleView();
  }
}

// Simple inline styles for basic layout and styling.
// This avoids having to manage external CSS files for now.
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "1.5rem",
    marginTop: "1rem",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
  input: {
    width: "100%",
    padding: "0.5rem",
    marginTop: "0.5rem",
    borderRadius: 4,
    border: "1px solid #ccc",
  },
  button: {
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 600,
  },
  buttonSecondary: {
    padding: "0.5rem 1rem",
    borderRadius: 4,
    border: "1px solid #333",
    background: "#fff",
    cursor: "pointer",
  },
  error: {
    color: "red",
    marginTop: "1rem",
  },
};

export default App;
