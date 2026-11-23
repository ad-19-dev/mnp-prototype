// Batch import (2026-11-23: the tag study's option E, final; before that proposal A of 2026-11-18), shared by the send
// flow (and the Detail modal's audience) and the Audience group editor. The design and its reasons: teams/tagwhy.html.
// Large: lists can run to thousands, so the dialog is 1120 wide and fills the window's height; the list field scrolls.
//   - Choose the data type (and the region for phone numbers). Changing the type with entries in the list asks first.
//   - Paste (2 or more entries at once): wrong formats turn red at once; the rest stay as entered, faded, while they are
//     looked up ("Checking x of y…" below), then all turn into their results at once and every red one moves to the end.
//   - Typing one entry (comma, new line, Enter, or leaving the input): it stays where it is. Picked from the dropdown: its
//     result. Not picked: gray (what was typed, checked on Save); red for a wrong format, or an NT account / employee ID /
//     Org ID the dropdown has no exact match for.
//   - Labels by data type: NT accounts and employee IDs show the person; phone numbers, MVPN and emails show the value
//     (an employee's number adds the person); Org IDs show the code (hover: name and people).
//   - Anything red: "n valid, m invalid. Fix or remove invalid to save. Remove invalid" (red border) and Save is off.
//   - Save: takes in the text left in the input, checks the gray ones in the same field, then adds the list and closes,
//     or moves the new red ones to the end.
//   - The caret can sit between tags (click a gap; ←/→, Home/End); Shift+←/→ select a tag; between tags
//     Backspace/Delete remove the tag beside the caret, at the end Backspace selects the last tag first. Click a tag to
//     edit it as plain text in the same spot. Removing a tag also removes its hidden repeats.
import * as React from 'react'
import { Button, CircularProgress, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Popover, PopoverAnchor, PopoverContent, Select, Tag, Tooltip, TooltipContent, TooltipTrigger, cn } from '@qijenchen/design-system'
import { PMAP, splitTokens, type ListKind, type Tag as RTag } from '../lib/data'
import { L, tx } from '../lib/i18n'
import { REGIONS, type Region } from './RecvInput'
import { SugList, fmtErr, look, suggest, type LookOpts, type Ok, type Sug } from './importLookup'
import { ConfirmDialog, FormField, ListKindField, PAvatar, listKindExample, listKindName } from './ui'

export type ImportOk = { v: string; tag: RTag }
type Opts = { allowExt?: boolean; noExtEmail?: boolean; noExtPhone?: boolean }
type Item = { id: number; v: string; pin?: string }
type Hit = { id: number; v: string; ok?: Ok; why?: string }
// a simulated server check: 6 entries every 0.45 s (stands in for the real lookup of a pasted list)
const STEP = 6, STEP_MS = 450

// noun: what is added ('audience' in the send flow, 'member' in a group); has: already added
export function BatchImportDialog({ open, onClose, onAdd, has, opts, noun = 'audience' }: {
  open: boolean; onClose: () => void; onAdd: (ok: ImportOk[], left: number) => void; has: (key: string) => boolean; opts: Opts; noun?: 'audience' | 'member'
}) {
  const [kind, setKind] = React.useState<ListKind | null>(null), [region, setRegion] = React.useState<Region>('TW')
  const [items, setItems] = React.useState<Item[]>([]), [draft, setDraft] = React.useState('')
  const [order, setOrder] = React.useState<number[]>([])                     // the order once the red ones were moved
  const [checked, setChecked] = React.useState<Record<number, string>>({})   // what the server has checked (id → value)
  const [pendingIds, setPendingIds] = React.useState<number[]>([])
  const [edit, setEdit] = React.useState<{ id: number; v: string } | null>(null)
  const [hi, setHi] = React.useState(0), [ehi, setEhi] = React.useState(0), [sugOpen, setSugOpen] = React.useState(false)
  const [pend, setPend] = React.useState<ListKind | null>(null)
  const [at, setAt] = React.useState<number | null>(null), [caretTick, setCaretTick] = React.useState(0)
  const [waiting, setWaiting] = React.useState(false), [tick, setTick] = React.useState(0)
  const nextId = React.useRef(1), itemsRef = React.useRef<Item[]>([]), runN = React.useRef(0), runIds = React.useRef(new Set<number>())
  const saving = React.useRef(false), gatherAfter = React.useRef(false), moving = React.useRef(false)
  const inputRef = React.useRef<HTMLInputElement>(null), boxRef = React.useRef<HTMLDivElement>(null)
  const reset = () => { setItems([]); itemsRef.current = []; setDraft(''); setOrder([]); setChecked({}); setPendingIds([]); setEdit(null); setAt(null); setWaiting(false); saving.current = false; gatherAfter.current = false }
  React.useEffect(() => { if (open) { setKind(null); setRegion('TW'); reset() } }, [open])
  React.useEffect(() => { reset() }, [kind])
  const lo: LookOpts = { noExtEmail: opts.noExtEmail || !opts.allowExt, noExtPhone: opts.noExtPhone || !opts.allowExt }

  // the simulated check: a few at a time
  React.useEffect(() => {
    if (!pendingIds.length) return
    const t = setTimeout(() => {
      const done = pendingIds.slice(0, STEP)
      setChecked(c => { const n = { ...c }; done.forEach(id => { const it = itemsRef.current.find(x => x.id === id); if (it) n[id] = it.v }); return n })
      setPendingIds(l => l.slice(STEP))
    }, STEP_MS)
    return () => clearTimeout(t)
  }, [pendingIds])

  // look every entry up; repeats and ones already added drop out (they aren't shown)
  const hitsOf = (list: Item[]): Hit[] => {
    if (!kind) return []
    const seen: Record<string, boolean> = {}, out: Hit[] = []
    list.forEach(it => {
      const r = look(kind, region, it.v, it.pin, lo)
      if (typeof r === 'string') { const k = 'x:' + it.v.toLowerCase(); if (seen[k]) return; seen[k] = true; out.push({ id: it.id, v: it.v, why: r }) }
      else { if (seen[r.key] || has(r.tag.key)) return; seen[r.key] = true; out.push({ id: it.id, v: it.v, ok: r }) }
    })
    return out
  }
  const hits = hitsOf(items), byId = Object.fromEntries(hits.map(h => [h.id, h]))
  const shown: Hit[] = order.map(id => byId[id]).filter(Boolean).concat(hits.filter(h => order.indexOf(h.id) < 0))
  itemsRef.current = items
  const pendingNow = (h: Hit) => pendingIds.indexOf(h.id) >= 0, checking = hits.some(pendingNow)
  // a run (a pasted batch, or the gray ones on Save) keeps what was entered, faded, until all of it is done
  const isPending = (h: Hit) => pendingNow(h) || (checking && runIds.current.has(h.id))
  const fmtBad = (h: Hit) => !!fmtErr(kind, h.v), isChecked = (h: Hit) => checked[h.id] === h.v
  const bad = hits.filter(h => fmtBad(h) || (h.why && !isPending(h) && isChecked(h)))
  const good = hits.filter(h => h.ok && !isPending(h) && !fmtBad(h) && isChecked(h))
  const unchecked = hits.filter(h => !fmtBad(h) && !isPending(h) && !isChecked(h))
  const n = good.length, k = unchecked.length
  // an NT account, employee ID or Org ID typed without picking: the dropdown's answer has no exact match = not found
  function notInDropdown(v: string) { return (kind === 'nt' || kind === 'emp' || kind === 'org') && !fmtErr(kind, v) && typeof look(kind, region, v, undefined, lo) === 'string' }
  const queue = (ids: number[], fresh: boolean) => {
    if (!ids.length) return
    if (fresh || !pendingIds.length) { runIds.current = new Set(); runN.current = 0 }
    ids.forEach(id => runIds.current.add(id)); runN.current += ids.length; setPendingIds(l => l.concat(ids))
  }

  // entries come in at the caret
  const take = (t: string, pin?: string) => {
    const l = splitTokens(t).map(x => x.trim()).filter(Boolean)
    setDraft('')
    if (!l.length) return [] as number[]
    const add = l.map(v => ({ id: nextId.current++, v, pin })), all = itemsRef.current.concat(add)
    setItems(all); itemsRef.current = all
    if (at != null) { const o = shown.map(h => h.id); o.splice(Math.min(at, o.length), 0, ...add.map(x => x.id)); setOrder(o); setAt(at + add.length) }
    if (add.length > 1) {
      // a batch: looked up at once; when that's done the red ones gather at the end
      queue(hitsOf(all).filter(h => add.some(x => x.id === h.id) && !fmtErr(kind, h.v)).map(h => h.id), false)
      gatherAfter.current = true; setTick(x => x + 1)
    } else if (!pin && notInDropdown(add[0].v)) setChecked(c => ({ ...c, [add[0].id]: add[0].v }))
    if (at == null) setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, 0)
    return add.map(x => x.id)
  }
  // the ids of these entries and of every repeat of them
  function sameAs(ids: number[]) {
    const keyOf = (it: Item) => { if (!kind) return 'x:' + it.v; const r = look(kind, region, it.v, it.pin, lo); return typeof r === 'string' ? 'x:' + it.v.toLowerCase() : r.key }
    const ks = new Set(items.filter(x => ids.indexOf(x.id) >= 0).map(keyOf))
    return new Set(items.filter(x => ids.indexOf(x.id) >= 0 || ks.has(keyOf(x))).map(x => x.id))
  }
  const drop = (id: number) => {
    const i = shown.findIndex(h => h.id === id), gone = sameAs([id])
    setItems(l => l.filter(x => !gone.has(x.id)))
    if (i >= 0) setAt(a => (a != null && i < a ? a - 1 : a))
  }
  const removeInvalid = () => { const gone = sameAs(bad.map(h => h.id)); setItems(l => l.filter(x => !gone.has(x.id))); setOrder(o => o.filter(id => !gone.has(id))); setAt(null) }
  const gather = () => {
    if (!bad.length) return
    const isBad = (h: Hit) => bad.indexOf(h) >= 0
    setOrder(shown.filter(h => !isBad(h)).concat(shown.filter(isBad)).map(h => h.id)); setAt(null)
    setTimeout(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, 0)
  }
  // Save: the text left in the input comes in; with nothing red, the gray ones are checked; then add, or gather the red ones
  const save = () => { if (draft.trim()) take(draft); saving.current = true; setWaiting(true); setTick(x => x + 1) }
  React.useEffect(() => {
    if (checking) return
    if (gatherAfter.current && !saving.current) { gatherAfter.current = false; gather(); return }
    if (!saving.current) return
    if (k && !bad.length) { const q = unchecked.map(h => h.id); runIds.current = new Set(q); runN.current = q.length; setPendingIds(q); return }
    saving.current = false; gatherAfter.current = false; setWaiting(false)
    if (!bad.length && !k) {
      const seen: Record<string, boolean> = {}, ok: ImportOk[] = []
      good.forEach(h => { const t = h.ok!.tag; if (seen[t.key] || has(t.key)) return; seen[t.key] = true; ok.push({ v: h.v, tag: t }) })
      onAdd(ok, 0); return
    }
    gather()
  }, [checking, tick])

  // ---------- caret ----------
  const moveCaret = (i: number) => { const len = shown.length, to = Math.max(0, Math.min(i, len)); moving.current = true; setAt(to >= len ? null : to); setCaretTick(x => x + 1) }
  React.useEffect(() => {
    if (!moving.current) return
    inputRef.current?.focus({ preventScroll: true }); inputRef.current?.parentElement?.scrollIntoView({ block: 'nearest' })
    moving.current = false
  }, [caretTick])
  const caretFromPoint = (x: number, y: number) => {
    const els = Array.from(boxRef.current?.children || []).filter(el => !el.contains(inputRef.current)) as HTMLElement[]
    const rects = els.map(el => el.getBoundingClientRect())
    const row = rects.map((rc, i) => ({ rc, i })).filter(o => y >= o.rc.top - 2 && y <= o.rc.bottom + 2)
    if (!row.length) return rects.length && y < rects[0].top ? 0 : rects.length
    const hit = row.find(o => o.rc.left + o.rc.width / 2 > x)
    return hit ? hit.i : row[row.length - 1].i + 1
  }
  const caretMid = at != null && at < shown.length
  const focusTag = (id: number | undefined) => {
    const el = id == null ? null : boxRef.current?.querySelector<HTMLElement>('[data-tagid="' + id + '"]')
    if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }) } else inputRef.current?.focus()
  }
  React.useEffect(() => { boxRef.current?.querySelectorAll<HTMLElement>('[data-tagid] button').forEach(b => { b.tabIndex = -1 }) })

  // ---------- suggestions ----------
  const keys = (skip?: number) => hits.filter(h => h.ok && h.id !== skip).map(h => h.ok!.key)
  const takenBy = (skip?: number) => { const ks = keys(skip); return (v: string, pin?: string) => { if (!kind) return false; const r = look(kind, region, v, pin, lo); return typeof r !== 'string' && (ks.indexOf(r.key) >= 0 || has(r.tag.key)) } }
  const sugs = kind && draft.trim() ? suggest(kind, region, draft, takenBy()) : []
  const showSug = sugOpen && !edit && sugs.length > 0
  const pick = (x: Sug) => {
    const ids = take(x.value, x.pin)
    if (ids.length) setChecked(c => { const o = { ...c }; ids.forEach(id => { o[id] = x.value }); return o })
    setHi(0); setTimeout(() => inputRef.current?.focus(), 0)
  }
  const esugs = kind && edit && edit.v.trim() ? suggest(kind, region, edit.v, takenBy(edit.id)) : []

  // ---------- editing a tag: plain text in the same spot ----------
  const saveEdit = (over?: { v: string; pin?: string }) => {
    if (!edit) return
    const v = (over ? over.v : edit.v).trim(), id = edit.id
    setEdit(null)
    if (!v) { drop(id); return }
    setItems(l => l.map(x => (x.id === id ? { ...x, v, pin: over ? over.pin : (v === x.v ? x.pin : undefined) } : x)))
    if (over || notInDropdown(v)) setChecked(c => ({ ...c, [id]: v }))
    setTimeout(() => { const el = boxRef.current?.querySelector<HTMLElement>('[data-tagid="' + id + '"]'); inputRef.current?.focus({ preventScroll: true }); el?.scrollIntoView({ block: 'nearest' }) }, 0)
  }
  const editor = (h: Hit) => {
    const onKey = (e: React.KeyboardEvent) => {
      const opened = esugs.length > 0
      if (opened && e.key === 'ArrowDown') { e.preventDefault(); setEhi(i => Math.min(i + 1, esugs.length - 1)) }
      else if (opened && e.key === 'ArrowUp') { e.preventDefault(); setEhi(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Escape') { e.stopPropagation(); setEdit(null) }
      else if (e.key === 'Enter') { e.preventDefault(); if (opened) { const x = esugs[Math.min(ehi, esugs.length - 1)]; saveEdit({ v: x.value, pin: x.pin }) } else saveEdit() }
    }
    return (
      <Popover key={h.id} open={esugs.length > 0}>
        <PopoverAnchor asChild><span className="inline-flex">
          <input data-editing autoFocus aria-label={L('Edit ', '修改 ') + h.v} value={edit!.v} size={Math.max(edit!.v.length, 3)} onChange={e => { setEhi(0); setEdit({ id: h.id, v: e.target.value }) }}
            onBlur={() => saveEdit()} onKeyDown={onKey} className="h-6 min-w-[2ch] bg-transparent px-0.5 text-body text-foreground outline-none" style={{ fieldSizing: 'content' } as React.CSSProperties} />
        </span></PopoverAnchor>
        <PopoverContent align="start" sideOffset={6} className="w-96 p-1" onOpenAutoFocus={e => e.preventDefault()}>
          <SugList sugs={esugs} hi={Math.min(ehi, esugs.length - 1)} setHi={setEhi} onPick={x => saveEdit({ v: x.value, pin: x.pin })} />
        </PopoverContent>
      </Popover>
    )
  }

  // ---------- tags ----------
  const tagKeys = (h: Hit) => (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    const i = shown.findIndex(x => x.id === h.id), prev = shown[i - 1], next = shown[i + 1]
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') { e.preventDefault(); setEdit({ id: h.id, v: h.v }) }
    else if (e.key === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); if (prev) focusTag(prev.id) }
    else if (e.key === 'ArrowRight' && e.shiftKey) { e.preventDefault(); if (next) focusTag(next.id); else moveCaret(i + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveCaret(i) }
    else if (e.key === 'ArrowRight' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); moveCaret(i + 1) }
    else if (e.key === 'Home') { e.preventDefault(); moveCaret(0) }
    else if (e.key === 'End') { e.preventDefault(); moveCaret(shown.length) }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); drop(h.id); moveCaret(i) }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); moveCaret(i + 1); setDraft(d => d + e.key); setSugOpen(true) }
  }
  const byName = kind === 'nt' || kind === 'emp'
  const editable = (h: Hit, name: string) => ({
    role: 'button', tabIndex: -1, className: 'cursor-text', 'data-tagid': h.id,
    'aria-label': L('Edit ', '修改 ') + name + (h.why ? ': ' + tx(h.why) : ''),
    onClick: (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button')) setEdit({ id: h.id, v: h.v }) },
    onKeyDown: tagKeys(h),
  })
  const red = (h: Hit, why: string) => (
    <Tooltip key={h.id}>
      <TooltipTrigger asChild><Tag color="red" unbounded {...editable(h, h.v)} onRemove={() => drop(h.id)} removeAriaLabel={h.v}>{h.v}</Tag></TooltipTrigger>
      <TooltipContent side="bottom" align="start">{tx(why)}</TooltipContent>
    </Tooltip>
  )
  const tag = (h: Hit) => {
    if (fmtBad(h)) return red(h, fmtErr(kind, h.v))
    if (isPending(h)) return <Tag key={h.id} unbounded data-tagid={h.id} aria-disabled className="opacity-50">{h.v}</Tag>
    if (!isChecked(h)) return <Tag key={h.id} unbounded {...editable(h, h.v)} onRemove={() => drop(h.id)} removeAriaLabel={h.v}>{h.v}</Tag>
    if (!h.ok) return red(h, h.why!)
    const p = h.ok.p ? PMAP[h.ok.p] : null, text = byName ? h.ok.label : h.ok.val
    const t = <Tag key={h.id} unbounded avatar={byName && p ? <PAvatar p={p} size={16} /> : undefined} {...editable(h, text)} onRemove={() => drop(h.id)} removeAriaLabel={text}>{text}</Tag>
    // a hover only where the tag doesn't show what was typed (names for codes) or a code needs its name (Org IDs)
    const tip = byName ? (p ? h.ok.val + ' · ' + p.org : null) : kind === 'org' ? h.ok.who : null
    if (!tip) return t
    return <Tooltip key={h.id}><TooltipTrigger asChild>{t}</TooltipTrigger><TooltipContent side="bottom" align="start">{tip}</TooltipContent></Tooltip>
  }

  // ---------- the input's keys ----------
  const caretKey = (e: React.KeyboardEvent) => {
    if (showSug) return false
    const cur = at ?? shown.length
    if (e.key === 'ArrowLeft' && e.shiftKey) { if (cur > 0) focusTag(shown[cur - 1].id); return true }
    if (e.key === 'ArrowRight' && e.shiftKey) { if (cur < shown.length) focusTag(shown[cur].id); return true }
    if (e.key === 'ArrowLeft') { if (cur > 0) moveCaret(cur - 1); return true }
    if (e.key === 'ArrowRight') { if (cur < shown.length) moveCaret(cur + 1); return true }
    if (e.key === 'Home') { moveCaret(0); return true }
    if (e.key === 'End') { moveCaret(shown.length); return true }
    // between tags: remove the tag beside the caret at once; at the end, Backspace selects the last tag first
    if (e.key === 'Backspace') { if (cur > 0) { if (caretMid) { drop(shown[cur - 1].id); moveCaret(cur - 1) } else focusTag(shown[cur - 1].id) } return true }
    if (e.key === 'Delete') { if (cur < shown.length) { if (caretMid) { drop(shown[cur].id); moveCaret(cur) } else focusTag(shown[cur].id) } return true }
    return false
  }

  // ---------- help text ----------
  const errNow = bad.length > 0
  const rmLink = <Button variant="link" size="sm" className="!inline !h-auto !min-w-0 !p-0 align-baseline [&>span]:!px-0" onClick={removeInvalid}>{L('Remove invalid', '移除無效的')}</Button>
  const hint = !hits.length ? L('Separate with commas or new lines.', '用逗號或換行分隔。')
    : checking ? <span className="inline-flex items-center gap-1.5"><CircularSpin />{L('Checking ' + (runN.current - pendingIds.length) + ' of ' + runN.current + '…', '檢查中 ' + (runN.current - pendingIds.length) + ' / ' + runN.current + '…')}</span>
    : <span>
        {n || (!bad.length && !k) ? L(n + ' valid', n + ' 筆有效') : null}
        {bad.length ? <>{n ? L(', ', '，') : ''}<span className="text-error-text">{L(bad.length + ' invalid', bad.length + ' 筆無效')}</span></> : null}
        {k ? (n || bad.length ? L(', ' + k + ' not checked yet', '，' + k + ' 筆尚未檢查') : L(k + (k === 1 ? ' entry' : ' entries'), k + ' 筆')) : null}
        {errNow ? <>{L('. ', '。')}<span className="text-error-text">{L('Fix or remove invalid to save.', '請修改或移除無效的才能儲存。')}</span> {rmLink}</> : null}
      </span>
  const word = noun === 'member' ? L('members', '位成員') : L('audiences', '位收件人')

  // the input, where the caret is; between tags with nothing typed it takes no room (a drawn caret stands in)
  const inputBox = (
    <Popover key="__input" open={showSug} onOpenChange={o => { if (!o) setSugOpen(false) }}>
      <PopoverAnchor asChild>
        <span className={caretMid ? 'relative flex self-stretch' : 'flex min-w-[200px] flex-1'} style={caretMid && !draft ? { width: 0, marginRight: '-0.25rem' } : undefined}>
          <input ref={inputRef} id="imp-text" disabled={!kind} autoComplete="off" role="combobox" aria-expanded={showSug} aria-autocomplete="list"
            className="tag-caret-input w-full bg-transparent py-0.5 text-body outline-none placeholder:text-fg-muted disabled:cursor-not-allowed"
            style={caretMid ? (draft ? { width: (draft.length + 0.5) + 'ch' } : { position: 'absolute', left: -3, top: 0, bottom: 0, width: 2, padding: 0, caretColor: 'transparent' }) : undefined}
            placeholder={!kind ? L('Choose a data type first', '請先選擇資料類型') : items.length ? '' : L('e.g. ', '例如：') + (kind === 'phone' ? REGIONS.find(r => r.v === region)!.ph : listKindExample(kind))}
            value={draft} onChange={e => { setHi(0); setSugOpen(true); if (/[\n,，;；]/.test(e.target.value)) take(e.target.value); else setDraft(e.target.value.replace(/^\s+/, '')) }}
            onKeyDown={e => {
              if (showSug && e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, sugs.length - 1)) }
              else if (showSug && e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
              else if (e.key === 'Escape' && showSug) { e.stopPropagation(); setSugOpen(false) }
              else if (e.key === 'Enter') { e.preventDefault(); if (showSug) pick(sugs[Math.min(hi, sugs.length - 1)]); else take(draft) }
              else if (!draft && caretKey(e)) e.preventDefault()
            }}
            onBlur={e => { if (moving.current) return; take(draft); setSugOpen(false); if (!(e.relatedTarget && boxRef.current?.contains(e.relatedTarget as Node))) setAt(null) }}
            onPaste={e => { e.preventDefault(); take(draft + e.clipboardData.getData('text')) }} />
          {caretMid && !draft ? <span aria-hidden className="tag-caret" /> : null}
        </span>
      </PopoverAnchor>
      <PopoverContent align="start" sideOffset={6} className="w-96 p-1" onOpenAutoFocus={e => e.preventDefault()}>
        <SugList sugs={sugs} hi={Math.min(hi, sugs.length - 1)} setHi={setHi} onPick={pick} />
      </PopoverContent>
    </Popover>
  )
  const list = shown.map(h => (edit && edit.id === h.id ? editor(h) : tag(h)))
  list.splice(caretMid ? at! : list.length, 0, inputBox)

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={1120} height="fill" onEscapeKeyDown={e => { if (edit || showSug) e.preventDefault() }}>
          <DialogHeader><DialogTitle>{L('Batch import', '批次匯入')}</DialogTitle><DialogDescription className="sr-only">{L('Batch import', '批次匯入')}</DialogDescription></DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              <div className="flex flex-wrap items-end gap-2">
                {/* changing the data type clears the list: asked first when the list isn't empty */}
                <ListKindField id="imp-kind" value={kind} onChange={x => { if (x === kind) return; if (items.length) setPend(x); else setKind(x) }} />
                {kind === 'phone' ? <div className="w-36"><FormField id="imp-region" label={L('Region', '地區')}><Select id="imp-region" aria-label={L('Region', '地區')} value={region} onChange={v => setRegion(v as Region)} options={REGIONS.map(x => ({ value: x.v, label: x.code + ' (' + x.v + ')' }))} /></FormField></div> : null}
              </div>
              <FormField id="imp-text" label={L('List', '名單')} hint={hint}>
                <div ref={boxRef} className={cn(errNow && '!border-error', 'flex h-[calc(100svh-400px)] min-h-[200px] w-full flex-wrap content-start items-center gap-1 overflow-y-auto rounded-md border px-[var(--field-px)] py-[var(--field-control-py-md)]',
                  kind ? 'cursor-text border-border bg-surface hover:border-border-hover focus-within:!border-primary' : 'cursor-not-allowed border-transparent bg-disabled')}
                  onMouseDown={e => { if (kind && e.target === e.currentTarget) { e.preventDefault(); if (draft.trim()) take(draft); moveCaret(caretFromPoint(e.clientX, e.clientY)) } }}>
                  {list}
                </div>
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="tertiary" onClick={onClose}>{L('Cancel', '取消')}</Button>
            {checking && waiting ? <Button variant="primary" loading>{L('Save', '儲存')}</Button>
              : bad.length ? (
                <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button variant="primary" disabled>{L('Save', '儲存')}</Button></span></TooltipTrigger>
                  <TooltipContent>{L('Fix or remove the invalid entries first', '請先修改或移除無效的項目')}</TooltipContent></Tooltip>
              ) : <Button variant="primary" disabled={(!hits.length && !draft.trim()) || !!edit} aria-label={L('Save: add ' + (n + k) + ' ' + word, '儲存：加入 ' + (n + k) + ' ' + word)} onClick={save}>{L('Save', '儲存')}</Button>}
          </DialogFooter>
          <ConfirmDialog onClose={() => setPend(null)} cf={pend ? {
            title: L('Change the data type?', '要變更資料類型嗎？'),
            text: L('Changing to ' + listKindName(pend) + ' clears the list. The ' + hits.length + (hits.length === 1 ? ' entry' : ' entries') + ' you added can’t be looked up as another type.',
              '變更為 ' + listKindName(pend) + ' 會清空名單，已加入的 ' + hits.length + ' 筆無法用其他類型查詢。'),
            cancel: L('Cancel', '取消'), ok: L('Clear and change', '清空並變更'), danger: true, run: () => { setKind(pend); setPend(null) },
          } : null} />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

// the DS spinner, small, before "Checking x of y…"
function CircularSpin() { return <CircularProgress size={14} aria-hidden /> }
