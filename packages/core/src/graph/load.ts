import { validateGraph, type ValidateResult } from "./validate.js";

export function loadGraph(json: string): ValidateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      ok: false,
      errors: [
        { code: "schema", message: `invalid JSON: ${(err as Error).message}` },
      ],
    };
  }
  return validateGraph(parsed);
}
