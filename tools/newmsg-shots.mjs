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
  await p.getByRole('option').first().click(); await wait(300);
  // proposal A (2026-11-18): each entry is a tag, looked up at once; red ones are edited in place; Proceed adds the found
  // a one-line field: a paste keeps its line breaks, a fill doesn't, so the sample uses commas
  await dlg().locator('#imp-text').fill('gywu, cmchen, ytchang, celee, sywangd, psyang, a19999, gywuu, cmchen'); await wait(500);
  const red = () => dlg().getByRole('button', { name: /^Edit a19999/ });
  await red().hover(); await wait(700);
  await shot('dlg-import-list', dlg(), [
    [1, dlg().getByRole('button', { name: /^(Remove|移除) / }).first(), 'tl'],
    [2, red(), 'tl'],
    [3, dlg().getByText(/Click a tag to edit it\.$/), 'tl'],
    [4, dlg().getByRole('button', { name: /^Proceed/ }), 'tl'],
  ], 12);
  await red().click(); await wait(400);
  await shot('dlg-import-result', dlg(), [
    [1, dlg().getByRole('textbox', { name: /^Edit a19999/ }), 'tl'],
  ], 12);
  await p.keyboard.press('Escape'); await wait(200);
  await dlg().getByRole('button', { name: /^Proceed/ }).click(); await wait(700);
  await p.keyboard.press('Escape'); await wait(300);
});
// a long list (2026-11-19): the ones not found come first, even when typed last
await step('dlg-import-many', async () => {
  await p.getByRole('button', { name: 'Batch import' }).click(); await wait(600);
  await dlg().getByRole('combobox').first().click(); await wait(300);
  await p.getByRole('option').first().click(); await wait(300);
  const nts = 'gywu,cmchen,kylin,chlinb,ycchenz,ycchenq,ycchenm,bhhuang,ytchang,celee,sywangd,thtsai,psyang,chhsu,shcheng,ythsieh,hykuo,prhung,yttseng,chchiu,ycliao,shlai,cnchou,thliu';
  await dlg().locator('#imp-text').fill(nts + ',' + nts + ',a19999,gywuu,cm.chen,'); await wait(700);
  await shot('dlg-import-many', dlg(), [
    [1, dlg().getByRole('button', { name: /^Edit a19999/ }), 'tl'],
    [2, dlg().getByText(/valid audiences\. Click a tag/), 'tl'],
  ], 12);
  await p.keyboard.press('Escape'); await wait(400);
});
// only Desktop OS: someone without the desktop agent can't get it
await step('dlg-unreach', async () => {
  await p.getByRole('checkbox', { name: 'Desktop OS', exact: true }).click(); await wait(400);
  await covSec().scrollIntoViewIfNeeded();
  await shot('s1-cov', covSec(), [[1, p.getByRole('button', { name: 'Check coverage' }), 'tl']], 12);
  await checkCov();
  await page('s1-unreach');
  await p.getByRole('button', { name: /can’t be sent/ }).first().click(); await wait(600);
  await shot('dlg-unreach', dlg(), [], 12); await p.keyboard.press('Escape'); await wait(300);
  await p.getByRole('checkbox', { name: 'Desktop OS', exact: true }).click(); await wait(300);
});
await step('s1-filled', async () => {
  await p.getByRole('checkbox', { name: 'Device Notifications', exact: true }).click(); await wait(200);
  await p.getByRole('checkbox', { name: 'Email', exact: true }).click(); await wait(300);
  // the channels changed since the last check: the numbers are gone until it's checked again
  await covSec().scrollIntoViewIfNeeded();
  await shot('s1-cov-stale', covSec(), [[1, p.getByRole('button', { name: 'Check again' }), 'tl']], 12);
  await checkCov(); await big(1500); await page('s1-filled');
});
await step('s1-sms', async () => {
  await p.getByRole('radio', { name: /PNS \+ SMS fallback/ }).click(); await wait(400);
  await page('s1-sms');
});
await step('s1-urgent', async () => {
  await p.getByRole('checkbox', { name: /It’s urgent/ }).click(); await wait(400);
  await page('s1-urgent');
  // untick it again: the rest of the flow needs SMS approval, so step 3 shows Send now's note (2026-11-19)
  await p.getByRole('checkbox', { name: /It’s urgent/ }).click(); await wait(300);
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
  await p.locator('#f-title').fill('Network maintenance tonight');
  await p.locator('#f-content').fill('The office network is down tonight 22:00–23:00. Save your work before 22:00. Wi-Fi and VPN will be down.');
  await p.locator('#f-sms').fill('Network maintenance tonight 22:00–23:00. Save your work before 22:00.');
  await p.locator('#f-subject').fill('Network maintenance tonight 22:00–23:00');
  await p.locator('#f-body [contenteditable="true"], #f-body').first().click(); await p.keyboard.type('Hi all, the office network will be down tonight from 22:00 to 23:00. Please save your work before 22:00.');
  await wait(400); await page('s2-filled');
});
// picking a template when something is written already: it asks before replacing
await step('dlg-replace', async () => {
  await p.getByRole('radio', { name: 'Use template' }).click(); await wait(300);
  await p.locator('#f-tpl').click(); await wait(400);
  await p.getByRole('option').first().click(); await wait(500);
  await shot('dlg-replace', dlg(), [], 12);
  await dlg().getByRole('button', { name: 'Cancel', exact: true }).click(); await wait(300);
  await p.getByRole('radio', { name: 'New' }).click(); await wait(300);
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
  // urgent sends are created straight away (2026-11-18: no Send without SMS approval? confirm)
  await big(940); await p.screenshot({ path: `${OUT}/after-submit.jpg`, type: 'jpeg', quality: 80 }); marks['after-submit'] = { w: 1680, h: 940, marks: [] };
});

// one of each audience type on a fresh page, so the table shows every presentation
await step('s1-types', async () => {
  await p.goto('http://localhost:4190/index.html'); await wait(1500);
  await p.getByRole('button', { name: 'New message' }).first().click(); await wait(900);
  await big(1100);
  const add = async (label, q) => {
    if (label) {
      await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(300);
      await p.getByRole('option', { name: label, exact: true }).click(); await wait(300);
    }
    const box = p.locator('[data-compose]').getByRole('textbox').first();
    await box.fill(q); await wait(500); await box.press('Enter'); await wait(400);
    await p.keyboard.press('Escape'); await wait(200);
  };
  // Email not ticked yet: an outside address can't be added (company addresses still add the employee)
  await step('s1-email-off', async () => {
    await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(300);
    await p.getByRole('option', { name: 'Email', exact: true }).click(); await wait(300);
    const box = p.locator('[data-compose]').getByRole('textbox').first();
    await box.fill('amy@vendor-example.com'); await wait(500);
    const sec = p.getByRole('heading', { name: 'Audience', exact: true }).locator('xpath=ancestor::section[1]');
    await shot('s1-email-off', [p.getByRole('combobox', { name: 'Audience type' }), box, p.locator('[data-radix-popper-content-wrapper]').last()], [], 16);
    await box.fill(''); await p.keyboard.press('Escape'); await wait(200);
    await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(300);
    await p.getByRole('option', { name: 'Person', exact: true }).click(); await wait(300); await p.keyboard.press('Escape');
  });
  // channels come first, as a sender would do it
  await p.getByRole('checkbox', { name: 'Email', exact: true }).click(); await wait(200);
  await p.getByRole('checkbox', { name: 'Device Notifications', exact: true }).click(); await wait(200);
  // an outside number can only be added with SMS fallback on (2026-11-16): turn it on for that one, then back off
  await add(null, 'Chen'); await add('Org', 'PENG'); await add('Group', '');
  await p.getByRole('radio', { name: /PNS \+ SMS fallback/ }).click(); await wait(300);
  // the phone field: region first, then the number (2026-11-19)
  await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(300);
  await p.getByRole('option', { name: 'Phone', exact: true }).click(); await wait(300); await p.keyboard.press('Escape'); await wait(200);
  await p.getByRole('combobox', { name: 'Region' }).click(); await wait(400);
  await shot('s1-phone-region', [p.getByRole('combobox', { name: 'Audience type' }), p.locator('[data-compose]').getByRole('textbox').first(), p.getByRole('listbox').last()], [], 16);
  await p.keyboard.press('Escape'); await wait(300);
  await add('Phone', '0987654321');
  await p.getByRole('radio', { name: /PNS only/ }).click(); await wait(300);
  await add('Email', 'amy@vendor-example.com');
  // back to the default type (Person), as a sender sees it: Email/Phone show an Add button, disabled while empty
  await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(300);
  await p.getByRole('option', { name: 'Person', exact: true }).click(); await wait(300); await p.keyboard.press('Escape'); await wait(200);
  await p.evaluate(() => document.activeElement && document.activeElement.blur()); await wait(200);
  await p.getByRole('heading', { name: 'Audience', exact: true }).scrollIntoViewIfNeeded();
  const sec = p.getByRole('heading', { name: 'Audience', exact: true }).locator('xpath=ancestor::section[1]');
  await shot('s1-types', (await sec.count()) ? sec : null, [], 12);
  // SMS fallback on: the audience list gets the phone columns
  await p.getByRole('radio', { name: /PNS \+ SMS fallback/ }).click(); await wait(400);
  await p.getByRole('checkbox', { name: 'Personal phone' }).nth(1).click(); await wait(300);
  await big(2200);
  const aud = p.getByRole('heading', { name: 'Audience', exact: true }).locator('xpath=ancestor::section[1]');
  await shot('s1-phones', (await aud.count()) ? aud : null, [], 12);
  await checkCov();
  const reachSec = p.getByRole('heading', { name: 'Message Coverage by Channel' }).locator('xpath=ancestor::section[1]');
  await shot('s1-ext', (await reachSec.count()) ? reachSec : null, [], 12);
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
  await dlg().locator('#imp-text').fill('gywu, cmchen, ytchang, a19999,'); await wait(600);
  await shot('dlg-import-group', dlg(), [[1, dlg().getByText(/valid members\. Click a tag/), 'tl']], 12);
  await p.keyboard.press('Escape'); await wait(300);
});
writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no errors');
await b.close();
