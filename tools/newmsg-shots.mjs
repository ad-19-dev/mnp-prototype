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
// Message Coverage by Channel is worked out on request (2026-11-19): press Check coverage / Check again when it's there
const covSec = () => p.getByRole('heading', { name: 'Message Coverage by Channel' }).locator('xpath=ancestor::section[1]');
const checkCov = async () => { const b = p.getByRole('button', { name: /^(Check coverage|Check again)$/ }); if (await b.count()) { await b.first().click(); await wait(1300) } };
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
  await p.getByRole('option', { name: 'NT accounts' }).click(); await wait(300);
  // option E (2026-11-23): a pasted list is looked up at once (faded, Checking x of y…), then all results show together
  // and the invalid ones gather at the end; Save is off while any is red
  await dlg().locator('#imp-text').fill('gywu, cmchen, ytchang, celee, sywangd, psyang, a19999, chhsu, shcheng, gywuu, ythsieh, hykuo, prhung, cm.chen, cmchen,'); await wait(250);
  await p.mouse.move(0, 0); await shot('dlg-import-checking', dlg(), [[1, dlg().getByText(/^Checking /), 'tl']], 12);
  await wait(1600);
  const red = () => dlg().getByRole('button', { name: /^Edit a19999/ });
  await red().hover(); await wait(700);
  await shot('dlg-import-list', dlg(), [
    [1, dlg().getByRole('button', { name: /^(Remove|移除) Grace/ }).first(), 'tl'],
    [2, red(), 'tl'],
    [3, dlg().getByText(/invalid to save\./), 'tl'],
    [4, dlg().getByRole('button', { name: 'Remove invalid' }), 'tl'],
    [5, dlg().getByRole('button', { name: /^Save/ }), 'tl'],
  ], 12);
  await red().click(); await wait(300);
  await dlg().locator('[data-editing]').fill('thl'); await wait(400);
  // the dropdown is a popover (role dialog too): name the Batch import dialog
  const bi = p.getByRole('dialog', { name: 'Batch import' });
  await shot('dlg-import-result', bi, [
    [1, bi.locator('[data-editing]'), 'tl'],
    [2, p.getByRole('listbox', { name: 'Matches' }), 'tl'],
  ], 12);
  await p.keyboard.press('Escape'); await wait(200);
  await dlg().getByRole('button', { name: 'Remove invalid' }).click(); await wait(200);
  await dlg().getByRole('button', { name: /^Save/ }).click(); await wait(900);
});
// a long list: the invalid ones gather at the end once it's checked
await step('dlg-import-many', async () => {
  await p.getByRole('button', { name: 'Batch import' }).click(); await wait(600);
  await dlg().getByRole('combobox').first().click(); await wait(300);
  await p.getByRole('option', { name: 'NT accounts' }).click(); await wait(300);
  const nts = 'gywu,cmchen,kylin,chlinb,ycchenz,a19999,ycchenq,ycchenm,bhhuang,ytchang,celee,sywangd,thtsai,gywuu,psyang,chhsu,shcheng,ythsieh,hykuo,prhung,cm.chen,yttseng,chchiu,ycliao,shlai,cnchou,thliu';
  await dlg().locator('#imp-text').fill(nts + ',' + nts + ','); await wait(3200); await p.mouse.move(0, 0);
  await shot('dlg-import-many', dlg(), [
    [1, dlg().getByRole('button', { name: /^Edit a19999/ }), 'tl'],
    [2, dlg().getByText(/invalid to save\./), 'tl'],
  ], 12);
  await p.keyboard.press('Escape'); await wait(400);
});

// the Audience group editor opens the same dialog; it adds members
await step('dlg-import-group', async () => {
  await p.setViewportSize({ width: 1680, height: 940 });
  await p.goto('http://localhost:4190/index.html'); await wait(1500);
  await p.getByRole('tab', { name: 'Audience groups' }).first().click().catch(async () => { await p.getByText('Audience groups').first().click() }); await wait(800);
  await p.getByRole('button', { name: /^New group/ }).first().click(); await wait(800);
  await p.getByRole('button', { name: 'Batch import' }).click(); await wait(600);
  await dlg().getByRole('combobox').first().click(); await wait(300);
  await p.getByRole('option').first().click(); await wait(300);
  await dlg().getByRole('combobox').first().click(); await wait(300);
  await p.getByRole('option', { name: 'Emails' }).click(); await wait(300);
  await dlg().locator('#imp-text').fill('ytchang@tsmc.com, celee@tsmc.com, partner@example.com, a19999@tsmc.com,'); await wait(900); await p.mouse.move(0, 0);
  await shot('dlg-import-group', dlg(), [[1, dlg().getByText('partner@example.com'), 'tl']], 12);
  await p.keyboard.press('Escape'); await wait(300);
});
writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no errors');
await b.close();
