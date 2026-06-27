export interface RedactionOptions {
  extraGlobs?: string[];
}

/**
 * Redacts sensitive content before any hashing or sending to LLM.
 * This version is intentionally simple; real adapters enhance it.
 */
export function redactContent(
  filePath: string,
  content: string,
  opts: RedactionOptions = {},
): string {
  const lower = filePath.toLowerCase();

  const sensitive =
    lower.includes(".env") ||
    lower.includes("secret") ||
    lower.endsWith(".key") ||
    lower.includes("credential") ||
    (opts.extraGlobs ?? []).some((g) => lower.includes(g.toLowerCase()));

  if (sensitive) {
    return `// [REDACTED FILE: ${filePath}]\n`;
  }
  return content;
}
