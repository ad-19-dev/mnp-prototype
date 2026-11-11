// Study (build mode `modal`): one record's details in a large dialog instead of the side panel.
// Left: what was sent (each part's text) and to whom. Right, on a light grey panel: every fact the list row shows,
// and more (message ID, channel, status, approval record, sender, audience count, template, created, send time,
// created by), so nothing on the list is missing here (user test, 2026-11-10).
// Editing happens in place, only where the record's status allows it (the same rules as the row menu):
//   content: Scheduled, Scheduled expired (Edit content)
//   send time: Scheduled, Scheduled expired, Error (Reschedule)
// The footer holds the other actions: Cancel sending on the left; Duplicate to new message and Send now on the right.
import * as React from 'react'
import {
  Button, DatePicker, DescriptionItem, DescriptionList, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, PersonDisplay, Tag, Textarea,
} from '@qijenchen/design-system'
import { Ban, Copy, ExternalLink, Pencil, Send } from 'lucide-react'
import { ICSD, LIM, PEOPLE, PMAP, cleanHtml, fmtDT, fmtN, fromIso, textToHtml, toIso, type Channel, type Row, type Status } from '../../lib/data'
import { SENDER_ERR, SENDER_RE, pushTitle } from '../../lib/compose'
import { flash, patchRow, useApp } from '../../lib/store'
import { L, niceDT } from '../../lib/i18n'
import { CHN, FormField, StatusTag, personVal } from '../../components/ui'
import { RichText } from '../../components/RichText'
import { AudienceList, ChannelText, H3 } from './Detail'
import {
  AudienceN, askCancel, askSendNow, chName, duplicateCh, failsOf, msgId, recSender, recText, recordById, tagsFor,
  type Part, type Rec,
} from './split'
import type { SendCtl } from './ctl'

const canEditContent = (st: Status) => st === 'scheduled' || st === 'expired'
const canReschedule = (st: Status) => st === 'scheduled' || st === 'expired' || st === 'error'
const canSendNow = (st: Status) => st === 'expired' || st === 'error'
const canCancel = (st: Status) => st === 'scheduled' || st === 'expired' || st === 'error' || st === 'pending'

export function DetailModal({ m }: { m: SendCtl }) {
  const app = useApp(), x = recordById(m, app.rows, m.s.det)
  const close = () => m.set({ det: null })
  return (
    <Dialog open={!!x} onOpenChange={o => { if (!o) close() }}>
      {x ? <DetailModalBody key={x.id} m={m} x={x} close={close} /> : null}
    </Dialog>
  )
}

function DetailModalBody({ m, x, close }: { m: SendCtl; x: Rec; close: () => void }) {
  const app = useApp(), r = x.r, k = x.k, st = x.st, t = recText(r, k)
  const [editing, setEditing] = React.useState(false)
  const tags = tagsFor(r, k)
  const fails = failsOf(x)
  return (
    <DialogContent maxWidth={1120} height="fill">
      <DialogHeader>
        <div className="flex min-w-0 items-center gap-2">
          <Tag size="sm" color="neutral" className="shrink-0 tabular-nums">{msgId(r)}</Tag>
          <DialogTitle className="truncate">{t.title || chName(k)}</DialogTitle>
          <DialogDescription className="sr-only">{chName(k)}</DialogDescription>
        </div>
      </DialogHeader>

      {/* two columns, each scrolling on its own; the right one is the record's facts on a light grey panel */}
      <div className="flex min-h-0 flex-1 border-t border-divider">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--layout-space-loose)] overflow-y-auto p-[var(--layout-space-loose)]">
          <section className="flex flex-col gap-[var(--layout-space-tight)]">
            <div className="flex items-center justify-between gap-2">
              <H3>{L('Content', '內容')}</H3>
              {canEditContent(st) && !editing ? <Button variant="secondary" size="sm" startIcon={Pencil} onClick={() => setEditing(true)}>{L('Edit content', '編輯內容')}</Button> : null}
            </div>
            {editing ? <ContentEditor r={r} k={k} onDone={() => setEditing(false)} /> : <ContentView x={x} />}
          </section>

          <section className="flex flex-col gap-[var(--layout-space-tight)]">
            <div className="flex items-center justify-between gap-2">
              <H3>{L('Audience', '收件人')}</H3>
              {fails ? <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0 !text-error-text" onClick={() => m.set({ ns: r.id + '|' + k })}>{L(fails + ' not sent', fails + ' 人未送出')}</Button> : null}
            </div>
            {tags.length ? <AudienceList tags={tags} groups={app.groups} /> : <span className="text-body text-fg-secondary">—</span>}
          </section>
        </div>

        <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-divider bg-muted p-[var(--layout-space-loose)]" aria-label={L('Details', '詳細資料')}>
          <Facts m={m} x={x} />
        </aside>
      </div>

      <DialogFooter className="border-t border-divider">
        <div className="flex w-full flex-wrap items-center gap-2">
          {canCancel(st) ? <Button variant="tertiary" startIcon={Ban} className="!text-error-text" disabled={editing} onClick={() => askCancel(m, x)}>{L('Cancel sending', '取消傳送')}</Button> : null}
          <span className="flex-1" />
          <Button variant="secondary" startIcon={Copy} disabled={editing} onClick={() => { close(); duplicateCh(m, x) }}>{L('Duplicate to new message', '複製為新訊息')}</Button>
          {canSendNow(st) ? <Button variant="primary" startIcon={Send} disabled={editing} onClick={() => askSendNow(m, x)}>{L('Send now', '立即傳送')}</Button> : null}
        </div>
      </DialogFooter>
    </DialogContent>
  )
}

// ---------- left: what was sent ----------
function PartHead({ title, part }: { title: string; part?: Part }) {
  const done = part && !part.unk && (part.st === 'sent' || part.st === 'error')
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-body font-medium">{title}</span>
      {done ? (part!.of === 0
        ? <span className="text-caption text-fg-secondary">{L('Not needed', '不需要')}</span>
        : <span className="text-caption tabular-nums text-fg-secondary">{L(fmtN(part!.ok) + ' / ' + fmtN(part!.of) + ' sent', fmtN(part!.ok) + ' / ' + fmtN(part!.of) + ' 已送出')}</span>) : null}
    </span>
  )
}

// every part shown open (the dialog has room): Device Notifications and its SMS fallback each with their own count
function ContentView({ x }: { x: Rec }) {
  const r = x.r, k = x.k
  if (x.fb) return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <div className="flex flex-col gap-2"><PartHead title={CHN.push.name} part={{ ok: x.ok, of: x.of, unk: x.unk, st: x.pst }} /><ChannelText r={r} k="push" noSender /></div>
      <div className="flex flex-col gap-2"><PartHead title={L('SMS fallback', 'SMS 備援')} part={x.fb} /><ChannelText r={r} k="sms" /></div>
    </div>
  )
  return <ChannelText r={r} k={k} noSender />
}

// Edit content, in place: this channel's fields only (the same fields and limits as the send flow); Save writes
// them to this channel and nothing else
function ContentEditor({ r, k, onDone }: { r: Row; k: Channel; onDone: () => void }) {
  const d = r.desk || r, em = r.email && r.email.mode === 'own' ? r.email : null
  const [v, setV] = React.useState({
    sender: k === 'desktop' ? d.sender : r.sender, content: k === 'desktop' ? d.content : r.content.startsWith(r.title) ? r.content : r.title + '\n' + r.content, dTitle: d.title, sms: r.smsText || '',
    subject: em ? em.subject || '' : r.title, html: em ? em.html || '' : textToHtml(r.content), bodyText: em ? 'x' : r.content,
  })
  const [tried, setTried] = React.useState(false)
  const set = (p: Partial<typeof v>) => setV(o => ({ ...o, ...p }))
  const req = L('This field is required.', '此欄位為必填。'), tooLong = (n: number) => L('Up to ' + fmtN(n) + ' characters.', '最多 ' + fmtN(n) + ' 字。')
  const e: Record<string, string> = {}
  if (k === 'push' || k === 'sms') {
    if (!v.sender.trim()) e.sender = req; else if (!SENDER_RE.test(v.sender)) e.sender = SENDER_ERR(); else if (v.sender.length > LIM.sender) e.sender = tooLong(LIM.sender)
    if (!v.content.trim()) e.content = req; else if (v.content.length > LIM.push) e.content = tooLong(LIM.push)
  }
  if (k === 'sms') { if (!v.sms.trim()) e.sms = req; else if (v.sms.length > LIM.sms) e.sms = tooLong(LIM.sms) }
  if (k === 'desktop') {
    if (v.sender && !SENDER_RE.test(v.sender)) e.sender = SENDER_ERR(); else if (v.sender.length > LIM.sender) e.sender = tooLong(LIM.sender)
    if (!v.dTitle.trim()) e.dTitle = req; else if (v.dTitle.length > LIM.dTitle) e.dTitle = tooLong(LIM.dTitle)
    if (!v.content.trim()) e.content = req; else if (v.content.length > LIM.desktop) e.content = tooLong(LIM.desktop)
  }
  if (k === 'email') {
    if (!v.subject.trim()) e.subject = req; else if (v.subject.length > LIM.subject) e.subject = tooLong(LIM.subject)
    if (!v.bodyText.trim()) e.body = req
  }
  const show = (key: string) => (tried ? e[key] || '' : '')
  const save = () => {
    if (Object.keys(e).length) { setTried(true); return }
    const p: Partial<Row> = { fresh: Date.now() }
    if (k === 'push' || k === 'sms') { p.sender = v.sender.trim(); p.content = v.content.trim(); p.title = pushTitle(v.content); if (k === 'sms') p.smsText = v.sms.trim() }
    if (k === 'desktop') { const nd = { sender: v.sender.trim(), title: v.dTitle.trim(), content: v.content.trim() }; if (r.channels.indexOf('push') >= 0) p.desk = nd; else { p.sender = nd.sender; p.title = nd.title; p.content = nd.content } }
    if (k === 'email') p.email = { mode: 'own', subject: v.subject.trim(), html: cleanHtml(v.html), atts: (r.email && r.email.atts) || [] }
    patchRow(r.id, p)
    flash(L('Content saved', '已儲存內容'), 'ok')
    onDone()
  }
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-md border border-divider p-[var(--layout-space-tight)]">
      <p className="text-caption text-fg-secondary">{L('Changes apply to ' + chName(k) + ' only. Audience and other channels stay the same.', '只會改到 ' + chName(k) + '，收件人和其他通道不變。')}</p>
      {k === 'push' || k === 'sms' ? <>
        <FormField id="dm-sender" label={L('Sender', '寄件人')} required count={v.sender.length + ' / ' + LIM.sender} over={v.sender.length > LIM.sender} error={show('sender')}>
          <Input id="dm-sender" value={v.sender} error={!!show('sender')} onChange={ev => set({ sender: ev.target.value })} />
        </FormField>
        <FormField id="dm-content" label={L('Content', '內容')} required count={v.content.length + ' / ' + LIM.push} over={v.content.length > LIM.push} error={show('content')}>
          <Textarea id="dm-content" rows={5} value={v.content} error={!!show('content')} onChange={ev => set({ content: ev.target.value })} />
        </FormField>
        {k === 'sms' ? (
          <FormField id="dm-sms" label={L('SMS fallback', 'SMS 備援')} required count={v.sms.length + ' / ' + LIM.sms} over={v.sms.length > LIM.sms} error={show('sms')}>
            <Textarea id="dm-sms" rows={3} value={v.sms} error={!!show('sms')} onChange={ev => set({ sms: ev.target.value })} />
          </FormField>
        ) : null}
      </> : null}
      {k === 'desktop' ? <>
        <FormField id="dm-dsender" label={L('Sender', '寄件人')} count={v.sender.length + ' / ' + LIM.sender} over={v.sender.length > LIM.sender} error={show('sender')}>
          <Input id="dm-dsender" value={v.sender} error={!!show('sender')} onChange={ev => set({ sender: ev.target.value })} />
        </FormField>
        <FormField id="dm-dtitle" label={L('Title', '標題')} required count={v.dTitle.length + ' / ' + LIM.dTitle} over={v.dTitle.length > LIM.dTitle} error={show('dTitle')}>
          <Input id="dm-dtitle" value={v.dTitle} error={!!show('dTitle')} onChange={ev => set({ dTitle: ev.target.value })} />
        </FormField>
        <FormField id="dm-dcontent" label={L('Content', '內容')} required count={v.content.length + ' / ' + LIM.desktop} over={v.content.length > LIM.desktop} error={show('content')}>
          <Textarea id="dm-dcontent" rows={3} value={v.content} error={!!show('content')} onChange={ev => set({ content: ev.target.value })} />
        </FormField>
      </> : null}
      {k === 'email' ? <>
        <FormField id="dm-subject" label={L('Subject', '主旨')} required count={v.subject.length + ' / ' + LIM.subject} over={v.subject.length > LIM.subject} error={show('subject')}>
          <Input id="dm-subject" value={v.subject} error={!!show('subject')} onChange={ev => set({ subject: ev.target.value })} />
        </FormField>
        <FormField id="dm-body" label={L('Content', '內容')} required error={show('body')}>
          <RichText id="dm-body" seedKey={'dm-' + r.id} html={v.html} label={L('Content', '內容')} error={!!show('body')} onInput={(h, tx) => set({ html: h, bodyText: tx })} />
        </FormField>
      </> : null}
      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onClick={onDone}>{L('Cancel', '取消')}</Button>
        <Button variant="primary" onClick={save}>{L('Save', '儲存')}</Button>
      </div>
    </div>
  )
}

// ---------- right: the facts ----------
function Facts({ m, x }: { m: SendCtl; x: Rec }) {
  const r = x.r, k = x.k, st = x.st, I = CHN[k].icon
  const urgent = ICSD && !!r.bypass, approval = (ICSD && k === 'sms') || !!r.review || urgent
  const fails = failsOf(x), sender = recSender(r, k), tpl = m.tplName(r.tpl)
  const created = r.created.split(' ')
  const creator = PMAP[r.creator] || PEOPLE[0]
  return (
    <DescriptionList>
      <DescriptionItem label={L('Message ID', '訊息 ID')}><span className="tabular-nums">{msgId(r)}</span></DescriptionItem>
      <DescriptionItem label={L('Channel', '通道')}><span className="inline-flex items-center gap-1.5"><I className="size-4 text-fg-secondary" aria-hidden />{chName(k)}</span></DescriptionItem>
      <DescriptionItem label={L('Status', '狀態')}>
        <span className="flex flex-col items-start gap-1">
          <StatusTag s={st} />
          {fails ? <Button variant="link" size="xs" className="!h-auto !min-w-0 !justify-start !p-0 !text-error-text" onClick={() => m.set({ ns: r.id + '|' + k })}>{L(fails + ' not sent', fails + ' 人未送出')}</Button> : null}
        </span>
      </DescriptionItem>
      {approval ? <DescriptionItem label={L('Approval record', '核准紀錄')}><Button variant="link" size="sm" startIcon={ExternalLink} className="!h-auto !min-w-0 !justify-start !p-0" onClick={() => flash(L('Opens the Approval Center', '前往 Approval Center'), 'ok')}>{L('View in Approval Center', '到 Approval Center 查看')}</Button></DescriptionItem> : null}
      <DescriptionItem label={L('Sender', '寄件人')}>{sender || <span className="text-fg-muted">—</span>}</DescriptionItem>
      <DescriptionItem label={L('Audience', '收件人數')}><span className="inline-flex"><AudienceN x={x} /></span></DescriptionItem>
      <DescriptionItem label={L('Template', '模板')}>{tpl || <span className="text-fg-muted">—</span>}</DescriptionItem>
      <DescriptionItem label={L('Created', '建立時間')}><span className="tabular-nums">{created.join(' ')}</span></DescriptionItem>
      <DescriptionItem label={L('Send time', '傳送時間')}><SendTimeField m={m} x={x} editable={canReschedule(st)} /></DescriptionItem>
      <DescriptionItem label={L('Created by', '建立者')}><PersonDisplay value={personVal(creator)} /></DescriptionItem>
    </DescriptionList>
  )
}

// Send time, rescheduled in place where the status allows it: an Edit button opens a date field with Save / Cancel
function SendTimeField({ m, x, editable }: { m: SendCtl; x: Rec; editable: boolean }) {
  const r = x.r, k = x.k
  // the list's Send time: this channel's own schedule, the message's, or when it was created (sent right away)
  const cur = (r.chSched && r.chSched[k === 'sms' ? 'push' : k]) || r.sched || r.created
  const [at, setAt] = React.useState<string | null>(null), [tried, setTried] = React.useState(false)
  const d = at ? fromIso(at) : null, now = new Date(), max = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), now.getHours(), now.getMinutes())
  const err = !d ? L('Pick a date and time.', '請選擇日期和時間。') : d < now || d > max ? L('Please select a date between now and next 3 months.', '請選擇現在到未來 3 個月內的日期。') : ''
  if (at === null) return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums">{cur}</span>
      {editable ? <Button variant="text" size="xs" iconOnly startIcon={Pencil} aria-label={L('Reschedule', '重新排程')} onClick={() => { const n = new Date(); setAt(toIso(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 9, 0))); setTried(false) }} /> : null}
    </span>
  )
  const save = () => {
    if (err) { setTried(true); return }
    m.setCh(r.id, k, 'scheduled', fmtDT(d!))
    flash(L('Rescheduled for ', '已改為 ') + niceDT(d!), 'ok')
    setAt(null)
  }
  return (
    <span className="flex w-full flex-col gap-2">
      <FormField id="dm-at" hint={d && !err ? L('Sends ', '將於 ') + niceDT(d) + L('', ' 傳送') : L('Taipei time (GMT+8), up to 3 months ahead', '台北時間（GMT+8），3 個月內')} error={tried ? err : ''}>
        <DatePicker id="dm-at" showTime typeable locale={L('en-US', 'zh-TW')} value={at || null} error={tried && !!err} onChange={v => setAt(v || '')} placeholder="YYYY/MM/DD HH:MM" />
      </FormField>
      <span className="flex justify-end gap-2">
        <Button variant="tertiary" size="sm" onClick={() => setAt(null)}>{L('Cancel', '取消')}</Button>
        <Button variant="primary" size="sm" onClick={save}>{L('Reschedule', '重新排程')}</Button>
      </span>
    </span>
  )
}
