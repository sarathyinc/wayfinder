import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CompileProvider } from "@wayfinder/core";
import { _resetRegistry, defineAction, defineTask } from "@wayfinder/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProjectDir(): string {
  const dir = join(
    tmpdir(),
    `wayfinder-test-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(dir, "app", "dashboard"), { recursive: true });
  mkdirSync(join(dir, ".assist"), { recursive: true });
  return dir;
}

function writePageFile(dir: string, subpath: string, content: string) {
  const full = join(dir, "app", subpath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

const DASHBOARD_PAGE = `export default function Dashboard() { return <div>Dashboard</div>; }`;
const USERS_PAGE = `export default function Users() { return <div>Users</div>; }`;

// ---------------------------------------------------------------------------
// Structure-hash caching tests (G6)
// ---------------------------------------------------------------------------

describe("compile: structure-hash flow-pass caching", () => {
  it("unchanged structure does NOT call suggestTasks again", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      // Dynamic import to get fresh module per test
      const { compileCommand } = await import("./commands/compile.js");

      // First compile: should call suggestTasks
      const provider1: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([
          {
            id: "first-task",
            title: "First task",
            personas: ["user"],
            sequence: [],
            confidence: 0.8,
          },
        ]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider1 });
      expect(provider1.suggestTasks).toHaveBeenCalledTimes(1);

      // Second compile with same structure: should NOT call suggestTasks again
      const provider2: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider2 });
      expect(provider2.suggestTasks).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("changed structure (new action) calls suggestTasks again", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      const { compileCommand } = await import("./commands/compile.js");

      const provider1: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([
          {
            id: "first-task",
            title: "First task",
            personas: ["user"],
            sequence: [],
            confidence: 0.8,
          },
        ]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider1 });
      expect(provider1.suggestTasks).toHaveBeenCalledTimes(1);

      // Add a new route — changes structure
      writePageFile(dir, "users/page.tsx", USERS_PAGE);

      const provider2: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Users",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([
          {
            id: "second-task",
            title: "Second task",
            personas: ["user"],
            sequence: [],
            confidence: 0.8,
          },
        ]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider2 });
      expect(provider2.suggestTasks).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Gate: structure hash checks (G6)
// ---------------------------------------------------------------------------

describe("gate: structure-hash check", () => {
  it("fails when structure hash is missing from cache", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      const { compileCommand } = await import("./commands/compile.js");
      const { gateCommand } = await import("./commands/gate.js");

      const provider: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      // Compile to create capability_graph.json
      await compileCommand(dir, { _provider: provider });

      // Corrupt the cache by removing the tasks.structureHash
      const cachePath = join(dir, ".assist", "compile_cache.json");
      const cache = JSON.parse(
        (await import("node:fs")).readFileSync(cachePath, "utf8"),
      );
      delete cache.tasks;
      (await import("node:fs")).writeFileSync(
        cachePath,
        JSON.stringify(cache, null, 2),
      );

      // Gate should fail
      await expect(gateCommand(dir)).rejects.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes when structure hash is present in cache", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      const { compileCommand } = await import("./commands/compile.js");
      const { gateCommand } = await import("./commands/gate.js");

      const provider: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([
          {
            id: "first-task",
            title: "First task",
            personas: ["user"],
            sequence: [],
            confidence: 0.8,
          },
        ]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      // Compile first to generate the cache
      await compileCommand(dir, { _provider: provider });

      // Gate should pass
      await expect(gateCommand(dir)).resolves.not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Annotation merge tests (G7)
// ---------------------------------------------------------------------------

describe("compile: annotation merge", () => {
  beforeEach(() => {
    _resetRegistry();
  });

  it("annotation overrides LLM label and steps for same action id", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      // Populate the registry directly — same module realm as compileCommand.
      // (File-based loading is the production path; registry-direct is the
      // unit-test path since vite-node can't resolve deps from a tmpdir file.)
      defineAction({
        id: "dashboard.view",
        label: "Annotated Dashboard Label",
        steps: ["step from annotation"],
      });

      const { compileCommand } = await import("./commands/compile.js");

      const provider: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "LLM Dashboard",
          steps: ["llm step"],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider });

      const graph = JSON.parse(
        (await import("node:fs")).readFileSync(
          join(dir, "capability_graph.json"),
          "utf8",
        ),
      );

      const dashAction = graph.actions.find(
        (a: { id: string }) => a.id === "dashboard.view",
      );
      expect(dashAction).toBeDefined();
      expect(dashAction.label).toBe("Annotated Dashboard Label");
      expect(dashAction.steps).toEqual(["step from annotation"]);
    } finally {
      _resetRegistry();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("annotated task wins over suggested task with same id", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      // Populate registry directly.
      defineTask({
        id: "view-dashboard",
        title: "Annotated Task Title",
        personas: ["admin"],
        sequence: ["dashboard.view"],
        source: "annotated",
      });

      const { compileCommand } = await import("./commands/compile.js");

      const provider: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([
          {
            id: "view-dashboard",
            title: "LLM Suggested Task",
            personas: ["user"],
            sequence: ["dashboard.view"],
            confidence: 0.7,
          },
        ]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider });

      const graph = JSON.parse(
        (await import("node:fs")).readFileSync(
          join(dir, "capability_graph.json"),
          "utf8",
        ),
      );

      const tasks = graph.tasks.filter(
        (t: { id: string }) => t.id === "view-dashboard",
      );
      // Only one task with this id (annotation wins, deduped)
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Annotated Task Title");
      expect(tasks[0].source).toBe("annotated");
    } finally {
      _resetRegistry();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("duplicate action id detection still works after annotation merge", async () => {
    const dir = makeProjectDir();
    try {
      writePageFile(dir, "dashboard/page.tsx", DASHBOARD_PAGE);

      const { compileCommand } = await import("./commands/compile.js");
      const { validateGraph } = await import("@wayfinder/core");

      const provider: CompileProvider = {
        name: "mock",
        compilePerRoute: vi.fn().mockResolvedValue({
          description: "Dashboard",
          steps: [],
          fields: [],
          synonyms: [],
        }),
        suggestTasks: vi.fn().mockResolvedValue([]),
        matchIntent: vi.fn().mockResolvedValue({ kind: "app_unknown" }),
      };

      await compileCommand(dir, { _provider: provider });

      const graph = JSON.parse(
        (await import("node:fs")).readFileSync(
          join(dir, "capability_graph.json"),
          "utf8",
        ),
      );

      // Manually inject a duplicate action
      graph.actions.push({ ...graph.actions[0] });

      const result = validateGraph(graph);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((e) =>
            e.message.toLowerCase().includes("duplicate"),
          ),
        ).toBe(true);
      }
    } finally {
      _resetRegistry();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
