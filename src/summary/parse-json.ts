function extractBalancedBraces(raw: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (!char) {
      continue;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return null;
}

function extractJsonObject(raw: string): unknown {
  let start = raw.indexOf("{");
  while (start !== -1) {
    const candidate = extractBalancedBraces(raw, start);
    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch {
        // fall through to next candidate
      }
      start = raw.indexOf("{", start + candidate.length);
    } else {
      start = raw.indexOf("{", start + 1);
    }
  }

  throw new Error("No valid JSON object found in response");
}

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fall through to fenced extraction
    }
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const inner = fencedMatch[1].trim();
    try {
      return JSON.parse(inner);
    } catch {
      // fall through to brace extraction
    }
  }

  return extractJsonObject(trimmed);
}
