// Delivery details (proposal C, 2026-11-12): every message actually sent for one record, one row each, by person
// (orgs and groups expanded). Opened from the Detail modal's "Delivery details" link, and, filtered to Not sent, from every "{n} not sent", in a dialog of its own with the
// full width and height, because one send can reach tens of thousands of people and this is where a sender digs into a
// problem ("did Jason get it?", "why did PENG's SMS fail?").
//   Search: one box, no field to pick first (2026-11-12). Each term is matched against the name, phone or email
//           (part of it), and the employee ID, NT account and job ID (whole); several can be pasted at once,
//           separated by commas or spaces. The server tells the kinds apart (6 digits: employee ID, 12345-000001: job ID...).
//   Filters: Status (with counts) and Channel (Mobile notifications (SMS) only). No Reason filter: a reason only
//           exists on what wasn't sent and already shows under the Not sent tag.
//   Channel: how and where it went, in one column (2026-11-16: Via and Sent to merged): "PNS",
//           "SMS · Company phone", "SMS · Personal phone", "Desktop notifications", "Email". No phone number or address
//           is shown (privacy), only which phone; a number can still be searched for.
//   Not sent: one word everywhere for what didn't go out (no "Failed"); reasons include App unregistered, Service
//           unavailable, Number not in service. A Sent line can carry the carrier's note when it still didn't arrive
//           (Recipient has blocked SMS messages, Message is barred by customer).
//   Still sending: lines not sent yet aren't listed (no Queued status, 2026-11-16).
//   Recipient: the person plus a tag for the phone it went to: Company phone (blue) or Personal phone (purple);
//           PNS always goes to the company phone. Channel: PNS, SMS (fallback), SMS (outside number), Desktop notifications, Email.
//   Resend to not sent (n): in the footer, right of Close, when anyone wasn't reached: everyone with nothing sent (a
//           person whose push failed but whose SMS went out was reached). n counts people, not rows. No Alert.
//   Named Sent details again (2026-11-16).
// No Org column or filter, no export (2026-11-12).
import * as React from 'react'
import {
  Button, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Empty, Input, Pagination, PersonDisplay, Select, Tag as DsTag,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { DOMAIN, fmtN, PMAP, flatten, isExtPhone, type Channel, type Person, type Tag } from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { L } from '../../lib/i18n'
import { FilterMenu, NO_HIDE, personVal } from '../../components/ui'
import { chName, msgId, tagsFor, type Rec } from './split'

type St = 'sent' | 'failed'
// to: the number or address (searched, never shown); ch: what the Channel column shows; phone: which phone it went
// to (PNS: always the company phone; SMS: either), shown as a tag by the name; note: on a Sent line, what the
// receiving end reported when it didn't arrive after all (e.g. the recipient blocks SMS)
export type LogLine = { sn: string; p: Person | null; who: string; emp: string; nt: string; org: string; via: 'PNS' | 'SMS' | 'Desktop' | 'Email'; to: string; ch: string; st: St; reason: string; at: string; phone?: 'co' | 'pp'; note?: string }
const ST: Record<St, { label: () => string; color: 'green' | 'red' | 'neutral' }> = {
  sent: { label: () => L('Sent', '已送出'), color: 'green' }, failed: { label: () => L('Not sent', '未送出'), color: 'red' },
}
// a stable 0..1 per string, so the sample is the same every time
const h01 = (s: string) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return (x % 1000) / 1000 }

// the record's lines: who it went to, how, and what happened, in the order they were sent (200 a minute)
export function logLines(x: Rec, groups: Parameters<typeof flatten>[1]): LogLine[] {
  const r = x.r, k = x.k, tags = tagsFor(r, k)
  const people = flatten(tags.filter(t => t.type !== 'ext'), groups).map(y => PMAP[y.pid]).filter(Boolean)
  const ext = tags.filter(t => t.type === 'ext').map(t => t.email!)
  const base = new Date((((r.chSched && r.chSched[k === 'sms' ? 'push' : k]) || r.sched || r.created).replace(/\//g, '-').replace(' ', 'T')) + ':00')
  const at = (i: number) => { const d = new Date(base.getTime() + Math.floor(i / 200) * 60000 + (i % 200) * 250); return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':') }
  const out: LogLine[] = [], prefix = msgId(r) + '-'
  let n = 0
  const push = (l: Omit<LogLine, 'sn' | 'at' | 'ch'>, ch: string) => {
    const i = n++
    // still sending: what hasn't gone out yet isn't listed at all (no Queued rows, 2026-11-16)
    const progress = r.status === 'progress' || x.st === 'progress'
    if (progress && i > Math.max(3, Math.round(people.length * 0.6))) return
    out.push({ ...l, ch, sn: prefix + String(i + 1).padStart(6, '0'), at: at(i) })
  }
  // who fails matches the record's own numbers: the first ones are the people the channel can't reach (no app, no
  // desktop agent), then, if the record still failed more, a service error for some more (picked the same way each time)
  const fails = x.unk ? 0 : Math.max(0, x.of - x.ok)
  const cant = (p: Person) => (k === 'push' || k === 'sms' ? !p.dev : k === 'desktop' ? !p.desk : false)
  const order = people.slice().sort((a, b) => h01(a.id) - h01(b.id))
  const down: Record<string, boolean> = {}
  let left = Math.max(0, fails - people.filter(cant).length)
  order.forEach(p => { if (left > 0 && !cant(p)) { down[p.id] = true; left-- } })
  const svc = L('Service unavailable', '服務暫時無法使用')
  // SMS fallback: as many SMS not sent as the record's own SMS numbers say, picked the same way each time among the
  // people the push didn't reach; one sent SMS (when there are a few) carries a carrier note
  const fbMiss = people.filter(p => !(p.dev && !down[p.id])).sort((a, b) => h01(a.id + 'sms') - h01(b.id + 'sms'))
  const smsBad: Record<string, boolean> = {}, smsNote: Record<string, string> = {}
  if (k === 'sms' && x.fb && !x.fb.unk) {
    fbMiss.slice(0, Math.max(0, x.fb.of - x.fb.ok)).forEach(p => { smsBad[p.id] = true })
    const okFb = fbMiss.filter(p => !smsBad[p.id])
    if (okFb.length >= 3) smsNote[okFb[okFb.length - 1].id] = L('Recipient has blocked SMS messages', '收件人封鎖了簡訊')
    if (okFb.length >= 5) smsNote[okFb[okFb.length - 2].id] = L('Message is barred by customer', '訊息被用戶端阻擋')
  }
  people.forEach(p => {
    const base = { p, who: p.en + ' ' + p.zh, emp: p.emp, nt: p.nt, org: p.org }
    if (k === 'push' || k === 'sms') {
      const ok = p.dev && !down[p.id]
      // PNS only ever goes to the company phone
      push({ ...base, via: 'PNS', to: '', phone: 'co', st: ok ? 'sent' : 'failed', reason: ok ? '' : down[p.id] ? svc : L('App unregistered', 'App 未註冊') }, 'PNS')
      if (k === 'sms' && !ok && !(x.fb && x.fb.unk)) {
        // which phone: company, unless this person's row had only Personal phone ticked (and one is on file)
        const ph = r.chPhones, key = 'p:' + p.id, usePP = !!(ph && ph.co[key] === false && ph.pp[key] && p.pp)
        const num = usePP ? p.pp : p.co || p.pp, hv = h01(p.id + 'sms'), bad = !num || !!smsBad[p.id]
        // a Sent SMS can still not arrive: the carrier reports why (the recipient's side), shown under Sent
        const note = !bad && smsNote[p.id] ? smsNote[p.id] : ''
        push({ ...base, via: 'SMS', to: num || '', phone: num === p.co ? 'co' : 'pp', note, st: bad ? 'failed' : 'sent', reason: bad ? (!num ? L('No phone number', '沒有電話號碼') : hv < 0.07 ? svc : L('Number not in service', '號碼停用')) : '' },
          L('SMS (fallback)', 'SMS（備援）'))
      }
    } else if (k === 'desktop') {
      const ok = p.desk && !down[p.id]
      push({ ...base, via: 'Desktop', to: '', st: ok ? 'sent' : 'failed', reason: ok ? '' : down[p.id] ? svc : L('No desktop agent', '沒有桌面程式') }, 'Desktop notifications')
    } else {
      const bad = !!down[p.id]
      push({ ...base, via: 'Email', to: p.nt + '@' + DOMAIN, st: bad ? 'failed' : 'sent', reason: bad ? L('Mailbox full (552)', '信箱已滿（552）') : '' }, 'Email')
    }
  })
  ext.forEach(v => {
    // outside contacts: an SMS to an outside number goes out like any SMS; some outside email addresses bounce
    const ph = isExtPhone({ key: '', type: 'ext', email: v }), bad = !ph && h01(v) < 0.2
    push({ p: null, who: v, emp: '', nt: '', org: L('External', '外部'), via: ph ? 'SMS' : 'Email', to: v, st: bad ? 'failed' : 'sent', reason: bad ? (ph ? L('Number not in service', '號碼停用') : L('Address not found (550)', '查無此地址（550）')) : '' }, ph ? 'SMS' : 'Email')
  })
  return out
}

const PER = [50, 100, 200]
const col = createColumnHelper<LogLine>()

// who nothing reached: every line for them is Not sent (a person with a sent SMS after a failed push was reached)
export function notReached(lines: LogLine[]): Tag[] {
  const st: Record<string, { tag: Tag; ok: boolean }> = {}
  lines.forEach(l => {
    const tag: Tag = l.p ? { key: 'p:' + l.p.id, type: 'person', id: l.p.id } : { key: 'e:' + l.who, type: 'ext', email: l.who }
    const o = st[tag.key] || (st[tag.key] = { tag, ok: false })
    if (l.st !== 'failed') o.ok = true
  })
  return Object.keys(st).filter(key => !st[key].ok).map(key => st[key].tag)
}

// initial: the Status filter it opens with (['failed'] from "{n} not sent")
export function DeliveryLogDialog({ x, open, onClose, onResend, initial }: { x: Rec; open: boolean; onClose: () => void; onResend?: (tags: Tag[]) => void; initial?: St[] }) {
  const app = useApp(), k: Channel = x.k
  const all = React.useMemo(() => (open ? logLines(x, app.groups) : []), [open, x.r.id, x.k, x.r.fresh, app.groups])
  const [q, setQ] = React.useState('')
  const [fs, setFs] = React.useState<St[]>([]), [fv, setFv] = React.useState<string[]>([])
  const [page, setPage] = React.useState(1), [per, setPer] = React.useState(50)
  React.useEffect(() => { if (open) { setQ(''); setFs(initial || []); setFv([]); setPage(1) } }, [open, x.id])
  const terms = q.split(/[\s,，;]+/).map(t => t.trim().toLowerCase()).filter(Boolean)
  // any term matches part of the name, phone or email, or the whole employee ID, NT account or serial no.
  const match = (l: LogLine) => !terms.length || terms.some(t => (l.who + ' ' + l.to).toLowerCase().indexOf(t) >= 0 || t === l.emp.toLowerCase() || t === l.nt.toLowerCase() || t === l.sn.toLowerCase())
  const rows = all.filter(l => match(l) && (!fs.length || fs.indexOf(l.st) >= 0) && (!fv.length || fv.indexOf(l.ch) >= 0))
  const pages = Math.max(1, Math.ceil(rows.length / per)), pg = Math.min(page, pages), shown = rows.slice((pg - 1) * per, pg * per)
  const flip = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>) => (v: T) => { set(l => (l.indexOf(v) >= 0 ? l.filter(y => y !== v) : l.concat([v]))); setPage(1) }
  const count = (f: (l: LogLine) => string) => { const m: Record<string, number> = {}; all.forEach(l => { const v = f(l); if (v) m[v] = (m[v] || 0) + 1 }); return m }
  const byCh = count(l => l.ch), bySt = count(l => l.st), missed = React.useMemo(() => notReached(all), [all])
  const cols = React.useMemo(() => [
    col.accessor('sn', { header: L('Job ID', 'Job ID'), meta: { width: 140, maxWidth: 140 }, cell: i => <span className="tabular-nums">{i.getValue()}</span> }),
    // the person, and which phone it went to as a tag (company and personal in different colours); not on Desktop
    // OS or Email lines
    col.display({ id: 'who', header: L('Audience', '收件人'), meta: { width: 300 }, cell: i => { const l = i.row.original; return (
      <span className="flex min-w-0 items-center gap-2">
        {l.p ? <PersonDisplay value={personVal(l.p)} /> : <span className="truncate">{l.who}</span>}
        {l.phone ? <DsTag size="sm" color={l.phone === 'co' ? 'blue' : 'purple'} className="shrink-0">{l.phone === 'co' ? L('Company phone', '公務手機') : L('Personal phone', '私人手機')}</DsTag> : null}
      </span>
    ) } }),
    col.accessor('emp', { header: L('Employee ID', '工號'), meta: { width: 124, maxWidth: 124 }, cell: i => i.getValue() ? <span className="tabular-nums">{i.getValue()}</span> : <span className="text-fg-muted">—</span> }),
    // how it went: PNS, SMS (fallback: after the push didn't arrive), SMS (an outside number), Desktop notifications, Email
    col.accessor('ch', { header: L('Channel', '通道'), meta: { width: 150, maxWidth: 170 }, cell: i => <span className="truncate">{i.getValue()}</span> }),
    // status and reason in one column: the tag, and why under it when it failed
    col.display({ id: 'st', header: L('Status', '狀態'), meta: { width: 250, maxWidth: 260 }, cell: i => { const l = i.row.original; return <span className="flex min-w-0 flex-col items-start gap-0.5"><DsTag size="sm" color={ST[l.st].color}>{ST[l.st].label()}</DsTag>{/* the reason (Not sent) and the carrier's note (Sent) are both something gone wrong: red (2026-11-16) */}{l.reason || l.note ? <span className="truncate text-caption text-error-text">{l.reason || l.note}</span> : null}</span> } }),
    col.accessor('at', { header: L('Send time', '傳送時間'), meta: { width: 168, maxWidth: 168 }, cell: i => <span className="whitespace-nowrap tabular-nums">{i.getValue()}</span> }),
  ], [k, app.lang])
  const opts = (m: Record<string, number>) => Object.keys(m).sort().map(v => ({ k: v, view: <span>{v}</span>, text: v, n: m[v] }))
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={1280} height="fill">
          <DialogHeader>
            {/* the message ID tag and the channel sit in the title, like the Detail modal's; no summary line */}
            <div className="flex min-w-0 items-center gap-2">
              <DsTag size="sm" color="neutral" className="shrink-0 tabular-nums">{msgId(x.r)}</DsTag>
              <DialogTitle className="truncate">{L('Sent details · ', '發送明細・') + chName(k)}</DialogTitle>
              <DialogDescription className="sr-only">{L(fmtN(all.length) + ' messages', fmtN(all.length) + ' 則')}</DialogDescription>
            </div>
          </DialogHeader>
          {/* no h-full here: inside the DS scroll area it made the body 10px taller than the dialog, so a second scrollbar
              showed next to the table's own (2026-11-23) */}
          <DialogBody>
            <div className="flex min-h-0 flex-col gap-[var(--layout-space-tight)]">
              <div className="flex flex-wrap items-center gap-2">
                {/* one search box: names, phones and emails by part; employee IDs, NT accounts and job IDs whole */}
                <div className="w-[480px] max-w-full"><Input type="search" startIcon={Search} value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={L('Search name, employee ID, NT account, phone or job ID', '搜尋姓名、工號、NT 帳號、電話或 Job ID')} aria-label={L('Search delivery details', '搜尋發送明細')} /></div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <FilterMenu<string> label={L('Status', '狀態')} sel={fs} toggle={flip(setFs) as any} clear={() => { setFs([]); setPage(1) }}
                    opts={(['sent', 'failed'] as St[]).filter(s => bySt[s]).map(s => ({ k: s, view: <DsTag size="sm" color={ST[s].color}>{ST[s].label()}</DsTag>, text: ST[s].label(), n: bySt[s] }))} />
                  {k === 'sms' ? <FilterMenu<string> label={L('Channel', '通道')} sel={fv} toggle={flip(setFv)} clear={() => { setFv([]); setPage(1) }} opts={opts(byCh)} /> : null}
                </div>
              </div>
              {/* the table fills the room between the filters and the pagination and scrolls inside it (100svh minus the
                  dialog's margins, header, footer, filters and pagination: 390px, measured 2026-11-23) */}
              <div className="flex min-h-0 flex-1 flex-col">
                <DataTable tableOptions={NO_HIDE} columns={cols as any} data={shown} bordered height="calc(100svh - 390px)" autoRowHeight getRowId={l => l.sn}
                  emptyState={<Empty icon={Search} title={L('No matching messages', '找不到符合的訊息')} description={L('Check the search field and the filters.', '確認搜尋欄位與篩選條件。')} />} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-caption tabular-nums text-fg-secondary">{rows.length ? L(fmtN((pg - 1) * per + 1) + '–' + fmtN(Math.min(pg * per, rows.length)) + ' of ' + fmtN(rows.length), '第 ' + fmtN((pg - 1) * per + 1) + '–' + fmtN(Math.min(pg * per, rows.length)) + ' 筆，共 ' + fmtN(rows.length) + ' 筆') : ''}</span>
                <div className="flex items-center gap-3">
                  <Pagination total={rows.length} pageSize={per} page={pg} onPageChange={setPage} showTotal={false} prevAriaLabel={L('Previous page', '上一頁')} nextAriaLabel={L('Next page', '下一頁')} />
                  <div className="w-36"><Select size="sm" aria-label={L('Rows per page', '每頁筆數')} value={String(per)} onChange={v => { setPer(Number(v)); setPage(1) }} options={PER.map(n => ({ value: String(n), label: L(n + ' per page', n + ' 筆/頁') }))} /></div>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            {/* anyone not reached: Resend, right of Close (2026-11-16: no Alert); n counts people, not rows */}
            <Button variant={missed.length && onResend ? 'secondary' : 'primary'} onClick={onClose}>{L('Close', '關閉')}</Button>
            {missed.length && onResend ? <Button variant="primary" onClick={() => onResend(missed)}>{L('Resend to not sent (' + fmtN(missed.length) + ')', '重新寄送給未送出的人（' + fmtN(missed.length) + '）')}</Button> : null}
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
