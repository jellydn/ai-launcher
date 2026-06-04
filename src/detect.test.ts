import { describe, expect, test } from "bun:test";
import {
  detectCliProxyProfiles,
  detectGhCopilot,
  detectInstalledTools,
  formatSuggestedInstallHints,
  getSuggestedInstallTools,
  KNOWN_TOOLS,
  parseCcsApiList,
  SUGGESTED_INSTALL_TOOL_NAMES,
} from "./detect";

const CCS_API_LIST_OUTPUT = `CCS API Profiles

┌───────────────┬────────────────────┬──────────┐
│ API           │ Config             │ Status   │
├───────────────┼────────────────────┼──────────┤
│ glm           │ ~/.ccs/glm.settin… │ [OK]     │
├───────────────┼────────────────────┼──────────┤
│ glmt          │ ~/.ccs/glmt.setti… │ [OK]     │
├───────────────┼────────────────────┼──────────┤
│ kimi          │ ~/.ccs/kimi.setti… │ [!]      │
├───────────────┼────────────────────┼──────────┤
│ my-profile    │ ~/.ccs/my-profile… │ [OK]     │
├───────────────┼────────────────────┼──────────┤
│ test.api      │ ~/.ccs/test.api.s… │ [OK]     │
├───────────────┼────────────────────┼──────────┤
│ openrouter    │ ~/.ccs/openrouter… │ [!]      │
└───────────────┴────────────────────┴──────────┘

Total: 6 API profile(s)
`;

const CCS_API_LIST_WITH_ANSI = `CCS API Profiles

\x1b[90m┌───────────────┬────────────────────┬──────────┐\x1b[39m
\x1b[90m│\x1b[39m API           \x1b[90m│\x1b[39m Config             \x1b[90m│\x1b[39m Status   \x1b[90m│\x1b[39m
\x1b[90m├───────────────┼────────────────────┼──────────┤\x1b[39m
\x1b[90m│\x1b[39m glm           \x1b[90m│\x1b[39m ~/.ccs/glm.settin… \x1b[90m│\x1b[39m [OK]     \x1b[90m│\x1b[39m
\x1b[90m├───────────────┼────────────────────┼──────────┤\x1b[39m
\x1b[90m│\x1b[39m broken        \x1b[90m│\x1b[39m ~/.ccs/broken.set… \x1b[90m│\x1b[39m [!]      \x1b[90m│\x1b[39m
\x1b[90m└───────────────┴────────────────────┴──────────┘\x1b[39m
`;

const CCS_API_LIST_ASCII_PIPES = `CCS API Profiles

| API           | Config             | Status   |
|---------------|--------------------|---------:|
| glm           | ~/.ccs/glm.settin… | [OK]     |
| kimi          | ~/.ccs/kimi.setti… | [!]      |
| mm            | ~/.ccs/mm.setting… | [OK]     |
`;

describe("parseCcsApiList", () => {
  test("extracts profiles with OK status", () => {
    const profiles = parseCcsApiList(CCS_API_LIST_OUTPUT);

    expect(profiles).toContain("glm");
    expect(profiles).toContain("glmt");
    expect(profiles).toContain("my-profile");
    expect(profiles).toContain("test.api");
  });

  test("excludes profiles with ! status", () => {
    const profiles = parseCcsApiList(CCS_API_LIST_OUTPUT);

    expect(profiles).not.toContain("kimi");
    expect(profiles).not.toContain("openrouter");
  });

  test("excludes header row", () => {
    const profiles = parseCcsApiList(CCS_API_LIST_OUTPUT);

    expect(profiles).not.toContain("API");
  });

  test("handles ANSI color codes", () => {
    const profiles = parseCcsApiList(CCS_API_LIST_WITH_ANSI);

    expect(profiles).toContain("glm");
    expect(profiles).not.toContain("broken");
  });

  test("handles ASCII pipe characters", () => {
    const profiles = parseCcsApiList(CCS_API_LIST_ASCII_PIPES);

    expect(profiles).toContain("glm");
    expect(profiles).toContain("mm");
    expect(profiles).not.toContain("kimi");
  });

  test("returns empty array for empty output", () => {
    const profiles = parseCcsApiList("");

    expect(profiles).toEqual([]);
  });

  test("returns empty array for malformed output", () => {
    const profiles = parseCcsApiList("Some random text\nNo table here");

    expect(profiles).toEqual([]);
  });
});

describe("detectCliProxyProfiles", () => {
  test("returns all CLIProxy OAuth providers", () => {
    const profiles = detectCliProxyProfiles();
    const names = profiles.map((p) => p.name);

    expect(names).toContain("ccs:gemini");
    expect(names).toContain("ccs:codex");
    expect(names).toContain("ccs:agy");
    expect(names).toContain("ccs:qwen");
    expect(names).toContain("ccs:iflow");
    expect(names).toContain("ccs:kiro");
    expect(names).toContain("ccs:ghcp");
  });

  test("all profiles have correct auth type", () => {
    const profiles = detectCliProxyProfiles();

    for (const profile of profiles) {
      expect(profile.authType).toBe("oauth");
    }
  });

  test("all profiles have correct command format", () => {
    const profiles = detectCliProxyProfiles();

    for (const profile of profiles) {
      expect(profile.command).toStartWith("ccs ");
      expect(profile.command).toEndWith(profile.name.replace("ccs:", ""));
    }
  });

  test("all profiles have OAuth description", () => {
    const profiles = detectCliProxyProfiles();

    for (const profile of profiles) {
      expect(profile.description).toContain("OAuth");
    }
  });

  test("returns all 7 OAuth providers", () => {
    const profiles = detectCliProxyProfiles();

    expect(profiles).toHaveLength(7);
  });
});

describe("detectInstalledTools", () => {
  test("gemini is in KNOWN_TOOLS with correct configuration", () => {
    const gemini = KNOWN_TOOLS.find((t) => t.name === "gemini");

    expect(gemini).toBeDefined();
    expect(gemini?.name).toBe("gemini");
    expect(gemini?.command).toBe("gemini");
    expect(gemini?.description).toBe("Google Gemini CLI");
    expect(gemini?.promptCommand).toBe("gemini -p");
  });

  test("agy is in KNOWN_TOOLS with correct configuration", () => {
    const agy = KNOWN_TOOLS.find((t) => t.name === "agy");

    expect(agy).toBeDefined();
    expect(agy?.name).toBe("agy");
    expect(agy?.command).toBe("agy");
    expect(agy?.description).toBe("Google Antigravity CLI");
    expect(agy?.promptCommand).toBeUndefined();
  });

  test("copilot is in KNOWN_TOOLS with correct configuration", () => {
    const copilot = KNOWN_TOOLS.find((t) => t.name === "copilot");

    expect(copilot).toBeDefined();
    expect(copilot?.name).toBe("copilot");
    expect(copilot?.command).toBe("copilot");
    expect(copilot?.description).toBe("GitHub Copilot CLI");
    expect(copilot?.promptCommand).toBe("copilot suggest");
    expect(copilot?.promptUseStdin).toBe(true);
  });

  test("ollama is in KNOWN_TOOLS with correct configuration", () => {
    const ollama = KNOWN_TOOLS.find((t) => t.name === "ollama");

    expect(ollama).toBeDefined();
    expect(ollama?.name).toBe("ollama");
    expect(ollama?.command).toBe("ollama");
    expect(ollama?.execCommand).toBe("ollama launch --model minimax-m2.5:cloud");
    expect(ollama?.description).toBe("Ollama CLI");
  });

  test("droid is in KNOWN_TOOLS with correct configuration", () => {
    const droid = KNOWN_TOOLS.find((t) => t.name === "droid");

    expect(droid).toBeDefined();
    expect(droid?.name).toBe("droid");
    expect(droid?.command).toBe("droid");
    expect(droid?.description).toBe("Factory Droid CLI");
  });

  test("cursor is in KNOWN_TOOLS with correct configuration", () => {
    const cursor = KNOWN_TOOLS.find((t) => t.name === "cursor");

    expect(cursor).toBeDefined();
    expect(cursor?.name).toBe("cursor");
    expect(cursor?.command).toBe("agent");
    expect(cursor?.description).toBe("Cursor AI Editor");
  });

  test("pi is in KNOWN_TOOLS with correct configuration", () => {
    const pi = KNOWN_TOOLS.find((t) => t.name === "pi");

    expect(pi).toBeDefined();
    expect(pi?.name).toBe("pi");
    expect(pi?.command).toBe("pi");
    expect(pi?.description).toBe("Pi AI CLI");
  });

  test("freebuff is in KNOWN_TOOLS with correct configuration", () => {
    const freebuff = KNOWN_TOOLS.find((t) => t.name === "freebuff");

    expect(freebuff).toBeDefined();
    expect(freebuff?.name).toBe("freebuff");
    expect(freebuff?.command).toBe("freebuff");
    expect(freebuff?.description).toBe(
      "Freebuff - Free ad-supported AI coding agent (Codebuff variant)"
    );
    expect(freebuff?.promptCommand).toBeUndefined();
  });

  test("grok is in KNOWN_TOOLS with correct configuration", () => {
    const grok = KNOWN_TOOLS.find((t) => t.name === "grok");

    expect(grok).toBeDefined();
    expect(grok?.name).toBe("grok");
    expect(grok?.command).toBe("grok");
    expect(grok?.description).toBe("xAI Grok Build CLI");
    expect(grok?.promptCommand).toBe("grok --permission-mode plan -p");
  });

  test("returns only installed tools from KNOWN_TOOLS", () => {
    const tools = detectInstalledTools();

    // All returned tools must originate from KNOWN_TOOLS, ccs detection, or gh-copilot
    for (const tool of tools) {
      const isCcs = tool.name === "ccs" || tool.name.startsWith("ccs:");
      const isGhCopilot = tool.name === "gh-copilot";
      const isKnown = KNOWN_TOOLS.some((k) => k.name === tool.name);
      expect(isCcs || isGhCopilot || isKnown).toBe(true);
    }
  });
});

describe("suggested install tools", () => {
  test("every suggested name exists in KNOWN_TOOLS", () => {
    for (const name of SUGGESTED_INSTALL_TOOL_NAMES) {
      expect(KNOWN_TOOLS.some((t) => t.name === name)).toBe(true);
    }
  });

  test("getSuggestedInstallTools returns curated tools plus ccs", () => {
    const tools = getSuggestedInstallTools();
    const names = tools.map((t) => t.name);

    expect(names).toEqual([...SUGGESTED_INSTALL_TOOL_NAMES, "ccs"]);
    expect(tools[0]?.description).toBe("Anthropic Claude CLI");
    expect(tools.at(-1)?.description).toBe("CCS CLI (Claude Code Switch)");
  });

  test("formatSuggestedInstallHints aligns names and includes grok", () => {
    const lines = formatSuggestedInstallHints();

    expect(lines).toHaveLength(SUGGESTED_INSTALL_TOOL_NAMES.length + 1);
    expect(lines.some((line) => line.includes("grok") && line.includes("xAI Grok Build CLI"))).toBe(
      true
    );
    expect(lines.every((line) => line.startsWith("   • "))).toBe(true);
  });
});

describe("detectGhCopilot", () => {
  test("returns null or a correctly shaped tool", () => {
    const tool = detectGhCopilot();

    if (tool === null) {
      // gh is not installed or the copilot extension is absent — that is fine
      expect(tool).toBeNull();
    } else {
      expect(tool.name).toBe("gh-copilot");
      expect(tool.command).toBe("gh copilot");
      expect(tool.description).toBe("GitHub Copilot CLI");
      expect(tool.promptCommand).toBe("gh copilot suggest");
    }
  });
});
