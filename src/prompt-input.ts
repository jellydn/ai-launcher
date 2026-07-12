const ESC = "\x1b";
const CSI = `${ESC}[`;
const SHOW_CURSOR = `${CSI}?25h`;
const KEY_ENTER = "\r";
const KEY_CTRL_C = "\x03";
const KEY_ESC_ONLY = "\x1b";
const KEY_BACKSPACE = "\x7f";

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
