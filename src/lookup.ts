import Fuse from "fuse.js";
import type { SelectableItem } from "./types";

export interface LookupResult {
  success: boolean;
  item?: SelectableItem;
  error?: string;
  candidates?: SelectableItem[];
}

export function findToolByName(query: string | undefined, items: SelectableItem[]): LookupResult {
  if (!query) {
    return { success: false, error: "No query provided" };
  }
  const lowerQuery = query.toLowerCase();

  const exactNameMatch = items.find((i) => i.name.toLowerCase() === lowerQuery);
  if (exactNameMatch) {
    return { success: true, item: exactNameMatch };
  }

  const aliasMatch = items.find((i) => i.aliases.some((a) => a.toLowerCase() === lowerQuery));
  if (aliasMatch) {
    return { success: true, item: aliasMatch };
  }

  const suffixMatch = items.filter((i) => i.name.toLowerCase().endsWith(lowerQuery));
  if (suffixMatch.length === 1) {
    return { success: true, item: suffixMatch[0] };
  }

  const substringMatch = items.filter((i) => i.name.toLowerCase().includes(lowerQuery));
  if (substringMatch.length === 1) {
    return { success: true, item: substringMatch[0] };
  }

  const fuse = new Fuse(items, {
    keys: ["name"],
    threshold: 0.4,
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) {
    return {
      success: false,
      error: `No tool or template found matching '${query}'`,
    };
  }

  if (results.length >= 2) {
    const topScore = results[0]?.score ?? 0;
    const secondScore = results[1]?.score ?? 0;
    const scoreGap = Math.abs(topScore - secondScore);
    const isAmbiguous = scoreGap < 0.05;

    if (isAmbiguous) {
      const ambiguousMatches = results
        .filter((r) => Math.abs((r.score ?? 0) - topScore) < 0.05)
        .map((r) => r.item);
      return {
        success: false,
        error: `Ambiguous match for '${query}'\nDid you mean:\n${ambiguousMatches
          .map((i) => `  • ${i.name}${i.aliases.length > 0 ? ` (${i.aliases.join(", ")})` : ""}`)
          .join("\n")}`,
        candidates: ambiguousMatches,
      };
    }

    if (topScore < 0.25) {
      return { success: true, item: results[0]?.item };
    }
  }

  return { success: true, item: results[0]?.item };
}
