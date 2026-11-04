// Message details (side panel next to the list) and the list of receivers a message didn't reach (dialog)
import * as React from 'react'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, DataTable, DescriptionItem, DescriptionList, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DatePicker, FileItem, ProgressBar,
  Tag,
} from '@qijenchen/design-system'
import { NO_HIDE, Tip } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import { Building2, CalendarClock, CircleAlert, Globe, Pencil, Phone, RotateCw, Send, Trash2, Users, BookUser } from 'lucide-react'
import {
  ORGS, PEOPLE, PMAP, addMin, audToTags, chFailList, failList, membersFor, orgMembers, fmtDT, fmtN, fmtSize, fromIso, isExtPhone, parseDT, plural, reqIdFor, rowChs,
  type Channel, type Fail, type Group, type Row, type Tag as RTag,
} from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { Banner, CHN, FormField, IconBox, PAvatar, StatusTag, Two } from '../../components/ui'
import { MailHtml } from '../../components/RichText'
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
function H3({ children }: { children: React.ReactNode }) { return <h3 className="text-h6 font-bold text-foreground">{children}</h3> }
// who reviews the message, as people say it
const reviewer = (r: Row) => (r.review?.by === 'mgr' ? L('your supervisor', '主管') : r.review?.by === 'both' ? L('your supervisor and ICSD', '主管和 ICSD ') : 'ICSD')
const notStarted = (r: Row) => r.status === 'pending' || r.status === 'expired' || r.status === 'rejected' || r.status === 'scheduled'

// a titled part of the details: heading to content is tight; parts sit twice the loose gap apart (see DetailBody)
function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="flex flex-col gap-[var(--layout-space-tight)]"><H3>{title}</H3>{children}</section>
}

// what one channel sent, as text (the previews belong to the send flow)
function ChannelText({ r, k }: { r: Row; k: Channel }) {
  const box = 'whitespace-pre-wrap rounded-md border border-divider p-3 text-body'
  if (k === 'sms') return <div className={box}>{r.smsText}</div>
  if (k === 'email') {
    const em = r.email
    if (!em || em.mode !== 'own') return <div className={box}><strong className="font-medium">{r.title}</strong>{'\n'}{r.content}</div>
    return (
      <div className="flex flex-col gap-2">
        <span className="text-body text-fg-secondary"><span className="font-medium text-foreground">{L('Subject:', '主旨：')}</span> {em.subject}</span>
        <MailHtml html={em.html || ''} />
        {(em.atts || []).map(a => <FileItem key={a.name} name={a.name} description={fmtSize(a.size)} onDownload={() => flash(L('Downloading', '下載中'), 'ok', a.name)} />)}
      </div>
    )
  }
  const d = k === 'desktop' && r.desk ? r.desk : r
  return <div className={box}>{d.sender ? <span className="text-caption text-fg-secondary">{d.sender}{'\n'}</span> : null}<strong className="font-medium">{d.title}</strong>{'\n'}{d.content}</div>
}

// a person a channel missed, and whether another channel still reached them
function MissRow({ f }: { f: Fail }) {
  return (
    <div className="flex items-start gap-2 py-2">
      {f.ext ? <IconBox icon={Globe} /> : <PAvatar p={f.p!} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">{f.ext || f.p!.zh + ' ' + f.p!.en}</span>
        <span className="text-caption text-fg-secondary">{tx(f.reason)}</span>
      </span>
      {f.via ? <span className="shrink-0 text-caption text-fg-secondary">{L('Got it by ', '已由') + CHN[f.via].short + L('', ' 收到')}</span> : <span className="shrink-0 text-caption font-medium text-error-text">{L('Not reached', '未收到')}</span>}
    </div>
  )
}

function ChannelRow({ m, r, k, ok, of, last }: { m: SendCtl; r: Row; k: Channel; ok: number; of: number; last: boolean }) {
  const started = !notStarted(r), miss = started && r.status !== 'progress' ? of - ok : 0
  const list = miss ? chFailList(r, k, miss) : [], I = CHN[k].icon
  const line = !started ? (k === 'sms' ? L('Only for people without the app', '只送給沒裝 App 的人') : L('Not sent yet', '尚未傳送'))
    : k === 'sms' && !of ? L('Not needed', '不需要')
    : L(fmtN(ok) + ' / ' + fmtN(of) + ' delivered', fmtN(ok) + ' / ' + fmtN(of) + ' 已送達')
  return (
    <AccordionItem value={k} className={last ? 'border-b-0' : 'border-b border-divider'}>
      <AccordionTrigger className="px-3">
        <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <I className="size-4 shrink-0 text-fg-secondary" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body font-medium">{CHN[k].name}</span>
            <span className="text-caption text-fg-secondary">{line}{miss ? <span className="text-error-text">{L(' · ' + miss + ' missed', '・' + miss + ' 人未送達')}</span> : null}</span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-3">
        <div className="flex flex-col gap-[var(--layout-space-loose)] pb-1">
          <ChannelText r={r} k={k} />
          {miss ? (
            <div className="flex flex-col gap-1">
              <span className="text-body font-medium">{L('Not delivered (' + fmtN(miss) + ')', '未送達（' + fmtN(miss) + ' 人）')}</span>
              <div className="flex flex-col divide-y divide-divider">{list.slice(0, 3).map((f, i) => <MissRow key={i} f={f} />)}</div>
              {miss > 3 ? <div><Button variant="link" size="sm" onClick={() => m.set({ ns: r.id + '|' + k })}>{L('View all ' + fmtN(miss), '查看全部 ' + fmtN(miss) + ' 人')}</Button></div> : null}
            </div>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// groups and orgs open to show who's in them (closed at first); single people and external contacts stay as tags
function AudienceList({ tags, groups }: { tags: RTag[]; groups: Group[] }) {
  const sets = tags.filter(t => t.type === 'group' || t.type === 'org'), rest = tags.filter(t => t.type !== 'group' && t.type !== 'org')
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      {sets.length ? (
        <Accordion type="multiple" className="rounded-md border border-divider">
          {sets.map((t, i) => {
            const g = t.type === 'group' ? groups.find(x => x.id === t.id) : null, o = t.type === 'org' ? ORGS.find(x => x.code === t.id) : null
            const people = g ? membersFor(g).map(x => PMAP[x.pid]).filter(Boolean) : orgMembers(t.id!)
            const name = g ? g.name : o ? o.code : t.id!, sub = g ? L('Audience group', '收件群組') : o ? o.name : ''
            return (
              <AccordionItem key={t.key} value={t.key} className={i === sets.length - 1 ? 'border-b-0' : 'border-b border-divider'}>
                <AccordionTrigger className="px-3">
                  <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    {g ? <BookUser className="size-4 shrink-0 text-fg-secondary" aria-hidden /> : <Building2 className="size-4 shrink-0 text-fg-secondary" aria-hidden />}
                    <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-medium">{name}</span><span className="truncate text-caption text-fg-secondary">{sub}</span></span>
                    <span className="shrink-0 text-caption text-fg-secondary tabular-nums">{P(people.length, 'person', '人', 'people')}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3">
                  <div className="flex max-h-[280px] flex-col divide-y divide-divider overflow-auto">
                    {people.map(p => (
                      <div key={p.id} className="flex items-center gap-2 py-2">
                        <PAvatar p={p} />
                        <span className="flex min-w-0 flex-col"><span className="truncate text-body">{p.zh + ' ' + p.en}</span><span className="truncate text-caption text-fg-secondary">{p.emp + ' · ' + p.org}</span></span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      ) : null}
      {rest.length ? <div className="flex flex-wrap gap-2">{rest.map(x => <RecvTag key={x.key} t={x} groups={groups} />)}</div> : null}
    </div>
  )
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
          {r.bypass ? (
            <Banner tone="warning" title={L('Sent without ICSD approval (urgent)', '未經 ICSD 核准送出（緊急）')}>
              {L((PMAP[r.bypass.by] || PEOPLE[0]).en + ' skipped approval on ' + r.bypass.at + '. Reason: ' + r.bypass.reason, (PMAP[r.bypass.by] || PEOPLE[0]).en + ' 於 ' + r.bypass.at + ' 略過核准。原因：' + r.bypass.reason)}
            </Banner>
          ) : null}
          <DescriptionList orientation="horizontal" divided>
            {listSender(r) ? <DescriptionItem label={L('Sender', '寄件人')}>{r.sender}</DescriptionItem> : null}
            <DescriptionItem label={L('Template', '模板')}>{m.tplName(r.tpl) || L('None', '無')}</DescriptionItem>
            <DescriptionItem label={L('Channels', '通道')}>{chs.map(k => CHN[k].name).join(', ')}</DescriptionItem>
            {r.sms || r.review ? <DescriptionItem label={L('Approval', '核准')}>{r.bypass ? L('ICSD skipped (urgent)', '已略過 ICSD（緊急）') : r.status === 'pending' ? L('Waiting for ', '等待') + reviewer(r) : r.status === 'rejected' ? L('Rejected by ', '') + reviewer(r) + L('', '駁回') : L('Approved', '已核准')}</DescriptionItem> : null}
            <DescriptionItem label={L('Created by', '建立者')}>{cr.en + ' ' + cr.zh}</DescriptionItem>
            <DescriptionItem label={L('Created', '建立時間')}>{r.created}</DescriptionItem>
            <DescriptionItem label={L('Send time', '傳送時間')}>{r.sched || L('Right away', '立即傳送')}</DescriptionItem>
          </DescriptionList>
          </div>

          <Part title={L('Delivery', '送達狀況')}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body"><span className="font-medium">{notStarted(r) ? L('Not started', '尚未開始') : fmtN(r.ok) + ' / ' + fmtN(r.total)}</span> <span className="text-fg-secondary">{r.status === 'scheduled' ? L(P(r.total, 'audience', '') + ' on ' + r.sched, r.sched + ' 傳送給 ' + r.total + ' 人') : notStarted(r) ? L(P(r.total, 'audience', ''), r.total + ' 位收件人') : L('reached', '已送達')}</span></span>
              {fails ? <Button variant="link" size="sm" startIcon={CircleAlert} className="!text-error-text hover:!text-error-text hover:underline" onClick={() => m.set({ ns: r.id })}>{L(fails + ' failed', fails + ' 人失敗')}</Button> : null}
            </div>
          </div>
          </Part>

          {/* one row per channel: its delivery on the row, open it for what it sent and who it missed */}
          <Part title={L('By channel', '各通道')}>
            <Accordion type="multiple" className="rounded-md border border-divider">
              {m.chStats(r).map((x, i) => <ChannelRow key={x.k} m={m} r={r} k={x.k} ok={x.ok} of={x.of} last={i === chs.length - 1} />)}
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
const failCols = (byCh?: boolean) => [
  fcol.display({ id: 'who', header: L('Audience', '收件人'), meta: { width: 260 }, cell: i => { const f = i.row.original; return f.ext ? <span className="flex min-w-0 items-center gap-2"><IconBox icon={Globe} /><Two a={f.ext} b={L('External', '外部')} strong /></span> : <span className="flex min-w-0 items-center gap-2"><PAvatar p={f.p!} /><Two a={f.p!.zh + ' ' + f.p!.en} b={f.p!.emp + ' · ' + f.p!.nt} strong /></span> } }),
  fcol.display({ id: 'org', header: L('Org', '組織'), meta: { width: 110 }, cell: i => <span className="truncate">{i.row.original.ext ? '—' : i.row.original.p!.org}</span> }),
  fcol.display({ id: 'why', header: L('Reason', '原因'), meta: { width: byCh ? 230 : 280 }, cell: i => <Two a={tx(i.row.original.reason)} b={tx(i.row.original.fallback)} /> }),
  // on one channel's list: did another channel still reach them?
  ...(byCh ? [fcol.display({ id: 'via', header: L('Other channels', '其他通道'), meta: { width: 170 }, cell: i => { const v = i.row.original.via; return v ? <span>{L('Got it by ', '已由') + CHN[v].short + L('', ' 收到')}</span> : <span className="font-medium text-error-text">{L('Not reached', '未收到')}</span> } })] : []),
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
            <DialogTitle>{L(fmtN(n) + ' of ' + fmtN(st ? st.of : 0) + ' didn’t get ' + CHN[nch].name, fmtN(n) + ' / ' + fmtN(st ? st.of : 0) + ' 人沒收到' + CHN[nch].name)}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={failCols() as any} data={list} bordered height="380px" autoRowHeight getRowId={(_, i) => String(i)} />
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
            <DialogTitle>{L(fmtN(list.length) + ' of ' + fmtN(r.total) + ' failed', fmtN(list.length) + ' / ' + fmtN(r.total) + ' 人失敗')}</DialogTitle>
            <DialogDescription className="text-body text-fg-secondary">{r.title}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {r.err ? <Banner tone="error" title={tx(r.err.title)}>{tx(r.err.text)}</Banner> : null}
            <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={failCols() as any} data={list} bordered height="340px" autoRowHeight getRowId={(_, i) => String(i)} />
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
              <DialogDescription className="text-body text-fg-secondary">{L('It’s already approved, so it won’t go back for review.', '這則訊息已經核准，改時間不需要重新送審。')}</DialogDescription>
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
