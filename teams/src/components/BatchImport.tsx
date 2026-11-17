// Batch import (B+, 2026-11-16), shared by the send flow (and the Detail modal's audience) and the Audience group editor
// (2026-11-16: groups add members the same way as New message). One step, no second "match" page: choose the data
// type, paste a list (a column from Excel works) or type and press Enter; every entry is matched as it comes in.
// Below the paste box: "{n} to fix" (each entry as an editable field, with why it wasn't found, and ✕ to leave it out)
// and "{m} valid ..." (names only, each with an always-visible ✕). Entries already added, or twice in the list, are
// left out quietly ("n duplicates left out"). Footer: Clear all (left, tertiary), Cancel, Add {m} ... (adds what's
// valid and closes; whatever is still to fix isn't added).
import * as React from 'react'
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea } from '@qijenchen/design-system'
import { Building2, Mail, Phone, X } from 'lucide-react'
import { matchAs, splitTokens, type ListKind, type Match, type Tag } from '../lib/data'
import { L, P, tx } from '../lib/i18n'
import { FormField, ListKindField, PAvatar, listKindExample } from './ui'

export type ImportOk = { i: number; v: string; mm: Match; tag: Tag }
type Opts = { allowExt?: boolean; noExtEmail?: boolean; noExtPhone?: boolean }

// noun: what is added ('audience' in the send flow, 'member' in a group); has: already added
export function BatchImportDialog({ open, onClose, onAdd, has, opts, noun = 'audience' }: {
  open: boolean; onClose: () => void; onAdd: (ok: ImportOk[], fixLeft: number) => void; has: (key: string) => boolean; opts: Opts; noun?: 'audience' | 'member'
}) {
  const [kind, setKind] = React.useState<ListKind | null>(null), [text, setText] = React.useState(''), [vals, setVals] = React.useState<string[]>([])
  const [all, setAll] = React.useState(false)
  React.useEffect(() => { if (open) { setKind(null); setText(''); setVals([]); setAll(false) } }, [open])
  // each entry: to fix (not found, with why), valid (a tag to add), or a duplicate (left out without a row)
  const fix: { i: number; v: string; why: string }[] = [], ok: ImportOk[] = [], seen: Record<string, boolean> = {}
  let dup = 0
  if (kind) vals.forEach((v, i) => {
    const mm = matchAs(v, kind, opts)
    if (mm.kind === 'one' || mm.kind === 'org' || mm.kind === 'ext') {
      const tag: Tag = mm.kind === 'one' ? { key: 'p:' + mm.p.id, type: 'person', id: mm.p.id } : mm.kind === 'org' ? { key: 'o:' + mm.org.code, type: 'org', id: mm.org.code } : { key: 'e:' + mm.email, type: 'ext', email: mm.email }
      if (has(tag.key) || seen[tag.key]) { dup++; return }
      seen[tag.key] = true
      ok.push({ i, v, mm, tag })
    } else fix.push({ i, v, why: mm.kind === 'miss' ? mm.why : 'More than one match' })
  })
  const n = ok.length, some = vals.length > 0, shown = all ? ok : ok.slice(0, 12)
  const take = (t: string) => { if (!kind) return; const l = splitTokens(t); if (l.length) setVals(x => x.concat(l)); setText('') }
  const drop = (i: number) => setVals(x => x.filter((_, j) => j !== i))
  const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="text-h6 font-medium">{children}</h3>
  const valid = noun === 'member' ? L(P(n, 'valid member', '', 'valid members'), n + ' 位有效成員') : L(P(n, 'valid audience', '', 'valid audiences'), n + ' 位有效收件人')
  const addLabel = n ? (noun === 'member' ? L('Add ', '加入 ') + P(n, 'member', '人') : L('Add ', '加入 ') + P(n, 'audience', '位收件人')) : noun === 'member' ? L('Add members', '加入成員') : L('Add audiences', '加入收件人')
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={720} height="hug">
          <DialogHeader><DialogTitle>{L('Batch import', '批次匯入')}</DialogTitle><DialogDescription className="sr-only">{L('Batch import', '批次匯入')}</DialogDescription></DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              {/* changing the type matches what's already in again */}
              <ListKindField id="imp-kind" value={kind} onChange={setKind} />
              {/* big before anything is in, a slim "add more" box after; a paste is taken in at once (line breaks
                  kept), typing on Enter */}
              <FormField id="imp-text" label={L('List', '名單')} hint={some ? undefined : L('Separate with commas or new lines. A column copied from Excel works too.', '用逗號或換行分隔；也可以直接貼上從 Excel 複製的一欄。')}>
                <Textarea id="imp-text" rows={some ? 2 : 6} value={text} disabled={!kind}
                  placeholder={!kind ? L('Choose a data type first', '請先選擇資料類型') : some ? L('Paste or type more, then press Enter', '貼上或輸入更多，按 Enter 加入') : L('e.g. ', '例如：') + listKindExample(kind)}
                  onChange={ev => setText(ev.target.value)}
                  onPaste={ev => { ev.preventDefault(); take(text + ev.clipboardData.getData('text')) }}
                  onKeyDown={ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); take(text) } }} />
              </FormField>
              {fix.length ? (
                <section className="flex flex-col gap-2 pt-[var(--layout-space-tight)]">
                  <H3>{L(fix.length + ' to fix', fix.length + ' 筆要修正')}</H3>
                  <div className="flex flex-col gap-1.5">
                    {fix.map(x => (
                      <div key={x.i} className="flex items-center gap-2">
                        <div className="w-60 shrink-0"><Input size="sm" error aria-label={L('Fix ', '修正 ') + x.v} value={x.v} onChange={ev => { const v = ev.target.value; setVals(l => l.map((y, j) => (j === x.i ? v : y))) }} /></div>
                        <span className="min-w-0 flex-1 truncate text-caption text-error-text">{tx(x.why)}</span>
                        <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={L('Leave out ', '不加入 ') + x.v} onClick={() => drop(x.i)} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              {n || dup ? (
                <section className="flex flex-col gap-2 pt-[var(--layout-space-tight)]">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <H3>{valid}</H3>
                    {dup ? <span className="text-caption text-fg-secondary">{L(dup === 1 ? '1 duplicate left out' : dup + ' duplicates left out', '已略過 ' + dup + ' 筆重複')}</span> : null}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {shown.map(x => {
                      const mm = x.mm
                      return (
                        <span key={x.i} className="inline-flex items-center gap-1.5 rounded-md border border-divider bg-[var(--color-neutral-1)] py-0.5 pr-1 pl-1.5 text-body">
                          {mm.kind === 'one' ? <PAvatar p={mm.p} size={20} /> : React.createElement(mm.kind === 'org' ? Building2 : x.tag.email && x.tag.email.indexOf('@') < 0 ? Phone : Mail, { className: 'size-4 text-fg-secondary', 'aria-hidden': true })}
                          {mm.kind === 'one' ? mm.p.en + ' ' + mm.p.zh : mm.kind === 'org' ? mm.org.code : x.tag.email}
                          <button type="button" aria-label={L('Remove ', '移除 ') + x.v} className="rounded-sm text-fg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={() => drop(x.i)}><X className="size-3.5" /></button>
                        </span>
                      )
                    })}
                    {ok.length > shown.length ? <Button variant="link" size="sm" className="!h-auto !p-0" onClick={() => setAll(true)}>{L('+' + (ok.length - shown.length) + ' more', '還有 ' + (ok.length - shown.length) + ' 位')}</Button> : null}
                  </div>
                </section>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="tertiary" className="mr-auto" disabled={!some && !text} onClick={() => { setVals([]); setText('') }}>{L('Clear all', '全部清除')}</Button>
            <Button variant="tertiary" onClick={onClose}>{L('Cancel', '取消')}</Button>
            <Button variant="primary" disabled={!n} onClick={() => onAdd(ok, fix.length)}>{addLabel}</Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
