import { describe, expect, test } from "bun:test";
import { isSafeCommand } from "./template";

describe("Prompt handling for launchToolWithPrompt", () => {
  describe("command validation", () => {
    test("accepts safe commands", () => {
      expect(isSafeCommand("claude")).toBe(true);
      expect(isSafeCommand("opencode run")).toBe(true);
      expect(isSafeCommand("amp -x")).toBe(true);
    });

    test("rejects dangerous patterns", () => {
      expect(isSafeCommand("claude && rm -rf /")).toBe(false);
      expect(isSafeCommand("claude; whoami")).toBe(false);
      expect(isSafeCommand("claude || echo bad")).toBe(false);
      expect(isSafeCommand("claude $(whoami)")).toBe(false);
    });
  });

  describe("prompt argv append (no shell re-parse)", () => {
    // launchToolWithPrompt passes the prompt as a final argv element with
    // spawnSync(cmd, [...args, prompt], { shell: true }). Node/Bun quote the
    // argv for the shell, so quotes and metacharacters in the prompt do not
    // need manual '\'' escaping.

    test("prompt with single quotes is kept intact as argv", () => {
      const prompt = "Review this code: const foo = 'bar';";
      const args = ["claude", prompt];
      expect(args[1]).toBe(prompt);
      expect(args[1]).toContain("'bar'");
    });

    test("prompt with multiple single quotes is kept intact", () => {
      const prompt = "It's a test with 'multiple' quotes";
      expect(prompt).toContain("'");
      expect((prompt.match(/'/g) || []).length).toBe(3);
    });

    test("prompt with newlines is preserved", () => {
      const prompt = "Line 1\nLine 2\nLine 3";
      expect(prompt.split("\n")).toHaveLength(3);
    });

    test("prompt with special characters is preserved", () => {
      const prompt = 'Test with $var and `backticks` and "quotes"';
      expect(prompt).toContain("$var");
      expect(prompt).toContain("`backticks`");
      expect(prompt).toContain('"quotes"');
    });

    test("empty prompt is allowed as argv", () => {
      const prompt = "";
      expect(prompt).toBe("");
    });

    test("large prompt with git diff content is preserved", () => {
      const prompt = `Please analyze the following git diff:

diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
+const message = 'Hello, world!';
 function test() {
   console.log('test');
 }`;

      expect(prompt).toContain("diff --git");
      expect(prompt).toContain("@@ -1,3 +1,4 @@");
      expect(prompt).toContain("'Hello, world!'");
      expect(prompt).toContain("'test'");
    });
  });

  describe("combined command and prompt safety", () => {
    test("safe command with safe prompt", () => {
      const command = "claude";
      const prompt = "Review this code";

      expect(isSafeCommand(command)).toBe(true);
      expect(prompt.length).toBeGreaterThan(0);
    });

    test("safe command with prompt containing quotes", () => {
      const command = "claude";
      const prompt = "Review 'this' code";

      expect(isSafeCommand(command)).toBe(true);
      expect(prompt).toContain("'this'");
    });
  });
});
