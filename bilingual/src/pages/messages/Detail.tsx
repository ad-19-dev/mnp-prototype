// Message details (side sheet) and the list of receivers a message didn't reach (dialog)
import * as React from 'react'
import {
  Button, DataTable, DescriptionItem, DescriptionList, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, FileItem, ProgressBar, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader,
  SheetTitle, StepDescription, StepItem, StepLabel, Steps, Tag,
} from '@qijenchen/design-system'
import { NO_HIDE, Tip } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import { Building2, CircleAlert, Copy, Globe, Pencil, Phone, RotateCw, Users } from 'lucide-react'
import {
  ORGS, PEOPLE, PMAP, addMin, audToTags, failList, fmtDT, fmtN, fmtSize, isExtPhone, parseDT, plural, reqIdFor, rowChs,
  type Fail, type Group, type Row, type Tag as RTag,
} from '../../lib/data'
import { flash, useApp } from '../../lib/store'
import { Banner, CHN, IconBox, PAvatar, StatusTag, Two } from '../../components/ui'
import { MailHtml } from '../../components/RichText'
import type { SendCtl } from './ctl'
import { L, P, tx } from '../../lib/i18n'

export function RecvTag({ t, groups }: { t: RTag; groups: Group[] }) {
  if (t.type === 'person') {
    const p = PMAP[t.id!]
    return <Tip text={p ? p.nt + ' · ' + p.emp + ' · ' + p.org : ''}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" avatar={p ? <PAvatar p={p} size={16} /> : undefined}>{p ? p.zh + ' ' + p.en : t.id}</Tag></span></Tip>
  }
  if (t.type === 'group') {
    const g = groups.find(x => x.id === t.id) || { name: t.id, count: 0 }
    return <Tip text={L('Audience group · ', '收件群組 · ') + P(g.count, 'member', '人')}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" icon={Users}>{g.name} · {fmtN(g.count)}</Tag></span></Tip>
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
function H3({ children }: { children: React.ReactNode }) { return <h3 className="text-body font-semibold text-foreground">{children}</h3> }

export function DetailSheet({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, r = s.det ? app.rows.find(x => x.id === s.det) : null
  const close = () => m.set({ det: null })
  return (
    <Sheet open={!!r} onOpenChange={o => { if (!o) close() }}>
      {r ? <SheetContent side="right" className="w-full sm:max-w-[560px]"><DetailBody m={m} r={r} groups={app.groups} close={close} /></SheetContent> : null}
    </Sheet>
  )
}

function DetailBody({ m, r, groups, close }: { m: SendCtl; r: Row; groups: Group[]; close: () => void }) {
  const cr = PMAP[r.creator] || PEOPLE[0], chs = rowChs(r), done = r.status === 'sent' || r.status === 'error'
  const fails = done ? r.total - r.ok : 0, hasN = r.channels.indexOf('push') >= 0 || r.channels.indexOf('desktop') >= 0
  const created = parseDT(r.created) || new Date(), sched = r.sched ? parseDT(r.sched) : null
  const events: { t: string; when: string; cls: 'done' | 'cur' | 'bad' }[] = [{ t: L('Created by ' + cr.en, cr.en + ' 建立'), when: r.created, cls: 'done' }]
  let t = created
  if (r.aud.some(a => a[0] === 'e') && r.channels.indexOf('email') >= 0) { t = addMin(t, 41); events.push({ t: L('Approved by supervisor Jimmy Chen', '主管 Jimmy Chen 已核准'), when: fmtDT(t), cls: 'done' }) }
  if (r.sms) { t = addMin(t, 23); events.push({ t: L('Approved by ICSD', 'ICSD 已核准'), when: fmtDT(t), cls: 'done' }) }
  const start = sched || addMin(t, 2)
  if (r.status === 'scheduled') events.push({ t: L('Scheduled', '排程傳送'), when: fmtDT(start), cls: 'cur' })
  else {
    events.push({ t: L('Started sending', '開始傳送'), when: fmtDT(start), cls: 'done' })
    if (r.status === 'progress') events.push({ t: L(fmtN(r.ok) + ' of ' + fmtN(r.total) + ' reached', '已送達 ' + fmtN(r.ok) + ' / ' + fmtN(r.total)), when: L('Sending…', '傳送中…'), cls: 'cur' })
    if (r.status === 'sent') events.push({ t: L('Done: ' + fmtN(r.ok) + ' reached' + (fails ? ', ' + fails + ' not sent' : ''), '完成：' + fmtN(r.ok) + ' 人送達' + (fails ? '，' + fails + ' 人未送達' : '')), when: fmtDT(addMin(start, Math.max(1, Math.round(r.total / 90)))), cls: 'done' })
    if (r.status === 'error') events.push({ t: L('Failed: nothing was delivered', '失敗：所有人都沒收到'), when: fmtDT(addMin(start, 1)), cls: 'bad' })
  }
  const evId = (i: number) => 'ev' + i
  const curIdx = Math.max(0, events.findIndex(e => e.cls !== 'done'))
  const pct = Math.round(r.ok / Math.max(1, r.total) * 100), em = r.email
  return (
    <>
      <SheetHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2"><StatusTag s={r.status} /><span className="font-mono text-caption text-fg-secondary">{reqIdFor(r)}</span></div>
          <SheetTitle className="text-body-lg">{r.title}</SheetTitle>
          <SheetDescription className="sr-only">{L('Message details', '訊息詳情')}</SheetDescription>
        </div>
      </SheetHeader>
      <SheetBody>
        <div className="flex flex-col gap-[var(--layout-space-loose)] pb-[var(--layout-space-loose)]">
          <DescriptionList orientation="horizontal" divided>
            <DescriptionItem label={L('Sender', '寄件人')}>{r.sender}</DescriptionItem>
            <DescriptionItem label={L('Template', '模板')}>{m.tplName(r.tpl) || L('None', '無')}</DescriptionItem>
            <DescriptionItem label={L('Channels', '通道')}>{chs.map(k => CHN[k].name).join(', ')}</DescriptionItem>
            <DescriptionItem label={L('Created by', '建立者')}>{cr.en + ' ' + cr.zh}</DescriptionItem>
            <DescriptionItem label={L('Created', '建立時間')}>{r.created}</DescriptionItem>
            <DescriptionItem label={L('Send time', '傳送時間')}>{r.sched || L('Right away', '立即傳送')}</DescriptionItem>
          </DescriptionList>

          <H3>{L('Delivery', '送達狀況')}</H3>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body"><span className="font-medium">{r.status === 'scheduled' ? L('Not started', '尚未開始') : fmtN(r.ok) + ' / ' + fmtN(r.total)}</span> <span className="text-fg-secondary">{r.status === 'scheduled' ? L(P(r.total, 'receiver', '') + ' on ' + r.sched, r.sched + ' 傳送給 ' + r.total + ' 人') : L('reached', '已送達')}</span></span>
              {fails ? <Button variant="link" size="sm" startIcon={CircleAlert} className="!text-warning-text hover:!text-warning-text hover:underline" onClick={() => m.set({ ns: r.id })}>{L(fails + ' not sent', fails + ' 人未送達')}</Button> : null}
            </div>
            <ProgressBar aria-label={L('Delivered', '已送達')} value={pct} status={r.status === 'error' ? 'error' : r.status === 'sent' ? 'success' : 'inProgress'} />
            {done && chs.length > 1 ? (
              <div className="mt-1 flex flex-col gap-3 border-t border-divider pt-3">
                {m.chStats(r).map(x => (
                  <div key={x.k} className="grid grid-cols-[auto_1fr_120px] items-center gap-3">
                    <IconBox icon={CHN[x.k].icon} tone={x.k === 'sms' ? 'warn' : 'neutral'} />
                    <Two a={CHN[x.k].name} b={statText(x)} strong />
                    <ProgressBar aria-label={CHN[x.k].name} value={x.of ? Math.round(x.ok / x.of * 100) : 0} status="success" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {hasN ? <><H3>{L('Notification', '通知內容')}</H3><div className="whitespace-pre-wrap rounded-md bg-neutral-1 p-3 text-body"><strong className="font-medium">{r.title}</strong>{'\n'}{r.content}</div></> : null}
          {r.sms && r.smsText ? <><H3>SMS</H3><div className="rounded-md bg-neutral-1 p-3 text-body">{r.smsText}</div></> : null}
          {em ? (
            <>
              <H3>Email</H3>
              {em.mode === 'own' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-body text-fg-secondary"><span className="font-medium text-foreground">{L('Subject:', '主旨：')}</span> {em.subject}</span>
                  <MailHtml html={em.html || ''} />
                  {(em.atts || []).map(a => <FileItem key={a.name} name={a.name} description={fmtSize(a.size)} onDownload={() => flash(L('Downloading', '下載中'), 'ok', a.name)} />)}
                </div>
              ) : <p className="text-body text-fg-secondary">{L('Same as the notification.', '和通知內容相同。')}</p>}
            </>
          ) : null}

          <H3>{L('Receivers', '收件人')}</H3>
          <div className="flex flex-wrap gap-2">{audToTags(r.aud).map(x => <RecvTag key={x.key} t={x} groups={groups} />)}</div>

          <H3>{L('Activity', '紀錄')}</H3>
          <Steps orientation="vertical" size="sm" value={evId(events[curIdx].cls === 'done' ? events.length - 1 : curIdx)}
            completedValues={events.map((e, i) => e.cls === 'done' ? evId(i) : '').filter(Boolean)}
            errorValues={events.map((e, i) => e.cls === 'bad' ? evId(i) : '').filter(Boolean)}>
            {events.map((ev, i) => (
              <StepItem key={i} value={evId(i)} state={ev.cls === 'bad' ? 'error' : undefined}>
                <StepLabel>{ev.t}</StepLabel>
                <StepDescription>{ev.when}</StepDescription>
              </StepItem>
            ))}
          </Steps>
        </div>
      </SheetBody>
      <SheetFooter>
        {r.status === 'scheduled' ? <Button variant="tertiary" startIcon={Pencil} onClick={() => m.startCompose('edit', r)}>{L('Edit', '編輯')}</Button> : null}
        <Button variant="tertiary" startIcon={Copy} onClick={() => m.startCompose('duplicate', r)}>{L('Duplicate', '複製')}</Button>
        <Button variant="primary" onClick={close}>{L('Close', '關閉')}</Button>
      </SheetFooter>
    </>
  )
}

const fcol = createColumnHelper<Fail>()
const failCols = () => [
  fcol.display({ id: 'who', header: L('Receiver', '收件人'), meta: { width: 260 }, cell: i => { const f = i.row.original; return f.ext ? <span className="flex min-w-0 items-center gap-2"><IconBox icon={Globe} /><Two a={f.ext} b={L('External', '外部')} strong /></span> : <span className="flex min-w-0 items-center gap-2"><PAvatar p={f.p!} /><Two a={f.p!.zh + ' ' + f.p!.en} b={f.p!.emp + ' · ' + f.p!.nt} strong /></span> } }),
  fcol.display({ id: 'org', header: L('Org', '組織'), meta: { width: 110 }, cell: i => <span className="truncate">{i.row.original.ext ? '—' : i.row.original.p!.org}</span> }),
  fcol.display({ id: 'why', header: L('Reason', '原因'), meta: { width: 280 }, cell: i => <Two a={tx(i.row.original.reason)} b={tx(i.row.original.fallback)} /> }),
]

export function NotSentDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, r = s.ns ? app.rows.find(x => x.id === s.ns) : null
  const close = () => m.set({ ns: null })
  let body: React.ReactNode = null
  if (r) {
    const list = failList(r), counts: Record<string, number> = {}, order: string[] = []
    list.forEach(f => { if (!counts[f.reason]) { counts[f.reason] = 0; order.push(f.reason) } counts[f.reason]++ })
    body = (
      <>
        <DialogHeader>
          <div className="flex flex-col gap-0.5">
            <DialogTitle>{L(fmtN(list.length) + ' of ' + fmtN(r.total) + ' not sent', fmtN(list.length) + ' / ' + fmtN(r.total) + ' 人未送達')}</DialogTitle>
            <DialogDescription className="text-body text-fg-secondary">{r.title}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {r.err ? <Banner tone="error" title={tx(r.err.title)}>{tx(r.err.text)}</Banner> : null}
            {r.channels.length > 1 ? <p className="text-body text-fg-secondary">{L('None of the channels reached them.', '所有通道都沒送達這些人。')}</p> : null}
            {order.length > 1 ? <div className="flex flex-wrap gap-2">{order.map(k => <Tag key={k} size="md" unbounded>{tx(k)} · {fmtN(counts[k])}</Tag>)}</div> : null}
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
      {r ? <DialogContent maxWidth={760} height="hug">{body}</DialogContent> : null}
    </Dialog>
  )
}
