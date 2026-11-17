import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-scene-ready', 'true');
  await expect(page.locator('#render-error')).toBeHidden();
});

test('the 3D viewport contains rendered WebGL pixels, not merely a ready flag', async ({ page }) => {
  const image = await page.evaluate(() => new Promise<{ colors: number; contextLost: boolean }>((resolve, reject) => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('#rider-canvas');
      if (!(canvas instanceof HTMLCanvasElement)) return reject(new Error('The 3D canvas is missing.'));
      const gl = canvas.getContext('webgl2');
      if (!gl) return reject(new Error('No WebGL 2 context exists.'));
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const colors = new Set<string>();
      for (let i = 0; i < pixels.length && colors.size < 30; i += 16) {
        colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`);
      }
      resolve({ colors: colors.size, contextLost: gl.isContextLost() });
    });
  }));
  expect(image.contextLost).toBe(false);
  expect(image.colors).toBeGreaterThan(8);
});

test('guided demo observes actual countersteering at both example speeds', async ({ page }) => {
  for (const speed of ['10', '20']) {
    await page.getByLabel('Example speed').selectOption(speed);
    await page.getByRole('button', { name: 'Show me', exact: true }).click();
    await expect(page.locator('#simulation-shell')).toHaveAttribute('data-running', 'false', { timeout: 10_000 });
    await expect(page.locator('#simulation-shell')).toHaveAttribute('data-tick', '1200');
    await expect(page.locator('#observed-wheel')).toHaveAttribute('data-observed', 'true');
    await expect(page.locator('#observed-lean')).toHaveAttribute('data-observed', 'true');
    await expect(page.locator('#observed-path')).toHaveAttribute('data-observed', 'true');
    await expect(page.locator('#simulation-shell')).toHaveAttribute('data-limit', '');
    const lean = Number(await page.locator('#lean-value').getAttribute('data-radians'));
    expect(lean).toBeGreaterThan(0);
    await expect(page.locator('#hud-lean')).toHaveText(await page.locator('#lean-value').textContent() ?? '');
  }
  await page.getByLabel('Turn to explore').selectOption('left');
  await page.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-tick', '1200', { timeout: 10_000 });
  expect(Number(await page.locator('#lean-value').getAttribute('data-radians'))).toBeLessThan(0);
});

test('keyboard input, both grips, pause and reset follow the contract', async ({ page }) => {
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.keyboard.down('d');
  await expect(page.locator('#grip-right')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-2');
  await page.waitForTimeout(250);
  expect(Number(await page.locator('#lean-value').getAttribute('data-radians'))).toBeGreaterThan(0);
  await page.keyboard.down('a');
  await expect(page.locator('#grip-left')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  await page.keyboard.up('a');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-2');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-running', 'false');
  await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-time', '0');
  await expect(page.locator('#lean-value')).toHaveAttribute('data-radians', '0');
  await expect(page.locator('#grip-left')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#grip-right')).toHaveAttribute('aria-pressed', 'false');
});

test('pointer hold and focus loss release pressure without false upright behavior', async ({ page }) => {
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  const grip = await page.locator('#grip-right').boundingBox();
  if (!grip) throw new Error('The right grip is not visible.');
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-2');
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  expect(Number(await page.locator('#lean-value').getAttribute('data-radians'))).not.toBe(0);
  await page.keyboard.down('d');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-running', 'false');
  await expect(page.locator('#grip-right')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.up('d');
});

test('the generated index reaches every heading, including collapsed details', async ({ page }) => {
  const headings = await page.locator('main h1,main h2,main h3,main h4,main h5,main h6').count();
  await expect(page.locator('#section-index a')).toHaveCount(headings);
  await expect(page.locator('#physics-details')).not.toHaveAttribute('open', '');
  await page.locator('#section-index a[href="#profile-parameters"]').click();
  await expect(page.locator('#physics-details')).toHaveAttribute('open', '');
  await expect(page.locator('#profile-parameters')).toBeVisible();
  const style = await page.locator('.index-panel').evaluate(element => {
    const computed = getComputedStyle(element);
    return { position: computed.position, overflow: computed.overflowY };
  });
  expect(style).toEqual({ position: 'sticky', overflow: 'auto' });
});

test('a long press pauses at a model boundary without a scripted crash', async ({ page }) => {
  await page.getByLabel('Example speed').selectOption('20');
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.keyboard.down('d');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-limit', 'lean', { timeout: 12_000 });
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-running', 'false');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  await expect(page.locator('#coach-text')).toContainText('not a predicted fall');
  await expect(page.locator('#render-error')).toBeHidden();
  await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-limit', '');
});

test('graphics loss becomes a visible error and stops the trial', async ({ page }) => {
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.locator('#rider-canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('#render-error')).toBeVisible();
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-running', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-scene-ready', 'false');
});

test('mobile-sized layout keeps controls and navigation usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rider-canvas')).toBeVisible();
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  await page.locator('#section-index a[href="#ride"]').click();
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.locator('#grip-right').scrollIntoViewIfNeeded();
  const bounds = await page.locator('#grip-right').boundingBox();
  if (!bounds) throw new Error('Mobile grip is not visible.');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, id: 1 }],
  });
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-2');
  await page.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
});

test('press presets, continuous strength, and a live pulse trace are usable', async ({ page }) => {
  await page.getByRole('radio', { name: /Strong jerk/ }).click();
  await expect(page.locator('#press-strength')).toHaveValue('80');
  await expect(page.locator('#strength-value')).toContainText('Strong');
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.keyboard.down('d');
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'true');
  await expect(page.locator('#grip-right')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(600);
  await expect.poll(async () => Number(await page.locator('#simulation-shell').getAttribute('data-lean'))).toBeGreaterThan(0.0001);
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'true');
  await page.keyboard.up('d');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'false');
  await expect(page.locator('#right-trace')).not.toHaveAttribute('points', '');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('radio', { name: /Steady hold/ }).click();
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  await page.keyboard.down('d');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-2');
  await page.locator('#press-strength').evaluate(input => {
    if (!(input instanceof HTMLInputElement)) throw new Error('The strength control is missing.');
    input.value = '75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-6');
  await page.keyboard.up('d');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  await page.locator('#press-strength').focus();
  await page.keyboard.down('d');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '-6');
  await page.keyboard.up('d');
});

test('held jerk input repeats and the button blinks until release or cancellation', async ({ page }) => {
  await page.getByRole('radio', { name: /Quick push/ }).click();
  await page.getByRole('button', { name: 'Your turn', exact: true }).click();
  const bounds = await page.locator('#grip-right').boundingBox();
  if (!bounds) throw new Error('The right grip is unavailable.');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await expect(page.locator('#grip-right')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'true');
  const animation = await page.locator('#grip-right').evaluate(button => {
    const style = getComputedStyle(button);
    return { name: style.animationName, iterations: style.animationIterationCount, duration: style.animationDuration };
  });
  expect(animation).toEqual({ name: 'grip-input-pulse', iterations: 'infinite', duration: '1s' });
  const opacities: number[] = [];
  for (let sample = 0; sample < 3; sample++) {
    opacities.push(await page.locator('#grip-right').evaluate(button => Number(getComputedStyle(button).opacity)));
    await page.waitForTimeout(200);
  }
  expect(Math.max(...opacities) - Math.min(...opacities)).toBeGreaterThan(0.05);
  const levels = await page.locator('#right-trace').getAttribute('points');
  expect(levels).not.toBe('');
  await page.mouse.up();
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'false');
  await expect(page.locator('#grip-right')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
  expect(await page.locator('#grip-right').evaluate(button => getComputedStyle(button).animationName)).toBe('none');
  expect(Number(await page.locator('#lean-value').getAttribute('data-radians'))).not.toBe(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.down('d');
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'true');
  expect(await page.locator('#grip-right').evaluate(button => getComputedStyle(button).animationName)).toBe('none');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#grip-right')).toHaveAttribute('data-input-active', 'false');
  await expect(page.locator('#simulation-shell')).toHaveAttribute('data-running', 'false');
  await page.keyboard.up('d');
});

test('side and top directions carry force with an explicit model limitation', async ({ page }) => {
  for (const direction of ['side-in', 'side-out', 'top']) {
    await page.getByLabel('Push direction').selectOption(direction);
    await expect(page.locator('#direction-notice')).toContainText('not predicted');
    await page.getByRole('button', { name: 'Your turn', exact: true }).click();
    await page.keyboard.down('d');
    await expect.poll(async () => Number(await page.locator('#simulation-shell').getAttribute('data-force-right'))).toBeGreaterThan(0);
    await expect(page.locator('#simulation-shell')).toHaveAttribute('data-torque', '0');
    await page.waitForTimeout(100);
    await expect(page.locator('#lean-value')).toHaveAttribute('data-radians', '0');
    await page.keyboard.up('d');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
});

test('backward and diagonal demonstrations report their distinct effects without an error', async ({ page }) => {
  for (const direction of ['backward', 'diagonal']) {
    await page.getByLabel('Push direction').selectOption(direction);
    await page.getByRole('button', { name: 'Show me', exact: true }).click();
    await expect(page.locator('#simulation-shell')).toHaveAttribute('data-tick', '1200', { timeout: 10_000 });
    await expect(page.locator('#render-error')).toBeHidden();
    const lean = Number(await page.locator('#lean-value').getAttribute('data-radians'));
    if (direction === 'backward') {
      expect(lean).toBeLessThan(0);
      await expect(page.locator('#coach-title')).toContainText('reverses');
    } else {
      expect(lean).toBeGreaterThan(0);
      await expect(page.locator('#coach-text')).toContainText('not calculated');
    }
  }
});
