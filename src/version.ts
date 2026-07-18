import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolve the package version for dev and source runs.
 * `scripts/build.sh` overwrites this file with a compile-time constant so the
 * standalone binary does not need package.json next to it.
 */
function readPackageVersion(): string {
  try {
    const pkgPath = join(import.meta.dir, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    if (typeof pkg.version === "string" && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    // Fall through when package.json is unavailable (e.g. partial installs).
  }
  return "0.0.0-dev";
}

export const VERSION = readPackageVersion();
