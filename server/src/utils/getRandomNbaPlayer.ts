/**
 * Temporary list of NBA players.
 * Later we can load this from a JSON file or database.
 */
const NBA_PLAYERS = [
  "LeBron James",
  "Stephen Curry",
  "Kevin Durant",
  "Kawhi Leonard",
  "Giannis Antetokounmpo",
  "James Harden",
  "Nikola Jokic",
  "Luka Doncic",
  "Joel Embiid",
  "Damian Lillard",
];

/**
 * Picks a random NBA player from the player pool.
 */
export function getRandomNbaPlayer(): string {
  if (NBA_PLAYERS.length === 0) {
    throw new Error("NBA_PLAYERS list is empty");
  }

  const index = Math.floor(Math.random() * NBA_PLAYERS.length);
  const player = NBA_PLAYERS[index];
  if (player === undefined) {
    throw new Error("Failed to select an NBA player");
  }
  return player;
}
