import { existsSync } from "node:fs";
import { isAbsolute, normalize, resolve } from "node:path";

export function isValidOutputPath(filePath: string): boolean {
  const normalized = normalize(filePath);

  if (isAbsolute(normalized)) {
    console.error("Error: Output file path must be relative, not absolute");
    return false;
  }

  const isPathEscape =
    normalized.startsWith("..") || normalized.includes("/../") || normalized.includes("\\..\\");
  if (isPathEscape) {
    console.error("Error: Output file path cannot escape current directory");
    return false;
  }

  const forbiddenPatterns = [
    /^\./,
    /\.git\//,
    /\.config\//,
    /etc\//,
    /root\//,
    /home\//,
    /usr\//,
    /var\//,
    /sys\//,
    /proc\//,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(normalized)) {
      console.error("Error: Output file path points to a protected location");
      return false;
    }
  }

  return true;
}

export function validateOutputFile(filePath: string): string | null {
  if (!filePath || filePath.trim().length === 0) {
    return "Output file path cannot be empty";
  }

  if (!isValidOutputPath(filePath)) {
    return "Invalid output file path";
  }

  const resolvedPath = resolve(filePath);

  if (existsSync(resolvedPath)) {
    console.error(`Warning: File already exists: ${resolvedPath}`);
    console.error("Use a different filename or remove the existing file first");
    return "File already exists";
  }

  return null;
}

export function validateArguments(args: string[]): boolean {
  const safePattern = /^[a-zA-Z0-9._\-"/\\@#=\s,.:()[\]{}]+$/;
  return args.every((arg) => safePattern.test(arg) && arg.length <= 200);
}
