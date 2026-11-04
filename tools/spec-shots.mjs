// usage: preview teams on :4176, then  node tools/spec-shots.mjs teams/src/spec/shots
// Captures the spec screenshots from the teams preview, with callout positions (percent of each image)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1680, height: 940 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
const marks = {};
const wait = ms => p.waitForTimeout(ms);
async function shot(name, target, list = []) {
  const el = typeof target === 'string' ? p.locator(target).first() : target;
  let box = target === null ? { x: 0, y: 0, width: p.viewportSize().width, height: p.viewportSize().height } : await el.boundingBox();
  // detail panels: stop just below the last section or the footer, not at the bottom of the window
  if (name.startsWith('d-')) {
    const bottom = await el.evaluate(n => Math.max(...Array.from(n.querySelectorAll('section, dl, .sticky')).map(x => x.getBoundingClientRect().bottom)))
    box = { ...box, height: Math.min(box.height, bottom - box.y + 24) }
  }
  const out = [];
  for (const [n, loc, at = 'tl'] of list) {
    try {
      const bb = await loc.first().boundingBox(); if (!bb) throw new Error('no box');
      const x = at === 'tr' ? bb.x + bb.width : at === 'c' ? bb.x + bb.width / 2 : at === 'r' ? bb.x + bb.width : bb.x
      const y = at === 'c' || at === 'r' ? bb.y + bb.height / 2 : bb.y
      out.push({ n, x: +((x - box.x) / box.width * 100).toFixed(2), y: +((y - box.y) / box.height * 100).toFixed(2) })
    } catch (e) { errs.push(name + ' mark ' + n + ': ' + e.message.split('\n')[0]) }
  }
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80, clip: box });
  marks[name] = { w: Math.round(box.width), h: Math.round(box.height), marks: out };
}
const main = p.locator('#app-shell-main');
const aside = () => p.locator('aside').last();
const step = async (name, fn) => { try { await fn() } catch (e) { errs.push(name + ': ' + e.message.split('\n')[0]) } };
const space = async n => { await p.getByRole('button', { name: n, exact: true }).first().click(); await wait(1300) };
const closeAside = async () => { await aside().getByRole('button', { name: 'Close' }).first().click().catch(() => {}); await wait(300) };

await p.goto('http://localhost:4176/'); await wait(250);
await p.getByText('EN', { exact: true }).click(); await wait(100);
await step('loading', () => shot('loading', null));
await wait(1200);
await step('page', async () => {
  await space('Platform Ops');
  await shot('page', null, [
    [1, p.getByRole('button', { name: 'Platform Ops', exact: true }).first(), 'r'],
    [2, p.getByRole('button', { name: 'New message' }), 'tl'],
    [3, main.locator('h1, h2').first(), 'tl'],
    [4, p.getByRole('tab', { name: 'Send messages' }), 'tl'],
    [5, p.getByPlaceholder(/Search title/), 'tl'],
    [6, main.getByRole('button', { name: /^Status/ }), 'tl'],
    [7, main.locator('[role="columnheader"]').first(), 'tl'],
    [8, main.getByRole('button', { name: /failed$/ }).first(), 'tl'],
    [9, main.getByRole('button', { name: /^Actions for/ }).first(), 'c'],
    [10, main.getByRole('navigation').last(), 'tl'],
  ]);
});
await step('status-menu', async () => {
  await main.getByRole('button', { name: /^Status/ }).first().click(); await wait(400);
  const menu = p.getByRole('menu');
  const mb = await menu.boundingBox(), tb = await main.getByPlaceholder(/Search title/).boundingBox();
  await p.screenshot({ path: `${OUT}/status-menu.jpg`, type: 'jpeg', quality: 80, clip: { x: mb.x - 260, y: tb.y - 12, width: mb.width + 260 + 150, height: mb.y + mb.height - tb.y + 24 } });
  marks['status-menu'] = { w: Math.round(mb.width + 410), h: Math.round(mb.y + mb.height - tb.y + 24), marks: [] };
  await p.getByRole('menuitemcheckbox').filter({ hasText: 'Sent' }).first().click(); await wait(200);
  await p.keyboard.press('Escape'); await wait(200);
  await main.getByRole('button', { name: /^Channels/ }).first().click(); await wait(300);
  await p.getByRole('menuitemcheckbox').filter({ hasText: 'Email' }).first().click(); await wait(200);
  await p.keyboard.press('Escape'); await wait(400);
});
await step('filtered', async () => {
  const tb = await main.getByPlaceholder(/Search title/).boundingBox(), mb = await main.boundingBox();
  const hb = await main.locator('[role="row"]').nth(2).boundingBox();
  const clip = { x: mb.x, y: tb.y - 16, width: mb.width, height: hb.y + hb.height - tb.y + 24 };
  const out = [];
  for (const [n, loc, at] of [[1, main.getByRole('button', { name: /^Status/ }), 'tl'], [2, main.getByText(/^Showing \d+ of/), 'tl'], [3, main.getByRole('button', { name: 'Clear', exact: true }), 'r']]) {
    const bb = await loc.first().boundingBox(); const x = at === 'r' ? bb.x + bb.width : bb.x, y = at === 'r' ? bb.y + bb.height / 2 : bb.y
    out.push({ n, x: +((x - clip.x) / clip.width * 100).toFixed(2), y: +((y - clip.y) / clip.height * 100).toFixed(2) })
  }
  await p.screenshot({ path: `${OUT}/filtered.jpg`, type: 'jpeg', quality: 80, clip }); marks.filtered = { w: Math.round(clip.width), h: Math.round(clip.height), marks: out };
  await main.getByRole('button', { name: 'Clear', exact: true }).click(); await wait(300);
});
await step('nomatch', async () => { await p.getByPlaceholder(/Search title/).fill('zzzz'); await wait(400); await shot('nomatch', main); await p.getByPlaceholder(/Search title/).fill(''); await wait(300) });
await step('rowmenu', async () => {
  const btn = main.getByRole('button', { name: /^Actions for tWorkspace maintenance: Fri 10\/31/ }).first();
  const bb = await btn.boundingBox(); await btn.click(); await wait(400);
  const menu = p.getByRole('menu'), mb = await menu.boundingBox(), tb = await main.locator('[role="grid"], [role="table"]').first().boundingBox();
  const x0 = Math.max(tb.x, mb.x - 560), clip = { x: x0, y: bb.y - 24, width: tb.x + tb.width - x0, height: mb.y + mb.height - bb.y + 44 };
  await p.screenshot({ path: `${OUT}/rowmenu.jpg`, type: 'jpeg', quality: 80, clip }); marks.rowmenu = { w: Math.round(clip.width), h: Math.round(clip.height), marks: [] };
  await p.keyboard.press('Escape'); await wait(300);
});
await step('urgent', async () => {
  await space('ESH Emergency');
  const tb = await main.locator('[role="grid"], [role="table"]').first().boundingBox(), tg = await main.getByText('Urgent', { exact: true }).first().boundingBox();
  const clip = { x: tb.x, y: tb.y, width: tb.width, height: tg.y + tg.height + 26 - tb.y };
  await p.screenshot({ path: `${OUT}/urgent.jpg`, type: 'jpeg', quality: 80, clip });
  marks.urgent = { w: Math.round(clip.width), h: Math.round(clip.height), marks: [{ n: 1, x: +((tg.x - clip.x) / clip.width * 100).toFixed(2), y: +((tg.y - clip.y) / clip.height * 100).toFixed(2) }] };
});
await step('empty', async () => {
  await p.getByRole('button', { name: 'New team' }).click(); await wait(400);
  await p.locator('#nt-name').fill('Test team'); await p.getByRole('button', { name: 'Create team' }).click(); await wait(1400);
  await shot('empty', main);
});
// details panel: a tall window so the whole panel fits
await p.setViewportSize({ width: 1680, height: 1700 });
const open = async (sp, title) => { await space(sp); await main.getByRole('button', { name: new RegExp('^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click(); await wait(700) };
await step('d-sent', async () => {
  await open('Platform Ops', 'Resolved: slow page loads');
  await aside().getByRole('button', { name: /^Device Notifications/ }).click(); await wait(400);
  const a = aside();
  await shot('d-sent', a, [
    [1, a.getByText('Sent', { exact: true }).first(), 'tl'],
    [2, a.locator('h3').first(), 'tl'],
    [3, a.locator('dl').first(), 'tl'],
    [4, a.getByText('Delivery', { exact: true }), 'tl'],
    [5, a.getByRole('button', { name: /failed$/ }), 'r'],
    [6, a.getByText('By channel', { exact: true }), 'tl'],
    [7, a.getByRole('button', { name: /^Device Notifications/ }), 'tl'],
    [8, a.getByRole('button', { name: /See who didn/ }), 'tl'],
    [9, a.getByText('Audiences', { exact: true }), 'tl'],
    [10, a.getByRole('button', { name: /^See the \d+ members/ }).first(), 'r'],
  ]);
});
await step('dlg-failed', async () => { await aside().getByRole('button', { name: /failed$/ }).click(); await wait(600); await shot('dlg-failed', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300) });
await step('dlg-channel', async () => { await aside().getByRole('button', { name: /See who didn/ }).click(); await wait(600); await shot('dlg-channel', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300) });
await step('dlg-members', async () => { await aside().getByRole('button', { name: /^See the \d+ members/ }).first().click(); await wait(600); await shot('dlg-members', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300) });
for (const [nm, sp, t] of [['d-pending', 'Platform Ops', 'Vendor maintenance window'], ['d-expired', 'Platform Ops', 'tWorkspace maintenance: Fri 10/31'], ['d-scheduled', 'Platform Ops', 'Search service maintenance'], ['d-error', 'Platform Ops', 'Weekly release digest: W42'], ['d-urgent', 'ESH Emergency', 'Typhoon update'], ['d-rejected', 'My sending space', 'Reminder: badge photo']]) {
  await step(nm, async () => { await closeAside(); await open(sp, t); await shot(nm, aside()) });
}
writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
console.log(errs.join('\n') || 'no errors'); await b.close();
