// Message details (side panel next to the list) and the list of receivers a message didn't reach (dialog)
import * as React from 'react'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, DataTable, DescriptionItem, DescriptionList, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DatePicker, FileItem, ProgressBar,
  Tag,
} from '@qijenchen/design-system'
import { NO_HIDE, Tip } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import { Building2, CornerDownRight, CalendarClock, CircleAlert, Globe, Pencil, Phone, RotateCw, Send, Trash2, Users, BookUser } from 'lucide-react'
import {
  ICSD, ORGS, PEOPLE, PMAP, addMin, audToTags, chFailList, failList, membersFor, orgMembers, fmtDT, fmtN, fmtSize, fromIso, isExtPhone, parseDT, plural, reqIdFor, rowChs,
  type Channel, type Fail, type Group, type Row, type Tag as RTag,
} from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { Banner, CHN, FormField, IconBox, PAvatar, StatusTag, Two } from '../../components/ui'
import { MailHtml } from '../../components/RichText'
import { MembersDialog, type MemberSet } from '../../components/MembersDialog'
import { ShellAside } from '../../components/shell'
import { listSender, type SendCtl } from './ctl'
import { L, P, niceDT, tx } from '../../lib/i18n'

export function RecvTag({ t, groups }: { t: RTag; groups: Group[] }) {
  if (t.type === 'person') {
    const p = PMAP[t.id!]
    return <Tip text={p ? p.nt + ' · ' + p.emp + ' · ' + p.org : ''}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" avatar={p ? <PAvatar p={p} size={16} /> : undefined}>{p ? p.zh + ' ' + p.en : t.id}</Tag></span></Tip>
  }
  if (t.type === 'group') {
    const g = groups.find(x => x.id === t.id) || { name: t.id, count: 0 }
    return <Tip text={L('Audience group · ', '收件群組 · ') + P(g.count, 'member', '人')}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" icon={BookUser}>{g.name} · {fmtN(g.count)}</Tag></span></Tip>
  }
  if (t.type === 'org') {
    const o = ORGS.find(x => x.code === t.id) || { code: t.id, name: '', count: 0 }
    return <Tip text={o.name + ' · ' + P(o.count, 'member', '人')}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" icon={Building2}>{o.code} · {fmtN(o.count)}</Tag></span></Tip>
  }
  const ph = isExtPhone(t)
  return <Tip text={ph ? L('External phone', '外部電話') : L('External email', '外部 Email')}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" color="amber" icon={ph ? Phone : Globe}>{t.email} · {L('External', '外部')}</Tag></span></Tip>
}

function statText(x: { k: string; ok: number; of: number }) {
  if (x.k === 'sms') return x.of ? L(fmtN(x.ok) + ' of ' + fmtN(x.of) + ' delivered', fmtN(x.ok) + ' / ' + fmtN(x.of) + ' 已送達') : L('Not needed', '不需要')
  return L(fmtN(x.ok) + ' of ' + fmtN(x.of) + ' delivered', fmtN(x.ok) + ' / ' + fmtN(x.of) + ' 已送達')
}
export function H3({ children }: { children: React.ReactNode }) { return <h3 className="text-h6 font-bold text-foreground">{children}</h3> }
// who reviews the message, as people say it
// with ICSD switched off every approval is the supervisor's
export const reviewer = (r: Row) => (!ICSD || r.review?.by === 'mgr' ? L('your supervisor', '主管') : r.review?.by === 'both' ? L('your supervisor and the SMS reviewer', '主管和 SMS 審核人員') : L('the SMS reviewer', 'SMS 審核人員'))
export const notStarted = (r: Row) => r.status === 'pending' || r.status === 'expired' || r.status === 'rejected' || r.status === 'scheduled'

// a titled part of the details: heading to content is tight; parts sit twice the loose gap apart (see DetailBody)
export function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="flex flex-col gap-[var(--layout-space-tight)]"><H3>{title}</H3>{children}</section>
}

// what one channel sent, as text (the previews belong to the send flow)
export function ChannelText({ r, k }: { r: Row; k: Channel }) {
  const box = 'whitespace-pre-wrap rounded-md border border-divider p-3 text-body'
  if (k === 'sms') return <div className={box}>{r.smsText}</div>
  if (k === 'email') {
    const em = r.email
    if (!em || em.mode !== 'own') return <div className={box}><strong className="font-medium">{r.title}</strong>{'\n'}{r.content}</div>
    return (
      <div className="flex flex-col gap-2">
        <span className="text-body text-fg-secondary"><span className="font-medium text-foreground">{L('Subject:', '主旨：')}</span> {em.subject}</span>
        <MailHtml html={em.html || ''} />
        {(em.atts || []).map(a => <FileItem key={a.name} name={a.name} description={fmtSize(a.size)} onDownload={() => flash(L('Downloading', '下載中'), 'ok')} />)}
      </div>
    )
  }
  const d = k === 'desktop' && r.desk ? r.desk : r
  return <div className={box}>{d.sender ? <span className="text-caption text-fg-secondary">{d.sender}{'\n'}</span> : null}<strong className="font-medium">{d.title}</strong>{'\n'}{d.content}</div>
}

// SMS is the fallback for Device Notifications: its row sits right under it, indented, and says who it was for.
// Device Notifications counts the people it missed as failed, and says how many of them got the SMS instead.
// channels in the order people get them: SMS right after Device Notifications, since it's its fallback
function byChannel(m: SendCtl, r: Row) {
  const all = m.chStats(r), sms = all.find(x => x.k === 'sms'), rest = all.filter(x => x.k !== 'sms')
  const i = rest.findIndex(x => x.k === 'push')
  if (sms && i >= 0) rest.splice(i + 1, 0, sms)
  return rest
}

function ChannelRow({ m, r, k, ok, of, sms, last }: { m: SendCtl; r: Row; k: Channel; ok: number; of: number; sms?: number; last: boolean }) {
  const started = !notStarted(r), fail = started && r.status !== 'progress' ? of - ok : 0, fb = k === 'sms'
  const I = fb ? CornerDownRight : CHN[k].icon, name = fb ? L('SMS fallback', 'SMS 備援') : CHN[k].name
  // the same format on every row; SMS fallback's count is the people Device Notifications missed (its place,
  // indented under Device Notifications, says so)
  const line = !started ? L('Not sent yet', '尚未傳送')
    : fb && !of ? L('Not needed', '不需要')
    : L(fmtN(ok) + ' / ' + fmtN(of) + ' delivered', fmtN(ok) + ' / ' + fmtN(of) + ' 已送達')
  return (
    <AccordionItem value={k} className={last ? 'border-b-0' : 'border-b border-divider'}>
      <AccordionTrigger className={fb ? 'pl-9 pr-3' : 'px-3'}>
        <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <I className="size-4 shrink-0 text-fg-secondary" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-medium">{name}</span>
            <span className="text-caption text-fg-secondary">{line}
              {fail ? <span className="text-error-text">{L(' · ' + fmtN(fail) + ' failed', '・' + fmtN(fail) + ' 人失敗')}</span> : null}
              {!fb && sms && started ? <span className="text-success-text">{L(' · ' + fmtN(sms) + ' delivered via SMS', '・' + fmtN(sms) + ' 人改由 SMS 送達')}</span> : null}
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className={fb ? 'pl-9 pr-3' : 'px-3'}>
        <div className="flex flex-col gap-[var(--layout-space-loose)] pb-1">
          <ChannelText r={r} k={k} />
          {fail ? <div><Button variant="link" size="sm" className="!h-auto !p-0" onClick={() => m.set({ ns: r.id + '|' + k })}>{L('See failed audience members (' + fmtN(fail) + ')', '查看傳送失敗的收件人（' + fmtN(fail) + ' 人）')}</Button></div> : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// every audience is a row, in a fixed order: orgs, groups, people, then external contacts. Orgs and groups
// show their size as a link that opens a searchable member list (as in step 1 of the send flow).
const AUD_ORDER = { org: 0, group: 1, person: 2, ext: 3 } as Record<string, number>
export function AudienceList({ tags, groups }: { tags: RTag[]; groups: Group[] }) {
  const [mem, setMem] = React.useState<MemberSet | null>(null)
  const list = tags.slice().sort((a, b) => AUD_ORDER[a.type] - AUD_ORDER[b.type])
  const icon = (I: typeof Globe) => <span className="inline-flex size-6 shrink-0 items-center justify-center"><I className="size-4 text-fg-secondary" aria-hidden /></span>
  return (
    <>
      <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
        {list.map(t => {
          let lead: React.ReactNode, name = '', sub = '', end: React.ReactNode = null
          if (t.type === 'group' || t.type === 'org') {
            const g = t.type === 'group' ? groups.find(x => x.id === t.id) : null, o = t.type === 'org' ? ORGS.find(x => x.code === t.id) : null
            const people = g ? membersFor(g).map(x => PMAP[x.pid]).filter(Boolean) : orgMembers(t.id!)
            name = g ? g.name : o ? o.code : t.id!; sub = g ? L('Audience group', '收件群組') : L('Org', '組織') + (o ? ' · ' + o.name : '')
            lead = icon(g ? BookUser : Building2)
            end = <Button variant="link" size="sm" className="!h-auto !min-w-0 shrink-0 !p-0 tabular-nums" aria-label={L('See the ' + people.length + ' members of ', '查看成員：') + name}
              onClick={() => setMem({ name, kind: g ? L('Group', '群組') : L('Org', '組織'), people, group: g ? g.id : undefined })}>{P(people.length, 'person', '人', 'people')}</Button>
          } else if (t.type === 'person') {
            const p = PMAP[t.id!]
            lead = p ? <PAvatar p={p} /> : icon(Users); name = p ? p.zh + ' ' + p.en : t.id!; sub = p ? p.emp + ' · ' + p.org : ''
          } else {
            const ph = isExtPhone(t)
            lead = icon(ph ? Phone : Globe); name = t.email!
            sub = ph ? L('External phone · SMS only', '外部電話・只收 SMS') : L('External email · Email only', '外部 Email・只收 Email')
          }
          return (
            <div key={t.key} className="flex items-center gap-3 px-3 py-3">
              {lead}
              <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-medium">{name}</span><span className="truncate text-caption text-fg-secondary">{sub}</span></span>
              {end}
            </div>
          )
        })}
      </div>
      <MembersDialog set={mem} onClose={() => setMem(null)} />
    </>
  )
}

// the actual send time: the schedule, or when it went out (right after approval, or when it was created);
// a message that still waits for approval with no schedule has no time yet
export function sendTime(r: Row) {
  if (r.sched) return r.sched
  if (r.status === 'pending' || r.status === 'rejected') return '—'
  return r.review && r.review.at ? r.review.at : r.created
}

export function DetailSheet({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, r = s.det ? app.rows.find(x => x.id === s.det) : null
  if (!r) return null
  return <ShellAside title={L('Message details', '訊息詳情')} onClose={() => m.set({ det: null })}><DetailBody m={m} r={r} groups={app.groups} /></ShellAside>
}

function DetailBody({ m, r, groups }: { m: SendCtl; r: Row; groups: Group[] }) {
  const cr = PMAP[r.creator] || PEOPLE[0], chs = rowChs(r), done = r.status === 'sent' || r.status === 'error'
  const fails = done ? r.total - r.ok : 0, hasN = r.channels.indexOf('push') >= 0 || r.channels.indexOf('desktop') >= 0
  const pct = Math.round(r.ok / Math.max(1, r.total) * 100), em = r.email
  return (
    <>
      <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col gap-[var(--layout-space-loose)] px-[var(--layout-space-loose)] pt-[var(--layout-space-tight)] pb-[var(--layout-space-loose)]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2"><StatusTag s={r.status} /><span className="font-mono text-caption text-fg-secondary">{reqIdFor(r)}</span></div>
          <h3 className="text-body-lg font-medium text-foreground">{r.title}</h3>
        </div>
        <div className="flex flex-col gap-[calc(var(--layout-space-loose)*2)] pb-[var(--layout-space-loose)]">
          <div className="flex flex-col gap-[var(--layout-space-loose)]">
          {r.status === 'pending' ? <Banner tone="info" title={L('Waiting for approval from ' + reviewer(r), '等待' + reviewer(r) + '核准')}>{r.sched ? L('Sends at ' + r.sched + ' if it’s approved by then.', '核准後會在 ' + r.sched + ' 送出。') : L('Sends as soon as it’s approved.', '核准後立即送出。')}</Banner> : null}
          {r.status === 'expired' ? <Banner tone="warning" title={L('Approved after its scheduled time', '核准時已過排程時間')}>{L(reviewer(r) + ' approved it on ' + (r.review?.at || '') + ', after the scheduled ' + r.sched + ', so it wasn’t sent. Send it now, pick a new time, or delete it.', reviewer(r) + '於 ' + (r.review?.at || '') + ' 核准，已超過原訂的 ' + r.sched + '，所以沒有送出。可以立即傳送、重新排程或刪除。')}</Banner> : null}
          {r.status === 'rejected' ? <Banner tone="error" title={L('Rejected by ' + reviewer(r), reviewer(r) + '駁回')}>{L((r.review?.at ? r.review.at + '. ' : '') + 'Reason: ' + (r.review?.reason || ''), (r.review?.at ? r.review.at + '。' : '') + '原因：' + tx(r.review?.reason || ''))}</Banner> : null}
          {ICSD && r.bypass ? (
            <Banner tone="warning" title={L('Sent without SMS approval (urgent)', '未經 SMS 核准送出（緊急）')}>
              {L((PMAP[r.bypass.by] || PEOPLE[0]).en + ' skipped approval on ' + r.bypass.at + '. Reason: ' + r.bypass.reason, (PMAP[r.bypass.by] || PEOPLE[0]).en + ' 於 ' + r.bypass.at + ' 略過核准。原因：' + r.bypass.reason)}
            </Banner>
          ) : null}
          <DescriptionList orientation="horizontal" divided>
            {listSender(r) ? <DescriptionItem label={L('Sender', '寄件人')}>{r.sender}</DescriptionItem> : null}
            <DescriptionItem label={L('Template', '模板')}>{m.tplName(r.tpl) || '—'}</DescriptionItem>
            <DescriptionItem label={L('Channels', '通道')}>{chs.map(k => CHN[k].name).join(', ')}</DescriptionItem>
            {(ICSD && r.sms) || r.review ? <DescriptionItem label={L('Approval', '核准')}>{ICSD && r.bypass ? L('SMS approval skipped (urgent)', '已略過 SMS 核准（緊急）') : r.status === 'pending' ? L('Waiting for ', '等待') + reviewer(r) : r.status === 'rejected' ? L('Rejected by ', '') + reviewer(r) + L('', '駁回') : L('Approved', '已核准')}</DescriptionItem> : null}
            <DescriptionItem label={L('Created by', '建立者')}>{cr.en + ' ' + cr.zh}</DescriptionItem>
            <DescriptionItem label={L('Created', '建立時間')}>{r.created}</DescriptionItem>
            <DescriptionItem label={L('Send time', '傳送時間')}>{sendTime(r)}</DescriptionItem>
          </DescriptionList>
          </div>

          {/* same name and numbers as the list's Reach / Audience column */}
          <Part title={L('Reach / Audience', '送達 / 收件人')}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body tabular-nums"><span className="font-medium">{notStarted(r) ? '–' : fmtN(r.ok)}</span><span className="text-fg-secondary"> / {fmtN(r.total)}{notStarted(r) ? (r.status === 'scheduled' ? L(' · sends ' + r.sched, '・' + r.sched + ' 傳送') : L(' · not sent yet', '・尚未傳送')) : ''}</span></span>
              {fails ? <Button variant="link" size="sm" startIcon={CircleAlert} className="!text-error-text hover:!text-error-text hover:underline" onClick={() => m.set({ ns: r.id })}>{L(fails + ' failed', fails + ' 人失敗')}</Button> : null}
            </div>
          </div>
          </Part>

          {/* one row per channel: its delivery on the row, open it for what it sent and who it missed */}
          <Part title={L('By channel', '各通道')}>
            <Accordion type="multiple" className="rounded-md border border-divider">
              {byChannel(m, r).map((x, i, all) => <ChannelRow key={x.k} m={m} r={r} k={x.k} ok={x.ok} of={x.of} sms={x.k === 'push' ? all.find(y => y.k === 'sms')?.ok : undefined} last={i === all.length - 1} />)}
            </Accordion>
          </Part>

          <Part title={L('Audiences', '收件人')}>
            <AudienceList tags={audToTags(r.aud)} groups={groups} />
          </Part>

        </div>
      </div>
      {/* actions sit at the bottom of the panel (DS footer: destructive on the left, primary on the right);
          only messages that haven't gone out have any, so the others show no footer */}
      {r.status === 'scheduled' || r.status === 'expired' || r.status === 'rejected' ? <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-divider bg-surface px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
        <Button variant="text" danger startIcon={Trash2} className="mr-auto" onClick={() => m.askDelete(r)}>{L('Delete', '刪除')}</Button>
        {r.status === 'scheduled' ? <Button variant="secondary" startIcon={Pencil} onClick={() => m.startCompose('edit', r)}>{L('Edit', '編輯')}</Button> : null}
        {r.status === 'rejected' ? <Button variant="primary" startIcon={Pencil} onClick={() => m.startCompose('edit', r)}>{L('Edit and resubmit', '修改後重新送審')}</Button> : null}
        {r.status === 'expired' ? <>
          <Button variant="secondary" startIcon={CalendarClock} onClick={() => m.openReschedule(r)}>{L('Reschedule', '重新排程')}</Button>
          <Button variant="primary" startIcon={Send} onClick={() => m.askSendNow(r)}>{L('Send now', '立即傳送')}</Button>
        </> : null}
      </div> : null}
      </div>
    </>
  )
}

const fcol = createColumnHelper<Fail>()
export const failCols = (byCh?: boolean) => [
  fcol.display({ id: 'who', header: L('Audience', '收件人'), cell: i => { const f = i.row.original; return f.ext ? <span className="flex min-w-0 items-center gap-2"><IconBox icon={Globe} /><Two a={f.ext} b={L('External', '外部')} strong /></span> : <span className="flex min-w-0 items-center gap-2"><PAvatar p={f.p!} /><Two a={f.p!.zh + ' ' + f.p!.en} b={f.p!.emp + ' · ' + f.p!.nt} strong /></span> } }),
  fcol.display({ id: 'org', header: L('Org', '組織'), cell: i => <span className="truncate">{i.row.original.ext ? '—' : i.row.original.p!.org}</span> }),
  fcol.display({ id: 'why', header: L('Reason', '原因'), meta: { width: 300 }, cell: i => { const f = i.row.original; return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <Two a={tx(f.reason)} b={tx(f.fallback)} />
      {f.via === 'sms' ? <Tag size="sm" color="green">{L('Delivered via SMS', '已由 SMS 送達')}</Tag> : null}
    </span>
  ) } }),
  // on one channel's list: did another channel still reach them?
  ...(byCh ? [fcol.display({ id: 'via', header: L('Other channels', '其他通道'), cell: i => { const v = i.row.original.via; return v ? <span>{L('Got it by ', '已由') + CHN[v].short + L('', ' 收到')}</span> : <span className="font-medium text-error-text">{L('Not reached', '未收到')}</span> } })] : []),
]

export function NotSentDialog({ m }: { m: SendCtl }) {
  // ns is a message id for the people no channel reached, or "id|channel" for the people one channel missed
  const app = useApp(), s = m.s, [nid, nch] = (s.ns || '').split('|') as [string, Channel | undefined], r = nid ? app.rows.find(x => x.id === nid) : null
  const close = () => m.set({ ns: null })
  let body: React.ReactNode = null
  if (r && nch) {
    const st = m.chStats(r).find(x => x.k === nch), n = st ? st.of - st.ok : 0, list = chFailList(r, nch, n)
    body = (
      <>
        <DialogHeader>
          <div className="flex flex-col gap-0.5">
            <DialogTitle>{L('Failed audience members', '傳送失敗的收件人')}</DialogTitle>
            <DialogDescription className="text-body text-fg-secondary">{CHN[nch].name + ' · ' + L(fmtN(n) + ' of ' + fmtN(st ? st.of : 0), fmtN(n) + ' / ' + fmtN(st ? st.of : 0) + ' 人')}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <DataTable tableOptions={NO_HIDE} columns={failCols() as any} data={list} bordered height="380px" autoRowHeight getRowId={(_, i) => String(i)} />
        </DialogBody>
      </>
    )
  } else if (r) {
    const list = failList(r), counts: Record<string, number> = {}, order: string[] = []
    list.forEach(f => { if (!counts[f.reason]) { counts[f.reason] = 0; order.push(f.reason) } counts[f.reason]++ })
    body = (
      <>
        <DialogHeader>
          <div className="flex flex-col gap-0.5">
            <DialogTitle>{L('Failed audience members', '傳送失敗的收件人')}</DialogTitle>
            <DialogDescription className="text-body text-fg-secondary">{L('All channels · ' + fmtN(list.length) + ' of ' + fmtN(r.total), '所有通道 · ' + fmtN(list.length) + ' / ' + fmtN(r.total) + ' 人')}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {r.err ? <Banner tone="error" title={tx(r.err.title)}>{tx(r.err.text)}</Banner> : null}
            <DataTable tableOptions={NO_HIDE} columns={failCols() as any} data={list} bordered height="340px" autoRowHeight getRowId={(_, i) => String(i)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="primary" startIcon={RotateCw} onClick={() => m.resendNotSent(r)}>{r.status === 'error' ? L('Retry', '重新傳送') : L('Resend to ' + fmtN(list.length), '重寄給 ' + fmtN(list.length) + ' 人')}</Button>
        </DialogFooter>
      </>
    )
  }
  return (
    <Dialog open={!!r} onOpenChange={o => { if (!o) close() }}>
      {r ? <DialogContent maxWidth={nch ? 860 : 760} height="hug">{body}</DialogContent> : null}
    </Dialog>
  )
}

// Reschedule an expired message: a new time, no new approval
export function RescheduleDialog({ m }: { m: SendCtl }) {
  const app = useApp(), rs = m.s.rs, r = rs ? app.rows.find(x => x.id === rs.id) : null, close = () => m.set({ rs: null })
  const err = rs && (rs.tried || rs.at) ? m.rescheduleErr() : '', show = rs?.tried ? err : ''
  const d = rs ? fromIso(rs.at) : null
  return (
    <Dialog open={!!r} onOpenChange={o => { if (!o) close() }}>
      {r && rs ? (
        <DialogContent maxWidth={480} height="hug">
          <DialogHeader>
            <div className="flex flex-col gap-0.5">
              <DialogTitle>{L('Reschedule', '重新排程')}</DialogTitle>
              <DialogDescription className="sr-only">{L('Reschedule', '重新排程')}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <FormField id="rs-at" label={L('New date and time', '新的日期和時間')} required hint={d && !err ? L('Sends ', '將於 ') + niceDT(d) + L('', ' 傳送') : L('Taipei time (GMT+8), up to 30 days ahead', '台北時間（GMT+8），30 天內')} error={show}>
              <DatePicker id="rs-at" showTime typeable locale={L('en-US', 'zh-TW')} value={rs.at || null} error={!!show} onChange={v => m.set({ rs: { ...rs, at: v || '' } })} placeholder="YYYY/MM/DD HH:MM" />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button>
            <Button variant="primary" startIcon={CalendarClock} onClick={() => m.reschedule()}>{L('Reschedule', '重新排程')}</Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
