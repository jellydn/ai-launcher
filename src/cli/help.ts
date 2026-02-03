import { getColoredLogo } from "../logo";
import { VERSION } from "../version";

export function showVersion(): never {
  console.log(`ai-launcher v${VERSION}`);
  process.exit(0);
}

export function showHelp(): never {
  console.log(getColoredLogo("full"));
  console.log(`A fast, secure launcher for AI coding assistants.

USAGE:
    ai [toolname|alias] [args...]    Direct invocation
    ai [toolname] -- [args...]       Explicit separator
    ai -- [args...]                  Fuzzy select, then pass args
    ai                               Interactive fuzzy search

OPTIONS:
    --help, -h                       Show this help message
    --version, -v                    Show version information
    --diff-staged                    Analyze staged git changes
    --diff-commit <ref>              Analyze git diff against ref (e.g., HEAD~1)
    --diff-prompt <text>             Add custom text to diff analysis prompt
    --diff-output <file>             Save analysis output to markdown file
    upgrade                          Upgrade to latest version

EXAMPLES:
    ai                               Launch fuzzy search
    ai claude                        Launch Claude directly
    ai c                             Launch by alias
    ai claude --help                 Pass --help to claude
    ai -- --version                  Select tool, then show version
    ai claude --diff-staged          Analyze staged changes with Claude
    ai --diff-commit HEAD~1          Select tool, analyze commit diff
    ai --diff-staged --diff-output analysis.md
                                     Save analysis to file
    ai --diff-commit HEAD~1 --diff-prompt "Focus on security"
                                     Add custom prompt
    ai upgrade                       Upgrade to latest version

CONFIG:
    ~/.config/ai-launcher/config.json   Add custom tools, aliases, templates
`);
  process.exit(0);
}
