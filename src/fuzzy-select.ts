import Fuse from "fuse.js";
import type { Tool, Template } from "./types";

export interface SelectableItem {
  name: string;
  command: string;
  description: string;
  isTemplate: boolean;
  aliases?: string[];
}

export interface SelectionResult {
  cancelled: boolean;
  item?: SelectableItem;
}

export function toSelectableItems(tools: Tool[], templates: Template[]): SelectableItem[] {
  return [
    ...tools.map((t) => ({
      name: t.name,
      command: t.command,
      description: t.description || "",
      isTemplate: false,
      aliases: t.aliases,
    })),
    ...templates.map((t) => ({
      name: t.name,
      command: t.command,
      description: t.description,
      isTemplate: true,
      aliases: t.aliases,
    })),
  ];
}

const ESC = "\x1b";
const CSI = `${ESC}[`;
const HIDE_CURSOR = `${CSI}?25l`;
const SHOW_CURSOR = `${CSI}?25h`;
const CLEAR_LINE = `${CSI}2K`;
const MOVE_UP = (n: number) => `${CSI}${n}A`;
const BOLD = `${CSI}1m`;
const DIM = `${CSI}2m`;
const CYAN = `${CSI}36m`;
const GREEN = `${CSI}32m`;
const YELLOW = `${CSI}33m`;
const RESET = `${CSI}0m`;
const KEY_UP = `${ESC}[A`;
const KEY_DOWN = `${ESC}[B`;
const KEY_ENTER = "\r";
const KEY_CTRL_C = "\x03";
const KEY_ESC = "\x1b";
const KEY_BACKSPACE = "\x7f";

export async function fuzzySelect(items: SelectableItem[]): Promise<SelectionResult> {
  if (items.length === 0) {
    return { cancelled: true };
  }

  const fuse = new Fuse(items, {
    keys: ["name", "description", "aliases"],
    threshold: 0.4,
    includeScore: true,
  });

  let query = "";
  let selectedIndex = 0;
  let filteredItems = items;
  let scrollOffset = 0;
  const maxVisible = Math.min(10, items.length);

  const stdin = process.stdin;
  const stdout = process.stdout;

  if (!stdin.isTTY || !stdout.isTTY) {
    console.error("Interactive mode requires a terminal");
    console.error("Use direct invocation: ai <tool-name>");
    return { cancelled: true };
  }

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  stdout.write(HIDE_CURSOR);

  const render = () => {
    const lines: string[] = [];

    lines.push(`${CYAN}❯${RESET} ${query}${DIM}│${RESET}`);

    const displayStart = scrollOffset;
    const displayEnd = Math.min(scrollOffset + maxVisible, filteredItems.length);
    const displayItems = filteredItems.slice(displayStart, displayEnd);

    for (let i = 0; i < displayItems.length; i++) {
      const globalIndex = displayStart + i;
      const item = displayItems[i];
      if (!item) continue;
      const isSelected = globalIndex === selectedIndex;
      const prefix = isSelected ? `${GREEN}▸${RESET}` : " ";
      const indicator = item.isTemplate ? `${YELLOW}[TEMPLATE]${RESET} ` : "  ";
      const aliasText =
        item.aliases && item.aliases.length > 0
          ? `${CYAN}(${item.aliases.join(", ")})${RESET}`
          : "";
      const name = isSelected ? `${BOLD}${item.name}${RESET}` : item.name;
      const desc = item.description
        ? `${DIM} - ${item.description}${RESET}`
        : "";
      lines.push(`${prefix} ${indicator}${name}${aliasText}${desc}`);
    }

    if (filteredItems.length > maxVisible) {
      const remaining = filteredItems.length - displayEnd;
      if (remaining > 0) {
        lines.push(`${DIM}  ... and ${remaining} more${RESET}`);
      }
    }

    if (filteredItems.length === 0) {
      lines.push(`${DIM}  No matches${RESET}`);
    }

    stdout.write(`${lines.join("\n")}\n`);
    return lines.length;
  };

  const clear = (lineCount: number) => {
    stdout.write(MOVE_UP(lineCount));
    for (let i = 0; i < lineCount; i++) {
      stdout.write(`${CLEAR_LINE}\n`);
    }
    stdout.write(MOVE_UP(lineCount));
  };

  let lastLineCount = render();

  return new Promise((resolve) => {
    const cleanup = () => {
      clear(lastLineCount);
      stdout.write(SHOW_CURSOR);
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    const handleKey = (key: string) => {
      if (key === KEY_CTRL_C || key === KEY_ESC) {
        cleanup();
        resolve({ cancelled: true });
        return;
      }

      if (key === KEY_ENTER) {
        if (filteredItems.length > 0 && selectedIndex < filteredItems.length) {
          cleanup();
          resolve({ cancelled: false, item: filteredItems[selectedIndex] });
        }
        return;
      }

      if (key === KEY_UP) {
        selectedIndex = Math.max(0, selectedIndex - 1);
        if (selectedIndex < scrollOffset) {
          scrollOffset = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
        }
      } else if (key === KEY_DOWN) {
        selectedIndex = Math.min(filteredItems.length - 1, selectedIndex + 1);
        if (selectedIndex >= scrollOffset + maxVisible) {
          scrollOffset = Math.max(0, Math.min(filteredItems.length - maxVisible, selectedIndex - Math.floor(maxVisible / 2) + 1));
        }
      } else if (key === KEY_BACKSPACE) {
        query = query.slice(0, -1);
        updateFilter();
      } else if (key.length === 1 && key >= " " && key <= "~") {
        query += key;
        updateFilter();
      }

      clear(lastLineCount);
      lastLineCount = render();
    };

    const updateFilter = () => {
      if (query === "") {
        filteredItems = items;
      } else {
        filteredItems = fuse.search(query).map((r) => r.item);
      }
      selectedIndex = 0;
      scrollOffset = 0;
    };

    stdin.on("data", handleKey);
  });
}
