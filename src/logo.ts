export const logo = `
    ╔═══════════════════════════════════════════╗
    ║   ▲ ▲  AI  CLI  SWITCHER  ▲ ▲             ║
    ║   │ │        ││││││        │ │            ║
    ║   └─┘──┬──►  ││││││  ◄──┬──┘              ║
    ║        │      ││││││    │                 ║
    ║        └──────►││││││◄──┘                 ║
    ║               ││││││                      ║
    ╚═══════════════════════════════════════════╝
`;

export const smallLogo = `
    ▲ ▲  AI  CLI  SWITCHER  ▲ ▲
    │ │        ││││││        │ │
    └─┘──►─────││││││─────◄──┘
              ││││││
`;

export const minimalLogo = `
    ▲ ▲  AI  CLI  SWITCHER  ▲ ▲
    │ │        ││││││        │ │
              ││││││
`;

export const logoColors = {
	cyan: "\x1b[36m",
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
};

export function getColoredLogo(
	variant: "full" | "small" | "minimal" = "full",
): string {
	const art =
		variant === "full" ? logo : variant === "small" ? smallLogo : minimalLogo;
	return `${logoColors.cyan}${art}${logoColors.reset}`;
}
