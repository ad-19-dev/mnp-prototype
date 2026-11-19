// Batch import: how a tag is edited, and where a tag goes once it's fixed (2026-11-19). Live demos side by side,
// with the prototype's sample people and matching; nothing here changes the prototype.
//   Now: a click swaps the tag for a small DS Input (a field inside the field); red tags are always sorted first, so
//        a fixed one jumps to the gray ones at once.
//   A (suggested): a click turns the tag back into plain text in the same spot; the order is set only when entries
//        come in (red first then), and a fixed tag stays where it is, turning gray with a short green flash.
//   B: the order you typed is kept; the hint counts what's left to fix, and Next to fix jumps to the next red tag.
//   C: A, plus Enter on a fixed tag moves straight to the next red one (for long lists).
// Phone numbers get a region (TW / US / JP / CN) next to the data type; numbers starting with + keep their own code.
import * as React from 'react'
import { Button, Popover, PopoverAnchor, PopoverContent, Select, Tag, Tooltip, TooltipContent, TooltipTrigger, cn } from '@qijenchen/design-system'
import { Building2, Mail, Phone } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { FormField, ListKindField, PAvatar, listKindExample, pname } from '../../components/ui'
import { REGIONS, type Region } from '../../components/RecvInput'
import { DOMAIN, ORGS, PEOPLE, PMAP, fmtExtPhone, matchAs, splitTokens, type ListKind, type Person } from '../../lib/data'

type Mode = 'now' | 'A' | 'B' | 'C'
type Item = { id: number; v: string }
type Hit = { id: number; v: string; ok?: { key: string; label: string; p?: string; icon?: typeof Mail }; why?: string }

// phone numbers: by the chosen region, or by their own +code
function matchPhone(v: string, region: Region): NonNullable<Hit['ok']> | string {
  const t = v.trim(), d = t.replace(/\D/g, '')
  const byCode = t.startsWith('+') ? REGIONS.find(r => d.startsWith(r.code.slice(1))) : undefined
  if (t.startsWith('+') && !byCode) return 'Only TW, US, JP and CN numbers'
  const R = byCode || REGIONS.find(r => r.v === region)!, n = R.norm(byCode ? d.slice(R.code.length - 1) : d)
  if (!n) return R.err.replace(/\.$/, '')
  if (R.v === 'TW') { const p = PEOPLE.find(x => x.co === n || x.pp === n); if (p) return { key: 'p:' + p.id, label: pname(p), p: p.id } }
  const shown = R.v === 'TW' ? fmtExtPhone(n) : n
  return { key: 'e:' + shown, label: shown, icon: Phone }
}
function look(kind: ListKind, region: Region, v: string): NonNullable<Hit['ok']> | string {
  if (kind === 'phone') return matchPhone(v, region)
  const mm = matchAs(v, kind, { allowExt: true })
  if (mm.kind === 'one') return { key: 'p:' + mm.p.id, label: pname(mm.p), p: mm.p.id }
  if (mm.kind === 'org') return { key: 'o:' + mm.org.code, label: mm.org.code, icon: Building2 }
  if (mm.kind === 'ext') return { key: 'e:' + mm.email, label: mm.email, icon: Mail }
  return mm.kind === 'miss' ? mm.why : 'More than one match'
}

// suggestions while typing (2026-11-19): the people (or orgs) the typed text could be, for the data types that point
// at someone. Picking one adds the value of that data type (an NT account, an employee ID…), not the name.
//   NT accounts: NT account starts with it, or the name has it · Employee IDs / MVPN: starts with it (2+ digits)
//   Emails: company addresses only (the part before @) · Phone numbers: Taiwan employees' company or personal mobile
//   (4+ digits) · Org IDs: orgs (code or name). Outside emails and numbers never match anyone, so nothing shows.
type Sug = { value: string; p?: Person; org?: typeof ORGS[number]; sub: string }
function suggest(kind: ListKind, region: Region, q: string, taken: (v: string) => boolean): Sug[] {
  const t = q.trim(), low = t.toLowerCase(), d = t.replace(/\D/g, '')
  const ppl = PEOPLE.filter(p => !p.extKind && !p.gen)
  let out: Sug[] = []
  if (kind === 'nt' && t.length >= 2) out = ppl.filter(p => p.nt.startsWith(low) || (p.en + ' ' + p.zh).toLowerCase().includes(low)).map(p => ({ value: p.nt, p, sub: p.nt + ' · ' + p.org }))
  else if (kind === 'emp' && d.length >= 2 && d === t) out = ppl.filter(p => p.emp.startsWith(d)).map(p => ({ value: p.emp, p, sub: p.emp + ' · ' + p.org }))
  else if (kind === 'mvpn' && d.length >= 2 && d === t) out = ppl.filter(p => p.mvpn && p.mvpn.startsWith(d)).map(p => ({ value: p.mvpn, p, sub: 'MVPN ' + p.mvpn + ' · ' + p.org }))
  else if (kind === 'email' && t.length >= 2) { const [a, b] = low.split('@'); if (b === undefined || DOMAIN.startsWith(b)) out = ppl.filter(p => p.nt.startsWith(a)).map(p => ({ value: p.nt + '@' + DOMAIN, p, sub: p.nt + '@' + DOMAIN })) }
  else if (kind === 'phone' && region === 'TW' && !t.startsWith('+') && d.length >= 4) out = ppl.flatMap(p => [p.co, p.pp].filter(n => n && n.includes(d.replace(/^886/, '0'))).map(n => ({ value: n, p, sub: fmtExtPhone(n) + (n === p.co ? ' · Company mobile' : ' · Personal phone') })))
  else if (kind === 'org' && t.length >= 1) out = ORGS.filter(o => o.code.toLowerCase().startsWith(low) || o.name.toLowerCase().includes(low)).map(o => ({ value: o.code, org: o, sub: o.name + ' · ' + o.count + ' people' }))
  return out.filter(x => !taken(x.value) && !(x.p && taken(x.p.nt))).slice(0, 6)
}

const SAMPLE: Record<string, string> = {
  // ytchang and thliu are left out, so fixing a red tag to them gives a new person (not a repeat)
  nt: 'gywu, cmchen, kylin, chlinb, ycchenz, ycchenq, a19999, ycchenm, bhhuang, celee, sywangd, thtsai, gywuu, psyang, chhsu, shcheng, ythsieh, hykuo, prhung, cm.chen, yttseng, chchiu, ycliao, shlai, cnchou, cmchen',
  phone: '0918226588, 0912337415, 0987654321, 091234, +1 415 555 0123, +81 90 1234 5678, +86 138 0013 8000, +44 20 7946 0958',
}

function Demo({ mode }: { mode: Mode }) {
  const [kind, setKind] = React.useState<ListKind | null>('nt'), [region, setRegion] = React.useState<Region>('TW')
  const [items, setItems] = React.useState<Item[]>([]), [draft, setDraft] = React.useState('')
  const [seq, setSeq] = React.useState<number[]>([])        // A, C: the order, set when entries come in
  const [edit, setEdit] = React.useState<{ id: number; v: string } | null>(null)
  const [hi, setHi] = React.useState(0), [sugOpen, setSugOpen] = React.useState(false)
  const [flash, setFlash] = React.useState<number | null>(null)
  const nextId = React.useRef(1), inputRef = React.useRef<HTMLInputElement>(null), boxRef = React.useRef<HTMLDivElement>(null)

  // look every entry up; repeats drop out (they aren't shown)
  const hitsOf = (list: Item[]): Hit[] => {
    if (!kind) return []
    const seen: Record<string, boolean> = {}, out: Hit[] = []
    list.forEach(it => {
      const r = look(kind, region, it.v)
      if (typeof r === 'string') { const k = 'x:' + it.v.toLowerCase(); if (seen[k]) return; seen[k] = true; out.push({ id: it.id, v: it.v, why: r }) }
      else { if (seen[r.key]) return; seen[r.key] = true; out.push({ id: it.id, v: it.v, ok: r }) }
    })
    return out
  }
  const hits = hitsOf(items), byId = Object.fromEntries(hits.map(h => [h.id, h]))
  const redFirst = (hs: Hit[]) => hs.filter(h => h.why).concat(hs.filter(h => h.ok))
  // what is shown, in which order
  const shown: Hit[] = mode === 'now' ? redFirst(hits)
    : mode === 'B' ? hits
    : seq.map(id => byId[id]).filter(Boolean).concat(hits.filter(h => seq.indexOf(h.id) < 0))
  const bad = hits.filter(h => h.why), good = hits.filter(h => h.ok)

  // entries come in: A and C sort red first now (and only now)
  const take = (t: string) => {
    const l = splitTokens(t).map(x => x.trim()).filter(Boolean)
    setDraft('')
    if (!l.length) return
    const add = l.map(v => ({ id: nextId.current++, v })), all = items.concat(add)
    setItems(all)
    if (mode === 'A' || mode === 'C') setSeq(redFirst(hitsOf(all)).map(h => h.id))
  }
  const drop = (id: number) => { setItems(l => l.filter(x => x.id !== id)); setSeq(s => s.filter(x => x !== id)) }
  const openEdit = (h: Hit) => setEdit({ id: h.id, v: h.v })
  const nextRed = (after: number | null, list: Hit[]) => {
    const reds = list.filter(h => h.why && h.id !== after), i = after == null ? -1 : list.findIndex(h => h.id === after)
    return reds.find(h => list.indexOf(h) > i) || reds[0]
  }
  const saveEdit = (goNext?: boolean) => {
    if (!edit) return
    const was = byId[edit.id], v = edit.v.trim()
    if (!v) { drop(edit.id); setEdit(null); return }
    const nextItems = items.map(x => (x.id === edit.id ? { ...x, v } : x))
    setItems(nextItems)
    const now = hitsOf(nextItems).find(h => h.id === edit.id)
    if (was && was.why && now && now.ok) { setFlash(edit.id); setTimeout(() => setFlash(f => (f === edit.id ? null : f)), 1600) }
    setEdit(null)
    if (goNext && mode === 'C') {
      const list = seq.map(id => hitsOf(nextItems).find(h => h.id === id)).filter(Boolean) as Hit[]
      const n = nextRed(edit.id, list)
      if (n) { setTimeout(() => setEdit({ id: n.id, v: n.v }), 0); return }
    }
    // Now: back to the input at the end (the box scrolls to the bottom); A/B/C: stay on the tag just edited
    const id = edit.id
    setTimeout(() => {
      const el = mode === 'now' ? null : boxRef.current?.querySelector<HTMLElement>('[data-tagid="' + id + '"]')
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }) } else inputRef.current?.focus()
    }, 0)
  }
  const goNextToFix = () => {
    const n = nextRed(null, shown); if (!n) return
    setEdit({ id: n.id, v: n.v })
    setTimeout(() => { const el = boxRef.current?.querySelector('[data-editing]'); el && el.scrollIntoView({ block: 'nearest' }) }, 0)
  }
  React.useEffect(() => { setItems([]); setSeq([]); setEdit(null) }, [kind])

  const editable = (h: Hit) => ({
    role: 'button', tabIndex: 0, className: 'cursor-text', 'data-tagid': h.id,
    'aria-label': 'Edit ' + (h.ok ? h.ok.label : h.v) + (h.why ? ': ' + h.why : ''),
    onClick: (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button')) openEdit(h) },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEdit(h) } },
  })
  const tag = (h: Hit) => {
    const fl = flash === h.id
    if (h.ok) {
      const p = h.ok.p ? PMAP[h.ok.p] : null
      return <Tag key={h.id} unbounded avatar={p ? <PAvatar p={p} size={16} /> : undefined} icon={p ? undefined : h.ok.icon} {...editable(h)}
        className={cn('cursor-text transition-shadow', fl && 'ring-2 ring-[var(--color-green-6,#22a06b)]')} onRemove={() => drop(h.id)} removeAriaLabel={h.ok.label}>{h.ok.label}</Tag>
    }
    return (
      <Tooltip key={h.id}>
        <TooltipTrigger asChild><Tag color="red" {...editable(h)} onRemove={() => drop(h.id)} removeAriaLabel={h.v}>{h.v}</Tag></TooltipTrigger>
        <TooltipContent side="bottom" align="start">{h.why}</TooltipContent>
      </Tooltip>
    )
  }
  // editing: Now = a small DS-looking input; A/B/C = the entry as plain text with a caret, in the same spot
  const editor = (h: Hit) => mode === 'now'
    ? <input key={h.id} data-editing autoFocus aria-label={'Edit ' + h.v} value={edit!.v} onChange={e => setEdit({ id: h.id, v: e.target.value })}
        onBlur={() => saveEdit()} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.stopPropagation(); setEdit(null) } }}
        className="h-8 w-48 rounded-md border border-primary bg-surface px-2 text-body outline-none" />
    : <input key={h.id} data-editing autoFocus aria-label={'Edit ' + h.v} value={edit!.v} size={Math.max(edit!.v.length, 3)} onChange={e => setEdit({ id: h.id, v: e.target.value })}
        onBlur={() => saveEdit()} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { if (e.key === 'Enter' || mode === 'C') { e.preventDefault(); saveEdit(true) } } if (e.key === 'Escape') { e.stopPropagation(); setEdit(null) } }}
        className="h-6 min-w-[2ch] bg-transparent px-0.5 text-body text-foreground outline-none" style={{ fieldSizing: 'content' } as React.CSSProperties} />

  // people (or orgs) the typed text could be; already in the list are left out
  const inList = (v: string) => items.some(x => x.v.toLowerCase() === v.toLowerCase()) || hits.some(h => h.ok && h.ok.p && (PMAP[h.ok.p].nt === v || PMAP[h.ok.p].emp === v))
  const sugs = kind && draft.trim() ? suggest(kind, region, draft, inList) : []
  const showSug = sugOpen && sugs.length > 0
  const pick = (x: Sug) => { take(x.value); setHi(0); setTimeout(() => inputRef.current?.focus(), 0) }
  const n = good.length
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56"><ListKindField id={'k-' + mode} value={kind} onChange={k => setKind(k)} /></div>
        {kind === 'phone' ? <div className="w-36"><FormField id={'r-' + mode} label="Region"><Select aria-label="Region" value={region} onChange={v => setRegion(v as Region)} options={REGIONS.map(x => ({ value: x.v, label: x.v + ' ' + x.code }))} /></FormField></div> : null}
      </div>
      <FormField id={'t-' + mode} label="List" hint={
        !hits.length ? 'Separate with commas or new lines.'
          : mode === 'B' ? <span className="flex flex-wrap items-center gap-x-2">{n} valid audiences{bad.length ? <> · <span className="text-error-text">{bad.length} to fix</span> <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={goNextToFix}>Next to fix</Button></> : null}. Click a tag to edit it.</span>
          : mode === 'C' ? n + ' valid audiences. Click a tag to edit it; Enter goes on to the next red one.'
          : n + ' valid audiences. Click a tag to edit it.'}>
        <div ref={boxRef} className={cn('flex h-56 w-full flex-wrap content-start items-center gap-1 overflow-y-auto rounded-md border px-[var(--field-px)] py-[var(--field-control-py-md)]',
          kind ? 'cursor-text border-border bg-surface hover:border-border-hover focus-within:!border-primary' : 'cursor-not-allowed border-transparent bg-disabled')}
          onClick={e => { if (e.target === e.currentTarget) inputRef.current?.focus() }}>
          {shown.map(h => (edit && edit.id === h.id ? editor(h) : tag(h)))}
          <Popover open={showSug} onOpenChange={o => { if (!o) setSugOpen(false) }}>
            <PopoverAnchor asChild>
              <span className="flex min-w-[160px] flex-1">
                <input ref={inputRef} id={'t-' + mode} disabled={!kind} className="w-full bg-transparent py-0.5 text-body outline-none placeholder:text-fg-muted" autoComplete="off"
                  role="combobox" aria-expanded={showSug} aria-autocomplete="list"
                  placeholder={!kind ? 'Choose a data type first' : items.length ? '' : 'e.g. ' + (kind === 'phone' ? REGIONS.find(r => r.v === region)!.ph : listKindExample(kind))}
                  value={draft} onChange={e => { setHi(0); setSugOpen(true); if (/[\n,，;；]/.test(e.target.value)) take(e.target.value); else setDraft(e.target.value) }}
                  onKeyDown={e => {
                    if (showSug && e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, sugs.length - 1)) }
                    else if (showSug && e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
                    else if (e.key === 'Escape' && showSug) { e.stopPropagation(); setSugOpen(false) }
                    else if (e.key === 'Enter') { e.preventDefault(); if (showSug) pick(sugs[Math.min(hi, sugs.length - 1)]); else take(draft) }
                    else if (e.key === 'Backspace' && !draft && shown.length) drop(shown[shown.length - 1].id)
                  }}
                  onBlur={() => { take(draft); setSugOpen(false) }} onPaste={e => { e.preventDefault(); take(draft + e.clipboardData.getData('text')) }} />
              </span>
            </PopoverAnchor>
            {/* the people (or orgs) it could be: avatar, name, the matched value; Enter or a click adds it */}
            <PopoverContent align="start" sideOffset={6} className="w-80 p-1" onOpenAutoFocus={e => e.preventDefault()}>
              <div role="listbox" aria-label="Matches">
                {sugs.map((x, i) => (
                  <button key={x.value} type="button" role="option" aria-selected={i === hi} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(x)}
                    className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left', i === hi && 'bg-neutral-hover')}>
                    {x.p ? <PAvatar p={x.p} size={24} /> : <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted"><Building2 className="size-3.5 text-fg-secondary" aria-hidden /></span>}
                    <span className="flex min-w-0 flex-col"><span className="truncate text-body">{x.p ? pname(x.p) : x.org!.code}</span><span className="truncate text-caption text-fg-secondary">{x.sub}</span></span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </FormField>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!kind || (kind !== 'nt' && kind !== 'phone')} onClick={() => take(SAMPLE[kind === 'phone' ? 'phone' : 'nt'])}>Paste a sample list</Button>
        <Button variant="tertiary" size="sm" disabled={!items.length} onClick={() => { setItems([]); setSeq([]); setEdit(null) }}>Clear</Button>
        <span className="text-caption text-fg-secondary">Try: fix a red tag (a19999 → ytchang, gywuu → thliu), then look for it.</span>
      </div>
    </div>
  )
}

export default function ImportTags() {
  const col = (mode: Mode, title: string, badge: React.ReactNode, desc: string) => (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2"><b className="text-body">{title}</b>{badge}</span>
      <span className="text-caption text-fg-secondary">{desc}</span>
      <Demo mode={mode} />
    </div>
  )
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Batch import · 標籤的修改與位置</span>
          <h1 className="spec-h1">批次匯入：點標籤怎麼改、改好之後去哪</h1>
          <span className="text-caption text-fg-secondary">2026/11/19 · 四個版本都可以直接操作（按 Paste a sample list 貼上 26 筆，其中 3 筆找不到；把 a19999 改成 ytchang、gywuu 改成 thliu 試試），用的是原型的範例資料與比對規則；不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Problem" title="現在的兩個問題">
          <SpecTable head={['問題', '為什麼']} nowrap={[0]} rows={[
            ['修改時欄位裡又有一個欄位', '點標籤會換成一個有外框的輸入框（DS Input sm），名單欄位本身也是輸入框，看起來像兩層。它也比標籤高，那一行會跳一下。'],
            ['修好的標籤會跳走', '「紅色永遠排最前面」是每次畫面更新都重新排序，所以紅色一改成有效，馬上移到灰色那一區的最後；名單長時，使用者就找不到剛剛改的那一筆，也不確定有沒有改成功。'],
          ]} />
          <Notes items={[
            { title: '紅色排最前面還是有用', body: '貼上幾百筆時，要處理的幾筆一打開就看得到（這是加大對話框時的需求）。要改的不是「排最前面」本身，而是「什麼時候排」。' },
            { title: '常見做法', body: 'Gmail、Outlook 的收件人欄：點一下或雙擊收件人，標籤變回純文字，游標在字裡，改完按 Enter 再變回標籤，位置不變。' },
          ]} cols />
        </Section>

        <Section eyebrow="Try" title="直接試試" lead="每一個都先按 Paste a sample list，再把一個紅色標籤改好，看看它去哪裡。">
          <div className="grid gap-[var(--layout-space-loose)] xl:grid-cols-2">
            {col('now', '現在', <Tag size="sm" color="neutral">原型目前的做法</Tag>, '點標籤換成有外框的輸入框；紅色永遠排最前面，修好就跳到灰色區。')}
            {col('A', 'A：變回文字、原地變色', <Tag size="sm" color="green">建議</Tag>, '點標籤變回純文字（游標在字裡）；只有加入名單時把紅色排到前面，修好的標籤留在原地變灰色，閃一下綠框。')}
            {col('B', 'B：照輸入順序，用 Next 找下一筆', <Tag size="sm" color="neutral">替代</Tag>, '不排序；說明文字寫「n to fix」與 Next to fix，按了直接打開下一個紅色標籤。')}
            {col('C', 'C：A 加上 Enter 接著改下一筆', <Tag size="sm" color="neutral">A 的加強</Tag>, '和 A 相同；改好按 Enter 會直接打開下一個紅色標籤，不用再找。')}
          </div>
        </Section>

        <Section eyebrow="Suggest" title="輸入時比對到人：跳出選單" lead="四個示範都有：在名單欄位打字時，比對得到的人（或組織）出現在游標下方的選單，最多 6 筆；↑↓ 選、Enter 或點一下加入，Esc 關閉。加入的是這個資料類型的值（例如 NT 帳號），標籤上顯示姓名。已經在名單裡的人不再出現。">
          <SpecTable head={['資料類型', '比對得到人嗎', '怎麼比對', '從第幾個字開始']} nowrap={[0, 3]} rows={[
            ['NT accounts', '可以', 'NT 帳號開頭相符，或英文名、中文名含有輸入的字（例：打 chen 會出現 cmchen、ycchenz…）', '2 個字'],
            ['Employee IDs', '可以', '工號開頭相符（只有數字時）', '2 碼'],
            ['Emails', '只有公司信箱', '@ 前面是 NT 帳號，開頭相符；外部信箱不會對到任何人，不出現選單', '2 個字'],
            ['Phone numbers', '只有台灣員工的手機', '公務或私人手機含有輸入的數字；地區不是 TW、或以 + 開頭的外部號碼，不出現選單', '4 碼'],
            ['MVPN', '可以', 'MVPN 開頭相符', '2 碼'],
            ['Org IDs', '對到的是組織', '組織代號開頭相符，或名稱含有輸入的字；選單顯示組織圖示、代號、名稱與人數', '1 個字'],
          ]} />
          <Notes items={[
            { title: '不選也可以', body: '選單只是提示：不選、直接按 Enter 或逗號，就照打的字加入並比對（和現在一樣）。貼上整份名單時不出現選單。' },
            { title: '試試', body: '在任一個示範打 chen、12、ch 或 0918（Phone numbers）。' },
            { title: '正式版', body: '實際上公司超過 10 萬人，選單要向伺服器查詢（輸入停一下才查，例如 300ms），查詢中顯示載入中。' },
          ]} cols />
        </Section>

        <Section eyebrow="Compare" title="比較">
          <SpecTable head={['', '修改的樣子', '紅色在哪', '修好之後', '名單很長時']} nowrap={[0]} rows={[
            ['現在', '欄位裡的輸入框', '永遠在最前面', '立刻跳到後面（找不到）', '要處理的在最前面'],
            ['A（建議）', '變回純文字', '加入名單時排到前面', '原地變灰色、閃一下綠框', '要處理的在最前面；修好的不動'],
            ['B', '變回純文字', '照輸入順序（散在各處）', '原地變灰色、閃一下綠框', '靠 Next to fix 跳到下一筆'],
            ['C', '變回純文字', '同 A', '同 A；Enter 直接改下一筆', '同 A，鍵盤可以一路改完'],
          ]} />
          <Notes items={[
            { title: '建議 A', body: '保留「要處理的在最前面」，又不會讓剛改好的標籤消失：排序只發生在名單「進來」的那一刻（貼上、按 Enter、輸入逗號），修改不會觸發排序。修好的標籤在原地變灰並閃一下綠框，使用者看得到結果。下一次再貼上新名單時才重新整理順序。' },
            { title: '要不要加 C', body: 'C 的 Enter 接著改下一筆，對一次要修十幾筆的人很快；但只改一兩筆的人可能會被突然打開的下一筆嚇到。可以先上 A，看使用者測試再決定。' },
            { title: 'B 的取捨', body: 'B 完全不動順序，最容易預期；但紅色散在名單各處，名單很長時要靠 Next to fix，多一個要學的東西，也會讓「n to fix」的數字回到畫面上（之前拿掉過總結標籤）。' },
          ]} />
        </Section>

        <Section eyebrow="Spec" title="A 的規格（若採用）">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['修改', '點任何標籤（或聚焦後 Enter／Space），標籤變回純文字：沒有外框、沒有底色，字的大小、位置和標籤裡的字相同，游標在字的最後面，寬度跟著字變長。內容是原本輸入的值（例如 NT 帳號，不是姓名）。'],
            ['結束修改', 'Enter 或點別處：重新比對，變回標籤；Esc：取消修改；把字刪光再結束：移除這一筆。'],
            ['順序', '貼上、Enter、逗號把新的值加進來時，整份名單重新整理一次：紅色在前、灰色在後（各自保持輸入順序）。修改、移除不重新整理。'],
            ['修好之後', '標籤留在原地，變成灰色，外圍閃一下綠框（約 1.5 秒）。改了還是找不到：仍是紅色、留在原地，原因更新。'],
            ['說明文字', '不變：{n} valid audiences. Click a tag to edit it.'],
          ]} />
        </Section>

        <Section eyebrow="Phone" title="Phone numbers 加地區">
          <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
            ['地區', 'Data type 選 Phone numbers 時，旁邊多一個 Region 選單：TW +886（預設）、US +1、JP +81、CN +86，和收件人搜尋的地區一樣。'],
            ['沒有 + 的號碼', '照選的地區檢查與存放（TW 0912-345-678；其他寫成 +國碼）。'],
            ['有 + 的號碼', '用號碼自己的國碼，不管選了哪個地區（同一份名單可以混不同地區）；不是這四個國碼的，紅色標籤，原因 Only TW, US, JP and CN numbers。'],
            ['員工號碼', '台灣號碼是員工的公務或私人手機時，加入那位員工（灰色標籤是姓名）。'],
          ]} />
          <Notes items={[{ title: '試試', body: '在任一個示範把 Data type 換成 Phone numbers，再按 Paste a sample list：有台灣員工號碼、外部台灣號碼、美日中各一個、一個太短、一個英國號碼。' }]} />
        </Section>
      </main>
    </>
  )
}
