// Screenshots of the per-channel New message flow for its UI flow and design spec.
// usage: serve teams/split/dist on :4190, then  node tools/newmsg-shots.mjs teams/src/spec/newmsg/shots
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1680, height: 940 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
const marks = {}, wait = ms => p.waitForTimeout(ms);
const step = async (name, fn) => { try { await fn() } catch (e) { errs.push(name + ': ' + e.message.split('\n')[0]) } };
const hideToasts = () => p.evaluate(() => document.querySelectorAll('[data-sonner-toaster]').forEach(n => { n.style.display = 'none' }));
// box: a locator, a box, a list of locators (their union), or null for the whole window
async function boxOf(t) {
  if (t === null) return { x: 0, y: 0, width: p.viewportSize().width, height: p.viewportSize().height };
  if (Array.isArray(t)) {
    const bs = []; for (const l of t) bs.push(await l.first().boundingBox());
    const x = Math.min(...bs.map(c => c.x)), y = Math.min(...bs.map(c => c.y));
    return { x, y, width: Math.max(...bs.map(c => c.x + c.width)) - x, height: Math.max(...bs.map(c => c.y + c.height)) - y };
  }
  return typeof t.boundingBox === 'function' ? await t.first().boundingBox() : t;
}
async function shot(name, target, list = [], pad = 0) {
  let box = await boxOf(target);
  box = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 };
  await hideToasts();
  const out = [];
  for (const [n, loc, at = 'tl'] of list) {
    try {
      const bb = await loc.first().boundingBox(); if (!bb) throw new Error('no box');
      const x = at === 'tr' ? bb.x + bb.width : at === 'c' ? bb.x + bb.width / 2 : at === 'r' ? bb.x + bb.width : bb.x;
      const y = at === 'c' || at === 'r' ? bb.y + bb.height / 2 : bb.y;
      out.push({ n, x: +((x - box.x) / box.width * 100).toFixed(2), y: +((y - box.y) / box.height * 100).toFixed(2) });
    } catch (e) { errs.push(name + ' mark ' + n + ': ' + e.message.split('\n')[0]) }
  }
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80, clip: box });
  marks[name] = { w: Math.round(box.width), h: Math.round(box.height), marks: out };
}
const dlg = () => p.getByRole('dialog').last();
const big = async (h = 1300) => { await p.setViewportSize({ width: 1680, height: h }); await wait(300) };
const page = async name => { await hideToasts(); await shot(name, null) };
const foot = name => p.locator('[data-compose]').getByRole('button', { name, exact: true }).last();

await p.goto('http://localhost:4190/index.html'); await wait(1800);

// ---- step 1
await step('s1-empty', async () => {
  await p.getByRole('button', { name: 'New message' }).first().click(); await wait(900);
  await big(940); await page('s1-empty');
});
await step('s1-error', async () => { await foot('Next').click(); await wait(500); await page('s1-error') });
await step('s1-search', async () => {
  await p.getByPlaceholder(/Name, NT account/).fill('Chen'); await wait(700); await page('s1-search');
  await p.keyboard.press('Escape'); await p.getByPlaceholder(/Name, NT account/).fill(''); await wait(300);
});
await step('dlg-import', async () => {
  await p.getByRole('button', { name: 'Batch import' }).click(); await wait(600);
  await shot('dlg-import', dlg(), [], 12);
  await dlg().getByRole('combobox').first().click(); await wait(300);
  await p.getByRole('option').first().click(); await wait(300);
  await dlg().getByRole('button', { name: 'Try a sample' }).click(); await wait(300);
  await shot('dlg-import-list', dlg(), [], 12);
  await dlg().getByRole('button', { name: 'Find matches' }).click(); await wait(700);
  await shot('dlg-import-result', dlg(), [], 12);
  await dlg().locator('button').last().click(); await wait(700);
  await p.keyboard.press('Escape'); await wait(300);
});
// only Desktop OS: someone without the desktop agent can't get it
await step('dlg-unreach', async () => {
  await p.getByRole('checkbox', { name: 'Desktop OS', exact: true }).click(); await wait(400);
  await page('s1-unreach');
  await p.getByRole('button', { name: 'See who' }).click(); await wait(600);
  await shot('dlg-unreach', dlg(), [], 12); await p.keyboard.press('Escape'); await wait(300);
  await p.getByRole('checkbox', { name: 'Desktop OS', exact: true }).click(); await wait(300);
});
await step('s1-filled', async () => {
  await p.getByRole('checkbox', { name: 'Device Notifications', exact: true }).click(); await wait(200);
  await p.getByRole('checkbox', { name: 'Email', exact: true }).click(); await wait(300);
  await big(1500); await page('s1-filled');
});
await step('s1-sms', async () => {
  await p.getByRole('checkbox', { name: /Device Notifications \(SMS\)/ }).click(); await wait(400);
  await page('s1-sms');
});
await step('s1-urgent', async () => {
  await p.getByRole('checkbox', { name: /It’s urgent/ }).click(); await wait(400);
  await page('s1-urgent');
  await p.locator('#f-urgent').fill('The typhoon warning was issued at 07:30; staff must know before commuting.'); await wait(200);
});
await step('dlg-save-group', async () => {
  await foot('Save as group').click(); await wait(500);
  await shot('dlg-save-group', dlg(), [], 12); await p.keyboard.press('Escape'); await wait(300);
});

// ---- step 2
await step('s2-empty', async () => { await foot('Next').click(); await wait(800); await big(1500); await page('s2-empty') });
await step('s2-error', async () => { await foot('Next').click(); await wait(500); await page('s2-error') });
await step('s2-filled', async () => {
  await p.locator('#f-sender').fill('IT Service Desk');
  await p.locator('#f-content').fill('Network maintenance tonight 22:00–23:00\nSave your work before 22:00. Wi-Fi and VPN will be down.');
  await p.locator('#f-sms').fill('Network maintenance tonight 22:00–23:00. Save your work before 22:00.');
  await p.locator('#f-subject').fill('Network maintenance tonight 22:00–23:00');
  await p.locator('#f-body [contenteditable="true"], #f-body').first().click(); await p.keyboard.type('Hi all, the office network will be down tonight from 22:00 to 23:00. Please save your work before 22:00.');
  await wait(400); await page('s2-filled');
});
await step('dlg-save-tpl', async () => {
  await foot('Save as template').click(); await wait(500);
  await shot('dlg-save-tpl', dlg(), [], 12); await p.keyboard.press('Escape'); await wait(300);
});

// ---- step 3
await step('s3-now', async () => { await foot('Next').click(); await wait(800); await big(1400); await page('s3-now') });
await step('s3-schedule', async () => {
  await p.getByText('Scheduled send', { exact: true }).click(); await wait(400); await page('s3-schedule');
  const f = p.locator('#f-sched'); await f.fill('2026/11/01 09:00'); await p.keyboard.press('Tab'); await wait(400); await page('s3-error');
  await p.getByText('Send now', { exact: true }).click(); await wait(300);
});
await step('s3-preview', async () => {
  const seg = p.getByRole('radio', { name: 'Email', exact: true }).or(p.getByRole('button', { name: 'Email', exact: true })); await seg.last().click().catch(() => {}); await wait(400);
  await page('s3-preview-email');
});
await step('dlg-leave', async () => {
  await foot('Cancel').click(); await wait(500); await shot('dlg-leave', dlg(), [], 12);
  await dlg().getByRole('button', { name: 'Cancel', exact: true }).click(); await wait(300);
});
await step('submit', async () => {
  await foot('Create message').click(); await wait(700);
  if (await p.getByRole('dialog').count()) { await shot('dlg-urgent', dlg(), [], 12); await dlg().locator('button').last().click(); await wait(900) }
  await big(940); await p.screenshot({ path: `${OUT}/after-submit.jpg`, type: 'jpeg', quality: 80 }); marks['after-submit'] = { w: 1680, h: 940, marks: [] };
});

writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no errors');
await b.close();
