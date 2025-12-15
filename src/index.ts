import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { loadConfig } from "./config.js";
import { BrowserController } from "./browser/controller.js";
import { AgentRunner } from "./agent/runner.js";
import { log, hr } from "./utils/logger.js";

async function main() {
  const cfg = loadConfig();
  const singleTask = (process.env.TASK ?? process.argv.slice(2).join(" ")).trim();
  const interactive = !!input.isTTY && !singleTask;
  const rl = interactive ? createInterface({ input, output }) : null;

  log(`Provider: ${cfg.provider}`);
  log(`Headless: ${cfg.headless} | Profile: ${cfg.profileDir}`);
  hr();

  const browser = new BrowserController(cfg);
  await browser.launch();

  async function runTask(task: string) {
    const runner = new AgentRunner(cfg, browser, rl ?? { question: async () => "" });
    const result = await runner.run(task);
    log(`? Итог: ${result}`);
  }

  if (singleTask) {
    hr();
    await runTask(singleTask);
    hr();
    await browser.close();
    rl?.close();
    return;
  }

  if (!interactive) {
    log("NEED_USER: stdin is not interactive. Запусти в терминале или передай TASK='...'");
    await browser.close();
    rl?.close();
    return;
  }

  while (true) {
    const task = (await rl.question("?? Задача для агента (или 'exit'): ")).trim();
    if (!task || task.toLowerCase() === "exit") break;

    hr();
    await runTask(task);
    hr();
  }

  await browser.close();
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
