import { expect, test } from '@playwright/test';
import { artifactDirectory, artifactPath } from '../tooling/artifacts.mjs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-scene-ready', 'true');
  await expect(page.locator('#render-error')).toBeHidden();
});

test('solid Classic-style cockpit uses actual speed for its analog needle', async ({ page }) => {
  const canvas = page.locator('#rider-canvas');
  await expect(canvas).toHaveAttribute('data-graphics-style', 'classic350-solid');
  await expect(canvas).toHaveAttribute('data-cockpit-speed-kmh', '36');
  const lower = Number(await canvas.getAttribute('data-speed-needle-angle'));
  expect(Number.isFinite(lower)).toBe(true);
  await page.getByLabel('Example speed').selectOption('20');
  await expect(canvas).toHaveAttribute('data-cockpit-speed-kmh', '72');
  const higher = Number(await canvas.getAttribute('data-speed-needle-angle'));
  expect(Number.isFinite(higher)).toBe(true);
  expect(Math.abs(higher - lower)).toBeGreaterThan(0.3);
  await expect(page.locator('#speed-value')).toHaveText('72');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-time', '0');

  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  artifactDirectory('screenshots');
  await canvas.screenshot({ path: artifactPath('screenshots', 'classic_cockpit_desktop_20261003_235633.png') });
});

test('rich cockpit remains visible at mobile size with force input and comfort mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator('#rider-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-graphics-style', 'classic350-solid');
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.keyboard.down('d');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-2');
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'true');
  await page.waitForTimeout(300);
  await canvas.screenshot({ path: artifactPath('screenshots', 'classic_cockpit_mobile_force_20261003_235633.png') });
  await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const lean = await page.locator('#lean-value').getAttribute('data-radians');
  await page.getByLabel('Comfort camera').uncheck();
  await expect(page.locator('#lean-value')).toHaveAttribute('data-radians', lean ?? '');
  await expect(page.locator('#render-error')).toBeHidden();
});
