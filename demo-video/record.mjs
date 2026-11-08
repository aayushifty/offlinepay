// Records the real OfflinePay wallet (two phones, side by side) into offlinepay-demo.mp4.
// Needs: site/ served on :8090 (npm run build:web, then `python -m http.server 8090` in site/),
// this folder served on :8091. Run: node record.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = process.argv[2] || 'offlinepay-demo.mp4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fake camera: the app's real scanner (getUserMedia + jsQR) reads whatever image we hold up to it.
const fakeCam = () => {
  if (!navigator.mediaDevices) return;
  navigator.mediaDevices.getUserMedia = async () => {
    const c = document.createElement('canvas'); c.width = 720; c.height = 960;
    const g = c.getContext('2d'); let t = 0; const stream = c.captureStream(30);
    (function draw() {
      g.fillStyle = '#1b1f27'; g.fillRect(0, 0, c.width, c.height);
      const img = window.__camImg;
      if (img?.complete) {
        // QR slides in from the right so viewers see it arrive; jsQR only locks on once it is fully in frame.
        const p = Math.min(1, (performance.now() - window.__camStart) / 1100), e = 1 - (1 - p) ** 3;
        const s = 520 + Math.sin(t / 9) * 6, x = 360 - s / 2 + (1 - e) * 560 + Math.sin(t / 13) * 5;
        g.fillStyle = '#fff'; g.fillRect(x - 22, 480 - s / 2 - 22, s + 44, s + 44);
        g.drawImage(img, x, 480 - s / 2, s, s);
      }
      t++; if (stream.getVideoTracks()[0].readyState === 'live') requestAnimationFrame(draw);
    })();
    return stream;
  };
};

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(fakeCam);
const page = await ctx.newPage();
page.on('crash', () => console.log('PAGE CRASHED'));
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://localhost:8091/stage.html');
// The wallet calls history.back(); inside an iframe that walks the tab's joint history, so pad it.
await page.evaluate(() => { for (let i = 0; i < 50; i++) history.pushState({ pad: i }, ''); });
await page.waitForTimeout(2500);
await page.evaluate(() => window.stage.card(false));
const A = page.frameLocator('#fa'), B = page.frameLocator('#fb');
const frameOf = (fl) => page.frames().find((f) => f.url().startsWith(fl === A ? 'http://localhost:8090' : 'http://localhost:8092'));
const stage = (fn, ...args) => page.evaluate(([fn, args]) => window.stage[fn](...args), [fn, args]);

async function tap(fl, sel, opts = {}) {
  const loc = (typeof sel === 'string' ? fl.locator(sel) : sel).filter({ visible: true }).first();
  if (opts.optional && !(await loc.waitFor({ state: 'visible', timeout: 700 }).then(() => true, () => false))) return;
  await loc.waitFor({ state: 'visible', timeout: 15000 }).catch(async (e) => { await page.screenshot({ path: 'fail.png' }); console.log('URL', page.url(), page.frames().map((f) => f.url())); throw e; });
  await loc.scrollIntoViewIfNeeded();
  if (!opts.quiet) {
    const bb = await loc.boundingBox();
    await stage('tap', bb.x + bb.width / 2, bb.y + bb.height / 2);
    await sleep(220);
  }
  await loc.click({ timeout: 5000 }).catch(() => loc.click());
  await sleep(opts.after ?? 600);
}
const navTab = (fl, name) => tap(fl, fl.locator('nav button[data-action=tab], .bottom-nav button[data-action=tab], button[data-action=tab]').filter({ hasText: name }).last());

async function signup(fl, wallet, name, user, type) {
  const q = { quiet: true, after: 500 };
  await tap(fl, fl.locator('button[name=wallet]').filter({ hasText: wallet }), q);
  await tap(fl, fl.locator('button').filter({ hasText: 'Create account' }).first(), q);
  await fl.locator('[name=name]').fill(name);
  await fl.locator('[name=username]').fill(user);
  await fl.locator('[name=password]').fill('demo1234'); // local demo-only test account
  await fl.locator('[name=confirm]').fill('demo1234');
  await fl.locator("label.choice").filter({ hasText: type }).click();
  await tap(fl, fl.locator('button').filter({ hasText: 'Create account' }).filter({ visible: true }).last(), { quiet: true, after: 1500 });
}

// Hold the other phone's QR up to this phone's camera, after the scanner has visibly opened.
async function holdUpQR(scanner, shown) {
  const png = (await shown.locator('.qr-wrap').first().screenshot()).toString('base64');
  await sleep(700);
  await frameOf(scanner).evaluate((b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; window.__camStart = performance.now(); window.__camImg = i; }, png);
  await scanner.locator('.scanner').waitFor({ state: 'detached', timeout: 8000 });
  await frameOf(scanner).evaluate(() => { window.__camImg = null; });
}

// ---------- off-camera setup (title card covers it) ----------
await signup(A, 'PayA', 'Aayush Bhatta', 'aayush', 'Personal');
await signup(B, 'PayB', 'Himalayan Tea House', 'teahouse', 'Merchant');
for (const fl of [A, B]) {
  await navTab(fl, 'Offline Pay');
  await tap(fl, fl.getByText('Skip'), { quiet: true, after: 600 });
}
await tap(B, 'button[data-action=enable]', { quiet: true, after: 1500 });
await tap(B, 'button[data-action=back]', { quiet: true });
await navTab(A, 'Home'); await navTab(B, 'Home');

// ---------- recording ----------
await page.evaluate(() => window.stage.card(true)); await sleep(900);
fs.rmSync('frames', { recursive: true, force: true }); fs.mkdirSync('frames');
const cdp = await ctx.newCDPSession(page);
const times = [];
cdp.on('Page.screencastFrame', async (f) => {
  fs.writeFileSync(`frames/${String(times.length).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64'));
  times.push(f.metadata.timestamp);
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });

await sleep(2200);
await stage('card', false); await sleep(700);

await stage('caption', 1, 'Load the Offline Vault', 'While online, the customer locks NPR 1,000 into a secure vault on the phone.');
await stage('focus', 'a'); await sleep(500);
await navTab(A, 'Offline Pay');
await tap(A, 'button[data-action=enable]', { after: 1100 });
await tap(A, A.locator('button').filter({ hasText: 'Load vault' }), { after: 1500 });

await stage('caption', 2, 'Airplane mode on both phones', 'No internet. No server. Nothing can reach the bank now.');
await stage('focus', null); await sleep(500);
await tap(A, 'button[data-action=toggleNet]', { after: 250 });
await tap(B, 'button[data-action=toggleNet]', { after: 250 });
await stage('net', false); await sleep(1400);

await stage('caption', 3, 'Merchant shows a QR for Rs 150', 'The shop types the amount and shows a payment request QR.');
await stage('focus', 'b'); await sleep(400);
await navTab(B, 'Offline Pay');
await tap(B, 'button.big-act[data-action=receive]', { after: 500 });
await tap(B, 'input[name=amount]', { after: 100 });
await B.locator('input[name=amount]').pressSequentially('150', { delay: 120 });
await tap(B, B.locator('button').filter({ hasText: 'Show QR' }), { after: 1100 });

await stage('caption', 4, "Customer scans the merchant's QR", "The customer's camera reads the shop's payment request. Zero bars.");
await stage('scan', 1, 'a'); await stage('focus', 'a'); await sleep(500);
await tap(A, 'button.big-act[data-action=scanPay]', { after: 0 });
await holdUpQR(A, B);
await A.locator('button').filter({ hasText: 'Confirm & pay' }).waitFor();
await stage('scan', 0); await sleep(700);

await stage('caption', 5, 'Confirm and sign', "The phone seals the payment with its secret key, like signing a cheque, and shows it as a new QR.");
await tap(A, A.locator('button').filter({ hasText: 'Confirm & pay' }), { after: 2000 });

await stage('caption', 6, "Merchant scans the customer's QR", "The signed code is checked right on the merchant's phone. No internet needed.");
await stage('scan', 2, 'b'); await stage('focus', 'b'); await sleep(500);
await tap(B, 'button[data-action=scanPayment]', { after: 0 });
await holdUpQR(B, A);
await B.getByText('Payment verified').waitFor();
await stage('scan', 0);
await stage('caption', 6, 'Payment verified, offline', 'Two QR scans, about two seconds. Neither phone touched the internet.', 'ok');
await sleep(2400);

await stage('caption', 0, 'What if someone edits the amount?', 'A hacked phone changes Rs 150 into Rs 1,500 after signing.', 'bad');
await stage('focus', 'a');
await tap(A, 'button[data-action=doneTo]', { after: 400, optional: true });
await tap(A, A.locator('details.demo summary'), { after: 500 });
await tap(A, 'input[data-action=tamper]', { after: 600 });
await stage('focus', 'b');
await tap(B, 'button[data-action=doneTo]', { after: 400, optional: true });
await tap(B, 'button.big-act[data-action=receive]', { after: 400 });
await B.locator('input[name=amount]').pressSequentially('150', { delay: 70 });
await tap(B, B.locator('button').filter({ hasText: 'Show QR' }), { after: 600 });
await stage('scan', 1, 'a'); await stage('focus', 'a');
await tap(A, 'button.big-act[data-action=scanPay]', { after: 0 });
await holdUpQR(A, B);
await tap(A, A.locator('button').filter({ hasText: 'Confirm & pay' }), { after: 1300 });
await stage('scan', 2, 'b'); await stage('focus', 'b');
await tap(B, 'button[data-action=scanPayment]', { after: 0 });
await holdUpQR(B, A);
await B.getByText('Payment rejected').waitFor();
await stage('scan', 0);
await stage('caption', 0, 'Rejected instantly, even offline', "The signature no longer matches, so the merchant's phone refuses it.", 'bad');
await sleep(2600);

await stage('caption', 7, 'Signal returns: auto-settle', 'The phones reconnect and the real payment settles with the wallets on its own.', 'ok');
await stage('focus', null);
await tap(B, 'button[data-action=doneTo]', { after: 200, optional: true });
await tap(A, 'button[data-action=doneTo]', { after: 300, optional: true });
await tap(A, 'button[data-action=toggleNet]', { after: 200 });
await tap(B, 'button[data-action=toggleNet]', { after: 200 });
await stage('net', true); await sleep(900);
for (const fl of [A, B]) await tap(fl, 'button[data-action=sync]', { after: 500 });
for (const fl of [A, B]) await fl.locator('.chip.settled').first().scrollIntoViewIfNeeded().catch(() => {});
await sleep(2600);

await stage('card', true, 'No signal. <em>No problem.</em>', 'Pay offline · Verified on the spot · Settles automatically', 'OfflinePay');
await sleep(3000);
await cdp.send('Page.stopScreencast');
await sleep(300);
await browser.close();

// Screencast frames arrive only on repaint: give each frame its real on-screen duration.
// Frames can arrive slightly out of order, so sort by capture time.
const order = times.map((t, i) => ({ t, f: `${String(i).padStart(6, '0')}.jpg` })).sort((a, b) => a.t - b.t);
order.push({ ...order.at(-1), t: order.at(-1).t + 0.5 });
fs.writeFileSync('frames/list.txt', order.slice(0, -1).map((o, i) =>
  `file '${o.f}'\nduration ${Math.max(0, order[i + 1].t - o.t).toFixed(4)}`).join('\n') + `\nfile '${order.at(-2).f}'\n`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames/list.txt',
  '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', '-an', OUT], { stdio: 'inherit' });
console.log(`wrote ${OUT}: ${times.length} frames, ${(order.at(-2).t - order[0].t).toFixed(1)}s`);
