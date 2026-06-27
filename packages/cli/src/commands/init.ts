import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compileCommand } from "./compile.js";

export async function initCommand(dir = ".", options: { provider?: string } = {}) {
  const root = dir;
  console.log(`[assist] Initializing Wayfinder in ${root}...`);

  const configDir = join(root, ".assist");
  mkdirSync(configDir, { recursive: true });

  const provider = options.provider || "mock";
  const config = { provider, adapter: "nextjs" };
  writeFileSync(join(configDir, "config.json"), JSON.stringify(config, null, 2));
  console.log("Created .assist/config.json");

  await compileCommand(root, { provider });

  // If this looks like the demo, ensure layout uses the widget (already does in our setup)
  const layoutPath = join(root, "app/layout.tsx");
  try {
    const layout = readFileSync(layoutPath, "utf8");
    if (!layout.includes("AssistWidget")) {
      console.log("Note: Add <AssistWidget /> to your layout for the widget.");
    }
  } catch {}

  console.log("\n[assist] Init complete!");
  console.log("Use local: pnpm --filter @wayfinder/cli run dev:assist -- --help");
  console.log("For the demo: cd examples/nextjs-demo && pnpm dev");
}
