import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const SCREENS = ['login', 'dashboard', 'planner', 'explore', 'chat', 'wellness', 'settings'];
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const OLD_URL = process.env.OLD_URL || 'http://localhost:4181';
const NEW_URL = process.env.NEW_URL || 'http://localhost:4182';

async function renderToPng(page, baseURL, screen) {
  await page.goto(baseURL + '/');
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }',
  });
  if (screen !== 'login') {
    await page.locator('#loginEmail').fill('test@example.com');
    await page.locator('#loginPassword').fill('password');
    await page.locator('#loginForm button[type="button"]').click();
    await page.waitForSelector('#authContainer', { state: 'hidden', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.locator(`.nav-item[data-screen="${screen}"]`).click();
    await page.waitForTimeout(1200);
    await page.waitForSelector(`#${screen}`, { state: 'visible', timeout: 20000 });
  }
  await page.waitForTimeout(500);
  return page.screenshot({ fullPage: false });
}

test.describe('A/B pixel diff: old (inline CSS) vs new (extracted CSS)', () => {
  for (const screen of SCREENS) {
    test(`pixel-identical: ${screen}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
      const oldPage = await ctx.newPage();
      const newPage = await ctx.newPage();

      const [oldPng, newPng] = await Promise.all([
        renderToPng(oldPage, OLD_URL, screen),
        renderToPng(newPage, NEW_URL, screen),
      ]);

      await ctx.close();

      const oldImg = PNG.sync.read(oldPng);
      const newImg = PNG.sync.read(newPng);

      if (oldImg.width !== newImg.width || oldImg.height !== newImg.height) {
        throw new Error(
          `${screen}: dimension mismatch old=${oldImg.width}x${oldImg.height} new=${newImg.width}x${newImg.height}`,
        );
      }

      const diff = new PNG({ width: oldImg.width, height: oldImg.height });
      const mismatchedPixels = pixelmatch(oldImg.data, newImg.data, diff.data, oldImg.width, oldImg.height, {
        threshold: 0.1,
      });

      if (mismatchedPixels > 0) {
        const totalPixels = oldImg.width * oldImg.height;
        const pct = ((mismatchedPixels / totalPixels) * 100).toFixed(4);
        const diffPath = `tests/ab-diff-${screen}.png`;
        writeFileSync(diffPath, PNG.sync.write(diff));
        throw new Error(
          `${screen}: ${mismatchedPixels} mismatched pixels (${pct}% of ${totalPixels}). Diff: ${diffPath}`,
        );
      }
    });
  }
});
