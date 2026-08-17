/**
 * Capture BPV Game screenshots + playthrough video for README / GitHub Pages.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const OUT = path.resolve('docs/media');
fs.mkdirSync(OUT, { recursive: true });

async function tap(page, key, hold = 180, gap = 110) {
  await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  await page.keyboard.up(key);
  await page.waitForTimeout(gap);
}

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
page.on('dialog', d => {
  void d.dismiss().catch(() => {});
});

await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.getByRole('button', { name: 'PLAY' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(1600);

await page.screenshot({ path: path.join(OUT, 'main-menu.png') });

await page.getByRole('button', { name: 'PLAY' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'game-gate.png') });

await page.getByRole('button', { name: /^Offline/ }).click();
await page.waitForTimeout(450);
await page.screenshot({ path: path.join(OUT, 'offline-load.png') });

await page.getByRole('button', { name: /Load BPV World/i }).click();
await page.waitForTimeout(1400);

for (const key of ['KeyD', 'KeyD', 'KeyW', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyW']) {
  await tap(page, key);
}
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'isoearth-world.png') });

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const harbor = page.getByRole('button', { name: /Pixel Harbor/i });
if (await harbor.count()) {
  await harbor.click();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, 'isoearth-harbor.png') });
}

await page.keyboard.press('Escape');
await page.waitForTimeout(350);
const park = page.getByRole('button', { name: /Central Park/i });
if (await park.count()) {
  await park.click();
  await page.waitForTimeout(900);
}
for (const key of ['KeyA', 'KeyA', 'KeyS', 'KeyD']) {
  await tap(page, key, 160);
}
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'isoearth-park.png') });

await page.keyboard.press('KeyI');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'inventory.png') });
await page.keyboard.press('KeyI');
await page.waitForTimeout(280);

await page.keyboard.press('Escape');
await page.waitForTimeout(350);
await page.getByRole('button', { name: /Settings/i }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'settings.png') });
const closer = page.getByRole('button', { name: 'Close' });
if (await closer.count()) await closer.click();
await page.waitForTimeout(280);
if (!(await page.getByRole('button', { name: /Fish Cards/i }).count())) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}
await page.getByRole('button', { name: /Fish Cards/i }).click();
await page.waitForSelector('text=Emoji Design Fish Cards', { timeout: 10000 });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'fish-cards.png') });

await page.getByRole('button', { name: /Back to World/i }).click();
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
await page.getByRole('button', { name: /Tournaments/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'tournaments.png') });

await page.getByRole('button', { name: /Back to World/i }).click();
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Main Menu/i }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'SERVERS' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'multiplayer.png') });

await page.getByRole('button', { name: /Join Server/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, 'server-browser.png') });

const videoPath = await page.video()?.path();
await context.close();
await browser.close();

if (videoPath && fs.existsSync(videoPath)) {
  const webm = path.join(OUT, 'bpv-gameplay.webm');
  const mp4 = path.join(OUT, 'bpv-gameplay.mp4');
  fs.renameSync(videoPath, webm);
  const conv = spawnSync(
    'ffmpeg',
    ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4],
    { stdio: 'inherit' }
  );
  if (conv.status === 0 && fs.existsSync(mp4)) {
    fs.unlinkSync(webm);
    console.log('VIDEO', mp4);
  } else {
    console.log('VIDEO_WEBM', webm);
  }
} else {
  console.log('NO_VIDEO');
}

console.log('SHOTS', fs.readdirSync(OUT).join(', '));
