// Delivery details (proposal C, 2026-11-12): every message actually sent for one record, one row each, by person
// (orgs and groups expanded). Opened from the Detail modal's "View delivery details", in a dialog of its own with the
// full width and height, because one send can reach tens of thousands of people and this is where a sender digs into a
// problem ("did Jason get it?", "why did PENG's SMS fail?").
//   Search: one box, no field to pick first (2026-11-12). Each term is matched against the name, phone or email
//           (part of it), and the employee ID, NT account and serial no. (whole); several can be pasted at once,
//           separated by commas or spaces. The server tells the kinds apart (digits: employee ID, MSG-like: serial...).
//   Filters: Status (with counts), Org, and Via (Device Notifications (SMS) only). No Reason filter: a reason only
//           exists on failures and already shows under the Failed tag.
//   Paging: 50 / 100 / 200 per page, with "first–last of total". The list is worked out on the server; the prototype
//           builds it from the record's audience.
//   Status and reason are one column: the status tag, and the reason under it when it failed.
// Export CSV takes the rows that match the current search and filters.
import * as React from 'react'
import {
  Button, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Empty, Input, Pagination, PersonDisplay, Select, Tag,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Download, Search } from 'lucide-react'
import { DOMAIN, fmtN, maskPhone, PMAP, flatten, isExtPhone, type Channel, type Person } from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { L } from '../../lib/i18n'
import { FilterMenu, NO_HIDE, personVal } from '../../components/ui'
import { chName, msgId, tagsFor, type Rec } from './split'

type St = 'sent' | 'failed' | 'queued'
export type LogLine = { sn: string; p: Person | null; who: string; emp: string; nt: string; org: string; via: 'PNS' | 'SMS' | 'Desktop' | 'Email'; to: string; st: St; reason: string; at: string }
const ST: Record<St, { label: () => string; color: 'green' | 'red' | 'neutral' }> = {
  sent: { label: () => L('Sent', '已送出'), color: 'green' }, failed: { label: () => L('Failed', '失敗'), color: 'red' }, queued: { label: () => L('Queued', '排隊中'), color: 'neutral' },
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
  const out: LogLine[] = [], prefix = msgId(r).replace('MSG-', '') + '-'
  let n = 0
  const push = (l: Omit<LogLine, 'sn' | 'at'>) => {
    const i = n++
    const progress = r.status === 'progress' || x.st === 'progress'
    const st: St = progress && i > Math.max(3, Math.round(people.length * 0.6)) ? 'queued' : l.st
    out.push({ ...l, st, reason: st === 'queued' ? '' : l.reason, sn: prefix + String(i + 1).padStart(6, '0'), at: st === 'queued' ? '—' : at(i) })
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
  people.forEach(p => {
    const base = { p, who: p.en + ' ' + p.zh, emp: p.emp, nt: p.nt, org: p.org }
    if (k === 'push' || k === 'sms') {
      const ok = p.dev && !down[p.id]
      push({ ...base, via: 'PNS', to: L('App', 'App'), st: ok ? 'sent' : 'failed', reason: ok ? '' : down[p.id] ? svc : L('App unregistered', 'App 未註冊') })
      if (k === 'sms' && !ok && !(x.fb && x.fb.unk)) {
        const num = p.co || p.pp, bad = !num || h01(p.id + 'sms') < 0.15
        push({ ...base, via: 'SMS', to: num ? maskPhone(num) + (p.co ? L(' (company)', '（公務）') : L(' (personal)', '（私人）')) : '—', st: bad ? 'failed' : 'sent', reason: bad ? (num ? L('Number not in service', '號碼停用') : L('No phone number', '沒有電話號碼')) : '' })
      }
    } else if (k === 'desktop') {
      const ok = p.desk && !down[p.id]
      push({ ...base, via: 'Desktop', to: L('Windows PC', 'Windows 電腦'), st: ok ? 'sent' : 'failed', reason: ok ? '' : down[p.id] ? svc : L('No desktop agent', '沒有桌面程式') })
    } else {
      const bad = !!down[p.id]
      push({ ...base, via: 'Email', to: p.nt + '@' + DOMAIN, st: bad ? 'failed' : 'sent', reason: bad ? L('Mailbox full (552)', '信箱已滿（552）') : '' })
    }
  })
  ext.forEach(v => {
    const ph = isExtPhone({ key: '', type: 'ext', email: v }), bad = h01(v) < 0.2
    push({ p: null, who: v, emp: '', nt: '', org: L('External', '外部'), via: ph ? 'SMS' : 'Email', to: v, st: bad ? 'failed' : 'sent', reason: bad ? (ph ? L('Number not in service', '號碼停用') : L('Address not found (550)', '查無此地址（550）')) : '' })
  })
  return out
}

const PER = [50, 100, 200]
const col = createColumnHelper<LogLine>()

export function DeliveryLogDialog({ x, open, onClose }: { x: Rec; open: boolean; onClose: () => void }) {
  const app = useApp(), k: Channel = x.k
  const all = React.useMemo(() => (open ? logLines(x, app.groups) : []), [open, x.r.id, x.k, x.r.fresh, app.groups])
  const [q, setQ] = React.useState('')
  const [fs, setFs] = React.useState<St[]>([]), [fo, setFo] = React.useState<string[]>([]), [fv, setFv] = React.useState<string[]>([])
  const [page, setPage] = React.useState(1), [per, setPer] = React.useState(50)
  React.useEffect(() => { if (open) { setQ(''); setFs([]); setFo([]); setFv([]); setPage(1) } }, [open, x.id])
  const terms = q.split(/[\s,，;]+/).map(t => t.trim().toLowerCase()).filter(Boolean)
  // any term matches part of the name, phone or email, or the whole employee ID, NT account or serial no.
  const match = (l: LogLine) => !terms.length || terms.some(t => (l.who + ' ' + l.to).toLowerCase().indexOf(t) >= 0 || t === l.emp.toLowerCase() || t === l.nt.toLowerCase() || t === l.sn.toLowerCase())
  const rows = all.filter(l => match(l) && (!fs.length || fs.indexOf(l.st) >= 0) && (!fo.length || fo.indexOf(l.org) >= 0) && (!fv.length || fv.indexOf(l.via) >= 0))
  const pages = Math.max(1, Math.ceil(rows.length / per)), pg = Math.min(page, pages), shown = rows.slice((pg - 1) * per, pg * per)
  const flip = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>) => (v: T) => { set(l => (l.indexOf(v) >= 0 ? l.filter(y => y !== v) : l.concat([v]))); setPage(1) }
  const count = (f: (l: LogLine) => string) => { const m: Record<string, number> = {}; all.forEach(l => { const v = f(l); if (v) m[v] = (m[v] || 0) + 1 }); return m }
  const byOrg = count(l => l.org), byVia = count(l => l.via), bySt = count(l => l.st)
  const cols = React.useMemo(() => [
    col.accessor('sn', { header: L('Serial no.', '流水號'), meta: { width: 140, maxWidth: 140 }, cell: i => <span className="tabular-nums">{i.getValue()}</span> }),
    col.display({ id: 'who', header: L('Recipient', '收件人'), meta: { width: 220 }, cell: i => { const l = i.row.original; return l.p ? <PersonDisplay value={personVal(l.p)} /> : <span className="truncate">{l.who}</span> } }),
    col.accessor('emp', { header: L('Employee ID', '工號'), meta: { width: 124, maxWidth: 124 }, cell: i => i.getValue() ? <span className="tabular-nums">{i.getValue()}</span> : <span className="text-fg-muted">—</span> }),
    col.accessor('org', { header: L('Org', '組織'), meta: { width: 96, maxWidth: 96 } }),
    ...(k === 'sms' ? [col.accessor('via', { header: L('Via', '管道'), meta: { width: 72, maxWidth: 72 } })] : []),
    col.accessor('to', { header: L('Sent to', '寄送到'), meta: { width: 200, maxWidth: 220 }, cell: i => <span className="truncate tabular-nums">{i.getValue()}</span> }),
    // status and reason in one column: the tag, and why under it when it failed
    col.display({ id: 'st', header: L('Status', '狀態'), meta: { width: 200, maxWidth: 220 }, cell: i => { const l = i.row.original; return <span className="flex min-w-0 flex-col items-start gap-0.5"><Tag size="sm" color={ST[l.st].color}>{ST[l.st].label()}</Tag>{l.reason ? <span className="truncate text-caption text-fg-secondary">{l.reason}</span> : null}</span> } }),
    col.accessor('at', { header: L('Sent at', '送出時間'), meta: { width: 168, maxWidth: 168 }, cell: i => <span className="whitespace-nowrap tabular-nums">{i.getValue()}</span> }),
  ], [k, app.lang])
  const opts = (m: Record<string, number>) => Object.keys(m).sort().map(v => ({ k: v, view: <span>{v}</span>, n: m[v] }))
  const exportCsv = () => flash(L('Exporting ' + fmtN(rows.length) + ' rows as CSV', '匯出 ' + fmtN(rows.length) + ' 筆 CSV'), 'ok')
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={1280} height="fill">
          <DialogHeader>
            {/* the message ID tag and the channel sit in the title, like the Detail modal's; no summary line */}
            <div className="flex min-w-0 items-center gap-2">
              <Tag size="sm" color="neutral" className="shrink-0 tabular-nums">{msgId(x.r)}</Tag>
              <DialogTitle className="truncate">{L('Delivery details · ', '發送明細・') + chName(k)}</DialogTitle>
              <DialogDescription className="sr-only">{L(fmtN(all.length) + ' messages', fmtN(all.length) + ' 則')}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="flex h-full min-h-0 flex-col gap-[var(--layout-space-tight)]">
              <div className="flex flex-wrap items-center gap-2">
                {/* one search box: names, phones and emails by part; employee IDs, NT accounts and serial numbers whole */}
                <div className="w-[480px] max-w-full"><Input type="search" startIcon={Search} value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={L('Search name, employee ID, NT account, phone or serial no.', '搜尋姓名、工號、NT 帳號、電話或流水號')} aria-label={L('Search delivery details', '搜尋發送明細')} /></div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <FilterMenu<string> label={L('Status', '狀態')} sel={fs} toggle={flip(setFs) as any} clear={() => { setFs([]); setPage(1) }}
                    opts={(['sent', 'failed', 'queued'] as St[]).filter(s => bySt[s]).map(s => ({ k: s, view: <Tag size="sm" color={ST[s].color}>{ST[s].label()}</Tag>, n: bySt[s] }))} />
                  <FilterMenu<string> label={L('Org', '組織')} sel={fo} toggle={flip(setFo)} clear={() => { setFo([]); setPage(1) }} opts={opts(byOrg)} />
                  {k === 'sms' ? <FilterMenu<string> label={L('Via', '管道')} sel={fv} toggle={flip(setFv)} clear={() => { setFv([]); setPage(1) }} opts={opts(byVia)} /> : null}
                </div>
              </div>
              <div className="flex min-h-0 flex-col">
                <DataTable tableOptions={NO_HIDE} columns={cols as any} data={shown} bordered height="calc(100svh - 380px)" autoRowHeight getRowId={l => l.sn}
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
            <Button variant="tertiary" startIcon={Download} className="mr-auto" onClick={exportCsv}>{L('Export CSV', '匯出 CSV')}</Button>
            <Button variant="primary" onClick={onClose}>{L('Close', '關閉')}</Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
