import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { loadConfig } from "./config.js";
import { BrowserController } from "./browser/controller.js";
import { AgentRunner } from "./agent/runner.js";
import { log, hr } from "./utils/logger.js";

async function main() {
  const cfg = loadConfig();
  const rl = createInterface({ input, output });

  log(`Provider: ${cfg.provider}`);
  log(`Headless: ${cfg.headless} | Profile: ${cfg.profileDir}`);
  hr();

  const browser = new BrowserController(cfg);
  await browser.launch();

  while (true) {
    const task = (await rl.question("🧠 Задача для агента (или 'exit'): ")).trim();
    if (!task || task.toLowerCase() === "exit") break;

    hr();
    const runner = new AgentRunner(cfg, browser, rl);
    const result = await runner.run(task);
    hr();
    log(`✅ Итог: ${result}`);
    hr();
  }

  await browser.close();
  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
