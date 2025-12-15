import chalk from "chalk";

export function log(msg: string) {
  console.log(chalk.gray(`[${new Date().toISOString()}]`), msg);
}

export function hr() {
  console.log(chalk.darkGray("—".repeat(80)));
}

export function toolCall(name: string, args: unknown) {
  console.log(chalk.cyanBright("🛠 tool_call"), chalk.cyan(name), chalk.gray(JSON.stringify(args)));
}

export function toolResult(name: string, out: unknown) {
  console.log(chalk.greenBright("📦 tool_result"), chalk.green(name), chalk.gray(JSON.stringify(out)));
}

export function warn(msg: string) {
  console.log(chalk.yellow("⚠"), msg);
}

export function err(msg: string) {
  console.log(chalk.red("✖"), msg);
}
