// Screenshots of the one-record-per-channel prototype for its UI flow and design spec, with callout positions
// (percent of each image).
// usage: build with `npx vite build --mode split --outDir split/dist --emptyOutDir` inside teams/, serve teams/split/dist
//        on :4190 (python3 -m http.server 4190 -d teams/split/dist), then  node tools/split-shots.mjs teams/src/spec/split/shots
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
const main = p.locator('#app-shell-main');
const aside = () => p.locator('aside').last();
const space = async n => { await p.getByRole('button', { name: n, exact: true }).first().click(); await wait(1300) };
const row = (text, nth = 0) => main.locator('[role="row"]').filter({ hasText: text }).nth(nth);
// the row actions sit in their own column outside the row, so find them by their label
const openRowMenu = async text => { await main.getByRole('button', { name: new RegExp('^Actions for .*' + text) }).first().click(); await wait(350) };
const closeAside = async () => { await aside().getByRole('button', { name: 'Close' }).first().click().catch(() => {}); await wait(300) };
// a detail panel, cut just below its last section
async function panel(name, list = []) {
  const a = aside(), bb = await a.boundingBox();
  const bottom = await a.evaluate(n => Math.max(...Array.from(n.querySelectorAll('section')).map(x => x.getBoundingClientRect().bottom)));
  await shot(name, { x: bb.x, y: bb.y, width: bb.width, height: Math.min(bb.height, bottom - bb.y + 28) }, list);
}
const openRecord = async (text, nth = 0) => { await row(text, nth).getByRole('link').first().click().catch(async () => { await row(text, nth).getByText(text).first().click() }); await wait(700) };

await p.goto('http://localhost:4190/index.html'); await wait(300);
await p.getByText('EN', { exact: true }).click(); await wait(200);
await wait(1500);

// ---- list
await step('list', async () => {
  await shot('list', null, [
    [1, main.locator('[role="columnheader"]').filter({ hasText: 'Channel' }), 'tl'],
    [2, main.locator('[role="columnheader"]').filter({ hasText: 'Title' }), 'tl'],
    [3, main.locator('[role="columnheader"]').filter({ hasText: 'Status' }), 'tl'],
    [4, main.locator('[role="columnheader"]').filter({ hasText: 'Audience' }), 'tl'],
    [5, main.getByRole('button', { name: /^\d+ failed$/ }).first(), 'tl'],
    [6, main.getByRole('button', { name: /^Actions for/ }).first(), 'c'],
    [7, main.getByRole('button', { name: /^Status/ }), 'tl'],
    [8, main.getByRole('button', { name: /^Channel/ }), 'tl'],
  ]);
});
await step('group', async () => {
  const a = row('Design review', 0), c = row('Design review', 1);
  await shot('group', [a, c], [
    [1, a.locator('[role="cell"]').nth(0), 'tl'],
    [2, a.locator('[role="cell"]').nth(1), 'tl'],
    [3, a.locator('[role="cell"]').nth(3), 'tl'],
    [4, a.locator('[role="cell"]').nth(4), 'tl'],
    [5, c.locator('[role="cell"]').nth(5), 'tl'],
  ], 10);
});
await step('rows-progress', async () => {
  const a = row('Fire alarm', 0), c = row('Fire alarm', 1);
  await shot('rows-progress', [a, c], [], 10);
});
await step('rows-nofb', async () => {
  const a = row('Team lunch on Fri', 0), c = row('Team lunch on Fri', 1);
  await shot('rows-nofb', [a, c], [], 10);
});
await step('status-menu', async () => {
  await main.getByRole('button', { name: /^Status/ }).first().click(); await wait(400);
  const menu = p.getByRole('menu'), mb = await menu.boundingBox(), tb = await main.getByPlaceholder(/Search title/).boundingBox();
  await shot('status-menu', { x: mb.x - 260, y: tb.y - 12, width: mb.width + 410, height: mb.y + mb.height - tb.y + 24 });
  await p.keyboard.press('Escape'); await wait(250);
  await main.getByRole('button', { name: /^Channel/ }).first().click(); await wait(400);
  const mb2 = await p.getByRole('menu').boundingBox();
  await shot('channel-menu', { x: mb2.x - 260, y: tb.y - 12, width: mb2.width + 410, height: mb2.y + mb2.height - tb.y + 24 });
  await p.keyboard.press('Escape'); await wait(250);
});
await step('filtered', async () => {
  await main.getByRole('button', { name: /^Status/ }).first().click(); await wait(300);
  await p.getByRole('menuitemcheckbox').filter({ hasText: 'In progress' }).first().click(); await wait(200);
  await p.keyboard.press('Escape'); await wait(500);
  await shot('filtered', null);
  await main.getByRole('button', { name: 'Clear', exact: true }).first().click(); await wait(400);
});
await step('empty', async () => {
  await main.getByPlaceholder(/Search title/).fill('zzzz'); await wait(500);
  await shot('empty', null);
  await main.getByPlaceholder(/Search title/).fill(''); await wait(400);
});

// ---- row menus
const menuShot = async (name, text, nth = 0) => {
  await step(name, async () => {
    await openRowMenu(text);
    const r = row(text, nth), rb = await r.boundingBox(), mb = await p.getByRole('menu').boundingBox();
    const x = Math.min(rb.x, mb.x - 700), y = rb.y - 8;
    await shot(name, { x: Math.max(0, x), y, width: Math.max(rb.x + rb.width, mb.x + mb.width) - Math.max(0, x) + 8, height: Math.max(mb.y + mb.height, rb.y + rb.height) - y + 12 });
    await p.keyboard.press('Escape'); await wait(250);
  });
};
await menuShot('menu-sent', 'Team lunch moves to 12:30');
await menuShot('menu-scheduled', 'out of office');
await menuShot('menu-expired', 'UX sync moves');
await menuShot('menu-rejected', 'Reminder: badge photo');
await menuShot('menu-error', 'On-call swap');

// ---- details
await step('detail-fb', async () => {
  await space('ESH Emergency');
  await row('Chemical delivery at Dock 2').getByText('Chemical delivery at Dock 2').first().click(); await wait(800);
  const a = aside();
  await panel('detail-fb', [
    [1, a.getByText('Message content').first(), 'tl'],
    [2, a.getByRole('button', { name: /Approval center/ }), 'tl'],
    [3, a.getByText('Device Notifications', { exact: true }).first(), 'tl'],
    [4, a.getByText('SMS fallback', { exact: true }).first(), 'tl'],
    [5, a.getByText('Audiences', { exact: true }), 'tl'],
  ]);
  await closeAside();
});
await step('detail-single', async () => {
  await space('My sending space');
  await row('Design review', 1).getByText('Design review with Northwind Studio: Thu, Nov 6').first().click(); await wait(800);
  await panel('detail-email', []);
  await closeAside();
  await row('Team lunch moves to 12:30').getByText('Team lunch moves to 12:30 today').first().click(); await wait(800);
  await panel('detail-push', []);
  await closeAside();
});
await step('detail-pending', async () => {
  await row('Atlas demo moves').getByText('Atlas demo moves to Mon').first().click(); await wait(800);
  await panel('detail-pending', []);
  await closeAside();
});
await step('detail-mixed', async () => {
  await row('Design review', 0).getByText('Design review with Northwind Studio: Thu 11/6').first().click(); await wait(800);
  await panel('detail-mixed', [
    [1, aside().getByRole('button', { name: /Approval center/ }), 'tl'],
  ]);
  await closeAside();
});

// ---- dialogs
await step('dlg-fail', async () => {
  await row('Design review', 0).getByRole('button', { name: /failed/ }).click(); await wait(800);
  const d = p.getByRole('dialog'); await shot('dlg-fail', d, [
    [1, d.getByText(/Device Notifications \(SMS\) ·/), 'tl'],
    [2, d.locator('[role="columnheader"]').filter({ hasText: 'Reason' }), 'tl'],
    [3, d.getByRole('button', { name: /^Resend to/ }), 'tl'],
  ], 12);
  await d.getByRole('button', { name: /^Resend to/ }).click(); await wait(1200);
  await shot('resend', null);
  await p.getByRole('button', { name: 'Cancel' }).click(); await wait(500);
  const leave = p.getByRole('button', { name: 'Discard' }); if (await leave.count()) await leave.click(); await wait(500);
});
const dlgShot = async (name, text, item, btn) => {
  await step(name, async () => {
    await openRowMenu(text); await p.getByRole('menuitem', { name: item }).click(); await wait(600);
    await shot(name, p.getByRole('dialog'), [], 12);
    await p.keyboard.press('Escape'); await wait(300);
  });
};
await dlgShot('dlg-delete', 'out of office', /^Delete/);
await dlgShot('dlg-sendnow', 'UX sync moves', /^Send now/);
await dlgShot('dlg-reschedule', 'UX sync moves', /^Reschedule/);

writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no errors');
await b.close();
