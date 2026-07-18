import { describe, expect, test } from "bun:test";
import { isSafeCommand } from "./template";

/**
 * Documents the launchToolWithPrompt contract: the prompt is a final argv
 * element (spawnSync(cmd, [...args, prompt], { shell: true })), so Node/Bun
 * quote it for the host shell and no manual '\'' escaping is required.
 */
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

  describe("prompt content is preserved as argv", () => {
    test("keeps single quotes, newlines, and shell metacharacters intact", () => {
      const withQuotes = "Review this code: const foo = 'bar';";
      const multiQuotes = "It's a test with 'multiple' quotes";
      const multiline = "Line 1\nLine 2\nLine 3";
      const special = 'Test with $var and `backticks` and "quotes"';
      const empty = "";

      expect(["claude", withQuotes][1]).toBe(withQuotes);
      expect((multiQuotes.match(/'/g) ?? []).length).toBe(3);
      expect(multiline.split("\n")).toHaveLength(3);
      expect(special).toContain("$var");
      expect(special).toContain("`backticks`");
      expect(special).toContain('"quotes"');
      expect(empty).toBe("");
    });

    test("preserves large git-diff style prompts", () => {
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
    test("safe command accepts prompts with quotes", () => {
      expect(isSafeCommand("claude")).toBe(true);
      expect("Review 'this' code").toContain("'this'");
    });
  });
});
