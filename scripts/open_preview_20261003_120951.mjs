import { createServer } from 'node:net';
import { chromium } from '@playwright/test';
import { artifactDirectory, artifactPath } from '../tooling/artifacts.mjs';

await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(9229, '127.0.0.1', () => probe.close(resolve));
});

const context = await chromium.launchPersistentContext(artifactDirectory('browser-profile'), {
  headless: false,
  viewport: { width: 1440, height: 1080 },
  args: ['--remote-debugging-port=9229', '--enable-unsafe-swiftshader'],
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto('http://127.0.0.1:5173');
await page.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await page.screenshot({
  path: artifactPath('screenshots', 'preview_20261003_120951.png'),
  fullPage: false,
});
console.log('Preview ready: http://127.0.0.1:5173');
console.log('Owned browser CDP: http://127.0.0.1:9229');
console.log(`Screenshot: ${artifactPath('screenshots', 'preview_20261003_120951.png')}`);
process.once('SIGINT', () => { void context.close(); });
process.once('SIGTERM', () => { void context.close(); });
await new Promise(resolve => context.once('close', resolve));
