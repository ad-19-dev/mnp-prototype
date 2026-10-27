// Send flow dialogs: batch import, SMS numbers, save group, save template, template picker, unreachable receivers
import * as React from 'react'
import {
  Button, Checkbox, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FileUpload,
  Input, RadioGroup, RadioGroupItem, Tag, Textarea, cn,
} from '@qijenchen/design-system'
import { ArrowRight, Building2, ChevronLeft, Globe, Lock, Phone, Plus, Search, Wand2 } from 'lucide-react'
import { LIM, ME, PEOPLE, PMAP, fmtPhone, maskPhone, plural, splitTokens, tplFormats, SAMPLE_SEND } from '../../lib/data'
import { effEmailMode, hasNotif, multiPeople, recvFlat, smsOn, tplFit } from '../../lib/compose'
import { useApp } from '../../lib/store'
import { Banner, FmtChips, FormField, IconBox, KV, ListBox, ListRow, PAvatar, Two } from '../../components/ui'
import type { SendCtl } from './ctl'
import { L, P, tx } from '../../lib/i18n'

function Shell({ open, onClose, title, sub, width = 560, children, foot }: { open: boolean; onClose: () => void; title: string; sub?: React.ReactNode; width?: number; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      {open ? (
        <DialogContent maxWidth={width} height="hug">
          <DialogHeader>
            <div className="flex flex-col gap-0.5">
              <DialogTitle>{title}</DialogTitle>
              {sub ? <DialogDescription className="text-body text-fg-secondary">{sub}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
            </div>
          </DialogHeader>
          <DialogBody><div className="flex flex-col gap-[var(--layout-space-tight)]">{children}</div></DialogBody>
          <DialogFooter>{foot}</DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="text-body font-semibold">{children}</h3>

// ---------- batch import ----------
export function ImportDialog({ m }: { m: SendCtl }) {
  const imp = m.s.imp, close = () => m.set({ imp: null })
  if (!imp) return <Shell open={false} onClose={close} title="" foot={null}>{null}</Shell>
  const howto = L('Accepts NT accounts, employee IDs, names, MVPN, phone numbers, org codes and external emails. Separate with commas or new lines.', '可輸入 NT 帳號、工號、姓名、MVPN、手機、組織代碼或外部 Email，用逗號或換行分隔。')
  if (!imp.res) {
    const n = splitTokens(imp.text).length
    return (
      <Shell open onClose={close} width={720} title={L('Batch import', '批次匯入')} sub={L('Paste a list or upload a file. You’ll review matches before adding.', '貼上名單或上傳檔案，加入前會先讓你確認。')}
        foot={<><Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button><Button variant="primary" startIcon={Wand2} disabled={!n} onClick={() => m.identify()}>{L('Find matches', '比對名單')}</Button></>}>
        <FormField id="imp-text" label={L('List', '名單')} count={n ? P(n, 'entry', '筆', 'entries') : ''}>
          <Textarea id="imp-text" rows={9} className="font-mono" autoFocus value={imp.text} onChange={ev => m.setImp({ text: ev.target.value, file: '' })} placeholder="gywu, 120588, 陳怡君, 61204, 0918-226-588, PLT/UX, partner@example.com" />
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          <FileUpload variant="button" accept=".csv,.txt,text/csv,text/plain" buttonLabel={L('Upload .csv or .txt', '上傳 .csv 或 .txt')} onUpload={files => m.onImpFile(files[0])} />
          <Button variant="link" size="sm" onClick={() => m.setImp({ text: SAMPLE_SEND, file: '' })}>{L('Try a sample', '使用範例名單')}</Button>
          {imp.file ? <span className="text-caption text-fg-secondary">{L('Loaded ', '已載入 ') + imp.file}</span> : null}
        </div>
        <Banner tone="info">{howto}</Banner>
      </Shell>
    )
  }
  const sets = m.impSets(), picks = imp.picks
  let pickedN = 0
  const amb = sets.amb.map(a => {
    const pk = picks[a.i] || {}
    return { tok: a.m.tok!, i: a.i, cands: a.m.cands.map(p => { const key = 'p:' + p.id, added = !!(sets.have[key] || sets.seen[key]), on = !added && !!pk[p.id]; if (on) pickedN++; return { p, added, on } }) }
  })
  const addN = sets.ready.length + pickedN
  return (
    <Shell open onClose={close} width={720} title={L('Batch import', '批次匯入')} sub={L('Check the matches, then add them.', '確認比對結果後加入。')}
      foot={<><Button variant="tertiary" startIcon={ChevronLeft} onClick={() => m.setImp({ res: null, picks: {} })}>{L('Edit list', '修改名單')}</Button><Button variant="primary" disabled={!addN} onClick={() => m.impAdd()}>{addN ? L('Add ', '加入 ') + P(addN, 'receiver', '人') : L('Nothing to add', '沒有可加入的人')}</Button></>}>
      <div className="flex flex-wrap gap-2">
        <Tag size="md" color="green">{L(sets.ready.length + ' ready', sets.ready.length + ' 筆可加入')}</Tag>
        {amb.length ? <Tag size="md" color="amber">{L(amb.length + ' to choose', amb.length + ' 筆待選擇')}</Tag> : null}
        {sets.miss.length ? <Tag size="md" color="red">{L(sets.miss.length + ' not found', sets.miss.length + ' 筆找不到')}</Tag> : null}
        {sets.dup ? <Tag size="md">{L(sets.dup + ' already added', sets.dup + ' 筆已在名單中')}</Tag> : null}
      </div>
      {amb.length ? <>
        <H3>{L('Who do you mean?', '你指的是誰？')}</H3>
        {amb.map(a => (
          <div key={a.i} className="flex flex-col gap-1 rounded-md border border-divider p-2">
            <div className="px-1 text-body text-fg-secondary">{L('“' + a.tok + '” matches ' + a.cands.length + ' people', '「' + a.tok + '」有 ' + a.cands.length + ' 人符合')}</div>
            {a.cands.map(k => (
              <div key={k.p.id} className={cn('flex items-center gap-3 rounded-md px-1 py-1', k.added && 'opacity-60')}>
                <Checkbox checked={k.on || k.added} disabled={k.added} onCheckedChange={() => m.impPick(a.i, k.p.id)} aria-label={k.p.zh + ' ' + k.p.en} />
                <PAvatar p={k.p} /><Two a={k.p.zh + ' ' + k.p.en} b={k.p.title + ' · ' + k.p.org + ' · ' + k.p.emp} strong className="flex-1" />
                {k.added ? <Tag size="sm">{L('Already added', '已加入')}</Tag> : null}
              </div>
            ))}
          </div>
        ))}
      </> : null}
      {sets.ready.length ? <>
        <H3>{L('Ready to add', '可加入')}</H3>
        <ListBox max={240}>
          {sets.ready.map((x, i) => {
            const mm = x.m
            return (
              <ListRow key={i}>
                <code className="w-32 shrink-0 truncate font-mono text-caption text-fg-secondary">{mm.tok}</code>
                <ArrowRight className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
                {mm.kind === 'one' ? <PAvatar p={mm.p} size={20} /> : <IconBox icon={mm.kind === 'org' ? Building2 : (mm as any).email && (mm as any).email.indexOf('@') < 0 ? Phone : Globe} />}
                <span className="min-w-0 flex-1 truncate text-body font-medium">{mm.kind === 'one' ? mm.p.zh + ' ' + mm.p.en + ' · ' + mm.p.org : mm.kind === 'org' ? mm.org.code + ' · ' + P(mm.org.count, 'member', '人') : (mm as any).email + ' · ' + L('External', '外部')}</span>
                <span className="text-caption text-fg-secondary">{tx((mm as any).by)}</span>
              </ListRow>
            )
          })}
        </ListBox>
      </> : null}
      {sets.miss.length ? <>
        <H3>{L('Not found', '找不到')}</H3>
        <ListBox>{sets.miss.map((x, i) => <ListRow key={i}><code className="w-32 shrink-0 truncate font-mono text-caption">{x.tok}</code><span className="text-body text-fg-secondary">{tx(x.why)}</span></ListRow>)}</ListBox>
      </> : null}
    </Shell>
  )
}

// ---------- SMS numbers ----------
export function NumbersDialog({ m }: { m: SendCtl }) {
  const num = m.s.num, close = () => m.closeNumbers()
  const people = num ? multiPeople(m.s.c) : [], d = num ? num.draft : {}
  const chosen = people.filter(p => d['p:' + p.id]).length
  return (
    <Shell open={!!num} onClose={close} width={720} title={L('Choose SMS numbers', '選擇 SMS 號碼')} sub={L('These people have 2 numbers. Pick one for SMS.', '這些人有兩支電話，請選一支收 SMS。')}
      foot={<><span className="mr-auto text-body text-fg-secondary">{L(chosen + ' of ' + people.length + ' chosen', '已選 ' + chosen + ' / ' + people.length)}</span><Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button><Button variant="primary" onClick={() => m.confirmNum()}>{L('Save', '儲存')}</Button></>}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => m.numAllCo()}>{L('Use company mobile for all', '全部使用公務手機')}</Button>
        <span className="ml-auto inline-flex items-center gap-1 text-caption text-fg-secondary"><Lock className="size-3.5" aria-hidden />{L('Personal numbers are masked', '私人號碼已遮蔽')}</span>
      </div>
      <ListBox max={380}>
        {people.map(p => {
          const key = 'p:' + p.id
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <span className="flex min-w-48 flex-1 items-center gap-2"><PAvatar p={p} /><Two a={p.zh + ' ' + p.en} b={p.title + ' · ' + p.org} strong /></span>
              <RadioGroup value={d[key] || ''} onValueChange={v => m.numPick(key, v as 'co' | 'pp')} className="flex flex-wrap gap-4" aria-label={L('SMS number for ', 'SMS 號碼：') + p.en}>
                <RadioGroupItem value="co" label={<span className="font-mono">{fmtPhone(p.co)}</span>} description={L('Company mobile', '公務手機') + ' · MVPN ' + p.mvpn} />
                <RadioGroupItem value="pp" label={<span className="font-mono">{maskPhone(p.pp)}</span>} description={L('Personal phone', '私人手機')} />
              </RadioGroup>
            </div>
          )
        })}
      </ListBox>
    </Shell>
  )
}

// ---------- save receivers as group ----------
export function SaveGroupDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, sg = s.sg, close = () => m.set({ sg: null })
  let body: React.ReactNode = null, sub = ''
  if (sg) {
    const nm = sg.name.trim(), dup = app.groups.some(g => g.name.toLowerCase() === nm.toLowerCase())
    const err = (sg.tried && !nm) ? L('Enter a name.', '請輸入名稱。') : sg.name.length > 50 ? L('Up to 50 characters.', '最多 50 字。') : (nm && dup) ? L('This name is taken.', '這個名稱已經有人用了。') : ''
    const hasSets = s.c.receivers.some(t => t.type === 'group' || t.type === 'org'), ext = s.c.receivers.some(t => t.type === 'ext')
    sub = L('Saves ' + P(recvFlat(s.c, app.groups).people.length, 'person', '', 'people') + ' for reuse.', '把 ' + recvFlat(s.c, app.groups).people.length + ' 人存成群組，之後可重複使用。') + (ext ? L(' External addresses aren’t saved.', '外部收件人不會存入。') : '')
    body = <>
      <FormField id="sg-name" label={L('Group name', '群組名稱')} required count={sg.name.length + ' / 50'} over={sg.name.length > 50} error={err}>
        <Input id="sg-name" autoFocus value={sg.name} error={!!err} onChange={ev => m.set({ sg: { ...m.s.sg!, name: ev.target.value } })} placeholder={L('e.g. Fab 18 drill wardens', '例如：F18 演習引導員')} />
      </FormField>
      <FormField id="sg-desc" label={L('Description', '說明')} count={sg.desc.length + ' / 200'} over={sg.desc.length > 200}>
        <Textarea id="sg-desc" rows={3} value={sg.desc} onChange={ev => m.set({ sg: { ...m.s.sg!, desc: ev.target.value } })} placeholder={L('What this group is for', '這個群組的用途')} />
      </FormField>
    </>
  }
  return <Shell open={!!sg} onClose={close} title={L('Save as group', '存成群組')} sub={sub} foot={<><Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button><Button variant="primary" onClick={() => m.saveGroup()}>{L('Save', '儲存')}</Button></>}>{body}</Shell>
}

// ---------- save message as template ----------
export function SaveTplDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, st = s.stpl, c = s.c, close = () => m.set({ stpl: null })
  let body: React.ReactNode = null
  if (st) {
    const nm = st.name.trim(), dup = app.templates.some(t => t.name.toLowerCase() === nm.toLowerCase())
    const err = (st.tried && !nm) ? L('Enter a name.', '請輸入名稱。') : st.name.length > LIM.name ? L('Up to 50 characters.', '最多 50 字。') : (nm && dup) ? L('This name is taken.', '這個名稱已經有人用了。') : ''
    const mode = effEmailMode(c), rows = [{ k: L('Sender', '寄件人'), v: c.sender }]
    if (hasNotif(c)) rows.push({ k: L('Notification', '通知'), v: c.title })
    if (smsOn(c)) rows.push({ k: 'SMS', v: c.smsText })
    if (c.ch.email) rows.push({ k: 'Email', v: mode === 'own' ? c.subject : L('Same as notification', '同通知內容') })
    body = <>
      <FormField id="stpl-name" label={L('Template name', '模板名稱')} required count={st.name.length + ' / ' + LIM.name} over={st.name.length > LIM.name} error={err}>
        <Input id="stpl-name" autoFocus value={st.name} error={!!err} onChange={ev => m.set({ stpl: { ...m.s.stpl!, name: ev.target.value } })} placeholder={L('e.g. Chiller maintenance notice', '例如：冰水機維修通知')} />
      </FormField>
      <KV rows={rows} />
    </>
  }
  return <Shell open={!!st} onClose={close} title={L('Save as template', '存成模板')} sub={L('Saves the text only, not receivers or files.', '只存文字內容，不含收件人和附件。')} foot={<><Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button><Button variant="primary" onClick={() => m.saveTpl()}>{L('Save', '儲存')}</Button></>}>{body}</Shell>
}

// ---------- choose a template ----------
export function TplPickerDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, tp = s.tp, close = () => m.set({ tp: null })
  const q = tp ? tp.q.trim().toLowerCase() : ''
  const list = app.templates.filter(t => !q || [t.name, t.title, t.content, t.email && t.email.subject].join(' ').toLowerCase().indexOf(q) >= 0)
  return (
    <Shell open={!!tp} onClose={close} width={720} title={L('Choose a template', '選擇模板')} sub={L('Replaces the text only. Receivers and channels stay.', '只會替換文字，收件人和通道不變。')} foot={<Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button>}>
      <Input startIcon={Search} type="search" autoFocus placeholder={L('Search templates', '搜尋模板')} aria-label={L('Search templates', '搜尋模板')} value={tp ? tp.q : ''} onChange={ev => m.set({ tp: { q: ev.target.value } })} />
      <div className="flex max-h-[420px] flex-col gap-2 overflow-auto">
        {list.map(t => {
          const fit = tplFit(s.c, t), ow = PMAP[t.owner] || PEOPLE[0], on = s.c.tplId === t.id
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => m.askTemplate(t)}
              className={cn('flex flex-col gap-1 rounded-lg border p-3 text-left hover:border-border-hover hover:bg-neutral-hover focus-visible:outline-2 focus-visible:outline-ring', on ? 'border-primary bg-primary-subtle/40' : 'border-divider')}>
              <span className="flex items-center gap-2"><span className="flex-1 text-body font-medium">{t.name}</span><FmtChips list={tplFormats(t)} /></span>
              <span className="truncate text-body text-fg-secondary">{t.title || (t.email && t.email.subject) || ''}</span>
              <span className={cn('text-caption', fit.warn ? 'text-warning-text' : 'text-success-text')}>{fit.text}</span>
              <span className="text-caption text-fg-muted">{t.updated} · {ow.en}{t.owner === ME ? L(' (you)', '（你）') : ''}</span>
            </button>
          )
        })}
        {list.length ? null : <p className="text-body text-fg-secondary">{L('No matching templates.', '找不到符合的模板。')}</p>}
      </div>
    </Shell>
  )
}

// ---------- receivers no channel reaches ----------
export function UnreachDialog({ m }: { m: SendCtl }) {
  const s = m.s, open = s.unr, close = () => m.set({ unr: false })
  const c = s.c, rc = m.reach()
  const why = () => { const w: string[] = []; if (c.ch.push) w.push(c.ch.sms ? L('no device or phone', '沒有裝置或電話') : L('no device', '沒有裝置')); if (c.ch.desktop) w.push(L('no desktop agent', '沒有桌面程式')); return w.join(L(', ', '、')).replace(/^./, x => x.toUpperCase()) }
  return (
    <Shell open={open} onClose={close} width={720} title={L(P(rc.unrN, 'person', '', 'people') + ' won’t get this', rc.unrN + ' 人收不到')} sub={L('None of your channels reach them.', '你選的通道都送不到他們。')}
      foot={<><Button variant="tertiary" onClick={close}>{L('Close', '關閉')}</Button>{rc.viaSms ? <Button variant="secondary" startIcon={Plus} onClick={() => { m.pickChannel('sms'); close() }}>{L('Turn on SMS fallback', '開啟 SMS 備援')}</Button> : null}{rc.viaEmail ? <Button variant="primary" startIcon={Plus} onClick={() => { m.pickChannel('email'); close() }}>{L('Add Email', '加入 Email')}</Button> : null}</>}>
      <ListBox max={380}>
        {rc.unr.map(p => <ListRow key={p.id}><PAvatar p={p} /><Two a={p.zh + ' ' + p.en} b={p.emp + ' · ' + p.org} strong className="flex-1" /><span className="text-caption text-fg-secondary">{why()}</span></ListRow>)}
        {rc.flat.ext.filter(x => x.indexOf('@') >= 0 ? rc.unrE : rc.unrP).map(x => { const ph = x.indexOf('@') < 0; return <ListRow key={x}><IconBox icon={ph ? Phone : Globe} /><Two a={x} b={ph ? L('External phone', '外部電話') : L('External email', '外部 Email')} strong className="flex-1" /><span className="text-caption text-fg-secondary">{ph ? L('SMS only', '只收 SMS') : L('Email only', '只收 Email')}</span></ListRow> })}
      </ListBox>
    </Shell>
  )
}
