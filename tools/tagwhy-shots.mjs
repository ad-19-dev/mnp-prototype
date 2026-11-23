// Screenshots of the batch import tag design (option D of the tag study, since 2026-11-20) for the "why" page (teams/tagwhy.html).
// usage: build the study (npx vite build -c vite.importtags.config.ts), serve teams/importtags/dist on :4191, then
//   node tools/tagwhy-shots.mjs teams/src/spec/tagwhy/shots   (the set-aside dialog needs the verify-on-Add study,
//   npx vite build -c vite.importverify.config.ts, served from teams/importverify/dist on :4195)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
const marks = {}, wait = ms => p.waitForTimeout(ms);
const step = async (name, fn) => { try { await fn() } catch (e) { errs.push(name + ': ' + e.message.split('\n').slice(0, 12).join(' / ')) } };
async function shot(name, target, pad = 8, extra = []) {
  const bs = [await target.boundingBox()];
  // the list box is a fixed 224px tall: crop it to the tags in it (plus what hangs below, passed in extra)
  const low = await target.evaluate(el => el.classList.contains('h-56') ? Math.max(...[...el.children].map(c => c.getBoundingClientRect().bottom)) + 8 : null);
  if (low) bs[0] = { ...bs[0], height: Math.max(48, low - bs[0].y) };
  for (const l of extra) { const bb = await l.boundingBox(); if (bb) bs.push(bb) }
  const x = Math.min(...bs.map(c => c.x)) - pad, y = Math.min(...bs.map(c => c.y)) - pad;
  const box = { x: Math.max(0, x), y: Math.max(0, y), width: Math.max(...bs.map(c => c.x + c.width)) - x + pad, height: Math.max(...bs.map(c => c.y + c.height)) - y + pad };
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82, clip: box });
  marks[name] = { w: Math.round(box.width), h: Math.round(box.height), marks: [] };
}
await p.goto('http://localhost:4191/importtags.html'); await wait(800);
// the demo: the card (what the design looks like) plus the demo buttons under it
const demo = m => p.locator('[data-demo="' + m + '"]');
const card = m => demo(m).locator('div.rounded-lg.border').first();
const box = m => demo(m).locator('#t-' + m).locator('xpath=ancestor::div[contains(@class,"h-56")]');
const tag = (m, text) => box(m).getByRole('button', { name: new RegExp('^Edit ' + text) }).first();
const hint = m => demo(m).locator('span.gap-x-1').first();
const pop = () => p.locator('[data-radix-popper-content-wrapper]').last();
const setKind = async (m, label) => { await demo(m).locator('#k-' + m).click(); await p.getByRole('option', { name: label, exact: true }).click(); await wait(200) };
const show = async label => { await p.getByRole('radio', { name: label }).click(); await wait(200) };
const paste = async m => { await demo(m).getByRole('button', { name: 'Paste a sample list' }).click(); await wait(300) };
const clear = async m => { const c = demo(m).getByRole('button', { name: 'Clear' }); if (await c.isEnabled()) await c.click(); await wait(100) };
const reset = async () => { await p.keyboard.press('Escape'); await p.locator('h1').click(); await wait(150) };
const scrollTo = async m => { await reset(); await demo(m).scrollIntoViewIfNeeded(); await wait(150) };

// 2026-11-23 (third version of E): a pasted batch is identified at once and its red ones gather at the end; a typed entry stays
// where it is (gray, or red when it's a wrong format or not in the dropdown); anything red turns Proceed off ("fix first");
// Proceed gives the gray ones the strict check
const proceed = () => demo('E').locator('.border-t').getByRole('button', { name: 'Proceed' }).click()
const settle = () => wait(3600)   // the 24 right formats are identified 6 at a time
const typeIn = async t => { const inp = demo('E').locator('#t-E'); await inp.click(); await inp.pressSequentially(t, { delay: 20 }); await wait(200) }
// 1. pasted: identified at once, in batches (faded until known); a wrong format is red at once; Proceed off
await step('e-paste', async () => { await scrollTo('E'); await paste('E'); await wait(600); await p.mouse.move(0, 0); await shot('e-paste', card('E')) });
// 2. identified: names in place, the red ones gathered at the end; red border, Proceed off
await step('e-checked', async () => { await settle(); await p.mouse.move(0, 0); await shot('e-checked', card('E')) });
// 3. click a red tag: plain text with a caret, in the same spot; typing shows the people it could be
await step('nt-edit', async () => { await tag('E', 'a19999').click(); await wait(200); await shot('nt-edit', box('E')) });
await step('nt-edit-sug', async () => { const inp = box('E').locator('[data-editing]'); await inp.fill('ytch'); await wait(300); await shot('nt-edit-sug', card('E'), 8, [pop()]) });
// 4. picked Tina Chang from the dropdown: known at once, in the same spot
await step('e-fixed', async () => { const inp = box('E').locator('[data-editing]'); await inp.fill('ytchang'); await wait(300); await inp.press('Enter'); await wait(300); await p.mouse.move(0, 0); await shot('e-fixed', card('E')) });
// 5. typed without picking: thliu stays gray (what was typed); kyliin, not in the dropdown, is red at once; nothing moves
await step('e-typed', async () => { await typeIn('thliu, kyliin, '); await p.mouse.move(0, 0); await shot('e-typed', card('E')) });
// 6. Remove invalid: Proceed can be pressed; the gray one is still not checked
await step('e-removed', async () => { await demo('E').getByRole('button', { name: 'Remove invalid' }).click(); await wait(250); await p.mouse.move(0, 0); await shot('e-removed', card('E')) });
// 7. Proceed: the strict check of the gray one, in the same field; the button waits
await step('e-proceed', async () => { await proceed(); await wait(150); await p.mouse.move(0, 0); await shot('e-proceed', card('E')); await wait(1200) });
// 8. another batch: identified, and its red ones gather at the end
await step('e-more', async () => { await demo('E').getByRole('button', { name: 'Paste more' }).click(); await settle(); await p.mouse.move(0, 0); await shot('e-more', card('E')) });
// keyboard: ← from the input moves onto the tags; a focused red tag also shows its reason
await step('key-focus', async () => {
  await clear('E'); await paste('E'); await settle(); await p.mouse.move(0, 0); const inp = demo('E').locator('#t-E'); await inp.focus(); await p.keyboard.press('ArrowLeft'); await wait(100)
  await tag('E', 'cm.chen').focus(); await wait(700); await shot('key-focus', box('E'), 8, [p.getByRole('tooltip').last()]); await p.keyboard.press('Escape'); await wait(200)
});
// typing at the end: suggestions
await step('nt-type-sug', async () => {
  await wait(1000); await clear('E'); const inp = demo('E').locator('#t-E'); await inp.click(); await inp.pressSequentially('chen', { delay: 30 }); await wait(300)
  // the dropdown hangs below the card: hide the demo-only buttons there for this shot
  const strip = demo('E').locator('.border-dashed'); await strip.evaluate(e => { e.style.visibility = 'hidden' })
  await shot('nt-type-sug', box('E'), 8, [pop()]); await strip.evaluate(e => { e.style.visibility = '' })
  // picked: the person's tag at once (2026-11-23)
  await inp.press('Enter'); await wait(250); await p.mouse.move(0, 0); await shot('nt-type-pick', box('E'))
});
// set aside: may skip the invalid ones (the switch in the demo)
await step('alt-skip', async () => {
  await clear('E'); await paste('E'); await demo('E').getByRole('radio', { name: '可略過無效的' }).click(); await settle(); await proceed(); await wait(400); await p.mouse.move(0, 0)
  await shot('alt-skip', card('E')); await demo('E').getByRole('radio', { name: '一定要先改完（建議）' }).click()
});
// 6. the old way (Now): a bordered input inside the field
await step('now-edit', async () => { await scrollTo('now'); await paste('now'); await tag('now', 'a19999').click(); await wait(200); await shot('now-edit', box('now')); await p.keyboard.press('Escape') });
// set aside, for comparison on the why page (2026-11-20)
// a. red first after pasting (the prototype today, the Now demo)
await step('alt-redfirst', async () => { await scrollTo('now'); await clear('now'); await paste('now'); await p.mouse.move(0, 0); await shot('alt-redfirst', card('now')) });
// b. fixed, then sorted again: Tina Chang jumps behind the red ones
await step('alt-jump', async () => {
  await tag('now', 'a19999').click(); await wait(150); const inp = box('now').locator('[data-editing]'); await inp.fill('ytchang'); await inp.press('Enter'); await wait(1100); await p.mouse.move(0, 0)
  await shot('alt-jump', box('now'))
});
// d. the old Backspace: one press in an empty input removed the last tag
await step('alt-backspace', async () => {
  await scrollTo('E'); await clear('E'); await paste('E'); await settle(); await p.mouse.move(0, 0); await demo('E').locator('#t-E').focus(); await wait(150)
  await shot('alt-bs-before', box('E'))
  await box('E').getByRole('button', { name: /^Edit Yvonne/ }).locator('button').click(); await demo('E').locator('#t-E').focus(); await wait(200)
  await shot('alt-bs-after', box('E'))
});
// 7. Phone numbers: entered values; region next to the data type
await step('phone-paste', async () => {
  await scrollTo('D'); await clear('D'); await setKind('D', 'Phone numbers'); await paste('D'); await p.mouse.move(0, 0); await wait(200); await shot('phone-paste', card('D'))
});
// 10. the same list with names: half names, half numbers
await step('phone-names', async () => { await show('都是姓名'); await scrollTo('D'); await p.mouse.move(0, 0); await shot('phone-names', box('D')); await show('依資料類型（建議）') });
// 11. region select open
await step('region', async () => {
  await demo('D').locator('#r-D').click(); await wait(250)
  await shot('region', demo('D').locator('#k-D').locator('xpath=ancestor::div[contains(@class,"items-end")]'), 8, [p.getByRole('listbox').last()]); await p.keyboard.press('Escape')
});
// 12. changing the data type asks first
await step('confirm', async () => { await setKind('D', 'NT accounts'); await wait(250); await shot('confirm', p.getByRole('alertdialog').or(p.getByRole('dialog')).last()); await p.getByRole('button', { name: 'Cancel' }).click() });
// 13. Org IDs: the code, name and head count on hover
await step('org', async () => {
  await clear('D'); await setKind('D', 'Org IDs'); const inp = demo('D').locator('#t-D'); await inp.fill('PENG, FESH, PUX,'); await wait(200); await inp.blur(); await p.mouse.move(0, 0); await wait(200)
  await tag('D', 'PENG').hover(); await wait(700); await shot('org', box('D'), 8, [p.getByRole('tooltip').last()])
});

// set aside: a second dialog after Add (the verify-on-Add study, 2026-11-17, served on :4195)
await step('alt-modal', async () => {
  await p.goto('http://localhost:4195/importverify.html'); await wait(1000)
  await p.getByRole('button', { name: 'Batch import' }).nth(1).click(); await wait(400)
  await p.locator('#vi-kind').click(); await p.getByRole('option', { name: 'NT accounts', exact: true }).click(); await wait(150)
  await p.locator('#vi-text').fill('gywu, cmchen, ytchang, celee, sywangd, psyang, a19999, gywuu'); await wait(150)
  await p.getByRole('button', { name: /^Add \d+ audiences?$/ }).click(); await wait(1900)
  await shot('alt-modal', p.getByRole('dialog').last(), 8, [p.getByRole('dialog').first()])
});
writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
await b.close();
console.log(Object.keys(marks).join(' '));
if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); process.exitCode = 1 }
