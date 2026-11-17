// Batch import, two ways side by side (2026-11-17); nothing here changes the prototype.
//   Now (B+): matched as each entry comes in; to fix and valid are listed in the same dialog before adding.
//   New (verify on Add): type and paste; a format-only count while typing; on Add the server checks everything
//   (spinner); all good → added; any invalid → a second dialog lists them and Proceed saves only the valid ones.
// Both are live, with the prototype's sample people and matching rules.
import * as React from 'react'
import {
  Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Tag, Textarea,
} from '@qijenchen/design-system'
import { Building2, Mail, Phone, Upload, X } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { FormField, ListKindField, PAvatar, listKindExample } from '../../components/ui'
import { BatchImportDialog } from '../../components/BatchImport'
import { EMAIL_RE, PMAP, matchAs, splitTokens, type ListKind, type Tag as RTag } from '../../lib/data'

// ---------- what each demo has added so far (a stand-in for the audience table) ----------
function Added({ tags, onClear }: { tags: RTag[]; onClear: () => void }) {
  if (!tags.length) return <span className="text-caption text-fg-secondary">Nothing added yet.</span>
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-body font-medium">Audience ({tags.length})<Button variant="link" size="sm" className="!h-auto !p-0" onClick={onClear}>Clear</Button></span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => {
          const p = t.type === 'person' ? PMAP[t.id!] : null
          return <span key={t.key} className="inline-flex items-center gap-1.5 rounded-md border border-divider bg-[var(--color-neutral-1)] px-1.5 py-0.5 text-body">
            {p ? <PAvatar p={p} size={20} /> : React.createElement(t.type === 'org' ? Building2 : (t.email || '').indexOf('@') < 0 ? Phone : Mail, { className: 'size-4 text-fg-secondary', 'aria-hidden': true })}
            {p ? p.en + ' ' + p.zh : t.type === 'org' ? t.id : t.email}
          </span>
        })}
      </div>
    </div>
  )
}

// ---------- the new version ----------
// a format check only (no lookup), so the count can follow the typing; the lookup happens on Add
function formatOk(kind: ListKind, v: string) {
  const t = v.trim(), d = t.replace(/\D/g, '')
  if (kind === 'nt') return /^[a-z][a-z0-9._-]{1,19}$/i.test(t)
  if (kind === 'emp') return /^\d{6}$/.test(t)
  if (kind === 'mvpn') return /^\d{7}$/.test(t)
  if (kind === 'email') return EMAIL_RE.test(t)
  if (kind === 'phone') return /^[\d\s+()-]+$/.test(t) && d.length >= 8 && d.length <= 15
  if (kind === 'org') return /^[A-Za-z0-9/]{2,12}$/.test(t)
  return !!t
}
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

function VerifyImport({ open, onClose, onAdd, has }: { open: boolean; onClose: () => void; onAdd: (tags: RTag[]) => void; has: (key: string) => boolean }) {
  const [kind, setKind] = React.useState<ListKind | null>(null), [text, setText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [check, setCheck] = React.useState<{ ok: RTag[]; bad: { v: string; why: string }[] } | null>(null)
  React.useEffect(() => { if (open) { setKind(null); setText(''); setBusy(false); setCheck(null) } }, [open])
  // unique entries that look right for the data type
  const entries = Array.from(new Set(splitTokens(text).map(x => x.trim()).filter(Boolean)))
  const n = kind ? entries.filter(v => formatOk(kind, v)).length : 0
  // Add: the "API" checks every entry (the prototype's matching), after a short wait
  const add = () => {
    if (!kind) return
    setBusy(true)
    setTimeout(() => {
      const ok: RTag[] = [], bad: { v: string; why: string }[] = [], seen: Record<string, boolean> = {}
      entries.forEach(v => {
        const mm = matchAs(v, kind, { allowExt: true })
        if (mm.kind === 'one' || mm.kind === 'org' || mm.kind === 'ext') {
          const tag: RTag = mm.kind === 'one' ? { key: 'p:' + mm.p.id, type: 'person', id: mm.p.id } : mm.kind === 'org' ? { key: 'o:' + mm.org.code, type: 'org', id: mm.org.code } : { key: 'e:' + mm.email, type: 'ext', email: mm.email }
          if (seen[tag.key] || has(tag.key)) return
          seen[tag.key] = true; ok.push(tag)
        } else bad.push({ v, why: mm.kind === 'miss' ? mm.why : 'More than one match' })
      })
      setBusy(false)
      if (!bad.length) { onAdd(ok); return }
      setCheck({ ok, bad })
    }, 1400)
  }
  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose() }}>
        {open ? (
          <DialogContent maxWidth={720} height="hug">
            <DialogHeader><DialogTitle>Batch import</DialogTitle><DialogDescription className="sr-only">Batch import</DialogDescription></DialogHeader>
            <DialogBody>
              <div className="flex flex-col gap-[var(--layout-space-tight)]">
                <ListKindField id="vi-kind" value={kind} onChange={setKind} />
                <FormField id="vi-text" label="List" hint="Separate with commas or new lines.">
                  <Textarea id="vi-text" rows={8} className="font-mono" value={text} disabled={!kind || busy} onChange={e => setText(e.target.value)}
                    placeholder={kind ? 'e.g. ' + listKindExample(kind) : 'Choose a data type first'} />
                </FormField>
                {/* the count follows the typing: entries in the right format (not yet looked up) */}
                {kind && entries.length ? <span className="text-body text-fg-secondary" aria-live="polite">There {plural(n, 'is', 'are')} <span className="tabular-nums font-medium text-foreground">{n}</span> valid {plural(n, 'audience', 'audiences')} in total.</span> : null}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="tertiary" disabled={busy} onClick={onClose}>Cancel</Button>
              {/* while the server checks: a spinner, and both buttons disabled */}
              <Button variant="primary" loading={busy} disabled={!n || busy} onClick={add}>{'Add ' + n + ' ' + plural(n, 'audience', 'audiences')}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      {/* second level: some entries weren't found */}
      <Dialog open={!!check} onOpenChange={o => { if (!o) setCheck(null) }}>
        {check ? (
          <DialogContent maxWidth={560} height="hug">
            <DialogHeader><DialogTitle>Save without invalid audiences?</DialogTitle><DialogDescription className="sr-only">Some entries are invalid</DialogDescription></DialogHeader>
            <DialogBody>
              <div className="flex flex-col gap-[var(--layout-space-tight)]">
                <p className="text-body">There {plural(check.ok.length, 'is', 'are')} {check.ok.length} valid and {check.bad.length} invalid {plural(check.bad.length, 'audience', 'audiences')}. Are you sure you want to save without the invalid {plural(check.bad.length, 'audience', 'audiences')}?</p>
                {/* the invalid ones in a warning-framed box: value on the left, reason on the right, no header */}
                <div className="flex flex-col gap-2 rounded-md border border-[var(--warning-text)] bg-warning-subtle/40 p-3">
                  <span className="text-body font-medium">Invalid audiences listed below:</span>
                  <ul className="flex max-h-56 flex-col overflow-y-auto">
                    {check.bad.map((b, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 border-t border-divider py-1.5 first:border-t-0">
                        <span className="min-w-0 truncate font-mono text-body">{b.v}</span>
                        <span className="shrink-0 text-caption text-error-text">{b.why}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="tertiary" onClick={() => setCheck(null)}>Cancel</Button>
              {/* saves only the valid ones and closes both dialogs */}
              <Button variant="primary" danger onClick={() => { const ok = check.ok; setCheck(null); onAdd(ok) }}>Proceed</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}

// ---------- a demo: a button that opens the dialog, and what was added ----------
function Demo({ which }: { which: 'now' | 'new' }) {
  const [open, setOpen] = React.useState(false), [tags, setTags] = React.useState<RTag[]>([]), [note, setNote] = React.useState('')
  const has = (key: string) => tags.some(t => t.key === key)
  const done = (add: RTag[], left = 0) => { setTags(l => l.concat(add)); setOpen(false); setNote('Added ' + add.length + ' ' + plural(add.length, 'audience', 'audiences') + (left ? ' · ' + left + ' not added' : '')) }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-divider bg-surface p-[var(--layout-space-loose)]">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="tertiary" startIcon={Upload} onClick={() => { setNote(''); setOpen(true) }}>Batch import</Button>
        {note ? <span className="inline-flex items-center gap-1 text-caption text-success-text">{note}<button type="button" aria-label="Dismiss" className="text-fg-muted" onClick={() => setNote('')}><X className="size-3.5" /></button></span> : null}
      </div>
      <Added tags={tags} onClear={() => setTags([])} />
      {which === 'now'
        ? <BatchImportDialog open={open} onClose={() => setOpen(false)} has={has} opts={{ allowExt: true }} onAdd={(ok, left) => done(ok.map(x => x.tag), left)} />
        : <VerifyImport open={open} onClose={() => setOpen(false)} has={has} onAdd={ok => done(ok)} />}
    </div>
  )
}

const SAMPLE = 'gywu, cmchen, ytchang, celee\nsywangd, psyang, a19999, gywuu, cmchen'

export default function ImportVerify() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Batch import · 比較</span>
          <h1 className="spec-h1">批次匯入：現在的做法與「按 Add 再驗證」</h1>
          <span className="text-caption text-fg-secondary">2026/11/17 · 兩個版本都可以直接操作（按 Batch import 開啟），用的是原型的範例資料與比對規則；不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Try" title="直接試試" lead={<>兩邊都選 <b>NT accounts</b>，貼上同一段名單：<code className="font-mono">{SAMPLE.replace('\n', ', ')}</code>（a19999、gywuu 找不到；cmchen 重複）。</>}>
          <div className="grid gap-[var(--layout-space-loose)] lg:grid-cols-2">
            <div className="flex flex-col gap-2"><span className="flex items-center gap-2"><b className="text-body">現在（B+）</b><Tag size="sm" color="neutral">原型目前的做法</Tag></span><span className="text-caption text-fg-secondary">貼上就比對；要修正的、有效的分開列在同一個對話框，按 Add 只加入有效的。</span><Demo which="now" /></div>
            <div className="flex flex-col gap-2"><span className="flex items-center gap-2"><b className="text-body">新版（按 Add 再驗證）</b><Tag size="sm" color="blue">本次提案</Tag></span><span className="text-caption text-fg-secondary">輸入時只算格式正確的數量；按 Add 才向伺服器驗證，有無效的才跳第二層確認。</span><Demo which="new" /></div>
          </div>
        </Section>

        <Section eyebrow="New" title="新版的流程" lead="三個畫面：主彈窗、驗證中、二次確認。">
          <SpecTable head={['步驟', '畫面', '規格']} nowrap={[0, 1]} rows={[
            ['1', '主彈窗', <>Data type（必填）與 List。輸入時即時計算「格式正確、不重複」的數量（還沒查資料），下方提示 <code>There are {'{n}'} valid audiences in total.</code>。Footer：Cancel、<code>Add {'{n}'} audiences</code>（n 為 0 時停用）。</>],
            ['2', '驗證中', <>按 Add 後呼叫 API 驗證全部的值：主要按鈕顯示轉圈（DS Button loading），Cancel 與主要按鈕都停用、清單不能改。全部有效：直接加入並關閉。</>],
            ['3', '二次確認', <>有無效的值時開第二層彈窗。標題 <code>Save without invalid audiences?</code>，右上角關閉。內文 <code>There are {'{v}'} valid and {'{i}'} invalid audiences. Are you sure you want to save without the invalid audiences?</code>。黃色外框的清單框，標題 <code>Invalid audiences listed below:</code>，每列左邊是值、右邊是原因（紅字），沒有表頭，超過約 8 列時框內捲動。Footer：Cancel（回到主彈窗，可修改清單）、Proceed（danger，只存有效的並關閉所有彈窗）。</>],
          ]} />
          <Notes items={[
            { title: '文案小修正', body: '依英文文法加了複數（audiences），單數時自動變成 is / audience；標題的「Sace」應為「Save」，已修正。' },
            { title: '「有效數量」的意思', body: '主彈窗的數字只檢查格式（例如工號是 6 碼），不知道人存不存在；真正的有效數量要按 Add 驗證後才知道，所以二次確認裡的 valid 可能比主彈窗的少（範例：主彈窗 8，驗證後 6 valid、2 invalid）。' },
          ]} />
        </Section>

        <Section eyebrow="Compare" title="比較">
          <SpecTable head={['', '現在（B+）', '新版（按 Add 再驗證）']} nowrap={[0]} rows={[
            ['什麼時候知道哪些無效', '貼上當下，每一筆都看得到', '按 Add 之後'],
            ['數字準不準', '準：顯示的就是查到的', '主彈窗只是格式正確的數量，驗證後可能變少'],
            ['修正無效的值', '在原地直接改，改完立刻重新比對', '在二次確認按 Cancel 回主彈窗，在整段文字裡找出來改，再按一次 Add'],
            ['畫面數', '1', '2（加上驗證中）'],
            ['大量名單（幾千筆）', '邊貼邊查，伺服器負擔大，畫面上的清單很長', '一次送出驗證，畫面簡單；只列無效的'],
            ['被誤加的風險', '低：加入前就看到名單', '低：有無效的一定會停下來確認'],
            ['開發', '需要即時比對 API 與較多畫面狀態', '一支驗證 API、一個確認彈窗，較單純'],
          ]} />
          <Notes items={[
            { title: '新版適合', body: '名單多半是從系統匯出、大多正確，使用者只想快速貼上送出；伺服器不方便逐筆即時查詢。' },
            { title: '現在的做法適合', body: '名單常有打錯、需要邊看邊修；使用者想在加入前確認是誰（看得到姓名與大頭照）。' },
            { title: '可以考慮的折衷', body: '採用新版流程，但在二次確認的無效清單裡讓每一列可以直接修改後重新驗證，就不用回主彈窗在整段文字裡找。' },
          ]} />
        </Section>
      </main>
    </>
  )
}
