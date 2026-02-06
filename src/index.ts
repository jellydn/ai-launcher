#!/usr/bin/env bun

import { runCli } from "./cli/run";

async function main(): Promise<void> {
  await runCli(process.argv.slice(2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
