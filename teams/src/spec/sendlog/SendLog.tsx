// Proposals: per-recipient delivery details in the message's Detail modal (user test, 2026-11-11).
// One row per message actually sent (each has its own serial number), by person, not by org or group: recipient
// (name + employee ID), that message's own status, when it actually went out (large sends go in batches), and why it
// failed. Three placements, all live with the same sample data; nothing here changes the prototype.
// Also a note on counting coverage by messages instead of people (comment on Message Coverage by Channel).
import * as React from 'react'
import {
  Button, DataTable, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Input, Tabs, TabsList, TabsTrigger, Tag, PersonDisplay,
} from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Download, Search, Users } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'
import { FilterMenu, NO_HIDE, personVal } from '../../components/ui'
import { PEOPLE, type Person } from '../../lib/data'

// ---------- sample: a Device Notifications (SMS) message to an org, sent in batches of 20 a minute ----------
type St = 'sent' | 'failed' | 'queued' | 'none'
type Line = { sn: string; p: Person; via: 'PNS' | 'SMS'; st: St; at: string; reason: string }
const PPL = PEOPLE.filter(p => !p.extKind).slice(0, 46)
const LINES: Line[] = (() => {
  const out: Line[] = []
  let n = 0
  const time = (i: number) => '2026/11/06 09:' + String(Math.floor(i / 20)).padStart(2, '0') + ':' + String((i * 7) % 60).padStart(2, '0')
  PPL.forEach((p, i) => {
    const sn = () => '260611' + String(4200 + (++n)).padStart(6, '0')
    // most get the push; a few have no app registered, so the push fails and an SMS goes to their phone
    const noApp = i % 9 === 4
    out.push({ sn: sn(), p, via: 'PNS', st: noApp ? 'failed' : i > 42 ? 'queued' : 'sent', at: i > 42 ? '—' : time(i), reason: noApp ? 'App unregistered' : '' })
    if (noApp) {
      const bad = i === 13
      out.push({ sn: sn(), p, via: 'SMS', st: bad ? 'failed' : 'sent', at: time(i + 30), reason: bad ? 'Number not in service' : '' })
    }
  })
  return out
})()
const ST: Record<St, { label: string; color: 'green' | 'red' | 'neutral' }> = {
  sent: { label: 'Sent', color: 'green' }, failed: { label: 'Failed', color: 'red' }, queued: { label: 'Queued', color: 'neutral' }, none: { label: '—', color: 'neutral' },
}

// ---------- the table itself (shared by every option) ----------
const col = createColumnHelper<Line>()
function DeliveryTable({ height = '360px', showVia = true }: { height?: string; showVia?: boolean }) {
  const [q, setQ] = React.useState(''), [fs, setFs] = React.useState<St[]>([])
  const t = q.trim().toLowerCase()
  const rows = LINES.filter(x => (!fs.length || fs.indexOf(x.st) >= 0) && (!t || [x.sn, x.p.en, x.p.zh, x.p.emp].join(' ').toLowerCase().indexOf(t) >= 0))
  const cols = React.useMemo(() => [
    col.accessor('sn', { header: 'Serial no.', meta: { width: 140, maxWidth: 140 }, cell: i => <span className="tabular-nums">{i.getValue()}</span> }),
    col.display({ id: 'p', header: 'Recipient', meta: { width: 240 }, cell: i => <span className="flex min-w-0 items-center gap-2"><PersonDisplay value={personVal(i.row.original.p)} /><span className="shrink-0 text-caption tabular-nums text-fg-secondary">{i.row.original.p.emp}</span></span> }),
    ...(showVia ? [col.accessor('via', { header: 'Via', meta: { width: 72, maxWidth: 72 } })] : []),
    col.accessor('st', { header: 'Status', meta: { width: 96, maxWidth: 96 }, cell: i => i.getValue() === 'none' ? <span className="text-fg-muted">—</span> : <Tag size="sm" color={ST[i.getValue()].color}>{ST[i.getValue()].label}</Tag> }),
    col.accessor('at', { header: 'Sent at', meta: { width: 184, maxWidth: 184 }, cell: i => <span className="whitespace-nowrap tabular-nums">{i.getValue()}</span> }),
    col.accessor('reason', { header: 'Reason', meta: { width: 180 }, cell: i => i.getValue() || <span className="text-fg-muted">—</span> }),
  ], [showVia])
  const n = (s: St) => LINES.filter(x => x.st === s).length
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-72 max-w-full"><Input size="sm" type="search" startIcon={Search} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, employee ID or serial no." aria-label="Search" /></div>
        <FilterMenu<St> label="Status" sel={fs} toggle={k => setFs(l => (l.indexOf(k) >= 0 ? l.filter(x => x !== k) : l.concat([k])))} clear={() => setFs([])}
          opts={(['sent', 'failed', 'queued'] as St[]).map(k => ({ k, view: <Tag size="sm" color={ST[k].color}>{ST[k].label}</Tag>, n: n(k) }))} />
        <span className="ml-auto text-caption tabular-nums text-fg-secondary">{rows.length} of {LINES.length} messages</span>
      </div>
      {/* render every row (a sample of a few dozen): with the DS default overscan of 5, a fast scroll showed blank rows until they were drawn */}
      <DataTable tableOptions={NO_HIDE} columns={cols as any} data={rows} bordered height={height} overscan={LINES.length} getRowId={x => x.sn} />
    </div>
  )
}

// a stand-in for the Detail modal's left column, so each option is seen in place
const ModalLeft = ({ children }: { children: React.ReactNode }) => (
  <div className="flex overflow-hidden rounded-lg border border-divider bg-surface">
    <div className="flex min-w-0 flex-1 flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">{children}</div>
    <div className="hidden w-[220px] shrink-0 border-l border-divider bg-[var(--color-neutral-1)] p-[var(--layout-space-loose)] text-caption text-fg-secondary lg:block">Message ID, Channel, Status… (right column, unchanged)</div>
  </div>
)
const H = ({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) => <div className="flex items-center justify-between gap-2"><h3 className="text-h6 font-bold">{children}</h3>{extra}</div>
const AudienceStub = () => (
  <div className="flex items-center gap-2 rounded-md border border-divider px-3 py-3 text-body"><span className="inline-flex size-6 items-center justify-center rounded-full bg-muted"><Users className="size-3.5 text-fg-secondary" aria-hidden /></span>PENG<Tag size="sm" color="neutral">Org</Tag><span className="text-primary">{PPL.length} people</span></div>
)

function OptA() {
  const [tab, setTab] = React.useState('d')
  return (
    <ModalLeft>
      <H>Content</H><div className="h-16 rounded-md bg-[var(--color-neutral-1)]" />
      <Tabs value={tab} onValueChange={setTab}><TabsList aria-label="Audience"><TabsTrigger value="a">Audience</TabsTrigger><TabsTrigger value="d">Delivery details</TabsTrigger></TabsList></Tabs>
      {tab === 'a' ? <AudienceStub /> : <DeliveryTable />}
    </ModalLeft>
  )
}
function OptB() {
  return (
    <ModalLeft>
      <H>Content</H><div className="h-16 rounded-md bg-[var(--color-neutral-1)]" />
      <H>Audience</H><AudienceStub />
      <H>Delivery details</H><DeliveryTable height="300px" />
    </ModalLeft>
  )
}
function OptC() {
  const [open, setOpen] = React.useState(false)
  return (
    <ModalLeft>
      <H>Content</H><div className="h-16 rounded-md bg-[var(--color-neutral-1)]" />
      <H extra={<Button variant="link" size="sm" className="!h-auto !p-0" onClick={() => setOpen(true)}>View delivery details</Button>}>Audience</H><AudienceStub />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent maxWidth={1040} height="fill">
          <DialogHeader><DialogTitle>Delivery details</DialogTitle><DialogDescription className="sr-only">Every message sent, by recipient</DialogDescription></DialogHeader>
          <DialogBody><DeliveryTable height="calc(100svh - 300px)" /></DialogBody>
          <DialogFooter><Button variant="tertiary" startIcon={Download}>Export CSV</Button><Button variant="primary" onClick={() => setOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ModalLeft>
  )
}

export default function SendLog() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · 訊息詳情 · 提案</span>
          <h1 className="spec-h1">發送明細提案</h1>
          <span className="text-caption text-fg-secondary">2026/11/11 · 使用者想在訊息詳情看每個人的發送情形。三個放置方式都可以直接操作（搜尋、Status 篩選、切換分頁或開啟對話框），範例是一則 Device Notifications (SMS)；不影響原型。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Table" title="明細表格（三個方案共用）" lead="以人為單位：組織、群組都展開成個人。一則實際送出的訊息一列，有自己的流水號；同一個人收到推播又收到 SMS 時是兩列。">
          <SpecTable head={['欄位', '內容']} nowrap={[0]} rows={[
            ['Serial no.', '每一則送出的訊息的流水號'],
            ['Recipient', '姓名（人員顯示）加工號'],
            ['Via', '只在 Device Notifications (SMS)：PNS 或 SMS；其他通道不需要這欄'],
            ['Status', '這一則的狀態，比列表上的狀態少：Sent、Failed、Queued（還在排隊）；沒有資料時 —'],
            ['Sent at', '實際送出的時間到秒；大量發送時分批送，後面的人可能晚一兩分鐘；還沒送出時 —'],
            ['Reason', '失敗原因（例：App unregistered、Number not in service）；沒有時 —'],
          ]} />
          <Notes items={[
            { title: '搜尋與篩選', body: '依姓名、工號或流水號搜尋；Status 篩選沿用列表的 FilterMenu。右側顯示「n of m messages」。' },
            { title: '排序', body: '預設依流水號（等於送出順序）；可依 Status、Sent at 排序。' },
            { title: '還沒送出的訊息', body: 'Pending approval、Scheduled 等還沒送的訊息沒有明細，這個區塊不出現（或顯示「Details appear once it’s sent.」）。' },
          ]} cols />
        </Section>

        <Section eyebrow="Option A" title="A：Audience 與 Delivery details 兩個分頁" lead="左欄 Content 下方用分頁切換：Audience（選了誰，可編輯時在這裡改）／Delivery details（實際送給誰、結果）。">
          <OptA />
          <Notes items={[{ title: '優點', body: '「選了誰」和「送到誰」分開又相鄰，切換一下就能對照；版面高度不會因為明細暴增。送出前只有 Audience 分頁。' }, { title: '缺點', body: '明細要多點一下才看得到；左欄寬度有限，六個欄位稍擠。' }]} cols />
        </Section>
        <Section eyebrow="Option B" title="B：Audience 下方直接加一個 Delivery details 區塊" lead="不用切換，捲動就看得到；表格固定高度、內部捲動。">
          <OptB />
          <Notes items={[{ title: '優點', body: '最直接，打開就看得到；不新增任何互動。' }, { title: '缺點', body: '左欄變很長，Content、Audience、明細三段疊在一起；收件人上千人時，在 modal 裡捲兩層（左欄、表格）不好操作。' }]} cols />
        </Section>
        <Section eyebrow="Option C" title="C：從訊息詳情再開一個大的明細對話框" lead="Audience 標題右側放 View delivery details，開一個更寬、更高的對話框，專門看明細，可以匯出 CSV。">
          <OptC />
          <Notes items={[{ title: '優點', body: '表格有完整寬度與高度，適合上千筆；可以加匯出。訊息詳情本身維持簡潔。' }, { title: '缺點', body: '對話框疊對話框（設計系統允許，但層級多一層）；查明細要多一步。' }]} cols />
        </Section>

        <Section eyebrow="Compare" title="比較與建議">
          <SpecTable head={['', '看到明細要幾步', '大量收件人', '訊息詳情的長度', '新增的東西']} nowrap={[0]} rows={[
            ['A 分頁', '1（切分頁）', '可（表格內捲動）', '不變', 'Tabs'],
            ['B 直接一個區塊', '0（捲動）', '差（兩層捲動）', '變很長', '無'],
            ['C 再開對話框', '1（開對話框）', '最好（全寬、可匯出）', '不變', '一個對話框'],
          ]} />
          <Notes items={[
            { title: '建議：C', body: '明細是「查問題時才看」的資料，量可能很大；給它完整的空間與匯出，比擠在左欄好用。訊息詳情維持「這則訊息是什麼、送給誰」的概覽。' },
            { title: '若希望明細就在詳情裡：A', body: '分頁讓 Audience 與明細相鄰又不互相擠壓；收件人不多的團隊空間也夠用。' },
          ]} />
        </Section>

        <Section eyebrow="Coverage" title="另一則留言：以訊息數計算 Coverage" lead="把 Message Coverage by Channel 改成以「訊息」為單位時，Device Notifications (SMS) 這一列的總數會變成實際要寄出的訊息數。">
          <SpecTable head={['通道列', '以人計算（現在）', '以訊息計算']} nowrap={[0]} rows={[
            ['Device Notifications (SMS)', 'n / 人數：App 或 SMS 收得到就算一人', '推播：每人一則；SMS：勾了幾支手機就幾則（公務 + 私人的勾選總數）。分子是能寄出的則數'],
            ['Desktop OS、Email', 'n / 人數', '每人一則，數字和以人計算相同'],
          ]} />
          <Notes items={[
            { title: '需要先確認', body: 'SMS 只寄給推播收不到的人，送出前無法確定誰會收不到推播；以訊息計算時，SMS 的則數只能是「最多可能寄出」的估計值，或是只算 App 未註冊的人。這需要 PM 決定。' },
            { title: '對應的對話框', body: '「n messages can’t be sent」的名單可以改成一列一位收件人、每個通道一欄（✓ 收得到、— 收不到並附原因），讓寄件人一眼看到每個人是哪個管道收不到。' },
          ]} />
        </Section>
      </main>
    </>
  )
}
