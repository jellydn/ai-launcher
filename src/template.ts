export interface ParsedCommand {
	cmd: string;
	args: string[];
}

export function buildTemplateCommand(command: string, args: string[]): string {
	if (command.includes("$@")) {
		return command.replace("$@", args.join(" "));
	}
	return args.length > 0 ? `${command} ${args.join(" ")}` : command;
}

export function validateTemplateCommand(command: string): boolean {
	const dangerous = [
		/&&/,
		/\|\|/,
		/;/,
		/\$\(/,
		/`[^`]*`/,
		/\bsudo\b/,
		/\brm\s+-rf\b/,
		/>\s*\//,
	];

	for (const pattern of dangerous) {
		if (pattern.test(command)) {
			return false;
		}
	}

	return true;
}

export function parseTemplateCommand(command: string): ParsedCommand {
	const parts: string[] = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let i = 0; i < command.length; i++) {
		const char = command[i]!;

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			current += char;
		} else if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			current += char;
		} else if (char === " " && !inSingleQuote && !inDoubleQuote) {
			if (current.length > 0) {
				parts.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}

	if (current.length > 0) {
		parts.push(current);
	}

	return {
		cmd: parts[0] ?? "",
		args: parts.slice(1),
	};
}
