/**
 * Heuristic to derive whether a route is live (available: true) or behind a
 * feature flag / not yet deployed (available: false).
 *
 * A route is considered NOT available when either:
 *
 * 1. Its source bundle contains a feature-flag marker string:
 *    - FEATURE_         — common SCREAMING_SNAKE prefix (e.g. FEATURE_FLAG, FEATURE_NEW_UI)
 *    - featureFlag      — camelCase call/import (e.g. featureFlag('x'))
 *    - feature_flag     — snake_case reference
 *    - isEnabled(       — generic flag check function
 *    - getFlag(         — generic flag getter
 *    - flags.           — flag-bag property access (e.g. flags.newDashboard)
 *    - FF_              — common FF_ prefix (e.g. FF_BETA_ROUTE)
 *    - process.env.NEXT_PUBLIC_FLAG — Next.js public env-var flag pattern
 *
 * 2. The routeKey contains a path segment starting with `_` (conventional
 *    Next.js "disabled" / work-in-progress prefix, e.g. /_wip or /foo/_draft).
 *
 * Config escape hatch: if your project uses a different convention, call
 * `deriveAvailable` with a pre-processed `sourceBundle` that has had
 * false-positive markers stripped before passing it here.
 */

/** Markers in source that indicate the route is feature-flag gated. */
const FLAG_MARKERS = [
  "FEATURE_",
  "featureFlag",
  "feature_flag",
  "isEnabled(",
  "getFlag(",
  "flags.",
  "FF_",
  "process.env.NEXT_PUBLIC_FLAG",
] as const;

/**
 * Returns `true` if the route is live/available, `false` if it appears to be
 * behind a feature flag or follows the conventional disabled-route prefix.
 *
 * @param routeKey    - The route key, e.g. `/dashboard` or `/_wip-feature`.
 * @param sourceBundle - The (already-redacted) source text of the route file(s).
 */
export function deriveAvailable(
  routeKey: string,
  sourceBundle: string,
): boolean {
  // Convention: any path segment starting with `_` marks the route as disabled.
  // We check for "/_ " which covers both top-level (/_ ...) and nested segments.
  if (routeKey.includes("/_")) {
    return false;
  }

  // Source-level feature-flag markers
  for (const marker of FLAG_MARKERS) {
    if (sourceBundle.includes(marker)) {
      return false;
    }
  }

  return true;
}
