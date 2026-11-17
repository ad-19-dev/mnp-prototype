// Batch import (2026-11-17: the "verify on Add" compromise, replacing B+), shared by the send flow (and the Detail
// modal's audience) and the Audience group editor.
//   1. Choose the data type and paste or type the list. While typing, a count of the entries in the right format (not
//      looked up yet): "There are {n} valid audiences in total." Footer: Cancel, Add {n} audiences.
//   2. Add: the server looks every entry up (spinner on Add; Cancel, Add and the list disabled). All found → added.
//   3. Some not found → a second dialog "Save without invalid audiences?": the counts, and a DS Alert (warning) holding
//      each invalid entry as a field (error) with its reason, to fix in place. Footer: Cancel (back to the list),
//      Check again (looks only those up again; all found → added), Proceed (danger: adds the valid ones only).
//   Entries already added, or twice in the list, are left out quietly.
import * as React from 'react'
import { Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea } from '@qijenchen/design-system'
import { EMAIL_RE, matchAs, splitTokens, type ListKind, type Match, type Tag } from '../lib/data'
import { L, tx } from '../lib/i18n'
import { FormField, ListKindField, listKindExample } from './ui'

export type ImportOk = { i: number; v: string; mm: Match; tag: Tag }
type Opts = { allowExt?: boolean; noExtEmail?: boolean; noExtPhone?: boolean }
type Bad = { v: string; why: string }

// a format check only (no lookup), so the count can follow the typing
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

// noun: what is added ('audience' in the send flow, 'member' in a group); has: already added
export function BatchImportDialog({ open, onClose, onAdd, has, opts, noun = 'audience' }: {
  open: boolean; onClose: () => void; onAdd: (ok: ImportOk[], fixLeft: number) => void; has: (key: string) => boolean; opts: Opts; noun?: 'audience' | 'member'
}) {
  const [kind, setKind] = React.useState<ListKind | null>(null), [text, setText] = React.useState('')
  const [busy, setBusy] = React.useState(false), [busy2, setBusy2] = React.useState(false)
  const [check, setCheck] = React.useState<{ ok: ImportOk[]; bad: Bad[] } | null>(null)
  React.useEffect(() => { if (open) { setKind(null); setText(''); setBusy(false); setBusy2(false); setCheck(null) } }, [open])
  const word = (n: number) => (noun === 'member' ? L(n === 1 ? 'member' : 'members', '位成員') : L(n === 1 ? 'audience' : 'audiences', '位收件人'))
  const are = (n: number) => (n === 1 ? 'is' : 'are')
  // unique entries that look right for the data type
  const entries = Array.from(new Set(splitTokens(text).map(x => x.trim()).filter(Boolean)))
  const n = kind ? entries.filter(v => formatOk(kind, v)).length : 0
  // the "API": looks entries up (the prototype's matching); seen: keys already valid
  const lookup = (list: string[], seen: Record<string, boolean>) => {
    const ok: ImportOk[] = [], bad: Bad[] = []
    list.forEach((v, i) => {
      const mm = matchAs(v, kind!, opts)
      if (mm.kind === 'one' || mm.kind === 'org' || mm.kind === 'ext') {
        const tag: Tag = mm.kind === 'one' ? { key: 'p:' + mm.p.id, type: 'person', id: mm.p.id } : mm.kind === 'org' ? { key: 'o:' + mm.org.code, type: 'org', id: mm.org.code } : { key: 'e:' + mm.email, type: 'ext', email: mm.email }
        if (seen[tag.key] || has(tag.key)) return
        seen[tag.key] = true; ok.push({ i, v, mm, tag })
      } else bad.push({ v, why: mm.kind === 'miss' ? mm.why : 'More than one match' })
    })
    return { ok, bad }
  }
  const add = () => {
    if (!kind) return
    setBusy(true)
    setTimeout(() => {
      const r = lookup(entries, {})
      setBusy(false)
      if (!r.bad.length) { onAdd(r.ok, 0); return }
      setCheck(r)
    }, 1200)
  }
  // look the edited ones up again; what's found joins the valid ones; all found → added
  const recheck = () => {
    if (!check) return
    setBusy2(true)
    setTimeout(() => {
      const seen: Record<string, boolean> = {}
      check.ok.forEach(x => { seen[x.tag.key] = true })
      const r = lookup(check.bad.map(b => b.v), seen), ok = check.ok.concat(r.ok)
      setBusy2(false)
      if (!r.bad.length) { setCheck(null); onAdd(ok, 0); return }
      setCheck({ ok, bad: r.bad })
    }, 900)
  }
  const nv = check ? check.ok.length : 0, nb = check ? check.bad.length : 0
  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose() }}>
        {open ? (
          <DialogContent maxWidth={720} height="hug">
            <DialogHeader><DialogTitle>{L('Batch import', '批次匯入')}</DialogTitle><DialogDescription className="sr-only">{L('Batch import', '批次匯入')}</DialogDescription></DialogHeader>
            <DialogBody>
              <div className="flex flex-col gap-[var(--layout-space-tight)]">
                <ListKindField id="imp-kind" value={kind} onChange={setKind} />
                <FormField id="imp-text" label={L('List', '名單')} hint={L('Separate with commas or new lines.', '用逗號或換行分隔。')}>
                  <Textarea id="imp-text" rows={8} value={text} disabled={!kind || busy} onChange={e => setText(e.target.value)}
                    placeholder={kind ? L('e.g. ', '例如：') + listKindExample(kind) : L('Choose a data type first', '請先選擇資料類型')} />
                </FormField>
                {/* the count follows the typing: entries in the right format (not yet looked up) */}
                {kind && entries.length ? <span className="text-body text-fg-secondary" aria-live="polite">{L('There ' + are(n) + ' ', '共 ')}<span className="font-medium tabular-nums text-foreground">{n}</span>{L(' valid ' + word(n) + ' in total.', ' ' + word(n) + '格式正確。')}</span> : null}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="tertiary" disabled={busy} onClick={onClose}>{L('Cancel', '取消')}</Button>
              {/* while the server checks: a spinner, and both buttons disabled */}
              <Button variant="primary" loading={busy} disabled={!n || busy} onClick={add}>{L('Add ' + n + ' ' + word(n), '加入 ' + n + ' ' + word(n))}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      {/* second level: some entries weren't found; fix them here, or save without them */}
      <Dialog open={!!check} onOpenChange={o => { if (!o && !busy2) setCheck(null) }}>
        {check ? (
          <DialogContent maxWidth={640} height="hug">
            <DialogHeader><DialogTitle>{noun === 'member' ? L('Save without invalid members?', '不含無效的成員，直接儲存？') : L('Save without invalid audiences?', '不含無效的收件人，直接儲存？')}</DialogTitle><DialogDescription className="sr-only">{L('Some entries are invalid', '有些項目無效')}</DialogDescription></DialogHeader>
            <DialogBody>
              <div className="flex flex-col gap-[var(--layout-space-tight)]">
                <p className="text-body">{L('There ' + are(nv) + ' ' + nv + ' valid and ' + nb + ' invalid ' + word(nb) + '. Are you sure you want to save without the invalid ' + word(nb) + '?', nv + ' 筆有效、' + nb + ' 筆無效。確定要不含無效的' + word(nb) + '直接儲存嗎？')}</p>
                {/* the DS Alert (inline, warning): each invalid entry as a field, with its reason on the right */}
                <Alert variant="warning" title={noun === 'member' ? L('Invalid members listed below:', '以下是無效的成員：') : L('Invalid audiences listed below:', '以下是無效的收件人：')} description={
                  <div className="mt-1 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                    {check.bad.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-56 shrink-0"><Input size="sm" error disabled={busy2} aria-label={L('Fix ', '修正 ') + b.v} value={b.v} onChange={e => { const v = e.target.value; setCheck(c => c && { ...c, bad: c.bad.map((x, j) => (j === i ? { ...x, v } : x)) }) }} /></div>
                        <span className="min-w-0 flex-1 truncate text-right text-error-text">{tx(b.why)}</span>
                      </div>
                    ))}
                  </div>
                } />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="tertiary" disabled={busy2} onClick={() => setCheck(null)}>{L('Cancel', '取消')}</Button>
              <Button variant="secondary" loading={busy2} disabled={busy2} onClick={recheck}>{L('Check again', '重新驗證')}</Button>
              {/* adds the valid ones only and closes both dialogs */}
              <Button variant="primary" danger disabled={busy2} onClick={() => { const c = check; setCheck(null); onAdd(c.ok, c.bad.length) }}>{L('Proceed', '繼續')}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
