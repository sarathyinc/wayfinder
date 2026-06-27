import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import rule from "./no-unregistered-action.js";

const tester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: { jsx: true },
    sourceType: "module",
  },
});

describe("no-unregistered-action", () => {
  it("passes valid cases and rejects invalid cases", () => {
    tester.run("no-unregistered-action", rule, {
      valid: [
        // button with data-action-id AND matching defineAction — no warning
        `
          import { defineAction } from "@wayfinder/core";
          defineAction({ id: "submit-form" });
          <button onClick={handleClick} data-action-id="submit-form">Submit</button>
        `,
        // button with onClick but NO data-action-id — not opted in, no warning
        `<button onClick={handleClick}>Submit</button>`,
        // anchor with data-action-id AND defineAction — no warning
        `
          defineAction({ id: "nav-home" });
          <a onClick={go} data-action-id="nav-home">Home</a>
        `,
      ],
      invalid: [
        // button with data-action-id but no defineAction — should warn
        {
          code: `<button onClick={handleClick} data-action-id="submit-form">Submit</button>`,
          errors: [
            { messageId: "unregistered", data: { actionId: "submit-form" } },
          ],
        },
        // anchor with data-action-id but no defineAction — should warn
        {
          code: `<a onClick={go} data-action-id="nav-home">Home</a>`,
          errors: [
            { messageId: "unregistered", data: { actionId: "nav-home" } },
          ],
        },
        // defineAction exists for DIFFERENT id — should still warn for unregistered one
        {
          code: `
            defineAction({ id: "other-action" });
            <button onClick={f} data-action-id="submit-form">Submit</button>
          `,
          errors: [
            { messageId: "unregistered", data: { actionId: "submit-form" } },
          ],
        },
      ],
    });
  });
});
