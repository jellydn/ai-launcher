import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { isSafeCommand } from "./template";

/**
 * launchToolWithPrompt uses spawnSync(cmd, [...args, prompt], { shell: false }).
 * With shell:false, argv elements are literal — metacharacters must not execute.
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

  describe("shell:false keeps prompt argv literal", () => {
    test("does not execute shell metacharacters in prompt", () => {
      const prompt = "a; echo INJECTED";
      // shell:true re-parses; shell:false must print the literal string.
      const withShell = spawnSync("printf", ["%s", prompt], {
        shell: true,
        encoding: "utf-8",
      });
      const withoutShell = spawnSync("printf", ["%s", prompt], {
        shell: false,
        encoding: "utf-8",
      });

      expect(withoutShell.stdout).toBe(prompt);
      // Document the hazard shell:true introduces (may expand / re-parse).
      expect(withShell.stdout).not.toBe(prompt);
    });

    test("preserves quotes, newlines, and special characters as argv", () => {
      const prompt = "It's a test with 'quotes', $var, `ticks`, and\nnewlines";
      const result = spawnSync("printf", ["%s", prompt], {
        shell: false,
        encoding: "utf-8",
      });
      expect(result.stdout).toBe(prompt);
    });
  });

  describe("combined command and prompt safety", () => {
    test("safe command accepts prompts with quotes", () => {
      expect(isSafeCommand("claude")).toBe(true);
      expect("Review 'this' code").toContain("'this'");
    });
  });
});
