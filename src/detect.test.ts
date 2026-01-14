import { describe, test, expect } from "bun:test";
import { parseCcsApiList, detectCliProxyProfiles } from "./detect";

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
    const names = profiles.map(p => p.name);

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
