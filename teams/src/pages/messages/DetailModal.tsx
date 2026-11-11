// Study (build mode `modal`): one record's details in a large dialog instead of the side panel.
// Left: what was sent (each part's text, as fields) and to whom. Right, on a light grey panel: every fact the list
// row shows, and more (message ID, channel, status, approval record, sender, audience count, template, created,
// send time, created by), so nothing on the list is missing here (user test, 2026-11-10).
// There is no separate edit mode: the fields are always there, editable or disabled by the record's status (the
// same rules as the row menu):
//   content and audience: Scheduled, Scheduled expired (what Edit content allowed, plus the audience)
//   send time: Scheduled, Scheduled expired, Error (what Reschedule allowed)
// Once anything is changed the footer swaps its actions for Discard changes / Save changes; closing with unsaved
// changes asks first. Otherwise the footer holds Cancel sending (left), Duplicate to new message and Send now (right).
import * as React from 'react'
import {
  Button, DatePicker, DescriptionItem, DescriptionList, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, PersonDisplay, Tag, Textarea,
} from '@qijenchen/design-system'
import { Ban, Copy, ExternalLink, Send, Trash2 } from 'lucide-react'
import {
  ICSD, LIM, PEOPLE, PMAP, cleanHtml, flatten, fmtDT, fmtN, fromIso, isExtPhone, textToHtml,
  type Channel, type Row, type Status, type Tag as RTag,
} from '../../lib/data'
import { SENDER_ERR, SENDER_RE, pushTitle } from '../../lib/compose'
import { flash, patchRow, useApp } from '../../lib/store'
import { L, niceDT } from '../../lib/i18n'
import { CHN, ErrText, FormField, StatusTag, personVal } from '../../components/ui'
import { RichText } from '../../components/RichText'
import { RecvInput, riKey, type RiState } from '../../components/RecvInput'
import { AudienceList, H3 } from './Detail'
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
  const dirty = React.useRef(false)
  const close = () => { dirty.current = false; m.set({ det: null, cf: null }) }
  const askClose = () => {
    if (!dirty.current) { close(); return }
    m.set({ cf: { title: L('Discard changes?', '要捨棄變更嗎？'), text: L('Your changes to this message won’t be saved.', '這則訊息的變更不會儲存。'), icon: Trash2, tone: 'err', cancel: L('Keep editing', '繼續編輯'), ok: L('Discard', '捨棄'), danger: true, run: close } })
  }
  return (
    <Dialog open={!!x} onOpenChange={o => { if (!o) askClose() }}>
      {x ? <DetailModalBody key={x.id} m={m} x={x} close={close} onDirty={d => { dirty.current = d }} /> : null}
    </Dialog>
  )
}

// ---------- the form behind the dialog: content fields, audience and send time ----------
type Vals = { sender: string; content: string; dTitle: string; sms: string; subject: string; html: string; bodyText: string; at: string }
const isoOf = (dt: string) => dt.replace(/\//g, '-').replace(' ', 'T')
const curTime = (r: Row, k: Channel) => (r.chSched && r.chSched[k === 'sms' ? 'push' : k]) || r.sched || r.created
function initVals(r: Row, k: Channel): Vals {
  const d = r.desk || r, em = r.email && r.email.mode === 'own' ? r.email : null
  return {
    sender: k === 'desktop' ? d.sender : r.sender,
    // Device Notifications has no title field: its first line is the title, so the title goes back on top
    content: k === 'desktop' ? d.content : r.content.startsWith(r.title) ? r.content : r.title + '\n' + r.content,
    dTitle: d.title, sms: r.smsText || '',
    subject: em ? em.subject || '' : r.title, html: em ? em.html || '' : textToHtml(r.content), bodyText: em ? 'x' : r.content,
    at: isoOf(curTime(r, k)),
  }
}
// how many people the edited audience reaches on this channel
const countOf = (tags: RTag[], groups: Parameters<typeof flatten>[1]) => flatten(tags.filter(t => t.type !== 'ext'), groups).length + tags.filter(t => t.type === 'ext').length

function DetailModalBody({ m, x, close, onDirty }: { m: SendCtl; x: Rec; close: () => void; onDirty: (d: boolean) => void }) {
  const app = useApp(), r = x.r, k = x.k, st = x.st, t = recText(r, k)
  const edit = canEditContent(st), timeEdit = canReschedule(st)
  const init = React.useMemo(() => ({ v: initVals(r, k), tags: tagsFor(r, k) }), [r.id, k, r.fresh])
  const [v, setV] = React.useState<Vals>(init.v), [tags, setTags] = React.useState<RTag[]>(init.tags)
  const [tried, setTried] = React.useState(false), [seed, setSeed] = React.useState(0)
  const [ri, setRi] = React.useState<RiState>({ type: 'person', q: '', open: false, exp: null })
  const set = (p: Partial<Vals>) => setV(o => ({ ...o, ...p }))
  const tagKeys = (l: RTag[]) => l.map(x => x.key).join('|')
  // compared as times: the date field may add seconds
  const tOf = (x: string) => { const d = fromIso(x); return d ? d.getTime() : x }
  const timeChanged = tOf(v.at) !== tOf(init.v.at)
  // only this channel's own fields count as changes
  const own = (o: Vals) => k === 'email' ? [o.subject, o.html] : k === 'desktop' ? [o.sender, o.dTitle, o.content] : k === 'sms' ? [o.sender, o.content, o.sms] : [o.sender, o.content]
  const dirty = JSON.stringify(own(v)) !== JSON.stringify(own(init.v)) || tagKeys(tags) !== tagKeys(init.tags) || timeChanged
  React.useEffect(() => { onDirty(dirty) }, [dirty])

  // the same checks as the send flow
  const req = L('This field is required.', '此欄位為必填。'), tooLong = (n: number) => L('Up to ' + fmtN(n) + ' characters.', '最多 ' + fmtN(n) + ' 字。')
  const e: Record<string, string> = {}
  if (edit) {
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
    if (!tags.length) e.aud = L('Add at least one audience.', '請加入至少一位收件人。')
  }
  const atD = fromIso(v.at), now = new Date(), max = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), now.getHours(), now.getMinutes())
  if (timeChanged) { if (!atD) e.at = L('Pick a date and time.', '請選擇日期和時間。'); else if (atD < now || atD > max) e.at = L('Please select a date between now and next 3 months.', '請選擇現在到未來 3 個月內的日期。') }
  const show = (key: string) => (tried ? e[key] || '' : '')

  const discard = () => { setV(init.v); setTags(init.tags); setTried(false); setSeed(n => n + 1) }
  const save = () => {
    if (Object.keys(e).length) { setTried(true); return }
    if (edit) {
      const p: Partial<Row> = { fresh: Date.now() }
      if (k === 'push' || k === 'sms') { p.sender = v.sender.trim(); p.content = v.content.trim(); p.title = pushTitle(v.content); if (k === 'sms') p.smsText = v.sms.trim() }
      if (k === 'desktop') { const nd = { sender: v.sender.trim(), title: v.dTitle.trim(), content: v.content.trim() }; if (r.channels.indexOf('push') >= 0) p.desk = nd; else { p.sender = nd.sender; p.title = nd.title; p.content = nd.content } }
      if (k === 'email') p.email = { mode: 'own', subject: v.subject.trim(), html: cleanHtml(v.html), atts: (r.email && r.email.atts) || [] }
      if (tagKeys(tags) !== tagKeys(init.tags)) {
        // this channel's audience only; its count follows (Device Notifications (SMS) keeps it on Device Notifications)
        const aud = tags.map(x => [x.type === 'person' ? 'p' : x.type === 'group' ? 'g' : x.type === 'org' ? 'o' : 'e', (x.type === 'ext' ? x.email : x.id) || ''] as [string, string])
        p.chAud = { ...(r.chAud || {}), [k]: aud }
        p.byCh = { ...(r.byCh || {}), [k === 'sms' ? 'push' : k]: [0, countOf(tags, app.groups)] }
      }
      patchRow(r.id, p)
    }
    if (timeChanged && atD) m.setCh(r.id, k, 'scheduled', fmtDT(atD))
    flash(timeChanged && atD ? L('Saved. Sends ', '已儲存，將於 ') + niceDT(atD) + L('', ' 傳送') : L('Changes saved', '已儲存變更'), 'ok')
    setTried(false)
  }

  // audience: added here like in the send flow; external contacts only where their channel is (phone: SMS, email: Email)
  const addTag = (it: Parameters<typeof riKey>[0]) => {
    const key = riKey(it)
    if (tags.some(x => x.key === key)) return
    if (it.kind === 'ext') {
      const ph = isExtPhone({ key, type: 'ext', email: it.value })
      if (ph ? k !== 'sms' : k !== 'email') { flash(ph ? L('Phone numbers only get SMS.', '電話號碼只會收到 SMS。') : L('Email addresses only get Email.', 'Email 地址只會收到 Email。'), 'err'); return }
      setTags(l => l.concat([{ key, type: 'ext', email: it.value }]))
    } else setTags(l => l.concat([{ key, type: it.kind, id: it.id }]))
  }

  const fails = failsOf(x)
  const mode = edit ? 'edit' as const : 'disabled' as const
  const cnt = (n: number, lim: number) => (edit ? n + ' / ' + lim : undefined)
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
        <div className="flex min-w-0 flex-1 flex-col gap-[calc(var(--layout-space-loose)*1.5)] overflow-y-auto p-[var(--layout-space-loose)]">
          <section className="flex flex-col gap-[var(--layout-space-tight)]">
            <H3>{L('Content', '內容')}</H3>
            {k === 'push' || k === 'sms' ? <>
              {x.fb ? <PartHead title={CHN.push.name} part={{ ok: x.ok, of: x.of, unk: x.unk, st: x.pst }} /> : null}
              <FormField id="dm-sender" label={L('Sender', '寄件人')} required={edit} count={cnt(v.sender.length, LIM.sender)} over={v.sender.length > LIM.sender} error={show('sender')}>
                <Input id="dm-sender" mode={mode} value={v.sender} error={!!show('sender')} onChange={ev => set({ sender: ev.target.value })} />
              </FormField>
              <FormField id="dm-content" label={L('Content', '內容')} required={edit} count={cnt(v.content.length, LIM.push)} over={v.content.length > LIM.push} error={show('content')}>
                <Textarea id="dm-content" mode={mode} rows={4} value={v.content} error={!!show('content')} onChange={ev => set({ content: ev.target.value })} />
              </FormField>
              {k === 'sms' ? <>
                <PartHead title={L('SMS fallback', 'SMS 備援')} part={x.fb} />
                <FormField id="dm-sms" label={L('SMS text', 'SMS 內容')} required={edit} count={cnt(v.sms.length, LIM.sms)} over={v.sms.length > LIM.sms} error={show('sms')}>
                  <Textarea id="dm-sms" mode={mode} rows={3} value={v.sms} error={!!show('sms')} onChange={ev => set({ sms: ev.target.value })} />
                </FormField>
              </> : null}
            </> : null}
            {k === 'desktop' ? <>
              <FormField id="dm-dsender" label={L('Sender', '寄件人')} count={cnt(v.sender.length, LIM.sender)} over={v.sender.length > LIM.sender} error={show('sender')}>
                <Input id="dm-dsender" mode={mode} value={v.sender} error={!!show('sender')} onChange={ev => set({ sender: ev.target.value })} />
              </FormField>
              <FormField id="dm-dtitle" label={L('Title', '標題')} required={edit} count={cnt(v.dTitle.length, LIM.dTitle)} over={v.dTitle.length > LIM.dTitle} error={show('dTitle')}>
                <Input id="dm-dtitle" mode={mode} value={v.dTitle} error={!!show('dTitle')} onChange={ev => set({ dTitle: ev.target.value })} />
              </FormField>
              <FormField id="dm-dcontent" label={L('Content', '內容')} required={edit} count={cnt(v.content.length, LIM.desktop)} over={v.content.length > LIM.desktop} error={show('content')}>
                <Textarea id="dm-dcontent" mode={mode} rows={3} value={v.content} error={!!show('content')} onChange={ev => set({ content: ev.target.value })} />
              </FormField>
            </> : null}
            {k === 'email' ? <>
              <FormField id="dm-subject" label={L('Subject', '主旨')} required={edit} count={cnt(v.subject.length, LIM.subject)} over={v.subject.length > LIM.subject} error={show('subject')}>
                <Input id="dm-subject" mode={mode} value={v.subject} error={!!show('subject')} onChange={ev => set({ subject: ev.target.value })} />
              </FormField>
              <FormField id="dm-body" label={L('Content', '內容')} required={edit} error={show('body')}>
                <RichText id="dm-body" seedKey={'dm-' + r.id + '-' + seed} readOnly={!edit} html={v.html} label={L('Content', '內容')} error={!!show('body')} onInput={(h, tx) => set({ html: h, bodyText: tx })} />
              </FormField>
            </> : null}
          </section>

          <section className="flex flex-col gap-[var(--layout-space-tight)]">
            <div className="flex items-center justify-between gap-2">
              <H3>{L('Audience', '收件人')}</H3>
              {fails ? <Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0 !text-error-text" onClick={() => m.set({ ns: r.id + '|' + k })}>{L(fails + ' not sent', fails + ' 人未送出')}</Button> : null}
            </div>
            {/* editable: the send flow's search above the list, and a remove button on every row */}
            {edit ? <RecvInput id="dm-ri" ri={ri} setRi={setRi} groups={app.groups} isAdded={it => tags.some(x => x.key === riKey(it))} onAdd={addTag} /> : null}
            {tags.length ? <AudienceList tags={tags} groups={app.groups} onRemove={edit ? key => setTags(l => l.filter(x => x.key !== key)) : undefined} /> : <span className="text-body text-fg-secondary">—</span>}
            {show('aud') ? <ErrText>{show('aud')}</ErrText> : null}
          </section>
        </div>

        <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-divider bg-[var(--color-neutral-1)] p-[var(--layout-space-loose)]" aria-label={L('Details', '詳細資料')}>
          <Facts m={m} x={x} audN={edit ? countOf(tags, app.groups) : null} time={timeEdit ? (
            <FormField id="dm-at" hint={atD && timeChanged && !e.at ? L('Sends ', '將於 ') + niceDT(atD) + L('', ' 傳送') : undefined} error={show('at')}>
              <DatePicker id="dm-at" showTime typeable locale={L('en-US', 'zh-TW')} value={v.at || null} error={!!show('at')} onChange={val => set({ at: val || '' })} placeholder="YYYY/MM/DD HH:MM" />
            </FormField>
          ) : null} />
        </aside>
      </div>

      <DialogFooter className="border-t border-divider">
        <div className="flex w-full flex-wrap items-center gap-2">
          {canCancel(st) ? <Button variant="tertiary" startIcon={Ban} className="!text-error-text" disabled={dirty} onClick={() => askCancel(m, x)}>{L('Cancel sending', '取消傳送')}</Button> : null}
          <span className="flex-1" />
          {dirty ? <>
            <Button variant="tertiary" onClick={discard}>{L('Discard changes', '捨棄變更')}</Button>
            <Button variant="primary" onClick={save}>{L('Save changes', '儲存變更')}</Button>
          </> : <>
            <Button variant="secondary" startIcon={Copy} onClick={() => { close(); duplicateCh(m, x) }}>{L('Duplicate to new message', '複製為新訊息')}</Button>
            {canSendNow(st) ? <Button variant="primary" startIcon={Send} onClick={() => askSendNow(m, x)}>{L('Send now', '立即傳送')}</Button> : null}
          </>}
        </div>
      </DialogFooter>
    </DialogContent>
  )
}

// a part's name with how it went ("n / m sent"), above its fields; only once it has gone out
function PartHead({ title, part }: { title: string; part?: Part }) {
  const done = part && !part.unk && (part.st === 'sent' || part.st === 'error')
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
      <span className="text-body font-medium">{title}</span>
      {done ? (part!.of === 0
        ? <span className="text-caption text-fg-secondary">{L('Not needed', '不需要')}</span>
        : <span className="text-caption tabular-nums text-fg-secondary">{L(fmtN(part!.ok) + ' / ' + fmtN(part!.of) + ' sent', fmtN(part!.ok) + ' / ' + fmtN(part!.of) + ' 已送出')}</span>) : null}
    </span>
  )
}

// ---------- right: the facts ----------
// audN: the audience count as being edited; time: the send time field, where it can be changed
function Facts({ m, x, audN, time }: { m: SendCtl; x: Rec; audN: number | null; time: React.ReactNode }) {
  const r = x.r, k = x.k, st = x.st, I = CHN[k].icon
  const urgent = ICSD && !!r.bypass, approval = (ICSD && k === 'sms') || !!r.review || urgent
  const fails = failsOf(x), sender = recSender(r, k), tpl = m.tplName(r.tpl)
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
      <DescriptionItem label={L('Audience', '收件人數')}>{audN !== null ? <span className="tabular-nums">{fmtN(audN)}</span> : <span className="inline-flex"><AudienceN x={x} /></span>}</DescriptionItem>
      <DescriptionItem label={L('Template', '模板')}>{tpl || <span className="text-fg-muted">—</span>}</DescriptionItem>
      <DescriptionItem label={L('Created', '建立時間')}><span className="tabular-nums">{r.created}</span></DescriptionItem>
      <DescriptionItem label={L('Send time', '傳送時間')}>{time || <span className="tabular-nums">{curTime(r, k)}</span>}</DescriptionItem>
      <DescriptionItem label={L('Created by', '建立者')}><PersonDisplay value={personVal(creator)} /></DescriptionItem>
    </DescriptionList>
  )
}
