/**
 * Default server-side persona resolver.
 *
 * Adopters should replace this with their own resolver that maps their
 * authenticated session shape to Wayfinder persona strings.
 *
 * Built-in behaviour (in priority order):
 *   1. `null` / `undefined` session → `[]`  (unauthenticated — fail closed)
 *   2. Session object with a `roles` array → return that array
 *   3. Any other truthy session → `["user"]`  (authenticated, no roles)
 */
export function defaultPersonaResolver(session: unknown): string[] {
  if (session === null || session === undefined) {
    return [];
  }

  if (
    typeof session === "object" &&
    "roles" in session &&
    Array.isArray((session as { roles: unknown }).roles)
  ) {
    return (session as { roles: string[] }).roles.filter(
      (r) => typeof r === "string",
    );
  }

  return ["user"];
}
