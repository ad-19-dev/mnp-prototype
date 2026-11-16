// Demo for two questions on the prototype (2026-11-16); nothing here changes the prototype.
//   1. Sent details: how to make "Resend to 3" read as "to the 3 people who got nothing". The catch: the Not sent
//      filter counts messages (rows), not people; one person can have two Not sent rows (app push, then SMS).
//   2. Message details: is the red "{n} not sent" under Status enough, and where should it lead?
// Every mock is live (filters, links, buttons) with one small sample: a Device Notifications (SMS) record.
import * as React from 'react'
import {
  Button, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DescriptionItem, DescriptionList, Input, PersonDisplay, Tag,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { FilterMenu, NO_HIDE, StatusTag, personVal } from '../../components/ui'
import { PEOPLE, type Person } from '../../lib/data'

// ---------- sample ----------
type St = 'sent' | 'failed'
type Line = { sn: string; p: Person; ch: string; st: St; reason: string; at: string }
// nine people with names no one else in the sample shares, so each row reads as one person
const PPL = PEOPLE.filter(p => !p.extKind).filter((p, _, all) => all.filter(x => !x.extKind && x.en.split(' ')[0] === p.en.split(' ')[0]).length === 1).slice(0, 9)
// index → what happened: ok (push sent), sms (push failed, SMS sent), lost (push and SMS both not sent), nophone
const PLAN = ['ok', 'sms', 'ok', 'lost', 'ok', 'ok', 'nophone', 'ok', 'lost']
const LINES: Line[] = (() => {
  const out: Line[] = []
  let n = 0
  const at = () => '2026/11/14 09:30:' + String(n * 2).padStart(2, '0')
  const add = (l: Omit<Line, 'sn' | 'at'>) => { n++; out.push({ ...l, sn: '10188-' + String(n).padStart(6, '0'), at: at() }) }
  PPL.forEach((p, i) => {
    const k = PLAN[i]
    add({ p, ch: 'PNS · App', st: k === 'ok' ? 'sent' : 'failed', reason: k === 'ok' ? '' : 'App unregistered' })
    if (k === 'sms') add({ p, ch: 'SMS · Company phone', st: 'sent', reason: '' })
    if (k === 'lost') add({ p, ch: 'SMS · Personal phone', st: 'failed', reason: 'Number not in service' })
    if (k === 'nophone') add({ p, ch: 'SMS', st: 'failed', reason: 'No phone number' })
  })
  return out
})()
// people with nothing sent: every row of theirs is Not sent
const MISSED = PPL.filter(p => LINES.filter(l => l.p.id === p.id).every(l => l.st === 'failed'))
const N = MISSED.length
const NOT_SENT_ROWS = LINES.filter(l => l.st === 'failed').length
const ST: Record<St, { label: string; color: 'green' | 'red' }> = { sent: { label: 'Sent', color: 'green' }, failed: { label: 'Not sent', color: 'red' } }

// ---------- the Sent details dialog, drawn in the page (or in a real dialog) ----------
type Foot = 'now' | 'a' | 'b' | 'bplus'
const col = createColumnHelper<Line>()
function useCols() {
  return React.useMemo(() => [
    col.accessor('sn', { header: 'Job ID', meta: { width: 150, maxWidth: 150 }, cell: i => <span className="whitespace-nowrap tabular-nums">{i.getValue()}</span> }),
    col.display({ id: 'p', header: 'Recipient', meta: { width: 200 }, cell: i => <PersonDisplay value={personVal(i.row.original.p)} /> }),
    col.display({ id: 'emp', header: 'Employee ID', meta: { width: 110, maxWidth: 110 }, cell: i => <span className="tabular-nums">{i.row.original.p.emp}</span> }),
    col.accessor('ch', { header: 'Channel', meta: { width: 170, maxWidth: 190 } }),
    col.display({ id: 'st', header: 'Status', meta: { width: 180, maxWidth: 200 }, cell: i => { const l = i.row.original; return <span className="flex min-w-0 flex-col items-start gap-0.5"><Tag size="sm" color={ST[l.st].color}>{ST[l.st].label}</Tag>{l.reason ? <span className="truncate text-caption text-fg-secondary">{l.reason}</span> : null}</span> } }),
    col.accessor('at', { header: 'Send time', meta: { width: 160, maxWidth: 160 }, cell: i => <span className="whitespace-nowrap tabular-nums">{i.getValue()}</span> }),
  ], [])
}

function SentDetails({ foot, startWho = false, onClose, inDialog }: { foot: Foot; startWho?: boolean; onClose?: () => void; inDialog?: boolean }) {
  const [q, setQ] = React.useState(''), [fs, setFs] = React.useState<St[]>([]), [who, setWho] = React.useState(startWho)
  const [sent, setSent] = React.useState(false)
  const t = q.trim().toLowerCase()
  const rows = LINES.filter(l => (!fs.length || fs.indexOf(l.st) >= 0) && (!who || MISSED.some(p => p.id === l.p.id)) && (!t || [l.sn, l.p.en, l.p.zh, l.p.emp].join(' ').toLowerCase().indexOf(t) >= 0))
  const cols = useCols()
  const n = (s: St) => LINES.filter(l => l.st === s).length
  const resendLabel = foot === 'a' ? 'Resend to ' + N + ' not sent' : 'Resend to ' + N
  const body = (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-80 max-w-full"><Input type="search" startIcon={Search} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, employee ID, NT account, phone or job ID" aria-label="Search" /></div>
        {/* B+: the people filter set by "Show them", shown as a pressed button that clears it */}
        {who ? <Button variant="tertiary" pressed endIcon={X} onClick={() => setWho(false)} aria-label={'Clear: ' + N + ' people not reached'}>{N} people not reached</Button> : null}
        <div className="ml-auto flex items-center gap-2">
          <FilterMenu<St> label="Status" sel={fs} toggle={k => setFs(l => (l.indexOf(k) >= 0 ? l.filter(x => x !== k) : l.concat([k])))} clear={() => setFs([])}
            opts={(['sent', 'failed'] as St[]).map(k => ({ k, view: <Tag size="sm" color={ST[k].color}>{ST[k].label}</Tag>, n: n(k) }))} />
          <Button variant="tertiary">Channel</Button>
        </div>
      </div>
      <DataTable tableOptions={NO_HIDE} columns={cols as any} data={rows} bordered height={inDialog ? '380px' : '340px'} autoRowHeight overscan={LINES.length} getRowId={l => l.sn} />
      <span className="text-caption tabular-nums text-fg-secondary">1–{rows.length} of {rows.length}</span>
    </div>
  )
  const footer = (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* B and B+: one line on the left that says the number is people, and who */}
      {foot === 'b' || foot === 'bplus' ? (
        <span className="flex flex-wrap items-center gap-x-2 text-body text-fg-secondary">
          <span><span className="tabular-nums">{N}</span> people didn’t receive this message.</span>
          {foot === 'bplus' && !who ? <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={() => { setWho(true); setFs([]) }}>Show them</Button> : null}
        </span>
      ) : null}
      <span className="flex-1" />
      <Button variant="secondary" onClick={onClose}>Close</Button>
      <Button variant="primary" onClick={() => setSent(true)}>{resendLabel}</Button>
    </div>
  )
  const after = sent ? (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--color-neutral-1)] px-3 py-2 text-caption text-fg-secondary">
      按下後：開一則新訊息，同一個通道與內容，收件人只有 {MISSED.map(p => p.en).join('、')}（{N} 人）。
      <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={() => setSent(false)}>收起</Button>
    </div>
  ) : null
  if (inDialog) return (
    <>
      <DialogBody>{body}</DialogBody>
      {after ? <div className="px-[var(--layout-space-loose)] pb-2">{after}</div> : null}
      <DialogFooter>{footer}</DialogFooter>
    </>
  )
  // in the page: a frame drawn like the dialog
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-divider bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-divider px-[var(--layout-space-loose)] py-3">
          <Tag size="sm" color="neutral" className="tabular-nums">MSG-10188</Tag>
          <span className="text-h6 font-semibold">Sent details · Device Notifications (SMS)</span>
        </div>
        <div className="p-[var(--layout-space-loose)]">{body}</div>
        <div className="border-t border-divider px-[var(--layout-space-loose)] py-3">{footer}</div>
      </div>
      {after}
    </div>
  )
}

// ---------- question 2: the right column of Message details, and where "3 not sent" leads ----------
function Facts({ onNotSent }: { onNotSent: () => void }) {
  return (
    <div className="w-[300px] max-w-full rounded-lg border border-divider bg-[var(--color-neutral-1)] p-[var(--layout-space-loose)]">
      <DescriptionList>
        <DescriptionItem label="Channel">Device Notifications (SMS)</DescriptionItem>
        <DescriptionItem label="Status">
          <span className="flex flex-col items-start gap-1">
            <StatusTag s="error" />
            <Button variant="link" size="xs" className="!h-auto !min-w-0 !justify-start !p-0 !text-error-text" onClick={onNotSent}>{N} not sent</Button>
          </span>
        </DescriptionItem>
        <DescriptionItem label="Audience"><span className="tabular-nums">{PPL.length}</span></DescriptionItem>
        <DescriptionItem label="Send time"><span className="tabular-nums">2026/11/14 09:30</span></DescriptionItem>
      </DescriptionList>
    </div>
  )
}
// today's "Not sent to" dialog, for comparison
const ncol = createColumnHelper<Person>()
function NotSentTo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cols = React.useMemo(() => [
    ncol.display({ id: 'p', header: 'Audience', meta: { width: 240 }, cell: i => <PersonDisplay value={personVal(i.row.original)} /> }),
    ncol.display({ id: 'src', header: 'Source', meta: { width: 160 }, cell: () => <span className="flex items-center gap-2">FESH<Tag size="sm" color="neutral">Org</Tag></span> }),
    ncol.display({ id: 'r', header: 'Reason', meta: { width: 220 }, cell: i => <span className="truncate">{LINES.filter(l => l.p.id === i.row.original.id).map(l => l.reason).join(' · ')}</span> }),
  ], [])
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={760} height="hug">
          <DialogHeader><DialogTitle>Not sent to</DialogTitle><DialogDescription className="sr-only">Device Notifications (SMS)</DialogDescription></DialogHeader>
          <DialogBody><DataTable tableOptions={NO_HIDE} columns={cols as any} data={MISSED} bordered height="auto" getRowId={p => p.id} /></DialogBody>
          <DialogFooter><Button variant="primary" onClick={onClose}>Resend to {N}</Button></DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
function SentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={1080} height="hug">
          <DialogHeader>
            <div className="flex items-center gap-2"><Tag size="sm" color="neutral" className="tabular-nums">MSG-10188</Tag><DialogTitle>Sent details · Device Notifications (SMS)</DialogTitle></div>
            <DialogDescription className="sr-only">Opened from {N} not sent</DialogDescription>
          </DialogHeader>
          <SentDetails foot="bplus" startWho onClose={onClose} inDialog />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
function Entry({ to }: { to: 'old' | 'new' }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Facts onNotSent={() => setOpen(true)} />
      <span className="text-caption text-fg-secondary">點紅字「{N} not sent」試試看</span>
      {to === 'old' ? <NotSentTo open={open} onClose={() => setOpen(false)} /> : <SentDialog open={open} onClose={() => setOpen(false)} />}
    </div>
  )
}

const Frame = ({ title, sub, rec, children }: { title: string; sub?: string; rec?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <span className="flex flex-wrap items-center gap-2"><b className="text-body">{title}</b>{rec ? <Tag size="sm" color="green">建議</Tag> : null}{sub ? <span className="text-caption text-fg-secondary">{sub}</span> : null}</span>
    {children}
  </div>
)

export default function NotSent() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Sent details · Demo</span>
          <h1 className="spec-h1">未送出與 Resend 的 demo</h1>
          <span className="text-caption text-fg-secondary">2026/11/16 · 回覆原型上兩則提問。每個 mock 都可以操作（搜尋、Status 篩選、Show them、Resend、點 {N} not sent），不影響原型。範例：一則 Device Notifications (SMS)，{PPL.length} 人，其中 {N} 人完全沒收到。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Why" title="先看問題：Not sent 的列數 ≠ 沒收到的人數" lead={<>同一個人推播沒送到，會再寄 SMS，所以可能有兩列 Not sent。這個範例有 {NOT_SENT_ROWS} 列 Not sent，但只有 {N} 個人完全沒收到；另外有一位推播沒送到、SMS 送到了，算收到。使用者篩 Not sent 看到 {NOT_SENT_ROWS} 列，按鈕卻寫 Resend to {N}，對不起來。</>}>
          <SpecTable head={['', '數量', '算法']} nowrap={[0]} rows={[
            ['Status 篩選的 Not sent', NOT_SENT_ROWS + ' 列', '訊息則數（一列一則）'],
            ['Resend to {n}', N + ' 人', '人數：這個人的每一則都沒送到'],
          ]} />
        </Section>

        <Section eyebrow="Q1" title="Resend to 3：怎麼看得出是寄給沒收到的 3 個人" lead="四個版本，表格與篩選都一樣，只有底部不同。按 Resend 會在下方說明會發生什麼。">
          <Frame title="現在" sub="只有按鈕；3 是什麼要自己猜"><SentDetails foot="now" /></Frame>
          <Frame title="A：只改按鈕文字" sub={'Resend to ' + N + ' not sent'}><SentDetails foot="a" /></Frame>
          <Frame title="B：左側加一句說明" sub="按鈕不變"><SentDetails foot="b" /></Frame>
          <Frame title="B+：說明加 Show them" sub="點 Show them，表格只列這幾個人的每一則" rec><SentDetails foot="bplus" /></Frame>
          <Notes items={[
            { title: 'A 只改文字', body: '改動最小，和 Status 下方的「3 not sent」用同一組字。缺點：英文不太自然；篩 Not sent 時列數還是對不上。' },
            { title: 'B 說明是人數', body: '直接寫「' + N + ' people didn’t receive this message」，「人」與「沒收到」都說清楚了；按鈕維持和 Not sent to 對話框一樣的 Resend to {n}。' },
            { title: 'B+ 能先看是誰（建議）', body: '在 B 的說明後面加 Show them：表格只列這幾個人（依人篩選，不是依列），工具列出現「3 people not reached ✕」可以清掉。按 Resend 之前能確認名單，數字也對得上。' },
            { title: '不建議：再跳確認', body: 'Resend 本來就是開一則新訊息，收件人欄列著這些人、還能改，等於已經確認過；再多一層只是多一步。' },
          ]} />
        </Section>

        <Section eyebrow="Q2" title="訊息詳情：要怎麼看出有人沒收到" lead="右側 Status 下的紅字「3 not sent」已經在面板最上面，列表上也有，不用另外在 Send time 或其他地方加。值得想的是：點了開哪裡。">
          <div className="flex flex-wrap gap-[var(--layout-space-loose)]">
            <Frame title="現在" sub="開 Not sent to 對話框（只有名單、原因、Resend）"><Entry to="old" /></Frame>
            <Frame title="提案" sub="開 Sent details，已套用 B+ 的「只看這幾個人」" rec><Entry to="new" /></Frame>
          </div>
          <Notes items={[
            { title: '建議：Send time 不加', body: 'Send time 是「什麼時候寄」；送達結果放在 Status 下方，和狀態一起看最直覺。' },
            { title: '提案的好處', body: '查「誰沒收到」和 Resend 只剩一個地方（Sent details），規則只要維護一套；點進去就是那幾個人，清掉篩選又能看全部。列表上的「n not sent」也改成開同一個對話框。' },
            { title: '提案的代價', body: 'Sent details 欄位比 Not sent to 多（Job ID、Channel、Send time），只想快速看名單的人資訊偏多；Not sent to 的 Source 欄（從哪個組織或群組加入）在 Sent details 沒有。' },
          ]} />
        </Section>
      </main>
    </>
  )
}
