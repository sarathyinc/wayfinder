import type { CapabilityGraph, CompileProvider } from "@wayfinder/core";
import { handleAssistChat, isAssistChatRequest } from "@wayfinder/core";

export interface CreateRemixAssistHandlerOptions {
  graph: CapabilityGraph;
  provider: CompileProvider;
  getPersonas: (session: unknown) => string[] | Promise<string[]>;
}

/**
 * createRemixAssistHandler — Remix action handler factory for POST /assist/chat.
 *
 * Usage in a Remix action:
 *   export const action = createRemixAssistHandler({ graph, provider, getPersonas });
 *
 * Session extraction:
 *   Reads "session" cookie or Authorization header from the Remix Request object.
 *   Same conventions as the Next.js adapter.
 */
export function createRemixAssistHandler(
  opts: CreateRemixAssistHandlerOptions,
): (args: { request: Request }) => Promise<Response> {
  return async ({ request }) => {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Session extraction — same cookie/Authorization convention as Next.js adapter
    let session: unknown = null;
    const cookieHeader = request.headers.get("Cookie") ?? "";
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    if (sessionMatch) {
      session = { sessionCookie: sessionMatch[1] };
    } else {
      const auth = request.headers.get("Authorization");
      if (auth) session = { authorization: auth };
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isAssistChatRequest(body)) {
      return new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve personas upfront so we can pass a sync getter to handleAssistChat
    const resolvedPersonas = await opts.getPersonas(session);

    const result = await handleAssistChat(body, session, {
      graph: opts.graph,
      provider: opts.provider,
      getPersonas: () => resolvedPersonas,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
