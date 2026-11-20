// Screenshots of the batch import tag design (option D of the tag study, since 2026-11-20) for the "why" page (teams/tagwhy.html).
// usage: build the study (npx vite build -c vite.importtags.config.ts), serve teams/importtags/dist on :4191, then
//   node tools/tagwhy-shots.mjs teams/src/spec/tagwhy/shots
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
const demo = m => p.locator('div.rounded-lg.border').filter({ has: p.locator('#t-' + m) }).last();
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

// 1. NT accounts: pasted, red ones first, names with avatars
await step('nt-paste', async () => { await scrollTo('D'); await paste('D'); await p.mouse.move(0, 0); await shot('nt-paste', demo('D')) });
// 2. click a red tag: plain text with a caret, in the same spot
await step('nt-edit', async () => { await tag('D', 'a19999').click(); await wait(200); await shot('nt-edit', box('D')) });
// 3. typing while editing: the people it could be
await step('nt-edit-sug', async () => {
  const inp = box('D').locator('[data-editing]'); await inp.fill('ytch'); await wait(300)
  await shot('nt-edit-sug', box('D'), 8, [pop()])
});
// 4. fixed: stays in place, gray, a thin green flash
await step('nt-fixed', async () => {
  const inp = box('D').locator('[data-editing]'); await inp.fill('ytchang'); await wait(250); await inp.press('Enter'); await wait(120)
  await shot('nt-fixed', box('D'), 8, [hint('D')])
});
// 4b. a second batch: new red ones go first, the new person last, the tags already there keep their order
await step('more', async () => {
  await wait(1000); await p.mouse.move(0, 0); await shot('more-before', box('D'), 8, [hint('D')])
  await demo('D').getByRole('button', { name: 'Paste more' }).click(); await wait(300); await p.mouse.move(0, 0); await shot('more-after', box('D'), 8, [hint('D')])
});
// 4c. Show only invalid: only the red tags; fix one there; back to the whole list
await step('only', async () => {
  await clear('D'); await paste('D'); await p.mouse.move(0, 0)
  await demo('D').getByRole('button', { name: 'Show only invalid' }).click(); await wait(250); await shot('only', box('D'), 8, [hint('D')])
  await tag('D', 'a19999').click(); await wait(150); const inp = box('D').locator('[data-editing]'); await inp.fill('ytchang'); await inp.press('Enter'); await wait(1100)
  await shot('only-fixed', box('D'), 8, [hint('D')])
  await demo('D').getByRole('button', { name: 'Show all' }).click(); await wait(250); await p.mouse.move(0, 0); await shot('only-back', box('D'), 8, [hint('D')])
});
// 5. typing at the end: suggestions
await step('nt-type-sug', async () => {
  await wait(1000); await clear('D'); const inp = demo('D').locator('#t-D'); await inp.click(); await inp.pressSequentially('chen', { delay: 30 }); await wait(300)
  await shot('nt-type-sug', box('D'), 8, [pop()]); await inp.press('Escape'); await inp.fill('')
});
// 6. the old way (Now): a bordered input inside the field
await step('now-edit', async () => { await scrollTo('now'); await paste('now'); await tag('now', 'a19999').click(); await wait(200); await shot('now-edit', box('now')); await p.keyboard.press('Escape') });
// 7. Phone numbers: entered values; region next to the data type
await step('phone-paste', async () => {
  await scrollTo('D'); await clear('D'); await setKind('D', 'Phone numbers'); await paste('D'); await p.mouse.move(0, 0); await wait(200); await shot('phone-paste', demo('D'))
});
// 8. hover a number: who it is
await step('phone-hover', async () => {
  await tag('D', '0918-226-588').hover(); await wait(700); await shot('phone-hover', box('D'), 8, [p.getByRole('tooltip').last()]); await p.mouse.move(0, 0); await wait(900)
});
// 9. hover a shared number: who shares it
await step('phone-shared', async () => {
  const t = tag('D', '0919-000-119'); const bb = await t.boundingBox(); await p.mouse.move(bb.x + 20, bb.y + 8); await wait(150); await p.mouse.move(bb.x + 30, bb.y + 10); await wait(800); await shot('phone-shared', box('D'), 8, [p.getByRole('tooltip').last()]); await p.mouse.move(0, 0); await wait(900)
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

writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 1));
await b.close();
console.log(Object.keys(marks).join(' '));
if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); process.exitCode = 1 }
