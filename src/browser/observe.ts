import crypto from "node:crypto";
import path from "node:path";
import { Page, ElementHandle } from "playwright";

export type ObservedElement = {
  id: string;
  tag: string;
  role?: string;
  name?: string;
  text?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  bbox?: { x: number; y: number; w: number; h: number };
};

export type Observation = {
  observation_id: string;
  url: string;
  title: string;
  timestamp: string;
  screenshot_path: string;
  elements: ObservedElement[];
  // internal (не сериализуем наружу): map id->handle
  _handles?: Map<string, ElementHandle>;
};

function trunc(s: string | null | undefined, n: number) {
  if (!s) return undefined;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export async function observePage(page: Page, maxElements: number, screenshotDir: string): Promise<Observation> {
  const observation_id = crypto.randomUUID();
  const url = page.url();
  const title = await page.title().catch(() => "");

  const screenshot_path = path.join(screenshotDir, `${Date.now()}_${observation_id}.png`);
  await page.screenshot({ path: screenshot_path, fullPage: false });

  const selector = "a,button,input,textarea,select,[role='button'],[role='link'],[contenteditable='true']";
  const handles = await page.$$(selector);

  const elements: ObservedElement[] = [];
  const map = new Map<string, ElementHandle>();

  for (const h of handles) {
    const bbox = await h.boundingBox().catch(() => null);
    if (!bbox) continue;
    if (bbox.width < 5 || bbox.height < 5) continue;

    const meta = await h.evaluate((el) => {
      const cs = window.getComputedStyle(el as Element);
      const visible = cs && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity || "1") > 0.05;
      const tag = (el as HTMLElement).tagName.toLowerCase();
      const role = (el as HTMLElement).getAttribute("role") || undefined;
      const aria = (el as HTMLElement).getAttribute("aria-label") || undefined;

      const text = (el as HTMLElement).innerText || (el as HTMLElement).textContent || "";
      const placeholder = (el as HTMLInputElement).placeholder || undefined;
      const type = (el as HTMLInputElement).type || undefined;
      const value = (el as HTMLInputElement).value || undefined;

      // accessible-ish name
      const name = aria || (el as HTMLElement).getAttribute("title") || (el as HTMLElement).getAttribute("name") || undefined;

      return { visible, tag, role, text, placeholder, type, value, name };
    });

    if (!meta.visible) continue;

    const id = `e${elements.length + 1}`;
    map.set(id, h);

    elements.push({
      id,
      tag: meta.tag,
      role: meta.role,
      name: trunc(meta.name, 60),
      text: trunc(meta.text, 80),
      placeholder: trunc(meta.placeholder, 60),
      type: trunc(meta.type, 30),
      value: trunc(meta.value, 60),
      bbox: { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height },
    });

    if (elements.length >= maxElements) break;
  }

  // сортировка “сверху-вниз”
  elements.sort((a, b) => (a.bbox?.y ?? 0) - (b.bbox?.y ?? 0) || (a.bbox?.x ?? 0) - (b.bbox?.x ?? 0));

  return {
    observation_id,
    url,
    title,
    timestamp: new Date().toISOString(),
    screenshot_path,
    elements,
    _handles: map,
  };
}
