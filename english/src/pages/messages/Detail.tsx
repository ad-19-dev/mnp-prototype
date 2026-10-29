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

export function RecvTag({ t, groups }: { t: RTag; groups: Group[] }) {
  if (t.type === 'person') {
    const p = PMAP[t.id!]
    return <Tip text={p ? p.nt + ' · ' + p.emp + ' · ' + p.org : ''}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" avatar={p ? <PAvatar p={p} size={16} /> : undefined}>{p ? p.zh + ' ' + p.en : t.id}</Tag></span></Tip>
  }
  if (t.type === 'group') {
    const g = groups.find(x => x.id === t.id) || { name: t.id, count: 0 }
    return <Tip text={'Audience group · ' + plural(g.count, 'member')}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" icon={Users}>{g.name} · {fmtN(g.count)}</Tag></span></Tip>
  }
  if (t.type === 'org') {
    const o = ORGS.find(x => x.code === t.id) || { code: t.id, name: '', count: 0 }
    return <Tip text={o.name + ' · ' + plural(o.count, 'member')}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" icon={Building2}>{o.code} · {fmtN(o.count)}</Tag></span></Tip>
  }
  const ph = isExtPhone(t)
  return <Tip text={ph ? 'External phone number' : 'External email'}><span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-[var(--ring)]"><Tag size="md" color="amber" icon={ph ? Phone : Globe}>{t.email} · External</Tag></span></Tip>
}

function statText(x: { k: string; ok: number; of: number }) {
  if (x.k === 'sms') return x.of ? fmtN(x.ok) + ' of ' + fmtN(x.of) + ' SMS delivered' : 'Not needed: everyone got the device notification'
  return fmtN(x.ok) + ' of ' + fmtN(x.of) + ' delivered'
}
function H3({ children }: { children: React.ReactNode }) { return <h3 className="text-body font-medium text-foreground">{children}</h3> }

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
  const events: { t: string; when: string; cls: 'done' | 'cur' | 'bad' }[] = [{ t: 'Created by ' + cr.en, when: r.created, cls: 'done' }]
  let t = created
  if (r.aud.some(a => a[0] === 'e') && r.channels.indexOf('email') >= 0) { t = addMin(t, 41); events.push({ t: 'Approved by Jimmy Chen, supervisor', when: fmtDT(t), cls: 'done' }) }
  if (r.sms) { t = addMin(t, 23); events.push({ t: 'Approved by ICSD', when: fmtDT(t), cls: 'done' }) }
  const start = sched || addMin(t, 2)
  if (r.status === 'scheduled') events.push({ t: 'Scheduled to send', when: fmtDT(start), cls: 'cur' })
  else {
    events.push({ t: 'Sending started', when: fmtDT(start), cls: 'done' })
    if (r.status === 'progress') events.push({ t: fmtN(r.ok) + ' of ' + fmtN(r.total) + ' reached so far', when: 'Still sending', cls: 'cur' })
    if (r.status === 'sent') events.push({ t: 'Completed: ' + fmtN(r.ok) + ' reached' + (fails ? ', ' + fails + ' not sent' : ''), when: fmtDT(addMin(start, Math.max(1, Math.round(r.total / 90)))), cls: 'done' })
    if (r.status === 'error') events.push({ t: 'System error: nothing was delivered', when: fmtDT(addMin(start, 1)), cls: 'bad' })
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
          <SheetDescription className="sr-only">Message details</SheetDescription>
        </div>
      </SheetHeader>
      <SheetBody>
        <div className="flex flex-col gap-[var(--layout-space-loose)] pb-[var(--layout-space-loose)]">
          <DescriptionList orientation="horizontal" divided>
            <DescriptionItem label="Sender name">{r.sender}</DescriptionItem>
            <DescriptionItem label="Template">{m.tplName(r.tpl) || 'None'}</DescriptionItem>
            <DescriptionItem label="Send channels">{chs.map(k => CHN[k].name).join(', ')}</DescriptionItem>
            <DescriptionItem label="Creator">{cr.en + ' ' + cr.zh}</DescriptionItem>
            <DescriptionItem label="Create time">{r.created}</DescriptionItem>
            <DescriptionItem label="Scheduled time">{r.sched || 'Sent right away'}</DescriptionItem>
          </DescriptionList>

          <H3>Delivery</H3>
          <div className="flex flex-col gap-2 rounded-md border border-divider p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body"><span className="font-medium">{r.status === 'scheduled' ? 'Not started' : fmtN(r.ok)}</span> <span className="text-fg-secondary">{r.status === 'scheduled' ? 'Sends to ' + plural(r.total, 'receiver') + ' on ' + r.sched : 'of ' + fmtN(r.total) + (chs.length > 1 ? ' reached on at least one channel' : ' delivered')}</span></span>
              {fails ? <Button variant="link" size="sm" startIcon={CircleAlert} className="!text-warning-text hover:!text-warning-text hover:underline" onClick={() => m.set({ ns: r.id })}>{fails} not sent</Button> : null}
            </div>
            <ProgressBar aria-label="Delivered" value={pct} status={r.status === 'error' ? 'error' : r.status === 'sent' ? 'success' : 'inProgress'} />
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

          {hasN ? <><H3>Notification text</H3><div className="whitespace-pre-wrap rounded-md border border-divider bg-neutral-1 p-3 text-body"><strong className="font-medium">{r.title}</strong>{'\n'}{r.content}</div></> : null}
          {r.sms && r.smsText ? <><H3>SMS text</H3><div className="rounded-md border border-divider bg-neutral-1 p-3 text-body">{r.smsText}</div></> : null}
          {em ? (
            <>
              <H3>Email</H3>
              {em.mode === 'own' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-body text-fg-secondary"><span className="font-medium text-foreground">Subject:</span> {em.subject}</span>
                  <MailHtml html={em.html || ''} />
                  {(em.atts || []).map(a => <FileItem key={a.name} name={a.name} description={fmtSize(a.size)} onDownload={() => flash('Downloading ' + a.name + '.')} />)}
                </div>
              ) : <p className="text-body text-fg-secondary">Same as the notification text, sent as a plain email.</p>}
            </>
          ) : null}

          <H3>Receivers</H3>
          <div className="flex flex-wrap gap-2">{audToTags(r.aud).map(x => <RecvTag key={x.key} t={x} groups={groups} />)}</div>

          <H3>Activity</H3>
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
        {r.status === 'scheduled' ? <Button variant="tertiary" startIcon={Pencil} onClick={() => m.startCompose('edit', r)}>Edit</Button> : null}
        <Button variant="tertiary" startIcon={Copy} onClick={() => m.startCompose('duplicate', r)}>Duplicate</Button>
        <Button variant="primary" onClick={close}>Close</Button>
      </SheetFooter>
    </>
  )
}

const fcol = createColumnHelper<Fail>()
const failCols = [
  fcol.display({ id: 'who', header: 'Receiver', meta: { width: 260 }, cell: i => { const f = i.row.original; return f.ext ? <span className="flex min-w-0 items-center gap-2"><IconBox icon={Globe} /><Two a={f.ext} b="External address" strong /></span> : <span className="flex min-w-0 items-center gap-2"><PAvatar p={f.p!} /><Two a={f.p!.zh + ' ' + f.p!.en} b={f.p!.emp + ' · ' + f.p!.nt} strong /></span> } }),
  fcol.display({ id: 'org', header: 'Org', meta: { width: 110 }, cell: i => <span className="truncate">{i.row.original.ext ? '—' : i.row.original.p!.org}</span> }),
  fcol.display({ id: 'why', header: 'Reason', meta: { width: 280 }, cell: i => <Two a={i.row.original.reason} b={i.row.original.fallback} /> }),
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
            <DialogTitle>{fmtN(list.length) + ' of ' + fmtN(r.total) + ' not sent'}</DialogTitle>
            <DialogDescription className="text-body text-fg-secondary">{r.title}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {r.err ? <Banner tone="error" title={r.err.title}>{r.err.text}</Banner> : null}
            {r.channels.length > 1 ? <p className="text-body text-fg-secondary">These receivers weren’t reached on any of the channels this message used.</p> : null}
            {order.length > 1 ? <div className="flex flex-wrap gap-2">{order.map(k => <Tag key={k} size="md">{k} · {fmtN(counts[k])}</Tag>)}</div> : null}
            <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={failCols as any} data={list} bordered height="340px" autoRowHeight getRowId={(_, i) => String(i)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="primary" startIcon={RotateCw} onClick={() => m.resendNotSent(r)}>{r.status === 'error' ? 'Retry sending' : 'Resend to these ' + fmtN(list.length)}</Button>
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
