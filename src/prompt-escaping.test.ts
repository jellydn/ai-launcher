import { describe, expect, test } from "bun:test";
import { isSafeCommand } from "./template";

describe("Prompt escaping for launchToolWithPrompt", () => {
  describe("shell escaping edge cases", () => {
    test("command validation accepts safe commands", () => {
      expect(isSafeCommand("claude")).toBe(true);
      expect(isSafeCommand("opencode run")).toBe(true);
      expect(isSafeCommand("amp -x")).toBe(true);
    });

    test("command validation rejects dangerous patterns", () => {
      expect(isSafeCommand("claude && rm -rf /")).toBe(false);
      expect(isSafeCommand("claude; whoami")).toBe(false);
      expect(isSafeCommand("claude || echo bad")).toBe(false);
      expect(isSafeCommand("claude $(whoami)")).toBe(false);
    });
  });

  describe("prompt content edge cases", () => {
    test("single quotes in prompt should be escaped", () => {
      // The escaping is done by: prompt.replace(/'/g, "'\\''")
      const prompt = "Review this code: const foo = 'bar';";
      const escaped = prompt.replace(/'/g, "'\\''");

      // Single quotes should be escaped to '\''
      expect(escaped).toContain("'\\''");
      expect(escaped).toContain("const foo = '\\''bar'\\''");
    });

    test("handles prompt with multiple single quotes", () => {
      const prompt = "It's a test with 'multiple' quotes";
      const escaped = prompt.replace(/'/g, "'\\''");

      // Count escaped sequences
      const escapeCount = (escaped.match(/'\\'/g) || []).length;
      expect(escapeCount).toBe(3); // Three single quotes in original
    });

    test("handles prompt with newlines", () => {
      const prompt = "Line 1\nLine 2\nLine 3";
      const escaped = prompt.replace(/'/g, "'\\''");

      // Newlines should be preserved
      expect(escaped).toContain("\n");
      expect(escaped.split("\n")).toHaveLength(3);
    });

    test("handles prompt with special characters", () => {
      const prompt = 'Test with $var and `backticks` and "quotes"';
      const escaped = prompt.replace(/'/g, "'\\''");

      // These characters should pass through (they're in single-quoted shell string)
      expect(escaped).toContain("$var");
      expect(escaped).toContain("`backticks`");
      expect(escaped).toContain('"quotes"');
    });

    test("handles empty prompt", () => {
      const prompt = "";
      const escaped = prompt.replace(/'/g, "'\\''");
      expect(escaped).toBe("");
    });

    test("handles prompt with only single quotes", () => {
      const prompt = "'''";
      const escaped = prompt.replace(/'/g, "'\\''");
      expect(escaped).toBe("'\\'''\\'''\\''");
    });

    test("handles large prompt with git diff content", () => {
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

      const escaped = prompt.replace(/'/g, "'\\''");

      // Should preserve structure
      expect(escaped).toContain("diff --git");
      expect(escaped).toContain("@@ -1,3 +1,4 @@");
      // Single quotes should be escaped
      expect(escaped).toContain("'\\''Hello, world!'\\''");
      expect(escaped).toContain("'\\''test'\\''");
    });
  });

  describe("combined command and prompt safety", () => {
    test("safe command with safe prompt", () => {
      const command = "claude";
      const prompt = "Review this code";

      expect(isSafeCommand(command)).toBe(true);
      // Prompt escaping doesn't affect command safety
      const escaped = prompt.replace(/'/g, "'\\''");
      expect(escaped).toBe("Review this code");
    });

    test("safe command with prompt containing quotes", () => {
      const command = "claude";
      const prompt = "Review 'this' code";

      expect(isSafeCommand(command)).toBe(true);
      const escaped = prompt.replace(/'/g, "'\\''");
      expect(escaped).toBe("Review '\\''this'\\'' code");
    });
  });
});
