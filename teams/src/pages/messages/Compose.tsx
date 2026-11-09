// Send flow: 1 Receivers & channels, 2 Message, 3 Review, plus the approval result
import * as React from 'react'
import {
  Button, Checkbox, DataTable, DatePicker, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Empty, FileItem, FileUpload, Input, PersonDisplay, RadioGroup, RadioGroupItem, SegmentedControl, Select,
  SegmentedControlItem, StepItem, StepLabel, Steps, Tag, Textarea, cn, useIsNarrowViewport,
} from '@qijenchen/design-system'
import { NO_HIDE, Tip } from '../../components/ui'
import { groupInSpace, spaceName, tplInSpace } from '../../lib/teams'
import { scopeLabel } from './ctl'
import { } from '../../lib/store'
import { createColumnHelper } from '@tanstack/react-table'
import {
  AlertTriangle, Building2, CalendarClock, ChevronLeft, ChevronRight, FlaskConical, Globe, LayoutTemplate, Mail,
  CircleCheck, MessageSquareText, Monitor, Phone, Plus, Save, Search, Send, ShieldAlert, ShieldCheck, Smartphone, Upload, UserPlus, Users, X, Zap, BookUser, UserRound, UsersRound } from 'lucide-react'
import {
  CAP, CH_CARDS, DESK, ICSD, LIM, ORGS, PMAP, SUPERVISOR, cleanHtml, cutAt, flatten, fmtN, fmtSize, fromIso, isExtPhone,
  pad, placeholders, toIso, tplFormats, tplHasNotif, vwidth, type Channel, type Person, type Template, type Tag as RTag,
  ME,
} from '../../lib/data'
import {
  SENDER_RE, approval, effEmailMode, emailTooBig, hasNotif, multiPeople, noNumber, pushTitle, reachNote, smsCoverText, smsOn, smsPhones, stepOk, unresolved,
  type Compose, type Errs, type Reach,
} from '../../lib/compose'
import { useApp } from '../../lib/store'
import { L, P, joinL, niceDT } from '../../lib/i18n'
import { Banner, CHN, ChIcons, ErrText, FmtChips, FormField, IconBox, KV, Meter, PAvatar, Section, Two, personVal } from '../../components/ui'
import { RecvInput, riKey } from '../../components/RecvInput'
import { RichText } from '../../components/RichText'
import { ChannelPreview, type PreviewChannel } from '../../components/ChannelPreview'
import { MembersDialog, type MemberSet } from '../../components/MembersDialog'
import { PageHeader } from '../../components/shell'
import type { SendCtl } from './ctl'

const title = (mode: string) => ({
  new: L('New message', '新訊息'), edit: L('Edit message', '編輯訊息'),
  duplicate: L('Duplicate message', '複製訊息'), resend: L('Resend to missed audiences', '重寄給未送達的人'),
} as Record<string, string>)[mode] || L('New message', '新訊息')

export function ComposeView({ m }: { m: SendCtl }) {
  useApp()
  const c = m.s.c, ap = approval(c), e = m.errs()
  return (
    <div data-compose className="flex min-h-full flex-col">
      <PageHeader
        crumbs={[{ label: scopeLabel(), onClick: () => m.goList() }, { label: c.only ? L('Edit content', '編輯內容') : title(c.mode) }]}
      />
      {c.result ? <ResultView m={m} /> : (
        <>
          <div data-layout-space="lg" className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[calc(var(--layout-space-loose)*2)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
            {c.only ? null : <StepBar m={m} e={e} />}
            {c.only ? <Step2 m={m} e={e} /> : c.step === 1 ? <Step1 m={m} e={e} /> : c.step === 2 ? <Step2 m={m} e={e} /> : <Step3 m={m} e={e} />}
          </div>
          <FootBar m={m} />
        </>
      )}
    </div>
  )
}

function StepBar({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, narrow = useIsNarrowViewport()
  const steps = [L('Channels & audiences', '通道與收件人'), L('Message', '訊息內容'), L('Schedule & preview', '排程與預覽')]
  const done = [1, 2, 3].filter(n => n !== c.step && n <= c.maxStep && stepOk(n, e)).map(n => 's' + n)
  // on a phone the three steps don't fit side by side
  if (narrow) return (
    <div className="flex items-center gap-3">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-body font-medium text-on-emphasis">{c.step}</span>
      <Two a={steps[c.step - 1]} b={L('Step ' + c.step + ' of 3', '第 ' + c.step + ' 步，共 3 步')} strong />
    </div>
  )
  return (
    <div className="py-[var(--layout-space-tight)]">
      <Steps orientation="horizontal" value={'s' + c.step} completedValues={done} onValueChange={v => m.goStep(+v.slice(1))}>
        {steps.map((x, i) => {
          const n = i + 1, can = n === c.step || n <= Math.max(c.maxStep, c.step + 1)
          return <StepItem key={n} value={'s' + n} disabled={!can}><StepLabel>{x}</StepLabel></StepItem>
        })}
      </Steps>
    </div>
  )
}

// ---------- step 1 ----------
type RRow = { t: RTag; label: string; sub: string; kind: string; cnt: number; can: { k: Channel; n: number; of: number }[]; warn: boolean; badge: string; badgeBtn: boolean; ppl: Person[] }
const rcol = createColumnHelper<RRow>()

function recvKind(t: RTag) {
  return t.type === 'person' ? L('Person', '人員') : t.type === 'org' ? L('Org', '組織') : t.type === 'group' ? L('Group', '群組') : isExtPhone(t) ? L('External phone', '外部電話') : L('External email', '外部 Email')
}

// the phone ticks of one audience row; external contacts don't have them (a phone number gets the SMS itself)
const phoneOn = (c: Compose, key: string, k: 'co' | 'pp') => k === 'co' ? c.smsCO[key] !== false : !!c.smsPP[key]
function PhoneCell({ m, t, k }: { m: SendCtl; t: RTag; k: 'co' | 'pp' }) {
  const c = m.s.c
  if (t.type === 'ext') return <span className="text-fg-muted">—</span>
  const set = (v: boolean) => m.setC(k === 'co' ? { smsCO: { ...c.smsCO, [t.key]: v } } : { smsPP: { ...c.smsPP, [t.key]: v } })
  return <Checkbox checked={phoneOn(c, t.key, k)} onCheckedChange={v => set(!!v)} aria-label={(k === 'co' ? L('Company phone', '公務手機') : L('Personal phone', '私人手機'))} />
}
function PhoneHead({ m, k, label }: { m: SendCtl; k: 'co' | 'pp'; label: string }) {
  const c = m.s.c, rows = c.receivers.filter(t => t.type !== 'ext'), on = rows.filter(t => phoneOn(c, t.key, k)).length
  const all = !!rows.length && on === rows.length
  const setAll = () => { const v = Object.fromEntries(rows.map(t => [t.key, !all])); m.setC(k === 'co' ? { smsCO: v } : { smsPP: v }) }
  return <span className="inline-flex items-center gap-2"><Checkbox checked={all ? true : on ? 'indeterminate' : false} disabled={!rows.length} onCheckedChange={setAll} aria-label={L('All: ', '全部：') + label} />{label}</span>
}

function RecvTable({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, c = s.c, q = (s.rf || '').trim().toLowerCase(), sms = smsOn(c)
  const [mem, setMem] = React.useState<MemberSet | null>(null)
  const rows: RRow[] = c.receivers.map(t => {
    let label = '', sub = '', ppl: any[] = [], cnt = 1, warn = false, badge = '', badgeBtn = false
    if (t.type === 'person') {
      const p = PMAP[t.id!]; ppl = [p].filter(Boolean)
      label = p ? p.en + ' ' + p.zh : t.id!; sub = p ? [p.org, p.nt, p.emp].filter(Boolean).join(' · ') : ''
      const unres = false, noNum = sms && p && !p.co && !p.pp
      badge = unres ? L('Choose number', '選擇號碼') : noNum ? L('No phone', '無電話') : ''; badgeBtn = !!unres; warn = !!unres
    } else if (t.type === 'group' || t.type === 'org') {
      ppl = flatten([t], app.groups).map(x => PMAP[x.pid]).filter(Boolean); cnt = ppl.length
      if (t.type === 'group') { const g = app.groups.find(x => x.id === t.id); label = g ? g.name : t.id!; sub = g ? g.desc : '' }
      else { const o = ORGS.find(x => x.code === t.id); label = t.id!; sub = o ? o.no : '' }
    } else {
      const ph = isExtPhone(t), on = ph ? c.ch.sms : c.ch.email
      label = t.email!; sub = ph ? L('SMS only', '只收 SMS') : L('Email only', '只收 Email'); warn = !on
    }
    const internal = ppl.filter(p => !p.extKind), xe = ppl.filter(p => p.extKind === 'email').length, xp = ppl.filter(p => p.extKind === 'phone').length
    const can = t.type === 'ext'
      ? [{ k: (isExtPhone(t) ? 'sms' : 'email') as Channel, n: 1, of: 1 }]
      : [{ k: 'push' as Channel, n: internal.filter(p => p.dev).length, of: cnt }, { k: 'desktop' as Channel, n: internal.filter(p => p.desk).length, of: cnt }, { k: 'email' as Channel, n: internal.length + xe, of: cnt }, { k: 'sms' as Channel, n: internal.filter(p => p.co || p.pp).length + xp, of: cnt }]
    return { t, label, sub, kind: recvKind(t), cnt, can, warn, badge, badgeBtn, ppl }
  }).filter(x => !q || (x.label + ' ' + x.sub + ' ' + x.kind).toLowerCase().indexOf(q) >= 0)

  // the audience list only answers "who did I pick": one column, with the type and (for orgs and groups) the
  // head count beside the name; what each channel reaches is shown on the channel cards below
  const cols = React.useMemo(() => [
    rcol.display({ id: 'who', header: L('Audience', '收件人'), meta: { width: 320 }, cell: i => {
      const x = i.row.original, t = x.t, p = t.type === 'person' ? PMAP[t.id!] : null
      const Icon = t.type === 'group' ? Users : t.type === 'org' ? Building2 : isExtPhone(t) ? Phone : Mail
      const many = t.type === 'group' || t.type === 'org'
      // one line per cell (DS table rule): people use the DS person display (org · NT · ID in its hover card)
      return (
        <span className="flex min-w-0 items-center gap-2">
          {p ? <PersonDisplay value={personVal(p)} />
            : <>
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="size-3.5 text-fg-secondary" aria-hidden /></span>
              <span className="truncate text-body">{x.label}</span>
              <Tag size="sm" color="neutral">{x.kind}</Tag>
            </>}
          {/* an org or group's head count opens its member list */}
          {many ? <Button variant="link" size="sm" className="!h-auto !min-w-0 shrink-0 !p-0 tabular-nums" aria-label={L('See the ' + fmtN(x.cnt) + ' members of ', '查看成員：') + x.label} onClick={() => setMem({ name: x.label, kind: x.kind, people: x.ppl, group: t.type === 'group' ? t.id : undefined })}>{P(x.cnt, 'person', '人', 'people')}</Button> : null}
          {x.badgeBtn ? <Button size="xs" variant="secondary" onClick={() => m.openNumbers()}>{x.badge}</Button> : x.badge ? <Tag size="sm">{x.badge}</Tag> : null}
        </span>
      )
    } }),
    // SMS fallback on: per row, which phone gets the SMS (company ticked by default), with a select-all in the header
    ...(sms ? [
      rcol.display({ id: 'co', header: () => <PhoneHead m={m} k="co" label={L('Company phone', '公務手機')} />, meta: { width: 176, maxWidth: 176 }, cell: i => <PhoneCell m={m} t={i.row.original.t} k="co" /> }),
      rcol.display({ id: 'pp', header: () => <PhoneHead m={m} k="pp" label={L('Personal phone', '私人手機')} />, meta: { width: 176, maxWidth: 176 }, cell: i => <PhoneCell m={m} t={i.row.original.t} k="pp" /> }),
    ] : []),
  ], [m, app.lang, sms, c.smsCO, c.smsPP, c.receivers])

  if (!c.receivers.length) return <Empty icon={Users} title={L('No audiences yet', '還沒有收件人')} description={L('Search above, or use Batch import.', '在上方搜尋，或使用批次匯入。')} />
  return (
    <div className="flex flex-col gap-2">
      {c.receivers.length > 6 ? (
        <div className="flex items-center gap-2">
          <div className="w-64"><Input size="sm" startIcon={Search} type="search" placeholder={L('Filter audiences', '篩選收件人')} aria-label={L('Filter audiences', '篩選收件人')} value={s.rf} onChange={ev => m.set({ rf: ev.target.value })} /></div>
          {rows.length !== c.receivers.length ? <span className="text-caption text-fg-secondary">{rows.length} / {c.receivers.length}</span> : null}
          <Button variant="link" size="sm" danger className="ml-auto" onClick={() => m.askRemoveAll()}>{L('Remove all', '全部移除')}</Button>
        </div>
      ) : null}
      <DataTable tableOptions={NO_HIDE} columns={cols as any} data={rows} bordered height={rows.length > 6 ? '320px' : 'auto'} getRowId={x => x.t.key}
        rowActions={(x: RRow) => <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={L('Remove ', '移除 ') + x.label} onClick={() => m.removeRecv(x.t.key)} />} />
      <MembersDialog set={mem} onClose={() => setMem(null)} />
    </div>
  )
}

function ChCard({ m, k }: { m: SendCtl; k: Channel; rc?: Reach }) {
  const c = m.s.c, on = !!c.ch[k], meta = CHN[k], id = 'ch-' + k
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer flex-col gap-3 rounded-lg border p-[var(--layout-space-tight)] transition-colors', on ? 'border-primary bg-primary-subtle/40' : 'border-border hover:border-border-hover')}>
      <span className="flex items-start gap-3">
        <IconBox icon={meta.icon} tone={on ? 'info' : 'neutral'} />
        <Two a={meta.name} b={meta.desc} strong className="flex-1 [&>span:first-child]:font-semibold [&>span:last-child]:whitespace-normal" />
        <Checkbox id={id} checked={on} onCheckedChange={() => m.pickChannel(k)} aria-label={meta.name} />
      </span>
    </label>
  )
}

// Channels first (so the audience table can offer the SMS phone columns when SMS fallback is on), then audiences,
// then a summary of who each channel reaches, which needs both.
function Step1({ m, e }: { m: SendCtl; e: Errs }) {
  const app = useApp(), s = m.s, c = s.c, tried = c.tried || {}, rc = m.reach(), total = rc.total, hasR = c.receivers.length > 0
  const ap = approval(c), sms = smsOn(c), noNum = noNumber(c), anyCh = c.ch.push || c.ch.desktop || c.ch.email
  return (
    <>
      <Section title={L('Channels', '通道')}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <div className="grid gap-[var(--layout-space-tight)] md:grid-cols-3">{CH_CARDS.map(k => <ChCard key={k} m={m} k={k} />)}</div>
          {c.ch.push ? (
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              <Checkbox
                checked={c.ch.sms} onCheckedChange={() => m.pickChannel('sms')}
                label={<span className="inline-flex items-center gap-2">{L('Device Notifications (SMS)', 'Device Notifications（SMS）')}{ICSD ? <Tag size="sm" color="amber">{L('Need ICSD Approval', '需 ICSD 核准')}</Tag> : null}</span>}
                description={L('Send an SMS to anyone the push doesn’t reach. Choose company or personal phones in the audience list below.', '推播沒送到的人，改發 SMS。在下方收件人列表選擇寄到公務或私人手機。')}
              />
              {ICSD && c.ch.sms ? (
                <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider p-[var(--layout-space-tight)]">
                  <span className="flex items-center gap-2 text-body font-medium"><ShieldCheck className="size-4 text-warning-text" aria-hidden />{c.urgent ? L('SMS approval will be skipped', '將略過 SMS 核准') : L('The SMS needs ICSD approval before it’s sent', 'SMS 經 ICSD 核准後才會送出')}</span>
                  <Checkbox checked={c.urgent} onCheckedChange={() => m.setC({ urgent: !c.urgent })}
                    label={L('It’s urgent: send without waiting for SMS approval', '這是緊急訊息，不等 SMS 核准直接傳送')}
                    description={L('Only for urgent, important messages. This request will be kept on record.', '僅限緊急且重要的訊息，此次申請將會留存紀錄。')} />
                  {c.urgent ? (
                    <FormField id="f-urgent" label={L('Reason', '原因')} required count={c.urgentReason.length + ' / 200'} over={c.urgentReason.length > 200} error={tried[1] || c.urgentReason.length > 200 ? e.urgent : ''}>
                      <Textarea id="f-urgent" rows={2} value={c.urgentReason} error={!!(tried[1] && e.urgent)} onChange={ev => m.setC({ urgentReason: ev.target.value })} placeholder={L('e.g. Typhoon warning issued at 07:30; staff must know before commuting.', '例如：07:30 發布颱風警報，員工必須在通勤前得知。')} />
                    </FormField>
                  ) : null}
                  {ap.mgr && c.urgent ? <Banner tone="neutral">{L('Your supervisor still has to approve it, because it goes outside the company.', '因為有外部收件人，仍需要主管核准。')}</Banner> : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {tried[1] && e.ch ? <ErrText>{e.ch}</ErrText> : null}
        </div>
      </Section>

      <Section title={L('Audiences', '收件人')} sub={L('Up to ' + CAP + ' people. Add contractors by phone or email.', '最多 ' + CAP + ' 人。外包人員可用電話或 Email 加入。')}
        actions={<span className={cn('shrink-0 text-body tabular-nums', total > CAP ? 'font-medium text-error-text' : 'text-fg-secondary')} aria-label={L('Audience count', '收件人數')}>{fmtN(total)} / {fmtN(CAP)}</span>}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <RecvInput
            id="ri-send" ri={s.ri} setRi={ri => m.set({ ri })} groups={app.groups.filter(g => groupInSpace(g))}
            isAdded={it => c.receivers.some(t => t.key === riKey(it))}
            onAdd={it => { const k = riKey(it); if (it.kind === 'ext') m.addRecv({ key: k, type: 'ext', email: it.value }); else m.addRecv({ key: k, type: it.kind, id: it.id }) }}
            extra={<Button variant="tertiary" startIcon={Upload} onClick={() => m.openImport()}>{L('Batch import', '批次匯入')}</Button>}
          />
          <RecvTable m={m} />
          {tried[1] && !hasR ? <ErrText>{L('Add at least one audience.', '請加入至少一位收件人。')}</ErrText> : null}
          {total > CAP ? <ErrText>{L(fmtN(total - CAP) + ' over the limit. Remove some, or split into separate messages.', '超過上限 ' + fmtN(total - CAP) + ' 人。請移除部分收件人，或分成多則訊息。')}</ErrText> : null}
          {/* external contacts that no chosen channel reaches are counted in the summary's red line */}
          {e.ext && !(hasR && anyCh && rc.unrN) ? <ErrText>{e.ext}</ErrText> : null}
          {e.extp && !(hasR && anyCh && rc.unrN) ? <ErrText>{e.extp}</ErrText> : null}
        </div>
      </Section>

      {hasR && anyCh ? <ReachSummary m={m} rc={rc} noNum={noNum.map(p => p.en)} /> : null}
    </>
  )
}

// Who each chosen channel actually reaches, out of everyone picked; then the notices (approval, can't get it)
function ReachSummary({ m, rc, noNum }: { m: SendCtl; rc: Reach; noNum: string[] }) {
  const app = useApp(), c = m.s.c, ap = approval(c), n = smsPhones(c, app.groups)
  const line = (k: Channel, got: number) => {
    const I = CHN[k].icon, all = got === rc.total
    return (
      <div key={k} className="flex items-center gap-3 px-3 py-2">
        <I className="size-4 shrink-0 text-fg-secondary" aria-hidden />
        <span className="flex-1 text-body">{CHN[k].name}</span>
        <span className={cn('text-body tabular-nums', all ? 'text-success-text' : 'text-fg-secondary')}>{fmtN(got)} / {fmtN(rc.total)} {L(rc.total === 1 ? 'person' : 'people', '人')}</span>
      </div>
    )
  }
  const smsParts = [
    n.co ? L(P(n.co, 'company phone', '', 'company phones'), '公務手機 ' + n.co + ' 支') : '',
    n.pp ? L(P(n.pp, 'personal phone', '', 'personal phones'), '私人手機 ' + n.pp + ' 支') : '',
    n.auto ? L(P(n.auto, 'personal phone', '', 'personal phones') + ' (no company phone)', '私人手機 ' + n.auto + ' 支（沒有公務手機）') : '',
    n.ext ? L(P(n.ext, 'external phone', '', 'external phones'), '外部電話 ' + n.ext + ' 支') : '',
  ].filter(Boolean)
  return (
    <Section title={L('Who gets it', '誰會收到')} sub={L('What each channel reaches, out of everyone above.', '每個通道實際會送到的人數（以上方所有收件人計算）。')}>
      <div className="flex flex-col gap-[var(--layout-space-tight)]">
        <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
          {c.ch.push ? line('push', rc.push) : null}
          {smsOn(c) ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <MessageSquareText className="size-4 shrink-0 text-fg-secondary" aria-hidden />
              <span className="flex-1 text-body">{L('SMS (when the push doesn’t reach)', 'SMS（推播沒送到時）')}</span>
              <span className="text-body text-fg-secondary">{smsParts.length ? smsParts.join(L(', ', '、')) : L('No one needs it for now', '目前不需要')}</span>
            </div>
          ) : null}
          {c.ch.desktop ? line('desktop', rc.desktop) : null}
          {c.ch.email ? line('email', rc.email) : null}
        </div>
        {smsOn(c) && (n.none || noNum.length) ? <Banner tone="neutral">{noNum.length && noNum.length >= n.none
          ? L(joinL(noNum) + (noNum.length === 1 ? ' has' : ' have') + ' no phone number and won’t get SMS.', joinL(noNum) + ' 沒有電話，收不到 SMS。')
          : L(P(n.none, 'person has', '', 'people have') + ' no phone number and won’t get SMS.', n.none + ' 人沒有電話，收不到 SMS。')}</Banner> : null}
        {smsOn(c) && n.off ? <p className="flex items-center gap-1 text-body text-warning-text"><AlertTriangle className="size-4 shrink-0" aria-hidden />{L(P(n.off, 'person has', '', 'people have') + ' neither phone ticked and won’t get the SMS.', n.off + ' 人兩支手機都沒勾，收不到 SMS。')}</p> : null}
        {ap.mgr ? <p className="flex items-center gap-1 text-body text-warning-text"><AlertTriangle className="size-4 shrink-0" aria-hidden />{L('Includes ' + P(ap.ext, 'external audience', '') + '. Your supervisor, ' + SUPERVISOR + ', must approve.', '包含 ' + ap.ext + ' 位外部收件人，需要主管 ' + SUPERVISOR + ' 核准。')}</p> : null}
        {/* one line: who can't get it, as a link to the list; no suggestions to add channels */}
        {rc.unrN ? (
          <p className="flex flex-wrap items-center gap-x-2 text-body"><span className="inline-flex items-center gap-1 text-error-text"><AlertTriangle className="size-4 shrink-0" aria-hidden />{L(P(rc.unrN, 'person', '', 'people') + ' can’t get the message', rc.unrN + ' 人收不到訊息')}</span><Button variant="link" size="sm" className="!h-auto !min-w-0 !p-0" onClick={() => m.set({ unr: true })}>{L('See who', '查看是誰')}</Button></p>
        ) : null}
      </div>
    </Section>
  )
}

// ---------- step 2 ----------
function FormatBlock({ title, desc, icon: I, uses, children }: { title: string; desc?: string; icon?: typeof Mail; uses?: React.ReactNode; children: React.ReactNode }) {
  // each channel's content in its own framed block with a header (icon and name), so the channels read apart
  return (
    <section className="flex flex-col rounded-lg border border-divider" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-b border-divider bg-neutral-1 px-[var(--layout-space-tight)] py-3">
        <span className="flex items-center gap-3">
          {I ? <IconBox icon={I} tone="neutral" /> : null}
          <span className="flex flex-col gap-0.5"><span className="text-body font-semibold">{title}</span>{desc ? <span className="text-caption text-fg-secondary">{desc}</span> : null}</span>
        </span>
        {uses ? <span className="flex flex-wrap items-center gap-1.5">{uses}</span> : null}
      </div>
      <div className="flex flex-col gap-[var(--layout-space-tight)] p-[var(--layout-space-loose)]">{children}</div>
    </section>
  )
}

// New or from a template: the template is picked from a list of this space's templates
function TplChoice({ m }: { m: SendCtl }) {
  const app = useApp(), c = m.s.c
  const [useTpl, setUseTpl] = React.useState(!!c.tplId)
  const list = app.templates.filter(t => tplInSpace(t))
  const chsOf = (t: Template): Channel[] => { const f = tplFormats(t), l: Channel[] = []; if (f.indexOf('notif') >= 0) l.push('push', 'desktop'); if (f.indexOf('email') >= 0) l.push('email'); if (f.indexOf('sms') >= 0) l.push('sms'); return l }
  const pick = (v: string) => { if (v === 'new') { setUseTpl(false); if (c.tplId) m.clearTemplate() } else setUseTpl(true) }
  return (
    // the template field sits right after its radio and stays disabled until "Use template" is picked
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <RadioGroup value={useTpl ? 'tpl' : 'new'} onValueChange={pick} aria-label={L('Start from', '內容來源')} className="flex flex-wrap gap-x-6 gap-y-2">
        <RadioGroupItem value="new" label={L('New', '新訊息')} />
        <RadioGroupItem value="tpl" label={L('Use template', '使用模板')} />
      </RadioGroup>
      <div className="w-80 max-w-full">
        <Select id="f-tpl" searchable disabled={!useTpl} aria-label={L('Template', '模板')} placeholder={L('Choose a template', '選擇模板')} emptyText={L('No matching templates', '找不到符合的模板')}
          value={c.tplId || ''} onChange={v => { const t = list.find(x => x.id === v); if (t) m.askTemplate(t) }}
          options={list.map(t => ({ value: t.id, label: t.name, description: chsOf(t).map(k => CHN[k].short).join(' · ') }))} />
      </div>
    </div>
  )
}

function Step2({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, tried = c.tried || {}, hasN = hasNotif(c), lim = LIM.push, tpl = c.tplId ? m.tplById(c.tplId) : null
  const show = (k: keyof Errs, v: string, n: number) => (e[k] && (tried[2] || (v && v.length > n))) ? e[k]! : ''
  const eSender = e.sender && (tried[2] || !SENDER_RE.test(c.sender) || c.sender.length > LIM.sender) ? e.sender : '', eContent = show('content', c.content, lim), eSms = show('sms', c.smsText, LIM.sms)
  const edSender = e.dsender && (tried[2] || !SENDER_RE.test(c.dSender) || c.dSender.length > LIM.sender) ? e.dsender : '', edTitle = show('dtitle', c.dTitle, LIM.dTitle), edContent = show('dcontent', c.dContent, LIM.desktop)
  const noNotif = tpl && hasN && !tplHasNotif(tpl) ? <Banner tone="neutral">{L('This template has no notification text.', '這個模板沒有通知內容。')}</Banner> : null
  return (
    <Section title={c.only ? L('Edit content', '編輯內容') : L('Message details', '訊息詳情')} sub={c.only ? L('Changes apply to ' + CHN[c.only].name + ' only. Audiences and other channels stay the same.', '只會改到 ' + CHN[c.only].name + '，收件人和其他通道不變。') : L('Compose the message title and body to be sent to your audience.', '撰寫要傳送給收件人的訊息標題和內容。')}>
      <div className="flex flex-col gap-[calc(var(--layout-space-loose)*2)]">
        {c.only ? null : <TplChoice m={m} />}
        {c.ch.push ? (
          <FormatBlock title={CHN.push.name} icon={CHN.push.icon}>
            {noNotif}
            <FormField id="f-sender" label={L('Sender', '寄件人')} required count={c.sender.length + ' / ' + LIM.sender} over={c.sender.length > LIM.sender} hint={L('Recipients will see this name as the notification source. Only applies to Device Notifications App (PNS).', '收件人會看到這個名稱作為通知來源。只適用於 Device Notifications App（PNS）。')} error={eSender}>
              <Input id="f-sender" value={c.sender} error={!!eSender} onChange={ev => m.setC({ sender: ev.target.value })} />
            </FormField>
            <FormField id="f-content" label={L('Content', '內容')} required count={fmtN(c.content.length) + ' / ' + lim} over={c.content.length > lim} error={eContent}>
              <Textarea id="f-content" rows={4} value={c.content} error={!!eContent} onChange={ev => m.setC({ content: ev.target.value, title: pushTitle(ev.target.value) })} />
            </FormField>
          </FormatBlock>
        ) : null}
        {smsOn(c) ? (
          <FormatBlock title="SMS" icon={CHN.sms.icon} desc={L('Sent as a backup via SMS only if the push notification fails to send.', '只有推播傳送失敗時，才會用 SMS 補送。')}>
            <FormField id="f-sms" label={L('SMS text', 'SMS 內容')} required count={c.smsText.length + ' / ' + LIM.sms} over={c.smsText.length > LIM.sms} hint={L('Links won’t open in SMS.', 'SMS 裡的連結無法開啟。')} error={eSms}>
              <Textarea id="f-sms" rows={2} value={c.smsText} error={!!eSms} onChange={ev => m.setC({ smsText: ev.target.value })} />
            </FormField>
          </FormatBlock>
        ) : null}
        {c.ch.desktop ? (
          <FormatBlock title={CHN.desktop.name} icon={CHN.desktop.icon}>
            {c.ch.push ? null : noNotif}
            <FormField id="f-dsender" label={L('Sender (Optional)', '寄件人（選填）')} count={c.dSender.length + ' / ' + LIM.sender} over={c.dSender.length > LIM.sender} error={edSender}>
              <Input id="f-dsender" value={c.dSender} error={!!edSender} onChange={ev => m.setC({ dSender: ev.target.value })} />
            </FormField>
            <FormField id="f-dtitle" label={L('Title', '標題')} required count={c.dTitle.length + ' / ' + LIM.dTitle} over={c.dTitle.length > LIM.dTitle} error={edTitle}>
              <Input id="f-dtitle" value={c.dTitle} error={!!edTitle} onChange={ev => m.setC({ dTitle: ev.target.value })} />
            </FormField>
            <FormField id="f-dcontent" label={L('Content', '內容')} required count={fmtN(c.dContent.length) + ' / ' + LIM.desktop} over={c.dContent.length > LIM.desktop} hint={L('Supports Chinese, English, and numbers only.', '僅支援中文、英文、數字。')} error={edContent}>
              <Textarea id="f-dcontent" rows={3} value={c.dContent} error={!!edContent} onChange={ev => m.setC({ dContent: ev.target.value })} />
            </FormField>
          </FormatBlock>
        ) : null}
        {c.ch.email ? <EmailBlock m={m} e={e} show={show} /> : null}
      </div>
    </Section>
  )
}

function EmailBlock({ m, e, show }: { m: SendCtl; e: Errs; show: (k: keyof Errs, v: string, n: number) => string }) {
  const c = m.s.c
  const tried2 = !!(c.tried || {})[2]
  const eSub = show('subject', c.subject, LIM.subject), bodyN = c.bodyText.trim().length, eBody = e.body && (tried2 || emailTooBig(c)) ? e.body : ''
  return (
    <FormatBlock title="Email" icon={CHN.email.icon}>
      <FormField id="f-subject" label={L('Subject', '主旨')} required count={c.subject.length + ' / ' + LIM.subject} over={c.subject.length > LIM.subject} error={eSub}>
        <Input id="f-subject" value={c.subject} error={!!eSub} onChange={ev => m.setC({ subject: ev.target.value })} />
      </FormField>
      <FormField id="f-body" label={L('Content', '內容')} required hint={L('Supports text, tables, and images.', '支援文字、表格、圖片。')} error={eBody}>
        <RichText id="f-body" seedKey={'rte-' + c.htmlKey} html={c.html} label={L('Content', '內容')} error={!!eBody} onInput={(h, t) => m.onEmailInput(h, t)} />
      </FormField>
    </FormatBlock>
  )
}

// ---------- step 3 ----------
function RvRow({ icon, k, v, q, warn, edit }: { icon: typeof Mail; k: string; v: string; q?: string; warn?: boolean; edit?: () => void }) {
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <IconBox icon={icon} tone={warn ? 'warn' : 'neutral'} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium">{k}</span>
        <span className={cn('text-body', warn ? 'text-warning-text' : 'text-fg-secondary')}>{v}</span>
        {q ? <span className="mt-1 border-l-2 border-divider pl-2 text-caption text-fg-secondary">{q}</span> : null}
      </span>
      {edit ? <Button size="sm" variant="text" onClick={edit}>{L('Edit', '修改')}</Button> : null}
    </div>
  )
}

// what each audience will see, on a close-to-real device, one channel at a time
function Preview({ c, counts }: { c: Compose; counts: Partial<Record<PreviewChannel, number>> }) {
  const chs = (['push', 'desktop', 'sms', 'email'] as PreviewChannel[]).filter(k => c.ch[k])
  const [cur, setCur] = React.useState<PreviewChannel>(chs[0])
  const k = chs.indexOf(cur) >= 0 ? cur : chs[0]
  if (!k) return null
  const d = k === 'desktop', msg = { sender: (d ? c.dSender : c.sender).trim(), title: d ? c.dTitle.trim() : '', content: (d ? c.dContent : c.content).trim(), smsText: c.smsText.trim(), subject: c.subject.trim(), html: cleanHtml(c.html) }
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-md border border-divider p-[var(--layout-space-tight)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-h6 font-bold">{L('Preview', '預覽')}</span>
        {chs.length > 1 ? (
          <SegmentedControl size="sm" value={k} onValueChange={v => v && setCur(v as PreviewChannel)} aria-label={L('Preview channel', '預覽通道')}>
            {chs.map(x => <SegmentedControlItem key={x} value={x}>{x === 'sms' ? 'SMS' : CHN[x].name}</SegmentedControlItem>)}
          </SegmentedControl>
        ) : <span className="text-body text-fg-secondary">{CHN[k].name}</span>}
      </div>
      <div className="rounded-md bg-neutral-1 p-[var(--layout-space-loose)]"><ChannelPreview ch={k} msg={msg} zh={L('en', 'zh') === 'zh'} /></div>
      <span className="text-caption text-fg-secondary">{L('Preview only. The message may look different depending on each recipient’s device and settings.', '僅供參考。實際呈現會因收件人的裝置與設定而不同。')}</span>
    </div>
  )
}

function Step3({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, tried = c.tried || {}, rc = m.reach(), ap = approval(c), mode = effEmailMode(c)
  const schedD = fromIso(c.schedAt), nowD = new Date(), schedErr = (e.sched && (tried[3] || c.schedAt)) ? e.sched : ''
  const rows: React.ReactNode[] = []
  // the audience of each channel sits with its preview
  const counts: Partial<Record<PreviewChannel, number>> = { push: rc.push, sms: rc.smsable + rc.extP, desktop: rc.desktop, email: rc.email }
  if (rc.unrN) rows.push(<RvRow key="u" icon={AlertTriangle} warn k={L(P(rc.unrN, 'person', '', 'people') + ' can’t get the message', rc.unrN + ' 人收不到訊息')} v={L('None of your channels reach them.', '你選的通道都送不到他們。')} />)
  const tomorrow9 = toIso(new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() + 1, 9, 0))
  const opts = [
    ['now', Zap, L('Send now', '立即傳送'), undefined],
    ['schedule', CalendarClock, L('Scheduled send', '排程傳送'), L('Up to 3 months ahead', '3 個月內任一時間')],
  ] as const
  return (
    <>
      <p className="text-body text-fg-secondary">{L('Choose when to send and review all settings before submission.', '選擇傳送時間，並在送出前確認所有設定。')}</p>
      <Section title={L('Schedule', '排程')} sub={L('Taipei time (GMT+8)', '台北時間（GMT+8）')}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <RadioGroup value={c.sendMode} onValueChange={v => v === 'now' ? m.setC({ sendMode: 'now' }) : m.setC({ sendMode: 'schedule', schedAt: c.schedAt || tomorrow9 })} className="grid gap-[var(--layout-space-tight)] md:grid-cols-2">
            {opts.map(x => (
              <label key={x[0]} className={cn('flex cursor-pointer rounded-lg border p-[var(--layout-space-tight)]', c.sendMode === x[0] ? 'border-primary bg-primary-subtle/40' : 'border-border hover:border-border-hover')}>
                <RadioGroupItem value={x[0]} icon={x[1]} label={x[2]} description={x[3]} />
              </label>
            ))}
          </RadioGroup>
          {c.sendMode === 'schedule' ? (
            <FormField id="f-sched" label={L('Date and time', '日期和時間')} hint={schedD && !e.sched ? L('Sends ', '將於 ') + niceDT(schedD) + L(ap.need ? ' if approved by then' : '', ap.need ? ' 傳送（需先核准）' : ' 傳送') : undefined} error={schedErr} className="max-w-sm">
              <DatePicker id="f-sched" showTime typeable locale={L('en-US', 'zh-TW')} value={c.schedAt || null} error={!!schedErr} onChange={v => m.setC({ schedAt: v })} placeholder="YYYY/MM/DD HH:MM" />
            </FormField>
          ) : null}
        </div>
      </Section>
      <Section title={L('Review', '確認內容')}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          {rows.length ? <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">{rows}</div> : null}
          <Preview c={c} counts={counts} />
        </div>
      </Section>
    </>
  )
}

// ---------- footer and result ----------
function FootBar({ m }: { m: SendCtl }) {
  const c = m.s.c, ap = approval(c)
  // one label whatever the send time or approval: the review step already says what happens next
  const primary = L('Create message', '建立訊息')
  return (
    <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
        {c.only ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="tertiary" onClick={() => m.goList()}>{L('Cancel', '取消')}</Button>
            <Button variant="primary" onClick={() => m.saveContent()}>{L('Save', '儲存')}</Button>
          </div>
        ) : <>
        <div className="flex flex-wrap gap-2">
          {c.step === 1 ? <Button variant="tertiary" disabled={!c.receivers.length} onClick={() => m.set({ sg: { name: '', desc: '', tried: false } })}>{L('Save as group', '存成群組')}</Button> : null}
          {c.step === 2 ? <Button variant="tertiary" onClick={() => m.openSaveTpl()}>{L('Save as template', '存成模板')}</Button> : null}
          {c.step === 3 ? <Button variant="tertiary" onClick={() => m.sendTest()}>{L('Send me a test', '寄測試給我')}</Button> : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="tertiary" onClick={() => m.goList()}>{L('Cancel', '取消')}</Button>
          {c.step > 1 ? <Button variant="tertiary" onClick={() => m.goStep(c.step - 1)}>{L('Back', '上一步')}</Button> : null}
          {c.step < 3
            ? <Button variant="primary" onClick={() => m.goStep(c.step + 1)}>{L('Next', '下一步')}</Button>
            : <Button variant="primary" onClick={() => m.submit()}>{primary}</Button>}
        </div>
        </>}
      </div>
    </div>
  )
}

function ResultView({ m }: { m: SendCtl }) {
  const r = m.s.c.result!, ap = r.ap, both = ap.mgr && ap.icsd
  const rows = [
    { k: L('Request ID', '申請編號'), v: r.reqId },
    { k: L('Approver', '審核人'), v: both ? SUPERVISOR + L(', then the SMS reviewer', '，再由 SMS 審核人員') : ap.icsd ? L('SMS reviewer', 'SMS 審核人員') : SUPERVISOR },
    { k: L('Channels', '通道'), v: r.chs.map(k => CHN[k].name).join(L(', ', '、')) },
    { k: L('Submitted', '送出時間'), v: r.when },
    { k: L('Sends', '傳送時間'), v: r.sends },
    { k: L('Audiences', '收件人'), v: fmtN(r.total) },
  ]
  const text = both ? L('Your supervisor reviews it first, then the SMS reviewer. We’ll notify you at each step.', '先由主管審核，再由 SMS 審核人員審核，每一步都會通知你。')
    : ap.icsd ? L('The SMS reviewer will review it. We’ll notify you when it’s approved.', 'SMS 審核人員審核後會通知你。')
    : L('Your supervisor will review it. We’ll notify you when it’s approved.', '主管審核後會通知你。')
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)] pt-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-warning-subtle text-warning-text"><ShieldCheck className="size-6" aria-hidden /></span>
      <h2 className="text-h3">{L('Sent for approval', '已送出審核')}</h2>
      <p className="text-body text-fg-secondary">{text}</p>
      <div className="w-full text-left"><KV rows={rows} /></div>
      <div className="flex gap-2">
        <Button variant="tertiary" onClick={() => m.startCompose('new')}>{L('New message', '再發一則')}</Button>
        <Button variant="primary" onClick={() => m.toList()}>{L('Back to messages', '回到訊息列表')}</Button>
      </div>
    </div>
  )
}
