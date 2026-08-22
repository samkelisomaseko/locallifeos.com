import { test, expect } from '@playwright/test';

// Smoke test: the 3 repaired modules now execute for the first time.
// Verify they parse, expose their globals, run without throwing, and every screen renders.

const SCREENS = ['dashboard', 'planner', 'explore', 'chat', 'wellness', 'settings'];
const VIEWPORT = { width: 1440, height: 900 };
const BASE = process.env.NEW_URL || 'http://localhost:4182';

test.describe('repaired dead modules: activation smoke', () => {
  for (const screen of SCREENS) {
    test(`no runtime errors + globals defined: ${screen}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await ctx.newPage();

      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push('console.error: ' + m.text());
      });

      await page.goto(BASE + '/');
      if (screen !== 'login') {
        await page.locator('#loginEmail').fill('test@example.com');
        await page.locator('#loginPassword').fill('password');
        await page.locator('#loginForm button[type="button"]').click();
        await page.waitForSelector('#authContainer', { state: 'hidden', timeout: 20000 });
        await page.waitForTimeout(1500);
        await page.locator(`.nav-item[data-screen="${screen}"]`).click();
        await page.waitForSelector(`#${screen}`, { state: 'visible', timeout: 20000 });
        await page.waitForTimeout(800);
      }

      // Globals from the repaired modules
      const globals = await page.evaluate(() => ({
        showCtxMenu: typeof window.showCtxMenu,
        DB_PRO: typeof window.DB_PRO,
        exportCSV: typeof window.exportCSV,
        openConfirmationModal: typeof window.openConfirmationModal,
        AIMemory: typeof window.AIMemory,
        AISuggestions: typeof window.AISuggestions,
        AIEmotion: typeof window.AIEmotion,
        AIAutomation: typeof window.AIAutomation,
      }));
      expect(globals.showCtxMenu, 'showCtxMenu').toBe('function');
      expect(globals.DB_PRO, 'DB_PRO').toBe('object');
      expect(globals.exportCSV, 'exportCSV').toBe('function');
      expect(globals.openConfirmationModal, 'openConfirmationModal').toBe('function');
      expect(globals.AIMemory, 'AIMemory').toBe('object');
      expect(globals.AISuggestions, 'AISuggestions').toBe('object');
      expect(globals.AIEmotion, 'AIEmotion').toBe('object');
      expect(globals.AIAutomation, 'AIAutomation').toBe('object');

      // Filter known-unrelated noise; anything else fails
      const relevant = errors.filter(
        (e) =>
          !e.includes('googleapis.com') &&
          !e.includes('maps.googleapis') &&
          !e.includes('net::') &&
          !e.includes('Failed to load resource'),
      );
      expect(relevant, `runtime errors on ${screen}:\n` + relevant.join('\n')).toEqual([]);

      await ctx.close();
    });
  }
});
