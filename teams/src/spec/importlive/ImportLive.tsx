// Proposals for PM: batch import without a second "match" page. Whatever is pasted is matched right away, each entry
// shows whether it was found (and why not), and failures are fixed in place. Three options, all live with the same
// matching rules and sample data; nothing here changes the prototype.
import * as React from 'react'
import { Button, Select, Tag, Textarea, Input, Tooltip, TooltipContent, TooltipTrigger, cn } from '@qijenchen/design-system'
import { X } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { PAvatar } from '../../components/ui'
import { DOMAIN, EMAIL_RE, PEOPLE, type Person } from '../../lib/data'

// ---------- matching (the same for every option) ----------
type Kind = 'nt' | 'emp' | 'email' | 'phone'
const KINDS: { k: Kind; label: string; sample: string }[] = [
  { k: 'nt', label: 'NT accounts', sample: 'gywu, cmchen, kylin\nchlinb, gywuu, a19999, cmchen' },
  { k: 'emp', label: 'Employee IDs', sample: '120588, 103217, 118842\n121905, 999999, 12345' },
  { k: 'email', label: 'Emails', sample: 'gywu@' + DOMAIN + ', cmchen@' + DOMAIN + '\namy@vendor-example.com, nobody@' + DOMAIN + ', amy@vendor' },
  { k: 'phone', label: 'Phone numbers', sample: '0918226588, 0912337415\n0987654321, 091234' },
]
type Hit = { v: string; p?: Person; ext?: 'phone' | 'email'; err?: string; dup?: boolean }
const PPL = PEOPLE.filter(p => !p.extKind)
const digits = (s: string) => s.replace(/\D/g, '').replace(/^886/, '0')
function match(kind: Kind, raw: string): Hit {
  const v = raw.trim()
  if (kind === 'nt') { const p = PPL.find(x => x.nt.toLowerCase() === v.toLowerCase()); return p ? { v, p } : { v, err: 'No employee with this NT account' } }
  if (kind === 'emp') {
    if (!/^\d{6}$/.test(v)) return { v, err: 'Employee IDs have 6 digits' }
    const p = PPL.find(x => x.emp === v); return p ? { v, p } : { v, err: 'No employee with this ID' }
  }
  if (kind === 'email') {
    if (!EMAIL_RE.test(v)) return { v, err: 'Not a complete email address' }
    if (v.toLowerCase().endsWith('@' + DOMAIN)) { const p = PPL.find(x => x.nt + '@' + DOMAIN === v.toLowerCase()); return p ? { v, p } : { v, err: 'No employee with this address' } }
    return { v, ext: 'email' }
  }
  const d = digits(v)
  if (!/^09\d{8}$/.test(d)) return { v, err: 'Mobile numbers have 10 digits, starting with 09' }
  const p = PPL.find(x => x.co === d || x.pp === d); return p ? { v, p } : { v, ext: 'phone' }
}
const split = (t: string) => t.split(/[\n,，;；\t]+/).map(x => x.trim()).filter(Boolean)
// the same person twice in one list: the later one is marked as a duplicate and isn't added again
function matchAll(kind: Kind, list: string[]): Hit[] {
  const seen: Record<string, boolean> = {}
  return list.map(v => { const h = match(kind, v), key = h.p ? h.p.id : h.ext ? h.v.toLowerCase() : ''; if (key && seen[key]) return { ...h, dup: true }; if (key) seen[key] = true; return h })
}
const ok = (h: Hit) => !h.err && !h.dup
const okLabel = (h: Hit) => (h.p ? h.p.en + ' ' + h.p.zh : h.ext === 'phone' ? 'External phone' : 'External email')

// the import dialog's frame (the real one is a DS Dialog); the footer adds only what was found
function Frame({ kind, setKind, children, foot }: { kind: Kind; setKind: (k: Kind) => void; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="flex max-w-[760px] flex-col overflow-hidden rounded-lg border border-divider bg-surface shadow-sm">
      <div className="border-b border-divider px-[var(--layout-space-loose)] py-3 text-h6 font-semibold">Batch import</div>
      <div className="flex flex-col gap-[var(--layout-space-tight)] p-[var(--layout-space-loose)]">
        <div className="flex items-center gap-3"><span className="text-body font-medium">Data type</span><div className="w-48"><Select size="sm" aria-label="Data type" value={kind} onChange={v => setKind(v as Kind)} options={KINDS.map(k => ({ value: k.k, label: k.label }))} /></div></div>
        {children}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-divider px-[var(--layout-space-loose)] py-3">{foot}</div>
    </div>
  )
}
const Summary = ({ hits }: { hits: Hit[] }) => {
  const n = hits.filter(ok).length, bad = hits.filter(h => h.err).length, dup = hits.filter(h => h.dup).length
  return <span className="mr-auto flex flex-wrap gap-2 text-caption">{n ? <Tag size="sm" color="green">{n} found</Tag> : null}{bad ? <Tag size="sm" color="red">{bad} not found</Tag> : null}{dup ? <Tag size="sm" color="neutral">{dup} duplicate</Tag> : null}</span>
}
// prototype: instead of closing the dialog, say what would have been added
function useAdded() { const [n, setN] = React.useState<number | null>(null); return { note: n === null ? null : <span className="text-caption text-success-text">Would add {n} to the audience table and close.</span>, add: (k: number) => setN(k) } }

// ---------- A: tags, like an email "To" field ----------
function OptA() {
  const done = useAdded()
  const [kind, setKind] = React.useState<Kind>('nt'), [vals, setVals] = React.useState<string[]>(split(KINDS[0].sample)), [draft, setDraft] = React.useState('')
  const [edit, setEdit] = React.useState<{ i: number; v: string } | null>(null)
  const hits = matchAll(kind, vals)
  const commit = (t: string) => { const l = split(t); if (l.length) setVals(v => v.concat(l)); setDraft('') }
  return (
    <Frame kind={kind} setKind={k => { setKind(k); setVals(split(KINDS.find(x => x.k === k)!.sample)) }}
      foot={<><Summary hits={hits} /><Button variant="tertiary">Cancel</Button>{done.note}<Button variant="primary" disabled={!hits.filter(ok).length} onClick={() => done.add(hits.filter(ok).length)}>Add {hits.filter(ok).length} audiences</Button></>}>
      <div className="flex min-h-[132px] flex-wrap content-start items-center gap-1.5 rounded-md border border-border p-2">
        {hits.map((h, i) => edit && edit.i === i
          ? <input key={i} autoFocus className="w-40 rounded border border-primary px-1.5 py-0.5 text-body outline-none" value={edit.v} onChange={e => setEdit({ i, v: e.target.value })}
              onBlur={() => { setVals(l => l.map((x, j) => (j === i ? edit.v : x)).filter(Boolean)); setEdit(null) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
          : (
            <Tooltip key={i}><TooltipTrigger asChild>
              <span className={cn('inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-body', ok(h) ? 'bg-neutral-1 border border-divider' : h.dup ? 'bg-neutral-1 text-fg-muted line-through border border-divider' : 'border border-error bg-error-subtle text-error-text cursor-text')}
                onClick={() => (h.err ? setEdit({ i, v: h.v }) : null)}>
                {h.p ? <PAvatar p={h.p} /> : null}<span className="truncate">{ok(h) ? okLabel(h) : h.v}</span>
                <button type="button" aria-label={'Remove ' + h.v} className="text-fg-muted hover:text-foreground" onClick={e => { e.stopPropagation(); setVals(l => l.filter((_, j) => j !== i)) }}><X className="size-3.5" /></button>
              </span>
            </TooltipTrigger><TooltipContent>{h.err ? h.err + ' · click to fix' : h.dup ? 'Already in this list' : h.v}</TooltipContent></Tooltip>
          ))}
        <input className="min-w-[160px] flex-1 px-1 py-0.5 text-body outline-none" placeholder="Paste or type, then Enter" value={draft}
          onChange={e => (/[\n,，;]/.test(e.target.value) ? commit(e.target.value) : setDraft(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(draft) } }}
          onPaste={e => { e.preventDefault(); commit(e.clipboardData.getData('text')) }} />
      </div>
      <span className="text-caption text-fg-secondary">Found entries become gray tags with the person’s name; red tags weren’t found (hover for why, click to fix).</span>
    </Frame>
  )
}

// ---------- B: one row per entry, like a spreadsheet ----------
function OptB() {
  const done = useAdded()
  const [kind, setKind] = React.useState<Kind>('nt'), [vals, setVals] = React.useState<string[]>(split(KINDS[0].sample).concat(['']))
  const hits = matchAll(kind, vals.filter(Boolean))
  let hi = 0
  // a paste is read straight from the clipboard (a one-line field would drop its line breaks): a list of many entries,
  // from Excel, a text file or an email, fills as many rows from this cell down
  const pasteAt = (i: number, text: string) => setVals(l => { const many = split(text); const n = l.slice(); n.splice(i, n[i] ? 0 : 1, ...many); if (n[n.length - 1] !== '') n.push(''); return n })
  const setAt = (i: number, v: string) => setVals(l => { const n = l.slice(); const many = split(v); if (many.length > 1) n.splice(i, 1, ...many); else n[i] = v; if (n[n.length - 1] !== '') n.push(''); return n })
  return (
    <Frame kind={kind} setKind={k => { setKind(k); setVals(split(KINDS.find(x => x.k === k)!.sample).concat([''])) }}
      foot={<><Summary hits={hits} /><Button variant="tertiary">Cancel</Button>{done.note}<Button variant="primary" disabled={!hits.filter(ok).length} onClick={() => done.add(hits.filter(ok).length)}>Add {hits.filter(ok).length} audiences</Button></>}>
      <div className="max-h-[320px] overflow-auto rounded-md border border-divider">
        <table className="w-full border-collapse text-body">
          <thead className="sticky top-0 bg-[var(--color-neutral-1)] text-left text-fg-secondary"><tr><th className="w-10 px-2 py-2 font-normal">#</th><th className="w-[38%] px-2 py-2 font-normal">{KINDS.find(k => k.k === kind)!.label}</th><th className="px-2 py-2 font-normal">Result</th><th className="w-10" /></tr></thead>
          <tbody>
            {vals.map((v, i) => {
              const h = v ? hits[hi++] : null
              return (
                <tr key={i} className="border-t border-divider">
                  <td className="px-2 text-caption tabular-nums text-fg-muted">{i + 1}</td>
                  <td className="px-1 py-1"><Input size="sm" aria-label={'Entry ' + (i + 1)} onPaste={e => { const t = e.clipboardData.getData('text'); if (split(t).length > 1) { e.preventDefault(); pasteAt(i, t) } }} value={v} error={!!(h && h.err)} placeholder={v ? '' : 'Paste or type'} onChange={e => setAt(i, e.target.value)} /></td>
                  <td className="px-2 py-1">{!h ? null : h.err ? <span className="text-error-text">{h.err}</span> : h.dup ? <span className="text-fg-muted">Duplicate · not added again</span>
                    : <span className="flex min-w-0 items-center gap-2">{h.p ? <PAvatar p={h.p} /> : null}<span className="truncate">{okLabel(h)}</span>{h.p ? <span className="text-caption text-fg-secondary">{h.p.org} · {h.p.emp}</span> : null}</span>}</td>
                  <td className="px-1">{v ? <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={'Remove row ' + (i + 1)} onClick={() => setVals(l => l.filter((_, j) => j !== i))} /> : null}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <span className="text-caption text-fg-secondary">Paste a whole list (one per line, or separated by commas, from Excel or anywhere) into any cell: it fills as many rows as it has. The last row is always empty for the next one.</span>
    </Frame>
  )
}

// ---------- C: add what's found right away; only the ones not found stay ----------
function OptC() {
  const [kind, setKind] = React.useState<Kind>('nt'), [text, setText] = React.useState(KINDS[0].sample), [left, setLeft] = React.useState<Hit[] | null>(null), [got, setGot] = React.useState(0)
  const run = (list: string[]) => { const hits = matchAll(kind, list); setGot(g => g + hits.filter(ok).length); setLeft(hits.filter(h => h.err)) }
  return (
    <Frame kind={kind} setKind={k => { setKind(k); setText(KINDS.find(x => x.k === k)!.sample); setLeft(null); setGot(0) }}
      foot={left === null
        ? <><Button variant="tertiary">Cancel</Button><Button variant="primary" disabled={!split(text).length} onClick={() => run(split(text))}>Add</Button></>
        : <><span className="mr-auto text-caption text-fg-secondary">{got} added to the audience</span><Button variant="tertiary" onClick={() => { setLeft(null); setText(''); setGot(0) }}>Done</Button><Button variant="primary" disabled={!left.length} onClick={() => run(left.map(h => h.v))}>Try again</Button></>}>
      {left === null
        ? <Textarea rows={6} className="font-mono" value={text} onChange={e => setText(e.target.value)} aria-label="List" />
        : left.length === 0 ? <span className="text-body text-success-text">All added.</span> : (
          <div className="flex flex-col gap-2">
            <span className="text-body"><Tag size="sm" color="green">{got} added</Tag> These {left.length} weren’t found. Fix them and try again, or leave them out.</span>
            {left.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-56"><Input size="sm" error aria-label={'Fix ' + h.v} value={h.v} onChange={e => setLeft(l => l!.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} /></div>
                <span className="text-caption text-error-text">{h.err}</span>
                <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={'Leave out ' + h.v} onClick={() => setLeft(l => l!.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
        )}
    </Frame>
  )
}

export default function ImportLive() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · New message · 批次匯入 · 提案</span>
          <h1 className="spec-h1">批次匯入提案</h1>
          <span className="text-caption text-fg-secondary">2026/11/12 · PM：不要再進下一層比對頁，貼上後就地看到哪些成功、哪些失敗與原因，失敗的就地修正。三個方案都可以直接操作（貼上、修改、移除、切換資料類型）；不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Rules" title="比對規則（三個方案共用）" lead="範例名單裡刻意放了找不到、格式錯、重複的項目。">
          <SpecTable head={['資料類型', '找得到', '找不到時的原因']} nowrap={[0]} rows={[
            ['NT accounts', '員工', 'No employee with this NT account'],
            ['Employee IDs', '員工', 'Employee IDs have 6 digits；No employee with this ID'],
            ['Emails', '公司信箱是員工；其他網域是外部 Email', 'Not a complete email address；No employee with this address'],
            ['Phone numbers', '員工的公務或私人手機；其他號碼是外部電話', 'Mobile numbers have 10 digits, starting with 09'],
          ]} />
          <Notes items={[{ title: '重複', body: '同一個人在名單裡出現兩次時，後面那筆標成 Duplicate、不重複加入，也不算失敗。' }, { title: '同名同姓', body: '已經拿掉 Names 這個資料類型，所以不會再有「要選是哪一位」的情況。' }]} cols />
        </Section>
        <Section eyebrow="Option A" title="A：標籤（像郵件的收件人欄）" lead="貼上或輸入後按 Enter，每一筆變成一個標籤：找到的是灰色標籤，顯示姓名；找不到的是紅色標籤，滑過看原因，點一下就地修改。">
          <OptA />
          <Notes items={[{ title: '優點', body: '最精簡、大家熟悉（Outlook、Gmail）。一眼看出有幾個紅的。' }, { title: '缺點', body: '原因要滑過才看得到；一次幾百筆時標籤擠成一大片，不好找特定一筆；標籤上看不到原本輸入的值。' }]} cols />
        </Section>
        <Section eyebrow="Option B" title="B：一列一筆（像試算表）" lead="左欄是輸入的值（可以直接改），右欄即時顯示比對結果：姓名與組織、工號，或紅字原因。整份名單（從 Excel 一欄、文字檔或信件複製，換行、逗號或 Tab 分隔都可以）一次貼進任何一格，就會從那一格往下展開成多列。">
          <OptB />
          <Notes items={[{ title: '優點', body: '輸入的值和結果並排，原因直接看得到；筆數多時可以捲動、逐列檢查；修正就是改那一格。' }, { title: '缺點', body: '比 A 佔空間；只想貼兩三個人時顯得有點重。（一次貼整份名單沒問題：貼進任一格就會展開成多列。）' }]} cols />
        </Section>
        <Section eyebrow="Option C" title="C：先把找到的加進去，只留下找不到的" lead="貼上後按 Add：找到的直接加入收件人，對話框只剩找不到的那幾筆，每筆可以改，再按 Try again。">
          <OptC />
          <Notes items={[{ title: '優點', body: '步驟最少；大部分都找得到時，一次就完成。' }, { title: '缺點', body: '加入前看不到「會加入哪些人」；如果貼錯資料類型，會一次加進一堆不對的人，要回到收件人表格逐一刪。' }]} cols />
        </Section>
        <Section eyebrow="Compare" title="比較與建議">
          <SpecTable head={['', '看得到原因', '加入前確認', '大量名單', '修正方式', '空間']} nowrap={[0]} rows={[
            ['A 標籤', '滑過才看到', '可以', '擠', '點標籤改', '小'],
            ['B 一列一筆', '直接看到', '可以', '好（可捲動）', '改那一格', '中'],
            ['C 先加入', '直接看到（只列失敗的）', '不行', '好', '改輸入框再試', '小'],
          ]} />
          <Notes items={[
            { title: '建議：B', body: '批次匯入通常是幾十到幾百筆，而且使用者最在意「哪幾筆有問題、為什麼」。B 讓輸入值、結果與原因並排，修正就是改那一格，不需要第二層頁面。' },
            { title: '名單很短時', body: '收件人搜尋列本身已經能一筆一筆加入；批次匯入是給「手上有一份名單」的情況，所以以 B 的清楚度為優先。' },
          ]} />
        </Section>
      </main>
    </>
  )
}
