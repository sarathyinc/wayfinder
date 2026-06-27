/**
 * createAssistHandler — Next.js App Router POST route handler factory.
 *
 * ## Session convention
 * The handler extracts a session token from the incoming request using two
 * standard HTTP conventions (checked in order):
 *
 *   1. **Cookie** named `session`: If the `Cookie` header contains a
 *      `session=<value>` pair, the session object will be
 *      `{ sessionCookie: "<value>" }`.
 *
 *   2. **Authorization header**: If an `Authorization` header is present
 *      (e.g. `Bearer <token>`), the session object will be
 *      `{ authorization: "<header-value>" }`.
 *
 * If neither is present the session passed to `getPersonas` is `null`.
 * Adopters that use a different session mechanism (e.g. iron-session, JWT
 * cookies with a different name, Clerk auth) should call `getPersonas` with
 * whatever session data they retrieve from the request *before* delegating to
 * this handler, or wrap this handler and pass a custom `getPersonas` that
 * ignores the raw session token and looks up its own store.
 *
 * ## Fail-closed security
 * If `getPersonas` throws, returns an empty array, or the resulting filtered
 * graph is empty, the handler returns a `{ kind: "refuse" }` response. The
 * client never receives capability data outside the resolved persona set.
 */

import type { CapabilityGraph, CompileProvider } from "@wayfinder/core";
import { handleAssistChat, isAssistChatRequest } from "@wayfinder/core";

export interface CreateAssistHandlerOptions {
  /** The compiled capability graph for this application. */
  graph: CapabilityGraph;
  /** LLM provider used for intent matching (mock / openai / anthropic / …). */
  provider: CompileProvider;
  /**
   * Server-side persona resolver. Receives the extracted session token (or
   * `null`) and must return the list of persona strings for that session.
   *
   * Throwing or returning `[]` is treated as fail-closed: the handler returns
   * a `{ kind: "refuse", reason: "off_topic" }` response.
   */
  getPersonas: (session: unknown) => string[] | Promise<string[]>;
}

/**
 * Returns a `(req: Request) => Promise<Response>` compatible with Next.js
 * App Router route handlers (`export { handler as POST }`).
 */
export function createAssistHandler(
  opts: CreateAssistHandlerOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // --- 1. Parse request body ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid JSON" }, 400);
    }

    if (!isAssistChatRequest(body)) {
      return jsonResponse({ error: "missing required field: query" }, 400);
    }

    // --- 2. Extract session from request headers (server-side only) ---
    const session = extractSession(req);

    // --- 3. Resolve personas (fail-closed) ---
    let personas: string[];
    try {
      const resolved = await opts.getPersonas(session);
      personas = Array.isArray(resolved) ? resolved : [];
    } catch {
      // getPersonas threw — fail closed
      personas = [];
    }

    // --- 4. Call core handler ---
    // The ctx.getPersonas here is a synchronous wrapper that returns the
    // already-resolved list. The body's `persona` field (if any) is ignored
    // because AssistChatRequest has no persona field — it is stripped by
    // isAssistChatRequest validation.
    const assistReq = {
      query: body.query,
      locale: body.locale,
      context: body.context,
    };
    const response = await handleAssistChat(assistReq, session, {
      graph: opts.graph,
      provider: opts.provider,
      getPersonas: () => personas,
    });

    return jsonResponse(response, 200);
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract a lightweight session descriptor from the request headers.
 *
 * Priority:
 *   1. `Cookie: session=<value>` → `{ sessionCookie: value }`
 *   2. `Authorization: <value>` → `{ authorization: value }`
 *   3. Neither present → `null`
 */
function extractSession(req: Request): unknown {
  // Check for session cookie first
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const sessionValue = parseCookieValue(cookieHeader, "session");
    if (sessionValue !== null && sessionValue !== "") {
      return { sessionCookie: sessionValue };
    }
  }

  // Fall back to Authorization header
  const auth = req.headers.get("authorization");
  if (auth) {
    return { authorization: auth };
  }

  return null;
}

/**
 * Parse a specific cookie value from a `Cookie` header string.
 * Returns `null` if the cookie is not present.
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  for (const pair of cookieHeader.split(";")) {
    const [rawKey, ...rest] = pair.split("=");
    if (rawKey === undefined) continue;
    const key = rawKey.trim();
    if (key === name) {
      return rest.join("=").trim();
    }
  }
  return null;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
