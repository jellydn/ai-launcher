import Fuse from "fuse.js";
import type { SelectableItem, Template, Tool } from "./types";

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
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const MIN_TERMINAL_WIDTH = 40;
const COMPACT_MODE_THRESHOLD = 60;
const ESC_TIMEOUT_MS = 50;

let cachedTerminalWidth: number | null = null;

function getTerminalWidth(): number {
  if (cachedTerminalWidth !== null) {
    return cachedTerminalWidth;
  }

  const columns = process.stdout.columns;
  if (typeof columns !== "number" || columns < 1) {
    cachedTerminalWidth = 80;
  } else {
    cachedTerminalWidth = Math.max(MIN_TERMINAL_WIDTH, columns);
  }

  return cachedTerminalWidth;
}

function resetTerminalWidthCache(): void {
  cachedTerminalWidth = null;
}

function getDisplayLines(text: string, width: number): number {
  if (width <= 0) return 1;
  const cleanText = text.replace(ANSI_PATTERN, "");
  return Math.max(1, Math.ceil(cleanText.length / width));
}

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
const KEY_ESC_ONLY = "\x1b";
const KEY_BACKSPACE = "\x7f";
const KEY_CTRL_N = "\x0e";
const KEY_CTRL_P = "\x10";
const KEY_TAB = "\t";
const KEY_SHIFT_TAB = `${ESC}[Z`;

export async function fuzzySelect(items: SelectableItem[]): Promise<SelectionResult> {
  if (items.length === 0) {
    return { cancelled: true };
  }

  resetTerminalWidthCache();

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
    const terminalWidth = getTerminalWidth();

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

      const isCompact = terminalWidth < COMPACT_MODE_THRESHOLD;
      const indicator = item.isTemplate ? `${YELLOW}[T]${RESET} ` : isCompact ? "" : "   ";
      const name = isSelected ? `${BOLD}${item.name}${RESET}` : item.name;

      let aliasText = "";
      if (!isCompact && item.aliases && item.aliases.length > 0) {
        aliasText = `${CYAN}(${item.aliases.join(", ")})${RESET}`;
      }

      const aliasLength = aliasText ? (item.aliases?.join(", ").length ?? 0) + 2 : 0;
      const indicatorLength = item.isTemplate ? 4 : isCompact ? 0 : 3;
      const baseLength = 2 + indicatorLength + item.name.length + aliasLength;

      let desc = "";
      if (!isCompact && item.description) {
        const TRUNCATION_SUFFIX_LENGTH = 3;
        const MIN_DESCRIPTION_WIDTH = 15;
        const availableWidth = terminalWidth - baseLength - TRUNCATION_SUFFIX_LENGTH;

        if (availableWidth > MIN_DESCRIPTION_WIDTH) {
          const truncatedDesc =
            item.description.length > availableWidth
              ? `${item.description.slice(0, availableWidth - TRUNCATION_SUFFIX_LENGTH)}...`
              : item.description;
          desc = `${DIM} - ${truncatedDesc}${RESET}`;
        }
      }

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
    return lines;
  };

  const clear = (lines: string[], width: number) => {
    let totalLines = 0;
    for (const line of lines) {
      totalLines += getDisplayLines(line, width);
    }

    stdout.write(MOVE_UP(totalLines));
    for (let i = 0; i < totalLines; i++) {
      stdout.write(`${CLEAR_LINE}\n`);
    }
    stdout.write(MOVE_UP(totalLines));
  };

  let lastLines = render();

  return new Promise((resolve) => {
    const cleanup = () => {
      stdin.removeListener("data", handleKey);
      clear(lastLines, getTerminalWidth());
      stdout.write(SHOW_CURSOR);
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    const moveUp = () => {
      selectedIndex = Math.max(0, selectedIndex - 1);
      if (selectedIndex < scrollOffset) {
        scrollOffset = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
      }
    };

    const moveDown = () => {
      selectedIndex = Math.min(filteredItems.length - 1, selectedIndex + 1);
      if (selectedIndex >= scrollOffset + maxVisible) {
        scrollOffset = Math.max(
          0,
          Math.min(
            filteredItems.length - maxVisible,
            selectedIndex - Math.floor(maxVisible / 2) + 1
          )
        );
      }
    };

    const handleKey = (key: string) => {
      if (key === KEY_CTRL_C) {
        cleanup();
        resolve({ cancelled: true });
        return;
      }

      if (key === KEY_ESC_ONLY) {
        // Delay to distinguish bare ESC from escape sequences (e.g., arrow keys send ESC + [...).
        // Without this, pressing arrow keys would cancel the selection.
        setTimeout(() => {
          cleanup();
          resolve({ cancelled: true });
        }, ESC_TIMEOUT_MS);
        return;
      }

      if (key === KEY_ENTER) {
        if (filteredItems.length > 0 && selectedIndex < filteredItems.length) {
          cleanup();
          resolve({ cancelled: false, item: filteredItems[selectedIndex] });
        }
        return;
      }

      if (key === KEY_UP || key === KEY_CTRL_P || key === KEY_SHIFT_TAB) {
        moveUp();
      } else if (key === KEY_DOWN || key === KEY_CTRL_N || key === KEY_TAB) {
        moveDown();
      } else if (key === KEY_BACKSPACE) {
        query = query.slice(0, -1);
        updateFilter();
      } else if (key.length === 1 && key >= " " && key <= "~") {
        query += key;
        updateFilter();
      }

      clear(lastLines, getTerminalWidth());
      lastLines = render();
    };

    const updateFilter = () => {
      if (query === "") {
        filteredItems = items;
      } else {
        filteredItems = fuse.search(query).map((r) => r.item);
      }

      if (selectedIndex >= filteredItems.length) {
        selectedIndex = Math.max(0, filteredItems.length - 1);
      }

      if (selectedIndex < scrollOffset) {
        scrollOffset = selectedIndex;
      } else if (selectedIndex >= scrollOffset + maxVisible) {
        scrollOffset = Math.max(0, selectedIndex - maxVisible + 1);
      }
    };

    stdin.on("data", handleKey);
  });
}

export async function promptForInput(promptText: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  if (!stdin.isTTY || !stdout.isTTY) {
    return "";
  }

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  stdout.write(SHOW_CURSOR);
  stdout.write(promptText);

  return new Promise((resolve) => {
    let input = "";

    const cleanup = () => {
      stdin.removeListener("data", onData);
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    const onData = (key: string) => {
      if (key === KEY_CTRL_C || key === KEY_ESC_ONLY) {
        cleanup();
        stdout.write("\n");
        resolve("");
        return;
      }

      if (key === KEY_ENTER) {
        cleanup();
        stdout.write("\n");
        resolve(input);
        return;
      }

      if (key === KEY_BACKSPACE) {
        input = input.slice(0, -1);
        stdout.write("\b \b");
      } else if (key.length === 1 && key >= " " && key <= "~") {
        input += key;
        stdout.write(key);
      }
    };

    stdin.on("data", onData);
  });
}

export { getTerminalWidth, getDisplayLines };
