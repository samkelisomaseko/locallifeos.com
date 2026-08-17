import { test, expect } from '@playwright/test';

const SCREENS = ['dashboard', 'planner', 'explore', 'chat', 'wellness', 'settings'];

const BASELINE_DIR = 'tests/baselines';

async function login(page) {
  await page.goto('/');
  await page.locator('#loginEmail').fill('test@example.com');
  await page.locator('#loginPassword').fill('password');
  await page.locator('#loginForm button[type="button"]').click();
  await expect(page.locator('#authContainer')).toBeHidden({ timeout: 15000 });
  await page.waitForTimeout(2500);
}

test('login screen baseline', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${BASELINE_DIR}/login-${test.info().project.name}.png`, fullPage: false });
  await expect(page.locator('#loginEmail')).toBeVisible();
});

for (const screen of SCREENS) {
  test(`baseline: ${screen}`, async ({ page }) => {
    await login(page);
    await page.locator(`.nav-item[data-screen="${screen}"]`).click();
    await page.waitForTimeout(1200);
    await expect(page.locator(`#${screen}`)).toBeVisible();
    await page.screenshot({ path: `${BASELINE_DIR}/${screen}-${test.info().project.name}.png`, fullPage: false });
  });
}