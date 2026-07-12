import type { Summary } from "./schema.ts";

export function renderMarkdown(summary: Summary): string {
  const title = summary.title && summary.title.length > 0 ? summary.title : "Untitled";
  const lines: string[] = [`# ${title}`, "", summary.summary, ""];

  if (summary.key_points.length > 0) {
    lines.push("## Key Points");
    for (const point of summary.key_points) {
      lines.push(`- ${point}`);
    }
    lines.push("");
  }

  if (summary.action_items.length > 0) {
    lines.push("## Action Items");
    for (const item of summary.action_items) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push("");
  }

  lines.push(`_Category: ${summary.category} | Importance: ${summary.importance}_`);

  return lines.join("\n").trim();
}

export function renderJson(summary: Summary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}
