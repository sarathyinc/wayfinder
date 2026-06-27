import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/react/AssistWidget.tsx"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "next"],
});