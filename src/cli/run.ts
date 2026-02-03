import { loadConfig } from "../config";
import { detectInstalledTools, mergeTools } from "../detect";
import { fuzzySelect, promptForInput, toSelectableItems } from "../fuzzy-select";
import { findToolByName } from "../lookup";
import { upgrade } from "../upgrade";
import { executeDiffCommand, parseDiffArgs } from "./diff";
import { showHelp, showVersion } from "./help";
import { launchTool, launchToolWithPrompt, readStdin } from "./runner";

export async function runCli(args: string[]): Promise<void> {
  // Handle --help, --version, and upgrade before loading config
  if (args[0] === "--help" || args[0] === "-h") {
    showHelp();
  }

  if (args[0] === "--version" || args[0] === "-v") {
    showVersion();
  }

  if (args[0] === "upgrade") {
    await upgrade();
    return;
  }

  const stdinContent = readStdin();

  const config = loadConfig();
  const detectedTools = detectInstalledTools();
  const allTools = mergeTools(config.tools, detectedTools);

  const items = toSelectableItems(allTools, config.templates);
  const lookupItems = items;

  if (items.length === 0) {
    console.error("❌ No AI tools found!\n");
    console.error("💡 Install one or more of these tools:");
    console.error("   • claude    - Anthropic Claude CLI");
    console.error("   • opencode  - OpenCode AI assistant");
    console.error("   • amp       - Sourcegraph Amp CLI");
    console.error("   • codex     - OpenAI Codex CLI");
    console.error("   • ccs       - Claude Code Switch");
    console.error("\n📝 Or add custom tools to ~/.config/ai-launcher/config.json");
    process.exit(1);
  }

  const diffParsed = parseDiffArgs(args);
  if (diffParsed.hasDiffCommand) {
    const { options, diffFlagIndex } = diffParsed;
    if (options && diffFlagIndex !== undefined) {
      const diffContext = { args, lookupItems, fuzzySelect, items };
      await executeDiffCommand(options, diffFlagIndex, diffContext, launchToolWithPrompt);
      return;
    }
  }

  const dashIndex = args.indexOf("--");
  if (dashIndex !== -1) {
    const beforeDash = args.slice(0, dashIndex);
    const afterDash = args.slice(dashIndex + 1);

    if (beforeDash.length === 0) {
      const result = await fuzzySelect(items);
      if (result.cancelled) {
        process.exit(0);
      }
      if (result.item) {
        launchTool(result.item.command, afterDash, stdinContent);
      }
      return;
    }

    const toolQuery = beforeDash[0];
    if (!toolQuery) {
      console.error("No tool specified before '--' separator");
      process.exit(1);
    }

    const lookupResult = findToolByName(toolQuery, lookupItems);
    if (lookupResult.success && lookupResult.item) {
      launchTool(lookupResult.item.command, afterDash, stdinContent);
      return;
    }
    console.error(lookupResult.error);
    process.exit(1);
  }

  if (args.length > 0) {
    const toolQuery = args[0];
    const extraArgs = args.slice(1);

    const result = findToolByName(toolQuery, lookupItems);

    if (result.success && result.item) {
      launchTool(result.item.command, extraArgs, stdinContent);
      return;
    }

    console.error(result.error);
    process.exit(1);
  }

  const result = await fuzzySelect(items);

  if (result.cancelled) {
    process.exit(0);
  }

  if (result.item) {
    if (result.item.isTemplate && result.item.command.includes("$@")) {
      console.log(`\nSelected: ${result.item.name}`);
      const input = await promptForInput(`Enter arguments for "${result.item.name}": `);
      if (input.length === 0) {
        process.exit(0);
      }
      const finalCommand = result.item.command.replace("$@", input);
      console.log(`\nRunning: ${finalCommand}\n`);
      launchTool(finalCommand, [], stdinContent);
    } else {
      console.log(`\nRunning: ${result.item.command}\n`);
      launchTool(result.item.command, [], stdinContent);
    }
  }
}
