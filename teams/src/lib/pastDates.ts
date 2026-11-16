// Past dates can't be picked (2026-11-16). TEMPORARY: the DS DatePicker has no option for it yet (checked up to
// 0.1.0-beta.148); the DS owner will add one. Until then this marks every day before today in an open DatePicker
// calendar (the DS popover "日期選擇") as disabled: the button can't be clicked and is drawn like the DS disabled day.
// Every DatePicker in the prototype picks a send time, so all of them are future-only. Replace with the DS option
// when it ships, and delete this file and its call in main.tsx.
const OFF = 'text-fg-disabled pointer-events-none'
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

function mark() {
  const t = today()
  document.querySelectorAll<HTMLElement>('[aria-label="日期選擇"] td[data-day]').forEach(td => {
    const b = td.querySelector('button')
    if (!b) return
    const past = (td.getAttribute('data-day') || '') < t
    // the calendar re-renders its classes (e.g. on hover), so check the look, not just the disabled flag
    if (past && (!b.disabled || !b.classList.contains('pointer-events-none'))) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); OFF.split(' ').forEach(c => b.classList.add(c)) }
    if (!past && b.disabled && b.getAttribute('aria-disabled') === 'true') { b.disabled = false; b.removeAttribute('aria-disabled'); OFF.split(' ').forEach(c => b.classList.remove(c)) }
  })
}

export function pastDatesOff() {
  let queued = false
  new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mark() }) })
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
}
