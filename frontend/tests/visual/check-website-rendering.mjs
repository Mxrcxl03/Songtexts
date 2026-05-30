import { chromium, firefox, webkit, devices } from 'playwright';
import fs from 'node:fs/promises';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = '/Users/mko/Documents/Github/Songtexts/test-artifacts/visual-check-20260530';
const TARGET_SONG_BADGE = '#0001';

const configs = [
  { id: 'desktop-firefox', browserType: firefox, contextOptions: { viewport: { width: 1366, height: 768 } } },
  { id: 'desktop-chromium', browserType: chromium, contextOptions: { viewport: { width: 1366, height: 768 } } },
  {
    id: 'android-chromium-s22-like',
    browserType: chromium,
    contextOptions: {
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    },
  },
  { id: 'ipad-webkit', browserType: webkit, contextOptions: { ...devices['iPad Pro 11'] } },
];

async function loginAndOpenSong(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByPlaceholder('Username').fill('admin');
  await page.getByPlaceholder('Password').fill('admin');
  await page.getByRole('button', { name: 'Anmelden' }).click();

  await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 30000 });
  await page.waitForSelector('.song-list', { timeout: 30000 });

  const targetButton = page.locator('.song-item-btn', { hasText: TARGET_SONG_BADGE });
  let chosenButton = targetButton;
  if ((await targetButton.count()) === 0) {
    chosenButton = page.locator('.song-item-btn').first();
  }

  const firstSongTitle = (await chosenButton.innerText()).trim();
  await chosenButton.click();

  await page.waitForSelector('.lyrics-editor-readonly .lyrics-editor-textline-readonly', {
    timeout: 30000,
  });

  return { firstSongTitle };
}

async function measureAlignment(page) {
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.lyrics-editor-textline-readonly'));

    const charLeft = (el, index) => {
      const node = el?.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return null;
      const txt = node.textContent ?? '';
      if (index < 0 || index >= txt.length) return null;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      if (!rect || Number.isNaN(rect.left)) return null;
      return rect.left;
    };

    const deltas = [];
    const samples = [];
    let chordRows = 0;

    for (const row of rows) {
      const chordPre = row.querySelector('.lyrics-line-readonly-chords');
      const lyricPre = row.querySelector('.lyrics-line-readonly-text');
      if (!chordPre || !lyricPre) continue;

      const chordText = chordPre.textContent ?? '';
      const lyricText = lyricPre.textContent ?? '';
      if (!chordText.trim()) continue;

      chordRows += 1;

      for (let i = 0; i < chordText.length; i += 1) {
        const chordChar = chordText[i];
        if (chordChar === ' ' || i >= lyricText.length) continue;

        const cLeft = charLeft(chordPre, i);
        const lLeft = charLeft(lyricPre, i);
        if (cLeft === null || lLeft === null) continue;

        const delta = Math.abs(cLeft - lLeft);
        deltas.push(delta);
        if (samples.length < 20) {
          samples.push({ idx: i, delta: Number(delta.toFixed(3)), chordChar, lyricChar: lyricText[i] });
        }
      }
    }

    const maxDelta = deltas.length ? Math.max(...deltas) : null;
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;

    const chordElement = document.querySelector('.lyrics-line-readonly-chords');
    const lyricElement = document.querySelector('.lyrics-line-readonly-text');

    return {
      rowsTotal: rows.length,
      rowsWithChords: chordRows,
      comparedPoints: deltas.length,
      maxDeltaPx: maxDelta === null ? null : Number(maxDelta.toFixed(3)),
      avgDeltaPx: avgDelta === null ? null : Number(avgDelta.toFixed(3)),
      chordFont: chordElement ? getComputedStyle(chordElement).fontFamily : null,
      lyricFont: lyricElement ? getComputedStyle(lyricElement).fontFamily : null,
      chordWhiteSpace: chordElement ? getComputedStyle(chordElement).whiteSpace : null,
      lyricWhiteSpace: lyricElement ? getComputedStyle(lyricElement).whiteSpace : null,
      sampleDeltas: samples,
    };
  });
}

await fs.mkdir(OUT_DIR, { recursive: true });
const report = [];

for (const config of configs) {
  let browser;
  try {
    browser = await config.browserType.launch({ headless: true });
  } catch (error) {
    report.push({ id: config.id, status: 'error', phase: 'launch', message: String(error?.message ?? error) });
    continue;
  }

  const context = await browser.newContext(config.contextOptions);
  const page = await context.newPage();

  try {
    const nav = await loginAndOpenSong(page);
    const alignment = await measureAlignment(page);
    const screenshotPath = `${OUT_DIR}/${config.id}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    report.push({
      id: config.id,
      status: 'ok',
      song: nav.firstSongTitle,
      screenshotPath,
      alignment,
      url: page.url(),
    });
  } catch (error) {
    const screenshotPath = `${OUT_DIR}/${config.id}-error.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    report.push({
      id: config.id,
      status: 'error',
      phase: 'run',
      message: String(error?.message ?? error),
      screenshotPath,
      url: page.url(),
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

await fs.writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
