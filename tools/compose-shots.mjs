// Screenshots of the send flow for the send-flow spec, with callout positions (percent of each image).
// usage: preview teams on :4176, then  node tools/compose-shots.mjs teams/src/spec/compose/shots
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
const marks = {}, wait = ms => p.waitForTimeout(ms);
const step = async (name, fn) => { try { await fn() } catch (e) { errs.push(name + ': ' + e.message.split('\n')[0]) } };
// clip: a locator, a box, or null for the whole window; list: [n, locator, anchor] with anchor tl | tr | r | c
async function shot(name, target, list = [], pad = 0) {
  let box = target === null ? { x: 0, y: 0, ...p.viewportSize() } : target.x !== undefined ? target : await target.first().boundingBox();
  if (pad) box = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  const out = [];
  for (const [n, loc, at = 'tl'] of list) {
    try {
      const bb = await loc.first().boundingBox(); if (!bb) throw new Error('no box');
      const x = at === 'tr' || at === 'r' ? bb.x + bb.width : at === 'c' ? bb.x + bb.width / 2 : bb.x
      const y = at === 'c' || at === 'r' ? bb.y + bb.height / 2 : bb.y
      out.push({ n, x: +((x - box.x) / box.width * 100).toFixed(2), y: +((y - box.y) / box.height * 100).toFixed(2) })
    } catch (e) { errs.push(name + ' mark ' + n + ': ' + e.message.split('\n')[0]) }
  }
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80, clip: box });
  marks[name] = { w: Math.round(box.width), h: Math.round(box.height), marks: out };
}
const main = p.locator('#app-shell-main');
const btn = n => p.getByRole('button', { name: n, exact: true });
const foot = () => p.locator('[data-compose] .sticky').last();
// the main area plus the local header above it (breadcrumb and approval tags)
const page = async () => { const mb = await main.boundingBox(); return { x: mb.x, y: 48, width: mb.width, height: mb.y + mb.height - 48 } };
async function tall(fn) { const h = await p.evaluate(() => document.querySelector('[data-compose]')?.scrollHeight || 1000); await p.setViewportSize({ width: 1400, height: Math.max(1000, h + 120) }); await wait(300); await fn(); await p.setViewportSize({ width: 1400, height: 1000 }); await wait(200) }
async function addAud(type, q, opt) {
  await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(200)
  await p.getByRole('option', { name: type, exact: true }).click(); await wait(200)
  const inp = p.locator('#ri-send'); await inp.fill(q); await wait(350)
  if (opt) await p.locator('[data-radix-popper-content-wrapper]').getByText(opt).first().click(); else await inp.press('Enter')
  await wait(250); await p.keyboard.press('Escape'); await wait(150)
}
const newMsg = async () => { await btn('New message').click(); await wait(600) };
const leave = async () => { await btn('Cancel').click(); await wait(300); await btn('Discard').click().catch(() => {}); await wait(600) };

await p.goto('http://localhost:4176/'); await wait(1500);
await p.getByText('EN', { exact: true }).click(); await wait(300);

// ---------- step 1 ----------
await step('s1-empty', async () => {
  await newMsg();
  await shot('s1-empty', null, [
    [1, p.getByText('New message', { exact: true }).last(), 'tl'],
    [2, p.locator('[data-compose] [role="tablist"], [data-compose] ol, [data-compose] nav').first(), 'tl'],
    [3, p.getByRole('combobox', { name: 'Audience type' }), 'tl'],
    [4, p.locator('#ri-send'), 'tl'],
    [5, btn('Batch import'), 'tl'],
    [6, main.getByLabel('Audience count'), 'tr'],
    [7, main.getByText('No audiences yet'), 'tl'],
    [8, main.getByText('Channels', { exact: true }).first(), 'tl'],
    [9, btn('Save as group'), 'tl'],
    [10, btn('Next'), 'tr'],
  ]);
});
await step('s1-types', async () => {
  await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(300);
  const lb = await p.getByRole('listbox').boundingBox(), ib = await p.locator('#ri-send').boundingBox();
  await shot('s1-types', { x: lb.x - 16, y: ib.y - 16, width: 760, height: lb.y + lb.height - ib.y + 32 });
  await p.keyboard.press('Escape'); await wait(200);
});
await step('s1-search', async () => {
  const inp = p.locator('#ri-send'); await inp.click(); await inp.fill('chen'); await wait(400);
  const pb = await p.locator('[data-radix-popper-content-wrapper]').last().boundingBox(), ib = await inp.boundingBox();
  await shot('s1-search', { x: ib.x - 150, y: ib.y - 16, width: ib.width + 170, height: pb.y + pb.height - ib.y + 32 });
  await inp.fill(''); await p.keyboard.press('Escape'); await wait(200);
});
await step('s1-group', async () => {
  await p.getByRole('combobox', { name: 'Audience type' }).click(); await wait(200); await p.getByRole('option', { name: 'Group', exact: true }).click(); await wait(400);
  const pb = await p.locator('[data-radix-popper-content-wrapper]').last().boundingBox(), ib = await p.locator('#ri-send').boundingBox();
  await shot('s1-group', { x: ib.x - 150, y: ib.y - 16, width: ib.width + 170, height: pb.y + pb.height - ib.y + 32 });
  await p.keyboard.press('Escape'); await wait(200);
});
await step('s1-errors', async () => {
  await btn('Next').click(); await wait(500);
  await shot('s1-errors', await page());
});
await step('s1-filled', async () => {
  await addAud('Org', 'PLT/UX'); await addAud('Group', 'UX Team'); await addAud('Person', 'chen'); await addAud('Person', 'shlai');
  await addAud('Email', 'lisa.ho@vendor-example.com'); await addAud('Phone', '0988-000-222');
  for (const n of ['Device Notifications', 'Email']) await p.getByRole('checkbox', { name: n, exact: true }).click();
  await p.getByRole('checkbox', { name: /Device Notifications \(SMS\)/ }).click(); await wait(400);
  await tall(async () => shot('s1-filled', await page(), [
    [1, p.getByText('Needs supervisor approval').first(), 'tl'],
    [2, main.locator('[role="columnheader"]').first(), 'tl'],
    [3, main.getByRole('button', { name: /^See the \d+ members/ }).first(), 'tr'],
    [4, main.locator('[role="columnheader"]').filter({ hasText: 'Can receive' }), 'tl'],
    [5, main.getByRole('button', { name: 'Choose number' }).first(), 'tl'],
    [6, main.getByText(/2 phone numbers/).first(), 'tl'],
    [7, main.getByRole('checkbox', { name: 'Device Notifications', exact: true }), 'c'],
    [8, main.getByRole('checkbox', { name: /Device Notifications \(SMS\)/ }), 'tl'],
    [9, main.getByText('ICSD approves this message before it’s sent'), 'tl'],
    [10, main.getByText(/external audiences\. Your supervisor/), 'tl'],
    [11, main.getByText(/people get it/).first(), 'tl'],
  ]));
});
await step('dlg-numbers', async () => { await main.getByRole('button', { name: 'Choose', exact: true }).click(); await wait(500); await shot('dlg-numbers', p.getByRole('dialog')); await p.getByRole('dialog').getByRole('radio').first().click().catch(() => {}); await wait(200); await p.getByRole('dialog').getByRole('button').last().click(); await wait(400) });
await step('dlg-members', async () => { await main.getByRole('button', { name: /^See the \d+ members/ }).first().click(); await wait(500); await shot('dlg-members', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300) });
await step('s1-urgent', async () => {
  await main.getByRole('checkbox', { name: /It’s urgent/ }).click(); await wait(300);
  const sec = main.getByText('ICSD approval will be skipped').locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
  await shot('s1-urgent', sec, [[1, main.getByRole('checkbox', { name: /It’s urgent/ }), 'tl'], [2, p.locator('#f-urgent'), 'tl'], [3, main.getByText(/still has to approve/), 'tl']], 12);
  await main.getByRole('checkbox', { name: /It’s urgent/ }).click(); await wait(200);
});
await step('dlg-savegroup', async () => { await btn('Save as group').click(); await wait(500); await shot('dlg-savegroup', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300) });
await step('s1-unreach', async () => {
  await leave(); await newMsg();
  await addAud('Org', 'F18/MFG3'); await p.getByRole('checkbox', { name: 'Device Notifications', exact: true }).click(); await wait(400);
  const line = main.getByText(/people get it/).first().locator('xpath=..'), lb = await line.boundingBox(), cb = await main.getByText('Channels', { exact: true }).first().boundingBox(), mb = await main.boundingBox();
  await shot('s1-unreach', { x: mb.x + 120, y: cb.y - 16, width: mb.width - 240, height: lb.y + lb.height - cb.y + 32 }, [[1, main.getByText(/people get it/).first(), 'tl'], [2, main.getByRole('button', { name: 'See who' }), 'tl'], [3, main.getByRole('button', { name: /Add / }).first(), 'tl']]);
});
await step('dlg-unreach', async () => { await main.getByRole('button', { name: 'See who' }).click(); await wait(500); await shot('dlg-unreach', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300) });
await step('dlg-import', async () => {
  await btn('Batch import').click(); await wait(500); await shot('dlg-import', p.getByRole('dialog'));
  const d = p.getByRole('dialog'); await d.getByRole('combobox').first().click(); await wait(200); await p.getByRole('option').first().click(); await wait(200);
  await d.getByRole('button', { name: 'Try a sample' }).click(); await wait(300); await d.getByRole('button', { name: 'Find matches' }).click(); await wait(700);
  await shot('dlg-import2', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300);
});
await step('dlg-leave', async () => { await btn('Cancel').click(); await wait(400); await shot('dlg-leave', p.getByRole('dialog')); await btn('Discard').click(); await wait(600) });

// ---------- step 2 ----------
await step('s2', async () => {
  await newMsg(); await addAud('Person', 'chen');
  for (const n of ['Device Notifications', 'Desktop OS', 'Email']) await p.getByRole('checkbox', { name: n, exact: true }).click();
  await p.getByRole('checkbox', { name: /Device Notifications \(SMS\)/ }).click(); await wait(300);
  await btn('Next').click(); await wait(600);
  await tall(async () => shot('s2-empty', await page(), [
    [1, p.getByRole('radio', { name: 'New' }), 'tl'], [2, p.getByRole('radio', { name: 'Use template' }), 'tl'],
    [3, main.getByText('Device Notifications', { exact: true }).first(), 'tl'], [4, p.locator('#f-sender'), 'tl'],
    [5, main.getByText('Device Notifications (SMS)', { exact: true }).first(), 'tl'], [6, main.getByText('Desktop OS', { exact: true }).first(), 'tl'],
    [7, main.getByText('Email', { exact: true }).first(), 'tl'], [8, p.locator('#f-body'), 'tl'], [9, btn('Save as template'), 'tl'],
  ]));
  await btn('Next').click(); await wait(500);
  await tall(async () => shot('s2-errors', await page()));
});
await step('s2-tpl', async () => {
  await p.getByRole('radio', { name: 'Use template' }).click(); await wait(200); await p.locator('#f-tpl').click(); await wait(400);
  const lb = await p.getByRole('listbox').boundingBox(), rb = await p.getByRole('radio', { name: 'New' }).boundingBox();
  await shot('s2-tpl', { x: rb.x - 16, y: rb.y - 16, width: lb.x + lb.width - rb.x + 40, height: lb.y + lb.height - rb.y + 32 });
  await p.getByRole('option').first().click(); await wait(600);
  await tall(async () => shot('s2-filled', await page(), [[1, p.locator('#f-tpl'), 'tl'], [2, p.locator('#f-dtitle'), 'tl']]));
});
await step('dlg-savetpl', async () => {
  await p.locator('#f-sender').fill('IT Service Desk'); await p.locator('#f-sms').fill('Reminder: [what] by [date].'); await p.locator('#f-dcontent').fill('Please [what] by [date].');
  await btn('Save as template').click(); await wait(500); await shot('dlg-savetpl', p.getByRole('dialog')); await p.keyboard.press('Escape'); await wait(300);
});

// ---------- step 3 ----------
await step('s3', async () => {
  await btn('Next').click(); await wait(700);
  await tall(async () => shot('s3-now', await page(), [
    [1, p.getByRole('radio', { name: /Send now/ }), 'tl'], [2, p.getByRole('radio', { name: /Scheduled send/ }), 'tl'],
    [3, main.getByText('Audiences', { exact: true }).last(), 'tl'], [4, main.getByText('ICSD approval', { exact: true }), 'tl'],
    [5, main.getByText('Preview', { exact: true }), 'tl'], [6, main.getByRole('radiogroup', { name: 'Preview channel' }), 'tl'],
    [7, main.getByText(/^Needs approval from/), 'tl'], [8, btn('Send me a test'), 'tl'], [9, btn('Create message'), 'tr'],
  ]));
});
for (const [k, n] of [['desktop', 'Desktop OS'], ['sms', 'Device Notifications (SMS)'], ['email', 'Email']]) {
  await step('prev-' + k, async () => {
    await main.getByRole('radiogroup', { name: 'Preview channel' }).getByText(n, { exact: true }).click(); await wait(300);
    await shot('prev-' + k, main.getByText('Preview', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]'));
  });
}
await step('s3-sched', async () => {
  await p.getByRole('radio', { name: /Scheduled send/ }).click(); await wait(400);
  const sec = main.getByText('Send time', { exact: true }).first().locator('xpath=ancestor::section[1]');
  await shot('s3-sched', sec, [[1, p.locator('#f-sched'), 'tl']], 12);
});
await step('result', async () => { await btn('Create message').click(); await wait(800); await shot('result', await page()) });

// ---------- urgent ----------
await step('urgent', async () => {
  await btn('Back to messages').click(); await wait(800); await newMsg(); await addAud('Person', 'chen');
  await p.getByRole('checkbox', { name: 'Device Notifications', exact: true }).click(); await p.getByRole('checkbox', { name: /Device Notifications \(SMS\)/ }).click(); await wait(200);
  await main.getByRole('checkbox', { name: /It’s urgent/ }).click(); await p.locator('#f-urgent').fill('Typhoon warning issued at 07:30. Staff must know before they commute.');
  await btn('Next').click(); await wait(500);
  await p.locator('#f-sender').fill('ESH Emergency'); await p.locator('#f-title').fill('Typhoon alert: work from home tomorrow'); await p.locator('#f-content').fill('Non-fab staff work from home on Oct 22.'); await p.locator('#f-sms').fill('Typhoon: non-fab staff WFH 10/22.');
  await btn('Next').click(); await wait(600); await btn('Create message').click(); await wait(500);
  await shot('dlg-urgent', p.getByRole('dialog'));
  await shot('urgent-head', { x: (await main.boundingBox()).x, y: 48, width: (await main.boundingBox()).width, height: 48 });
});
writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
console.log(errs.join('\n') || 'no errors'); await b.close();
