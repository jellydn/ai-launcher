import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Dev/source runs read package.json. `scripts/build.sh` overwrites this file
 * with `export const VERSION = "x.y.z"` so compiled binaries need no package.json.
 */
function readPackageVersion(): string {
  try {
    const pkgPath = join(import.meta.dir, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version || "0.0.0-dev";
  } catch {
    return "0.0.0-dev";
  }
}

export const VERSION = readPackageVersion();
