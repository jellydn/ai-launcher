import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const INSTALLER = resolve(import.meta.dir, "../install.sh");
const OLD_BINARY = "existing executable\n";

describe("shell installer", () => {
  let root: string;
  let installDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "ai-install-"));
    const bin = join(root, "bin");
    installDir = join(root, "Users", "Dung Huynh Duc", ".local", "bin");
    mkdirSync(bin);
    mkdirSync(installDir, { recursive: true });
    writeFileSync(join(installDir, "ai.exe"), OLD_BINARY);
    const binary = '#!/bin/sh\n[ "$1" = "--version" ] || exit 9\necho "ai-launcher v0.16.3"\n';
    writeFileSync(join(root, "binary"), binary, { mode: 0o755 });
    writeFileSync(
      join(root, "checksums"),
      `${createHash("sha256").update(binary).digest("hex")}  ai-windows-x64.exe\n`
    );
    writeFileSync(
      join(root, "release"),
      JSON.stringify({
        assets: ["ai-windows-x64.exe", "checksums.txt"].map((name) => ({
          name,
          browser_download_url: `https://fixtures.invalid/${name}`,
        })),
      })
    );
    const executable = (name: string, script: string): void => {
      writeFileSync(join(bin, name), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
    };
    executable("uname", '[ "$1" = "-s" ] && echo MINGW64_NT-10.0 || echo x86_64');
    executable("sleep", "exit 0");
    executable(
      "curl",
      `output=""
url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o|--output) output="$2"; shift ;;
    https://*) url="$1" ;;
  esac
  shift
done
case "$url" in
  */releases/latest) kind=release ;;
  */checksums.txt) kind=checksums ;;
  */ai-windows-x64.exe) kind=binary ;;
  *) exit 99 ;;
esac
echo "$kind" >> "$FIXTURE_ROOT/calls"
count_file="$FIXTURE_ROOT/$kind-count"
count=0
[ ! -f "$count_file" ] || count=$(cat "$count_file")
count=$((count + 1))
echo "$count" > "$count_file"
if [ "$kind" = "$FAIL_KIND" ] && [ "$count" -le "$FAIL_COUNT" ]; then
  [ -z "$output" ] || printf partial > "$output"
  echo "$FAIL_MESSAGE" >&2
  exit "$FAIL_CODE"
fi
if [ -n "$output" ]; then
  cp "$FIXTURE_ROOT/$kind" "$output"
  chmod +x "$output"
else
  cat "$FIXTURE_ROOT/$kind"
fi`
    );
    env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      AI_INSTALL_DIR: installDir,
      FIXTURE_ROOT: root,
      FAIL_KIND: "binary",
      FAIL_COUNT: "0",
      FAIL_CODE: "56",
      FAIL_MESSAGE: "curl: (56) Recv failure: Connection was reset",
    };
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function run(): { status: number; output: string } {
    const result = Bun.spawnSync(["sh", INSTALLER], { env });
    return {
      status: result.exitCode,
      output: result.stdout.toString() + result.stderr.toString(),
    };
  }

  function expectPreserved(result: ReturnType<typeof run>): void {
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain("✓ Installed");
    expect(readFileSync(join(installDir, "ai.exe"), "utf8")).toBe(OLD_BINARY);
    expect(readdirSync(installDir)).toEqual(["ai.exe"]);
  }

  function calls(kind: string): number {
    return readFileSync(join(root, "calls"), "utf8")
      .split("\n")
      .filter((line) => line === kind).length;
  }

  test("installs a verified executable in a Windows home path with spaces", () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.output).toContain("✓ Installed ai.exe");
    expect(readFileSync(join(installDir, "ai.exe"))).toEqual(readFileSync(join(root, "binary")));
    expect(readdirSync(installDir)).toEqual(["ai.exe"]);
  });

  for (const kind of ["release", "binary", "checksums"]) {
    test(`preserves the existing executable after exhausted ${kind} downloads`, () => {
      Object.assign(env, { FAIL_KIND: kind, FAIL_COUNT: "9" });
      expectPreserved(run());
      expect(calls(kind)).toBe(3);
    });
  }

  for (const code of [7, 18, 28, 52, 56, 35]) {
    test(`recovers from curl ${code} without installing partial content`, () => {
      Object.assign(env, {
        FAIL_COUNT: "1",
        FAIL_CODE: String(code),
        FAIL_MESSAGE: `curl: (${code}) Recv failure: Connection was reset`,
      });
      const result = run();
      expect(result.status).toBe(0);
      expect(calls("binary")).toBe(2);
      expect(readFileSync(join(installDir, "ai.exe"))).toEqual(readFileSync(join(root, "binary")));
    });
  }

  for (const [code, message] of [
    [35, "curl: (35) SSL connect error"],
    [35, "curl: (35) schannel: protocol version mismatch"],
    [60, "curl: (60) SSL certificate problem"],
    [22, "curl: (22) The requested URL returned error: 404"],
  ] as const) {
    test(`does not retry persistent failure: ${message}`, () => {
      Object.assign(env, { FAIL_COUNT: "9", FAIL_CODE: String(code), FAIL_MESSAGE: message });
      expectPreserved(run());
      expect(calls("binary")).toBe(1);
    });
  }

  test("bounds repeated curl 35 resets", () => {
    Object.assign(env, { FAIL_COUNT: "9", FAIL_CODE: "35" });
    expectPreserved(run());
    expect(calls("binary")).toBe(3);
  });

  for (const checksum of [
    `${"0".repeat(64)}  ai-windows-x64.exe\n`,
    `${"0".repeat(64)}  other-ai-windows-x64.exe\n`,
    "invalid  ai-windows-x64.exe\n",
    "",
  ]) {
    test(`rejects invalid or missing checksum entry: ${JSON.stringify(checksum)}`, () => {
      writeFileSync(join(root, "checksums"), checksum);
      expectPreserved(run());
    });
  }

  test("rejects a release without checksums", () => {
    const release = JSON.parse(readFileSync(join(root, "release"), "utf8"));
    release.assets.pop();
    writeFileSync(join(root, "release"), JSON.stringify(release));
    expectPreserved(run());
  });

  test("rejects a checksum-valid executable whose version check fails", () => {
    const binary = "#!/bin/sh\nexit 126\n";
    writeFileSync(join(root, "binary"), binary);
    writeFileSync(
      join(root, "checksums"),
      `${createHash("sha256").update(binary).digest("hex")}  ai-windows-x64.exe\n`
    );
    expectPreserved(run());
  });

  test("preserves the executable when replacement fails (such as a Windows file lock)", () => {
    writeFileSync(join(root, "bin", "mv"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    expectPreserved(run());
  });

  test("does not install when SHA-256 tools are absent", () => {
    const bin = join(root, "bin");
    for (const command of [
      "sh",
      "mkdir",
      "mktemp",
      "rm",
      "cat",
      "cp",
      "chmod",
      "jq",
      "head",
      "awk",
      "grep",
    ]) {
      const path = Bun.which(command);
      if (!path) throw new Error(`Missing fixture dependency: ${command}`);
      symlinkSync(path, join(bin, command));
    }
    env.PATH = bin;
    expectPreserved(run());
  });

  test("failed first install leaves no executable or staging files", () => {
    rmSync(join(installDir, "ai.exe"));
    env.FAIL_COUNT = "9";
    const result = run();
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain("✓ Installed");
    expect(readdirSync(installDir)).toEqual([]);
  });
});
