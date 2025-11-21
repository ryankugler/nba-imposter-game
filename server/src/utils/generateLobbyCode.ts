/**
 * Generates a 4-character lobby code using a restricted
 * set of characters to avoid ambiguity (no 0/O, 1/I).
 * 
 * We keep this logic separate to:
 * - Make index.ts simpler
 * - Allow later testing (unit tests)
 */
export function generateLobbyCode(
  existingCodes: Set<string>,
  length: number = 4
): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  // Loop until we generate a unique lobby code not in our state Map
  do {
    code = "";

    for (let i = 0; i < length; i++) {
      const index = Math.floor(Math.random() * chars.length);
      code += chars[index];
    }
  } while (existingCodes.has(code));

  return code;
}
