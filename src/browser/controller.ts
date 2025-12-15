import fs from "node:fs/promises";
import path from "node:path";
import { chromium, BrowserContext, Page } from "playwright";
import { AppConfig } from "../config.js";
import { observePage, Observation } from "./observe.js";

export class BrowserController {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private lastObs: Observation | null = null;

  constructor(private cfg: AppConfig) {}

  async launch() {
    await fs.mkdir(this.cfg.profileDir, { recursive: true });
    await fs.mkdir(this.cfg.screenshotDir, { recursive: true });

    this.context = await chromium.launchPersistentContext(this.cfg.profileDir, {
      headless: this.cfg.headless,
      viewport: null,
    });

    const pages = this.context.pages();
    this.page = pages.length ? pages[0] : await this.context.newPage();
    await this.page.bringToFront();
  }

  async close() {
    await this.context?.close();
    this.context = null;
    this.page = null;
  }

  getPage(): Page {
    if (!this.page) throw new Error("Browser not launched");
    return this.page;
  }

  async observe(): Promise<Observation> {
    return observePage(this.getPage(), this.cfg.observeMaxElements, this.cfg.screenshotDir);
  }

  setLastObservation(obs: Observation) { this.lastObs = obs; }
  getLastObservation(): Observation {
    if (!this.lastObs) throw new Error("No observation yet");
    return this.lastObs;
  }
}
