// Screenshots every deck slide at 1920x1080 into shots/ (review aid). Run: node shots.mjs [url]
import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5050/';
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(url);
await page.waitForTimeout(3000);
for (let i = 0; i < 7; i++) {
  await page.evaluate((i) => window.presentation.goToSlide(i), i);
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `shots/slide${i + 1}.png` });
}
await browser.close();
console.log('done');
