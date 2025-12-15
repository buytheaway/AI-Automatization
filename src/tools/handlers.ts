import { ToolCall, ToolHandlerContext } from "./registry.js";

function getHandleOrThrow(ctx: ToolHandlerContext, element_id: string) {
  const obs = ctx.browser.getLastObservation();
  const h = obs._handles?.get(element_id);
  if (!h) throw new Error(`Unknown element_id=${element_id} (run browser_observe again)`);
  return h;
}

export async function executeTool(call: ToolCall, ctx: ToolHandlerContext) {
  const page = ctx.browser.getPage();

  switch (call.name) {
    case "browser_goto": {
      const url = String(call.args.url);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return { ok: true, url: page.url() };
    }

    case "browser_observe": {
      const obs = await ctx.browser.observe();
      ctx.browser.setLastObservation(obs);
      return {
        ok: true,
        observation_id: obs.observation_id,
        url: obs.url,
        title: obs.title,
        screenshot_path: obs.screenshot_path,
        elements: obs.elements,
      };
    }

    case "browser_click": {
      const id = String(call.args.element_id);
      const h = getHandleOrThrow(ctx, id);
      await h.click({ timeout: 10_000 });
      return { ok: true, clicked: id };
    }

    case "browser_type": {
      const id = String(call.args.element_id);
      const text = String(call.args.text ?? "");
      const clear = call.args.clear_first !== false;
      const h = getHandleOrThrow(ctx, id);

      await h.focus();
      if (clear) {
        // универсальная очистка
        await page.keyboard.press("Control+A");
        await page.keyboard.press("Backspace");
      }
      await page.keyboard.type(text, { delay: 10 });
      return { ok: true, typed: id, chars: text.length };
    }

    case "browser_press": {
      const key = String(call.args.key);
      await page.keyboard.press(key);
      return { ok: true, key };
    }

    case "browser_scroll": {
      const dy = Number(call.args.deltaY);
      await page.mouse.wheel(0, dy);
      return { ok: true, deltaY: dy };
    }

    case "browser_wait": {
      const ms = Number(call.args.ms);
      await page.waitForTimeout(ms);
      return { ok: true, ms };
    }

    case "browser_back": {
      await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => null);
      return { ok: true, url: page.url() };
    }

    default:
      throw new Error(`Unknown tool: ${call.name}`);
  }
}
