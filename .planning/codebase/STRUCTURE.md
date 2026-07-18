# Codebase Structure

**Analysis Date:** 2026-07-18

## Directory Layout
```
ai-launcher/
├── .changeset/
├── .github/
├── .planning/
├── HomebrewFormula/
├── dist/
├── docs/
├── node_modules/
├── scripts/
├── src/
│   ├── cli/
│   ├── meeting/
│   ├── prompts/
│   └── summary/
│       └── providers/
└── tasks/
```

## Directory Purposes
- `src/`: Root of all source code. Contains core logic and entry points. Key files: `index.ts`, `config.ts`, `detect.ts`.
- `src/cli/`: Handles CLI specific functionalities like git diff analysis. Key files: `diff.ts`.
- `src/meeting/`: Implementation for the `ai meeting` feature. Contains its own sub-CLI entry point. Key files: `index.ts`, `summarize.ts`, `schema.ts`.
- `src/prompts/`: Contains standardized prompts and registries used across different features. Key files: `prompts.ts`, `registry.ts`.
- `src/summary/`: Implementation for the `ai summary` feature. Contains URL/file fetching, text chunking, and multiple LLM adapters. Key files: `index.ts`, `input.ts`, `schema.ts`.
- `src/summary/providers/`: Connectors to specific AI platforms for summarization. Key files: `openai.ts`, `anthropic.ts`, `openrouter.ts`, `opencode.ts`, `ollama.ts`.
- `scripts/`: Shell scripts for building and CI processes. Key files: `build.sh`.
- `tasks/`: Bun/node task scripts if any exist for development.
- `HomebrewFormula/`: Contains formula for homebrew package publishing.

## Key File Locations
- **Entry Points:** `src/index.ts` (main), `src/meeting/index.ts` (meeting), `src/summary/index.ts` (summary).
- **Configuration:** `src/config.ts` (runtime config loading), `package.json`, `biome.json` (lint/format), `tsconfig.json`.
- **Core Logic:** `src/fuzzy-select.ts`, `src/lookup.ts`, `src/detect.ts`, `src/template.ts`.
- **Testing:** Unit tests are co-located with source files, named `*.test.ts` (e.g., `src/config.test.ts`, `src/summary/summary.test.ts`).

## Naming Conventions
- **Files:** Kebab-case with `.ts` extension (e.g., `fuzzy-select.ts`, `parse-json.ts`).
- **Test Files:** Co-located with `.test.ts` extension (e.g., `diff.test.ts`).
- **Directories:** Kebab-case or single words (e.g., `summary`, `cli`).
- **Exports:** Named exports preferred, matching camelCase equivalents of file names.

## Where to Add New Code
- **New Feature:** Create a new directory under `src/` (e.g., `src/new-feature/`) with an `index.ts` entry point, and hook it into the main router in `src/index.ts`.
- **New Component/Module:** If it's a CLI utility, place it in `src/cli/`. If it's a generic prompt tool, `src/prompts/`.
- **New Summary Provider:** Add a new file to `src/summary/providers/` (e.g., `src/summary/providers/mistral.ts`), implement the `SummaryProvider` interface, and register it in `src/summary/provider.ts`.
- **Utilities:** Put small helpers in the root `src/` directory (like `lookup.ts` or `errors.ts`) or create a `src/utils/` if they grow large.

## Special Directories
- **Purpose:** 
  - `dist/`: Build output folder.
  - `docs/`: Documentation.
  - `.changeset/`: Versioning and changelog management.
- **Generated:** `dist/`, `node_modules/`, `bun.lock`.
- **Committed:** `src/`, `scripts/`, `HomebrewFormula/`, config files (`package.json`, `biome.json`, `tsconfig.json`).
