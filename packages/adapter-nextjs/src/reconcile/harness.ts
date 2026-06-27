/**
 * Playwright integration for the reconciliation harness.
 *
 * This is the only file in the reconcile/ module that imports Playwright.
 * Keep it thin — just orchestration. The diff logic lives in diff.ts.
 */

import type { CapabilityGraph } from "@wayfinder/core";
import { diff } from "./diff.js";
import type { ControlSnapshot, ReconcileResult } from "./types.js";

/**
 * Minimal subset of the Playwright Page API used by the harness.
 * Defined locally so playwright types are not required at compile time
 * (playwright is an optional peerDependency).
 */
interface PlaywrightPage {
  goto(url: string, opts?: { waitUntil?: string }): Promise<unknown>;
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
  close(): Promise<void>;
}

interface PlaywrightBrowser {
  newPage(): Promise<PlaywrightPage>;
  close(): Promise<void>;
}

export interface RunReconciliationOptions {
  baseUrl: string;
  graph: CapabilityGraph;
  personas: string[];
  /** Optional: set up auth cookies / localStorage per persona before crawling. */
  authenticate?: (persona: string, page: PlaywrightPage) => Promise<void>;
}

/**
 * For each persona, navigate to every route in their graph slice,
 * snapshot actionable controls, and diff against the graph.
 */
export async function runReconciliation(
  opts: RunReconciliationOptions,
): Promise<ReconcileResult[]> {
  // Dynamically import playwright so the module only fails at runtime when
  // playwright is not installed — not at import time for non-Playwright users.
  // We use Function() to keep tsc from resolving the specifier at compile
  // time (playwright is an optional peer dep with no guaranteed @types entry).
  const playwrightMod = (await Function(
    "s",
    "return import(s)",
  )("playwright")) as {
    chromium: {
      launch(opts: { headless: boolean }): Promise<PlaywrightBrowser>;
    };
  };
  const { chromium } = playwrightMod;

  const browser = await chromium.launch({ headless: true });
  const results: ReconcileResult[] = [];

  try {
    for (const persona of opts.personas) {
      const personaActions = opts.graph.actions.filter((a) =>
        a.personas.includes(persona),
      );
      const routes = [...new Set(personaActions.map((a) => a.route))];

      const snapshots: ControlSnapshot[] = [];

      for (const route of routes) {
        const page = await browser.newPage();
        try {
          if (opts.authenticate) {
            await opts.authenticate(persona, page);
          }

          const url = opts.baseUrl.replace(/\/$/, "") + route;
          await page.goto(url, { waitUntil: "networkidle" });

          const routeSnapshots = await snapshotControls(page, route);
          snapshots.push(...routeSnapshots);
        } finally {
          await page.close();
        }
      }

      results.push(diff(persona, snapshots, opts.graph));
    }
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Snapshot all actionable controls on the current page.
 * Targets: button, [role=button], a[href], input[type=submit]
 */
async function snapshotControls(
  page: PlaywrightPage,
  route: string,
): Promise<ControlSnapshot[]> {
  return page.evaluate((r: string) => {
    const SELECTOR = 'button, [role="button"], a[href], input[type="submit"]';
    const elements = Array.from(document.querySelectorAll(SELECTOR));

    return elements.map((el) => {
      // Build a stable selector: prefer data-testid, then id, then tag+text
      let selector = "";
      const testId =
        el.getAttribute("data-testid") || el.getAttribute("data-test-id");
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (el.id) {
        selector = `#${el.id}`;
      } else {
        selector = el.tagName.toLowerCase();
      }

      const role =
        el.getAttribute("role") ||
        (el.tagName === "BUTTON"
          ? "button"
          : el.tagName === "A"
            ? "link"
            : el.tagName === "INPUT"
              ? "input"
              : undefined);

      const text =
        (el as HTMLElement).innerText?.trim() ||
        el.getAttribute("aria-label") ||
        (el as HTMLInputElement).value ||
        undefined;

      return {
        selector,
        text: text || undefined,
        role: role || undefined,
        route: r,
      };
    });
  }, route);
}
