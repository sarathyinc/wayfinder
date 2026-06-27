#!/usr/bin/env node
import { cac } from "cac";
import { initCommand } from "./commands/init.js";
import { discoverCommand } from "./commands/discover.js";
import { compileCommand } from "./commands/compile.js";
import { gateCommand } from "./commands/gate.js";

const cli = cac("assist");

cli
  .command("init [dir]", "Initialize Wayfinder in a project")
  .option("--provider <provider>", "LLM provider (mock|ollama|openai|anthropic)", { default: "mock" })
  .action(initCommand);

cli
  .command("discover [dir]", "Run deterministic discovery")
  .action(discoverCommand);

cli
  .command("compile [dir]", "Compile the capability graph using LLM provider")
  .option("--provider <provider>", "Provider to use", { default: "mock" })
  .action(compileCommand);

cli
  .command("gate [dir]", "Run drift gate (no LLM required)")
  .action(gateCommand);

cli.help();
cli.version("0.0.0");

cli.parse();
