import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { VERSION } from "../src/version";

const ROOT = resolve(import.meta.dir, "..");
const BIN = process.env.AI_LAUNCHER_BIN?.trim() || "";

type RunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runAi(args: string[], env: NodeJS.ProcessEnv, stdin?: string): RunResult {
  const command = BIN
    ? spawnSync(BIN, args, {
        cwd: ROOT,
        env,
        input: stdin,
        encoding: "utf-8",
        shell: false,
      })
    : spawnSync("bun", ["run", "src/index.ts", ...args], {
        cwd: ROOT,
        env,
        input: stdin,
        encoding: "utf-8",
        shell: false,
      });

  return {
    status: command.status,
    stdout: command.stdout ?? "",
    stderr: command.stderr ?? "",
  };
}

function writeExecutable(path: string, body: string): void {
  writeFileSync(path, body, { mode: 0o755 });
  chmodSync(path, 0o755);
}

async function runAiInTerminal(
  args: string[],
  env: NodeJS.ProcessEnv,
  answer: string
): Promise<{ status: number; output: string }> {
  let output = "";
  let answered = false;
  const command = BIN ? [resolve(BIN), ...args] : ["bun", "run", "src/index.ts", ...args];
  const child = Bun.spawn(["bash", "-c", '"$@" && echo CHAIN_RAN', "bash", ...command], {
    cwd: ROOT,
    env,
    terminal: {
      cols: 100,
      rows: 24,
      data(terminal, data) {
        output += Buffer.from(data).toString();
        if (!answered && output.includes("Continue? [y/N]")) {
          answered = true;
          setTimeout(() => {
            terminal.write(answer);
            if (answer === "y" || answer === "n") {
              setTimeout(() => terminal.write("\r"), 20);
            }
          }, 50);
        }
      },
    },
  });
  const timeout = setTimeout(() => child.kill(), 10000);
  try {
    const status = await child.exited;
    return { status, output };
  } finally {
    clearTimeout(timeout);
    child.terminal?.close();
  }
}

describe("CLI e2e", () => {
  let homeDir = "";
  let binDir = "";
  let capturePath = "";
  let env: NodeJS.ProcessEnv = {};

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "ai-launcher-e2e-home-"));
    binDir = mkdtempSync(join(tmpdir(), "ai-launcher-e2e-bin-"));
    capturePath = join(homeDir, "capture.json");

    const configDir = join(homeDir, ".config", "ai-launcher");
    mkdirSync(configDir, { recursive: true });

    // Fake AI tool: records argv + stdin for assertions.
    writeExecutable(
      join(binDir, "fake-ai"),
      `#!/usr/bin/env bun
import { writeFileSync } from "node:fs";

const chunks: Buffer[] = [];
for await (const chunk of Bun.stdin.stream()) {
  chunks.push(Buffer.from(chunk));
}
const stdin = Buffer.concat(chunks).toString("utf-8");

writeFileSync(
  process.env.FAKE_AI_CAPTURE || "",
  JSON.stringify({
    argv: process.argv.slice(2),
    stdin,
  })
);
console.log("FAKE_AI_OK");
`
    );

    writeFileSync(
      join(configDir, "config.json"),
      `${JSON.stringify(
        {
          tools: [
            {
              name: "fake",
              command: "fake-ai",
              description: "Fake AI for e2e",
              aliases: ["fk"],
            },
          ],
          templates: [
            {
              name: "review",
              command: "fake-ai -x 'Review: $@'",
              description: "Review template",
              aliases: ["rev"],
            },
          ],
        },
        null,
        2
      )}\n`
    );

    env = {
      ...process.env,
      HOME: homeDir,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      FAKE_AI_CAPTURE: capturePath,
      // Keep CI deterministic: no interactive TTY assumptions.
      TERM: "dumb",
    };
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(binDir, { recursive: true, force: true });
  });

  test("--version prints package version", () => {
    const result = runAi(["--version"], env);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(`ai-launcher v${VERSION}`);
  });

  test("--help exits successfully", () => {
    const result = runAi(["--help"], env);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ai-launcher");
    expect(result.stdout.toLowerCase()).toContain("usage");
  });

  test("launches configured tool with multi-word argv after --", () => {
    // CLI args are still validated by validateArguments (no ;|& etc.).
    const payload = "hello world with spaces";
    const result = runAi(["fake", "--", payload], env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_AI_OK");

    const capture = readCapture(capturePath);
    expect(capture.argv).toEqual([payload]);
    expect(capture.stdin).toBe("");
  });

  test("rejects shell metacharacters in CLI args", () => {
    const result = runAi(["fake", "--", "hello; echo PWNED"], env);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/invalid argument/i);
  });

  test("template substitutes multi-word input as one argv element", () => {
    const payload = "hello world with spaces";
    const result = runAi(["review", payload], env);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_AI_OK");

    const capture = readCapture(capturePath);
    expect(capture.argv).toEqual(["-x", `Review: ${payload}`]);
  });

  test("template accepts stdin input as one argv element (metacharacters stay literal)", () => {
    // Stdin is not subject to validateArguments; it must remain one literal argv token.
    const payload = "line1\nline2; rm -rf /";
    const result = runAi(["review"], env, payload);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_AI_OK");

    const capture = readCapture(capturePath);
    expect(capture.argv).toEqual(["-x", `Review: ${payload}`]);
  });

  test("unknown tool exits non-zero", () => {
    const result = runAi(["definitely-not-a-tool"], env);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`.toLowerCase()).toMatch(
      /no tool|not found|no match|unknown/
    );
  });

  describe("template confirmation boundary", () => {
    beforeEach(() => {
      // Do not let host GitHub authentication consume the terminal's input.
      writeExecutable(join(binDir, "gh"), "#!/bin/sh\nexit 1\n");
      writeExecutable(join(binDir, "write-template"), "#!/bin/sh\necho TEMPLATE_RAN\n");
      writeExecutable(
        join(binDir, "fake-router"),
        '#!/bin/sh\necho \'{"template":"auto-commit","arguments":[]}\'\n'
      );
      writeFileSync(
        join(homeDir, ".config", "ai-launcher", "config.json"),
        JSON.stringify({
          tools: [],
          templates: [
            {
              name: "auto-commit",
              aliases: ["ac"],
              command: "write-template",
              description: "Commit changes",
              mode: "write",
              requiresConfirmation: true,
            },
          ],
          router: { command: "fake-router" },
        })
      );
    });

    test.each([["ac"], ["auto-commit"], ["ac", "--", "message"]])(
      "explicit invocation %j runs without confirmation",
      async (...args) => {
        const result = await runAiInTerminal(args, env, "\x1b");
        expect(result.status).toBe(0);
        expect(result.output).toContain("TEMPLATE_RAN");
        expect(result.output).toContain("CHAIN_RAN");
        expect(result.output).not.toContain("Continue?");
        const piped = runAi(args, env);
        expect(piped.status).toBe(0);
        expect(piped.stdout).toContain("TEMPLATE_RAN");
        expect(piped.stdout).not.toContain("Selected template:");
      },
      15000
    );

    test.each(["n", "\r", "\x1b", "\x03"])(
      "router cancellation %j prevents execution and shell chaining",
      async (answer) => {
        const result = await runAiInTerminal(["please commit my changes"], env, answer);
        expect(result.output).toContain("Continue? [y/N]");
        expect(result.status).toBe(1);
        expect(result.output).not.toContain("TEMPLATE_RAN");
        expect(result.output).not.toContain("CHAIN_RAN");
      }
    );

    test("router executes a write template only after approval", async () => {
      const result = await runAiInTerminal(["please commit my changes"], env, "y");
      expect(result.status).toBe(0);
      expect(result.output).toContain("Continue? [y/N]");
      expect(result.output).toContain("TEMPLATE_RAN");
      expect(result.output).toContain("CHAIN_RAN");
    });

    test("router cannot silently approve a write template without a terminal", () => {
      const result = runAi(["please commit my changes"], env);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Confirmation requires an interactive terminal");
      expect(result.stdout).not.toContain("TEMPLATE_RAN");
    });
  });

  test("prompt list works without installed AI tools", () => {
    const result = runAi(["prompt", "list"], env);
    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });
});

function readCapture(path: string): { argv: string[]; stdin: string } {
  return JSON.parse(readFileSync(path, "utf-8")) as { argv: string[]; stdin: string };
}
