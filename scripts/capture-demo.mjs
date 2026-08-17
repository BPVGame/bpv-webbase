/**
 * Capture BPV Game screenshots + playthrough video for README.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('docs/media');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--deny-permission-prompts', '--use-fake-ui-for-media-stream']
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  geolocation: undefined,
  permissions: []
});

const page = await context.newPage();
page.on('dialog', async d => d.dismiss().catch(() => {}));

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2000);

// Dismiss any leftover overlays
await page.keyboard.press('Escape').catch(() => {});

// --- WORLD / IsoEarth ---
await page.waitForSelector('canvas.game-canvas, canvas', { timeout: 15000 });
await page.waitForTimeout(1200);

// Move around with WASD
for (const key of ['KeyD', 'KeyD', 'KeyW', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyW']) {
  await page.keyboard.down(key);
  await page.waitForTimeout(180);
  await page.keyboard.up(key);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'isoearth-world.png'), fullPage: false });

// Open pause menu → Pixel Harbor
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const harbor = page.getByRole('button', { name: /Pixel Harbor/i });
if (await harbor.count()) {
  await harbor.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'isoearth-harbor.png'), fullPage: false });
}

await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const park = page.getByRole('button', { name: /Central Park/i });
if (await park.count()) {
  await park.click();
  await page.waitForTimeout(800);
}
for (const key of ['KeyA', 'KeyA', 'KeyS', 'KeyD']) {
  await page.keyboard.down(key);
  await page.waitForTimeout(160);
  await page.keyboard.up(key);
}
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'isoearth-park.png'), fullPage: false });

// Inventory
await page.keyboard.press('KeyI');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'inventory.png'), fullPage: false });
await page.keyboard.press('KeyI');
await page.waitForTimeout(300);

// --- FISH CARDS via pause menu ---
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
await page.getByRole('button', { name: /Fish Cards/i }).click();
await page.waitForSelector('text=Emoji Design Fish Cards', { timeout: 10000 });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'fish-cards.png'), fullPage: false });

// --- TOURNAMENTS ---
await page.getByRole('button', { name: /Back to World/i }).click();
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
await page.getByRole('button', { name: /Tournaments/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'tournaments.png'), fullPage: false });

// Back to world
await page.getByRole('button', { name: /Back to World/i }).click();
await page.waitForTimeout(500);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const city = page.getByRole('button', { name: /City Center/i });
if (await city.count()) await city.click();
await page.waitForTimeout(500);
for (let i = 0; i < 8; i++) {
  const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  const k = keys[i % 4];
  await page.keyboard.down(k);
  await page.waitForTimeout(200);
  await page.keyboard.up(k);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(600);

const videoPath = await page.video()?.path();
await context.close();
await browser.close();

// Rename video
if (videoPath && fs.existsSync(videoPath)) {
  const dest = path.join(OUT, 'bpv-gameplay.webm');
  fs.renameSync(videoPath, dest);
  console.log('VIDEO', dest);
} else {
  console.log('NO_VIDEO');
}

console.log('SHOTS', fs.readdirSync(OUT).join(', '));
