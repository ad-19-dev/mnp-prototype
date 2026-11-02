// Send flow: 1 Receivers & channels, 2 Message, 3 Review, plus the approval result
import * as React from 'react'
import {
  Button, Checkbox, DataTable, DatePicker, Empty, FileItem, FileUpload, Input, RadioGroup, RadioGroupItem, SegmentedControl, Select,
  SegmentedControlItem, StepItem, StepLabel, Steps, Tag, Textarea, cn, useIsNarrowViewport,
} from '@qijenchen/design-system'
import { NO_HIDE, Tip } from '../../components/ui'
import { groupInSpace, spaceName } from '../../lib/teams'
import { scopeLabel } from './ctl'
import { } from '../../lib/store'
import { createColumnHelper } from '@tanstack/react-table'
import {
  AlertTriangle, Building2, CalendarClock, ChevronLeft, ChevronRight, FlaskConical, Globe, LayoutTemplate, Mail,
  CircleCheck, MessageSquareText, Monitor, Phone, Plus, Save, Search, Send, ShieldAlert, ShieldCheck, Smartphone, Upload, UserPlus, Users, X, Zap, BookUser, UserRound, UsersRound } from 'lucide-react'
import {
  CAP, CH_CARDS, DESK, LIM, ORGS, PMAP, SUPERVISOR, cutAt, flatten, fmtN, fmtSize, fromIso, isExtPhone,
  pad, placeholders, toIso, tplFormats, tplHasNotif, vwidth, type Channel, type Tag as RTag,
  ME,
} from '../../lib/data'
import {
  approval, effEmailMode, hasNotif, multiPeople, noNumber, reachNote, smsCoverText, smsOn, stepOk, unresolved,
  type Errs, type Reach,
} from '../../lib/compose'
import { useApp } from '../../lib/store'
import { L, P, joinL, niceDT } from '../../lib/i18n'
import { Banner, CHN, ErrText, FmtChips, FormField, IconBox, KV, Meter, PAvatar, Section, Two } from '../../components/ui'
import { RecvInput, riKey } from '../../components/RecvInput'
import { RichText } from '../../components/RichText'
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
        crumbs={[{ label: scopeLabel(), onClick: () => m.goList() }, { label: title(c.mode) }]}
        actions={c.result ? null : (
          <>
            {ap.mgr ? <Tag size="md" color="amber" unbounded icon={ShieldCheck}>{L('Needs supervisor approval', '需主管核准')}</Tag> : null}
            {ap.icsd ? <Tag size="md" color="amber" unbounded icon={ShieldCheck}>{L('Needs ICSD approval', '需 ICSD 核准')}</Tag> : null}
            {ap.skipped ? <Tag size="md" color="red" unbounded icon={ShieldAlert}>{L('Skipping ICSD approval (urgent)', '略過 ICSD 核准（緊急）')}</Tag> : null}
          </>
        )}
      />
      {c.result ? <ResultView m={m} /> : (
        <>
          <div data-layout-space="lg" className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[calc(var(--layout-space-loose)*2)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
            <StepBar m={m} e={e} />
            {c.step === 1 ? <Step1 m={m} e={e} /> : c.step === 2 ? <Step2 m={m} e={e} /> : <Step3 m={m} e={e} />}
          </div>
          <FootBar m={m} />
        </>
      )}
    </div>
  )
}

function StepBar({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, narrow = useIsNarrowViewport()
  const steps = [L('Audiences & channels', '收件人與通道'), L('Message', '訊息內容'), L('Review & send', '確認送出')]
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
type RRow = { t: RTag; label: string; sub: string; kind: string; cnt: number; can: { k: Channel; n: number; of: number }[]; warn: boolean; badge: string; badgeBtn: boolean }
const rcol = createColumnHelper<RRow>()

function recvKind(t: RTag) {
  return t.type === 'person' ? L('Person', '人員') : t.type === 'org' ? L('Org', '組織') : t.type === 'group' ? L('Group', '群組') : isExtPhone(t) ? L('External phone', '外部電話') : L('External email', '外部 Email')
}

function RecvTable({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, c = s.c, q = (s.rf || '').trim().toLowerCase(), sms = smsOn(c)
  const rows: RRow[] = c.receivers.map(t => {
    let label = '', sub = '', ppl: any[] = [], cnt = 1, warn = false, badge = '', badgeBtn = false
    if (t.type === 'person') {
      const p = PMAP[t.id!]; ppl = [p].filter(Boolean)
      label = p ? p.zh + ' ' + p.en : t.id!; sub = p ? p.nt + ' · ' + p.emp + ' · ' + p.org : ''
      const multi = sms && p && p.co && p.pp, unres = multi && !c.pick[t.key], noNum = sms && p && !p.co && !p.pp
      badge = unres ? L('Choose number', '選擇號碼') : noNum ? L('No phone', '無電話') : ''; badgeBtn = !!unres; warn = !!unres
    } else if (t.type === 'group' || t.type === 'org') {
      ppl = flatten([t], app.groups).map(x => PMAP[x.pid]).filter(Boolean); cnt = ppl.length
      if (t.type === 'group') { const g = app.groups.find(x => x.id === t.id); label = g ? g.name : t.id!; sub = g ? g.desc : '' }
      else { const o = ORGS.find(x => x.code === t.id); label = t.id!; sub = o ? o.name : '' }
    } else {
      const ph = isExtPhone(t), on = ph ? c.ch.sms : c.ch.email
      label = t.email!; sub = ph ? L('SMS only', '只收 SMS') : L('Email only', '只收 Email'); warn = !on
    }
    const internal = ppl.filter(p => !p.extKind), xe = ppl.filter(p => p.extKind === 'email').length, xp = ppl.filter(p => p.extKind === 'phone').length
    const can = t.type === 'ext'
      ? [{ k: (isExtPhone(t) ? 'sms' : 'email') as Channel, n: 1, of: 1 }]
      : [{ k: 'push' as Channel, n: internal.filter(p => p.dev).length, of: cnt }, { k: 'desktop' as Channel, n: internal.filter(p => p.desk).length, of: cnt }, { k: 'email' as Channel, n: internal.length + xe, of: cnt }, { k: 'sms' as Channel, n: internal.filter(p => p.co || p.pp).length + xp, of: cnt }]
    return { t, label, sub, kind: recvKind(t), cnt, can, warn, badge, badgeBtn }
  }).filter(x => !q || (x.label + ' ' + x.sub + ' ' + x.kind).toLowerCase().indexOf(q) >= 0)

  const cols = React.useMemo(() => [
    rcol.display({ id: 'who', header: L('Audience', '收件人'), meta: { width: 320 }, cell: i => {
      const x = i.row.original, t = x.t, p = t.type === 'person' ? PMAP[t.id!] : null
      const Icon = t.type === 'group' ? BookUser : t.type === 'org' ? Building2 : isExtPhone(t) ? Phone : Globe
      return (
        <span className="flex min-w-0 items-center gap-2">
          {p ? <PAvatar p={p} /> : <IconBox icon={Icon} tone={t.type === 'ext' && x.warn ? 'warn' : 'neutral'} />}
          <Two a={x.label} b={x.sub} strong />
          {x.badgeBtn ? <Button size="xs" variant="secondary" onClick={() => m.openNumbers()}>{x.badge}</Button> : x.badge ? <Tag size="sm">{x.badge}</Tag> : null}
        </span>
      )
    } }),
    rcol.accessor('kind', { header: L('Type', '類型'), meta: { width: 130 } }),
    rcol.accessor('cnt', { header: L('People', '人數'), meta: { width: 90, align: 'right' }, cell: i => <span className="tabular-nums">{fmtN(i.getValue())}</span> }),
    rcol.display({ id: 'can', header: L('Can receive', '可收到的通道'), meta: { width: 260 }, cell: i => (
      <span className="flex flex-wrap items-center gap-1.5">
        {i.row.original.can.map(x => {
          const I = CHN[x.k].icon
          return <Tip key={x.k} text={CHN[x.k].name + (x.of > 1 ? ': ' + x.n + ' / ' + x.of : '')}><span className={cn('inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-caption tabular-nums', x.n ? 'bg-neutral-2 text-foreground' : 'bg-transparent text-fg-disabled line-through')}><I className="size-3.5" aria-hidden />{x.of > 1 ? fmtN(x.n) : null}</span></Tip>
        })}
      </span>
    ) }),
  ], [m, app.lang])

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
      <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={cols as any} data={rows} bordered height={rows.length > 6 ? '320px' : 'auto'} autoRowHeight getRowId={x => x.t.key}
        rowActions={(x: RRow) => <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={L('Remove ', '移除 ') + x.label} onClick={() => m.removeRecv(x.t.key)} />} />
    </div>
  )
}

function ChCard({ m, k, rc }: { m: SendCtl; k: Channel; rc: Reach }) {
  const c = m.s.c, on = !!c.ch[k], meta = CHN[k], n = (rc as any)[k] as number, hasR = rc.total > 0
  const tpl = c.tplId ? m.tplById(c.tplId) : null
  const tplHas = !tpl ? false : k === 'email' ? (tpl.email.mode === 'own' || tplHasNotif(tpl)) : tplHasNotif(tpl)
  const pct = Math.round(n / Math.max(1, rc.total) * 100), id = 'ch-' + k
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer flex-col gap-3 rounded-lg border p-[var(--layout-space-tight)] transition-colors', on ? 'border-primary bg-primary-subtle/40' : 'border-border hover:border-border-hover')}>
      <span className="flex items-start gap-3">
        <IconBox icon={meta.icon} tone={on ? 'info' : 'neutral'} />
        <Two a={meta.name} b={meta.desc} strong className="flex-1 [&>span:last-child]:whitespace-normal" />
        <Checkbox id={id} checked={on} onCheckedChange={() => m.pickChannel(k)} aria-label={meta.name} />
      </span>
      {tpl ? <span className={cn('text-caption', tplHas ? 'text-success-text' : 'text-fg-secondary')}>{tplHas ? L('Template has text for this', '模板有這個通道的內容') : L('Template has no text for this', '模板沒有這個通道的內容')}</span> : null}
    </label>
  )
}

function Step1({ m, e }: { m: SendCtl; e: Errs }) {
  const app = useApp(), s = m.s, c = s.c, tried = c.tried || {}, rc = m.reach(), total = rc.total, hasR = c.receivers.length > 0
  const tpl = c.tplId ? m.tplById(c.tplId) : null, ap = approval(c), sms = smsOn(c)
  const multi = multiPeople(c), unres = unresolved(c), noNum = noNumber(c), anyCh = c.ch.push || c.ch.desktop || c.ch.email
  return (
    <>
      {tpl ? <Banner tone="info" action={<FmtChips list={tplFormats(tpl)} />}>{L('Using template: ', '使用模板：') + tpl.name}</Banner> : null}
      <Section title={L('Audiences', '收件人')} sub={L('Up to ' + CAP + ' people. Add contractors by phone or email.', '最多 ' + CAP + ' 人。外包人員可用電話或 Email 加入。')}
        actions={<span className={cn('shrink-0 text-body tabular-nums', total > CAP ? 'font-medium text-error-text' : 'text-fg-secondary')} aria-label={L('Audience count', '收件人數')}>{fmtN(total)} / {fmtN(CAP)}</span>}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <RecvInput
            id="ri-send" ri={s.ri} setRi={ri => m.set({ ri })} groups={app.groups.filter(g => groupInSpace(g))}
            bad={(tried[1] && !c.receivers.length) || total > CAP}
            isAdded={it => c.receivers.some(t => t.key === riKey(it))}
            onAdd={it => { const k = riKey(it); if (it.kind === 'ext') m.addRecv({ key: k, type: 'ext', email: it.value }); else m.addRecv({ key: k, type: it.kind, id: it.id }) }}
            extra={<Button variant="tertiary" startIcon={Upload} onClick={() => m.openImport()}>{L('Batch import', '批次匯入')}</Button>}
          />
          <RecvTable m={m} />
          {tried[1] && !hasR ? <ErrText>{L('Add at least one audience.', '請加入至少一位收件人。')}</ErrText> : null}
          {total > CAP ? <ErrText>{L(fmtN(total - CAP) + ' over the limit. Remove some, or split into separate messages.', '超過上限 ' + fmtN(total - CAP) + ' 人。請移除部分收件人，或分成多則訊息。')}</ErrText> : null}
          {sms && multi.length ? (
            <Banner tone={unres.length ? 'warning' : 'info'} action={<Button size="sm" variant="secondary" onClick={() => m.openNumbers()}>{unres.length ? L('Choose', '選擇號碼') : L('Review', '檢視')}</Button>}>
              {unres.length ? L(P(unres.length, 'person has', '', 'people have') + ' 2 phone numbers. Pick one for SMS.', unres.length + ' 人有兩支電話，請選一支收 SMS。') : L('SMS numbers set for ' + P(multi.length, 'person', '', 'people') + '.', '已設定 ' + multi.length + ' 人的 SMS 號碼。')}
            </Banner>
          ) : null}
          {sms && noNum.length ? <Banner tone="neutral">{L(joinL(noNum.map(p => p.en)) + (noNum.length === 1 ? ' has' : ' have') + ' no phone number and won’t get SMS.', joinL(noNum.map(p => p.en)) + ' 沒有電話，收不到 SMS。')}</Banner> : null}
        </div>
      </Section>

      <Section title={L('Channels', '通道')}>
        <div className="flex flex-col gap-[var(--layout-space-tight)]">
          <div className="grid gap-[var(--layout-space-tight)] md:grid-cols-3">{CH_CARDS.map(k => <ChCard key={k} m={m} k={k} rc={rc} />)}</div>
          {c.ch.push ? (
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              <Checkbox
                checked={c.ch.sms} onCheckedChange={() => m.pickChannel('sms')}
                label={<span className="inline-flex items-center gap-2">{L('Device Notifications (SMS)', 'Device Notifications（SMS）')} <Tag size="sm" color="amber">{L('Needs ICSD approval', '需 ICSD 核准')}</Tag></span>}
                description={L('Send an SMS to anyone the push doesn’t reach.', '推播沒送到的人，改發 SMS。')}
              />
              {c.ch.sms ? (
                <div className="flex flex-col gap-[var(--layout-space-tight)] rounded-lg border border-divider p-[var(--layout-space-tight)]">
                  <span className="flex items-center gap-2 text-body font-medium"><ShieldCheck className="size-4 text-warning-text" aria-hidden />{c.urgent ? L('ICSD approval will be skipped', '將略過 ICSD 核准') : L('ICSD approves this message before it’s sent', 'ICSD 核准後才會送出')}</span>
                  <Checkbox checked={c.urgent} onCheckedChange={() => m.setC({ urgent: !c.urgent })}
                    label={L('It’s urgent: send without waiting for ICSD', '這是緊急訊息，不等 ICSD 核准直接傳送')}
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
          {e.ext ? <ErrText>{e.ext}</ErrText> : null}
          {e.extp ? <ErrText>{e.extp}</ErrText> : null}
          {ap.mgr ? <Banner tone="warning">{L('Includes ' + P(ap.ext, 'external audience', '') + '. Your supervisor, ' + SUPERVISOR + ', must approve.', '包含 ' + ap.ext + ' 位外部收件人，需要主管 ' + SUPERVISOR + ' 核准。')}</Banner> : null}
          {hasR && anyCh ? (
            // how many people get it, in one line; when one channel would reach everyone left, offer it
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-divider pt-[var(--layout-space-tight)]">
              {rc.unrN ? <>
                <p className="text-body"><span className="font-medium">{L(fmtN(rc.reachable) + ' of ' + fmtN(rc.total) + ' people get it', fmtN(rc.reachable) + ' / ' + fmtN(rc.total) + ' 人收得到')}</span><span className="text-fg-secondary">{L(' · ' + fmtN(rc.unrN) + ' don’t', '，' + fmtN(rc.unrN) + ' 人收不到')}</span></p>
                <Button variant="link" size="sm" onClick={() => m.set({ unr: true })}>{L('See who', '查看是誰')}</Button>
                {rc.viaEmail ? <Button size="sm" variant="secondary" startIcon={Plus} className="ml-auto" onClick={() => m.pickChannel('email')}>{rc.viaEmail >= rc.unrN ? L('Add Email to reach everyone', '加入 Email，全部收得到') : L('Add Email (+' + rc.viaEmail + ')', '加入 Email（多 ' + rc.viaEmail + ' 人）')}</Button>
                  : rc.viaSms ? <Button size="sm" variant="secondary" startIcon={Plus} className="ml-auto" onClick={() => m.pickChannel('sms')}>{rc.viaSms >= rc.unrN ? L('Add SMS to reach everyone', '加入 SMS，全部收得到') : L('Add SMS (+' + rc.viaSms + ')', '加入 SMS（多 ' + rc.viaSms + ' 人）')}</Button> : null}
              </> : <p className="flex items-center gap-2 text-body font-medium text-success-text"><CircleCheck className="size-4" aria-hidden />{L('All ' + fmtN(rc.total) + ' people get it', fmtN(rc.total) + ' 人都收得到')}</p>}
            </div>
          ) : null}
        </div>
      </Section>
    </>
  )
}

// ---------- step 2 ----------
function FormatBlock({ icon, title, uses, children, tone }: { icon: typeof Mail; title: string; uses?: React.ReactNode; children: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className="flex flex-col gap-[var(--layout-space-tight)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body font-semibold"><IconBox icon={icon} tone={tone || 'info'} />{title}</span>
        {uses ? <span className="flex flex-wrap items-center gap-1.5">{uses}</span> : null}
      </div>
      {children}
    </div>
  )
}

function Step2({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, tried = c.tried || {}, hasN = hasNotif(c), lim = LIM.push, tpl = c.tplId ? m.tplById(c.tplId) : null
  const show = (k: keyof Errs, v: string, n: number) => (e[k] && (tried[2] || (v && v.length > n))) ? e[k]! : ''
  const eSender = show('sender', c.sender, LIM.sender), eTitle = show('title', c.title, LIM.title), eContent = show('content', c.content, lim), eSms = show('sms', c.smsText, LIM.sms)
  const contentHint = c.ch.desktop ? L('Desktop shows about 120 characters. Put the action first.', '桌面通知只顯示約 60 個中文字，重點放前面。') : L('Lock screens show about 4 lines.', '鎖定畫面約顯示 4 行。')
  const deskTitle = c.ch.desktop && vwidth(c.title) > DESK.title, deskText = c.ch.desktop && vwidth(c.content) > DESK.text
  const cutNote = (label: string, s: string, w: number) => <Banner tone="warning" title={L('Desktop will cut the ' + label + ' short', '桌面通知會截斷' + label)}>{L('People see “…' + cutAt(s, w).slice(-18) + '” and click to read the rest.', '使用者只看得到「…' + cutAt(s, w).slice(-18) + '」，要點開才看得到全文。')}</Banner>
  const rc = m.reach()
  const smsWho = L('For people without the app' + (rc.extP ? ' and external phones' : ''), '給沒裝 App 的人' + (rc.extP ? '和外部電話' : ''))
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <IconBox icon={LayoutTemplate} tone="info" />
        <span className="flex min-w-0 flex-1 flex-col">
          {tpl ? <><span className="text-body font-medium">{L('Template: ', '模板：') + tpl.name}</span><span className="text-caption text-fg-secondary">{L('Replace the [brackets] before sending.', '送出前請替換 [方括號] 的內容。')}</span></>
            : <span className="text-body font-medium">{L('Start from a template?', '要從模板開始嗎？')}</span>}
        </span>
        <span className="flex gap-2">
          {tpl ? <><Button size="sm" variant="secondary" onClick={() => m.set({ tp: { q: '' } })}>{L('Change', '更換')}</Button><Button size="sm" variant="text" onClick={() => m.clearTemplate()}>{L('Remove', '不使用')}</Button></>
            : <Button variant="secondary" startIcon={LayoutTemplate} onClick={() => m.set({ tp: { q: '' } })}>{L('Choose template', '選擇模板')}</Button>}
        </span>
      </div>
      <Section title={L('Message', '訊息內容')}>
        <div className="flex flex-col gap-[var(--layout-space-loose)]">
          {hasN ? (
            <FormatBlock icon={MessageSquareText} title={L('Notification', '通知')} uses={<>{c.ch.push ? <Tag size="sm" icon={Smartphone}>{CHN.push.name}</Tag> : null}{c.ch.desktop ? <Tag size="sm" icon={Monitor}>{CHN.desktop.name}</Tag> : null}</>}>
              {tpl && !tplHasNotif(tpl) ? <Banner tone="neutral">{L('This template has no notification text.', '這個模板沒有通知內容。')}</Banner> : null}
              {c.ch.push ? (
                <FormField id="f-sender" label={L('Sender name', '寄件人名稱')} count={c.sender.length + ' / ' + LIM.sender} over={c.sender.length > LIM.sender} hint={L('Shown on Device Notifications only. Leave blank to use your NT account (' + PMAP[ME].nt + ').', '只顯示在 Device Notifications。不填會用你的 NT 帳號（' + PMAP[ME].nt + '）。')} error={eSender}>
                  <Input id="f-sender" value={c.sender} error={!!eSender} onChange={ev => m.setC({ sender: ev.target.value })} placeholder={PMAP[ME].nt} />
                </FormField>
              ) : null}
              <FormField id="f-title" label={L('Title', '標題')} required count={c.title.length + ' / ' + LIM.title} over={c.title.length > LIM.title} error={eTitle}>
                <Input id="f-title" value={c.title} error={!!eTitle} onChange={ev => m.setC({ title: ev.target.value })} placeholder={L('One line people can act on', '一句話說清楚重點')} />
              </FormField>
              {deskTitle ? cutNote(L('title', '標題'), c.title, DESK.title) : null}
              <FormField id="f-content" label={L('Text', '內文')} required count={fmtN(c.content.length) + ' / ' + lim} over={c.content.length > lim} hint={contentHint} error={eContent}>
                <Textarea id="f-content" rows={4} value={c.content} error={!!eContent} onChange={ev => m.setC({ content: ev.target.value })} placeholder={L('What’s happening and what to do', '發生什麼事、需要做什麼')} />
              </FormField>
              {deskText ? cutNote(L('text', '內文'), c.content, DESK.text) : null}
            </FormatBlock>
          ) : null}
          {smsOn(c) ? (
            <FormatBlock icon={MessageSquareText} tone="warn" title={L('Device Notifications (SMS)', 'Device Notifications（SMS）')} uses={<Tag size="sm" unbounded>{smsWho}</Tag>}>
              <FormField id="f-sms" label={L('SMS text', 'SMS 內容')} required count={c.smsText.length + ' / ' + LIM.sms} over={c.smsText.length > LIM.sms} hint={L('Links won’t open in SMS.', 'SMS 裡的連結無法開啟。')} error={eSms}>
                <Textarea id="f-sms" rows={2} value={c.smsText} error={!!eSms} onChange={ev => m.setC({ smsText: ev.target.value })} placeholder={L('Short version', '簡短版本')} />
              </FormField>
              {hasN ? <div><Button variant="link" size="sm" onClick={() => m.copySms()}>{L('Copy from notification', '從通知複製')}</Button></div> : null}
            </FormatBlock>
          ) : null}
          {c.ch.email ? <EmailBlock m={m} e={e} show={show} /> : null}
        </div>
      </Section>
    </>
  )
}

function EmailBlock({ m, e, show }: { m: SendCtl; e: Errs; show: (k: keyof Errs, v: string, n: number) => string }) {
  const c = m.s.c, hasN = hasNotif(c), mode = effEmailMode(c), used = c.atts.reduce((a, x) => a + x.size, 0)
  const eSub = show('subject', c.subject, LIM.subject), bodyN = c.bodyText.trim().length, eBody = show('body', c.bodyText.trim(), LIM.body)
  return (
    <FormatBlock icon={Mail} title="Email" uses={hasN ? (
      <SegmentedControl size="sm" value={mode || 'same'} onValueChange={v => v && m.setEmailMode(v as 'same' | 'own')} aria-label="Email">
        <SegmentedControlItem value="same">{L('Same as notification', '同通知內容')}</SegmentedControlItem>
        <SegmentedControlItem value="own">{L('Separate email', '另寫 Email')}</SegmentedControlItem>
      </SegmentedControl>
    ) : null}>
      {mode === 'same' ? (
        <div className="flex flex-col gap-2 border-l-2 border-divider pl-3">
          <div className="grid grid-cols-[72px_1fr] gap-2 text-body"><span className="text-fg-secondary">{L('Subject', '主旨')}</span><span>{c.title.trim() || <span className="text-fg-muted">{L('Notification title', '通知標題')}</span>}</span></div>
          <div className="grid grid-cols-[72px_1fr] gap-2 text-body"><span className="text-fg-secondary">{L('Text', '內文')}</span><span className="whitespace-pre-wrap">{c.content.trim() || <span className="text-fg-muted">{L('Notification text', '通知內文')}</span>}</span></div>
          <span className="text-caption text-fg-secondary">{L('Plain text. For formatting or files, choose Separate email.', '純文字。需要格式或附件，請選「另寫 Email」。')}</span>
        </div>
      ) : (
        <>
          <FormField id="f-subject" label={L('Subject', '主旨')} required count={c.subject.length + ' / ' + LIM.subject} over={c.subject.length > LIM.subject} error={eSub}>
            <Input id="f-subject" value={c.subject} error={!!eSub} onChange={ev => m.setC({ subject: ev.target.value })} placeholder={L('Email subject', 'Email 主旨')} />
          </FormField>
          <FormField id="f-body" label={L('Email text', 'Email 內文')} required count={fmtN(bodyN) + ' / ' + fmtN(LIM.body)} over={bodyN > LIM.body} error={eBody}>
            <RichText id="f-body" seedKey={'rte-' + c.htmlKey} html={c.html} label={L('Email text', 'Email 內文')} error={!!eBody} placeholder={L('Write the email…', '輸入 Email 內文…')} onInput={(h, t) => m.onEmailInput(h, t)} />
          </FormField>
          <div className="flex flex-col gap-2">
            <span className="text-body font-medium">{L('Attachments', '附件')}</span>
            {c.atts.length ? <div className="flex flex-col gap-2">{c.atts.map(a => <FileItem key={a.id} name={a.name} description={fmtSize(a.size)} actions={<Button variant="text" size="xs" iconOnly startIcon={X} aria-label={L('Remove ', '移除 ') + a.name} onClick={() => m.removeFile(a.id)} />} />)}</div> : null}
            <div className="flex flex-wrap items-center gap-3">
              <FileUpload variant="button" multiple buttonLabel={L('Attach files', '附加檔案')} onUpload={files => m.addFiles(files)} />
              <span className="text-caption text-fg-secondary">{L('Up to ' + LIM.files + ' files, 10 MB total.', '最多 ' + LIM.files + ' 個檔案，共 10 MB。')}{c.atts.length ? L(' ' + fmtSize(used) + ' used.', '已用 ' + fmtSize(used) + '。') : ''}</span>
            </div>
            {c.attErr ? <ErrText>{c.attErr}</ErrText> : null}
          </div>
        </>
      )}
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

function Step3({ m, e }: { m: SendCtl; e: Errs }) {
  const c = m.s.c, tried = c.tried || {}, rc = m.reach(), ap = approval(c), mode = effEmailMode(c)
  const schedD = fromIso(c.schedAt), nowD = new Date(), schedErr = (e.sched && (tried[3] || c.schedAt)) ? e.sched : ''
  const toMsg = () => m.goStep(2), notif = c.title.trim() + (c.content.trim() ? ' — ' + c.content.trim() : '')
  const reaches = (n: number) => L('Reaches ' + fmtN(n) + ' of ' + fmtN(rc.total), '可觸及 ' + fmtN(n) + ' / ' + fmtN(rc.total) + ' 人')
  const rows: React.ReactNode[] = [<RvRow key="t" icon={c.team ? UsersRound : UserRound} k={L('Sending space', '發送空間')} v={spaceName(c.team || 'me') + (c.team ? L(' · its members can see this message', '・成員都看得到這則訊息') : L(' · only you can see this message', '・只有你看得到這則訊息'))} />, <RvRow key="r" icon={Users} k={L('Audiences', '收件人')} v={P(rc.total, 'audience', '人') + (rc.ext ? L(', incl. ' + rc.ext + ' external', '，含 ' + rc.ext + ' 位外部') : '')} edit={() => m.goStep(1)} />]
  if (c.ch.push) rows.push(<RvRow key="p" icon={Smartphone} k={CHN.push.name} v={reaches(rc.push)} q={notif} edit={toMsg} />)
  if (c.ch.desktop) { const cut = vwidth(c.content) > DESK.text || vwidth(c.title) > DESK.title; rows.push(<RvRow key="d" icon={Monitor} warn={cut} k={CHN.desktop.name} v={reaches(rc.desktop) + (cut ? L(' · text gets cut short', ' · 內容會被截斷') : '')} q={notif} edit={toMsg} />) }
  if (c.ch.email) rows.push(<RvRow key="e" icon={Mail} k="Email" v={reaches(rc.email) + (mode === 'own' ? L(' · Separate email', ' · 另寫 Email') + (c.atts.length ? L(', ' + P(c.atts.length, 'file', ''), '，' + c.atts.length + ' 個附件') : '') : L(' · Same as notification', ' · 同通知內容'))} q={mode === 'own' ? c.subject : ''} edit={toMsg} />)
  if (c.ch.sms) {
    const parts = [rc.extP ? L(P(rc.extP, 'external phone', '', 'external phones'), rc.extP + ' 支外部電話') : '', c.ch.push && rc.smsable ? L('up to ' + rc.smsable + ' without the app', '最多 ' + rc.smsable + ' 位沒裝 App 的人') : ''].filter(Boolean)
    rows.push(<RvRow key="s" icon={MessageSquareText} k={CHN.sms.name} v={parts.length ? L('Goes to ', '傳給') + joinL(parts) : L('No one needs it', '目前沒有人需要')} q={c.smsText} edit={toMsg} />)
    rows.push(<RvRow key="icsd" icon={c.urgent ? ShieldAlert : ShieldCheck} warn={c.urgent} k={L('ICSD approval', 'ICSD 核准')} v={c.urgent ? L('Skipped as urgent. Reason: ', '緊急略過。原因：') + c.urgentReason.trim() : L('Sent after ICSD approves it', 'ICSD 核准後才會送出')} edit={() => m.goStep(1)} />)
  }
  const phs = placeholders([hasNotif(c) ? c.title + ' ' + c.content : '', smsOn(c) ? c.smsText : '', mode === 'own' ? c.subject + ' ' + c.bodyText : ''].join(' '))
  if (phs.length) rows.push(<RvRow key="ph" icon={AlertTriangle} warn k={L(P(phs.length, 'placeholder', '', 'placeholders') + ' to replace', '還有 ' + phs.length + ' 個 [方括號] 沒替換')} v={joinL(phs) + L(' — audiences would see these.', '：收件人會看到這些字。')} edit={toMsg} />)
  if (rc.unrN) rows.push(<RvRow key="u" icon={AlertTriangle} warn k={L(P(rc.unrN, 'person', '', 'people') + ' won’t get this', rc.unrN + ' 人收不到')} v={L('None of your channels reach them.', '你選的通道都送不到他們。')} edit={() => m.goStep(1)} />)
  const tomorrow9 = toIso(new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() + 1, 9, 0))
  const opts = [
    ['now', Zap, L('Send now', '立即傳送'), ap.need ? L('Right after approval', '核准後立即傳送') : L('Starts right away', '馬上開始傳送')],
    ['schedule', CalendarClock, L('Schedule', '排程傳送'), L('Up to 30 days ahead', '30 天內任一時間')],
  ] as const
  return (
    <>
      <Section title={L('Send time', '傳送時間')} sub={L('Taipei time (GMT+8)', '台北時間（GMT+8）')}>
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
          <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">{rows}</div>
          {ap.need ? <Banner tone="warning" title={L('Needs approval from ' + joinL(ap.who), '需要 ' + joinL(ap.who) + ' 核准')}>{L('Nothing is sent until it’s approved.', '核准前不會送出。')}</Banner> : null}
        </div>
      </Section>
    </>
  )
}

// ---------- footer and result ----------
function FootBar({ m }: { m: SendCtl }) {
  const c = m.s.c, ap = approval(c)
  const primary = ap.need ? L('Submit for approval', '送出審核') : ap.skipped ? L('Send without approval', '略過核准並傳送') : c.sendMode === 'schedule' ? L('Schedule', '排程傳送') : L('Send', '傳送')
  return (
    <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
        <div className="flex flex-wrap gap-2">
          {c.step === 1 ? <Button variant="tertiary" startIcon={UserPlus} disabled={!c.receivers.length} onClick={() => m.set({ sg: { name: '', desc: '', tried: false } })}>{L('Save as group', '存成群組')}</Button> : null}
          {c.step === 2 ? <Button variant="tertiary" startIcon={LayoutTemplate} onClick={() => m.openSaveTpl()}>{L('Save as template', '存成模板')}</Button> : null}
          {c.step >= 2 ? <Button variant="tertiary" startIcon={FlaskConical} onClick={() => m.sendTest()}>{L('Send me a test', '寄測試給我')}</Button> : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="text" onClick={() => m.goList()}>{L('Cancel', '取消')}</Button>
          {c.step > 1 ? <Button variant="tertiary" startIcon={ChevronLeft} onClick={() => m.goStep(c.step - 1)}>{L('Back', '上一步')}</Button> : null}
          {c.step < 3
            ? <Button variant="primary" endIcon={ChevronRight} onClick={() => m.goStep(c.step + 1)}>{L('Next', '下一步')}</Button>
            : <Button variant="primary" startIcon={ap.need ? ShieldCheck : ap.skipped ? ShieldAlert : c.sendMode === 'schedule' ? CalendarClock : Send} onClick={() => m.submit()}>{primary}</Button>}
        </div>
      </div>
    </div>
  )
}

function ResultView({ m }: { m: SendCtl }) {
  const r = m.s.c.result!, ap = r.ap, both = ap.mgr && ap.icsd
  const rows = [
    { k: L('Request ID', '申請編號'), v: r.reqId },
    { k: L('Approver', '審核人'), v: both ? SUPERVISOR + L(', then ICSD', '，再由 ICSD') : ap.icsd ? 'ICSD' : SUPERVISOR },
    { k: L('Channels', '通道'), v: r.chs.map(k => CHN[k].name).join(L(', ', '、')) },
    { k: L('Submitted', '送出時間'), v: r.when },
    { k: L('Sends', '傳送時間'), v: r.sends },
    { k: L('Audiences', '收件人'), v: fmtN(r.total) },
  ]
  const text = both ? L('Your supervisor reviews it first, then ICSD. We’ll notify you at each step.', '先由主管審核，再由 ICSD 審核，每一步都會通知你。')
    : ap.icsd ? L('ICSD will review it. We’ll notify you when it’s approved.', 'ICSD 審核後會通知你。')
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
