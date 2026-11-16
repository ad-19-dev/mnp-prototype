// Send flow dialogs: batch import, SMS numbers, save group, save template, template picker, unreachable receivers
import * as React from 'react'
import {
  Button, Checkbox, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FileUpload,
  Input, RadioGroup, RadioGroupItem, Tag, Textarea, cn,
} from '@qijenchen/design-system'
import { ArrowRight, Building2, ChevronLeft, Copy, Globe, Lock, Mail, Phone, Plus, Search, Wand2, X } from 'lucide-react'
import { LIM, ME, PEOPLE, PMAP, fmtPhone, maskPhone, plural, splitTokens, tplFormats, LIST_SAMPLES } from '../../lib/data'
import { effEmailMode, hasNotif, multiPeople, recvFlat, smsOn, tplFit } from '../../lib/compose'
import { flash, useApp } from '../../lib/store'
import { BatchImportDialog } from '../../components/BatchImport'
import { Banner, FmtChips, FormField, IconBox, KV, ListBox, ListKindField, ListRow, PAvatar, Two, listKindExample } from '../../components/ui'
import { groupInSpace, tplInSpace } from '../../lib/teams'
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
// a heading inside a dialog: 14px medium, so the dialog title (DS: 16px medium) stays the strongest (2026-11-16)
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="text-h6 font-medium">{children}</h3>
// a titled group of match results: heading close to its items, groups set apart from each other
const Group = ({ children }: { children: React.ReactNode }) => <section className="flex flex-col gap-2 pt-[var(--layout-space-tight)]">{children}</section>

// ---------- batch import ----------
// the shared B+ dialog (components/BatchImport), adding to the send flow's audience; outside contacts only with
// their channel (Email; SMS fallback)
export function ImportDialog({ m }: { m: SendCtl }) {
  const c = m.s.c, close = () => m.set({ imp: null })
  return <BatchImportDialog open={!!m.s.imp} onClose={close} has={key => c.receivers.some(t => t.key === key)}
    opts={{ allowExt: true, noExtEmail: !c.ch.email, noExtPhone: !(c.ch.push && c.ch.sms) }}
    onAdd={(ok, left) => {
      m.setC({ receivers: m.s.c.receivers.concat(ok.map(x => x.tag)) })
      close()
      flash(L('Added ', '已加入 ') + P(ok.length, 'audience', '位收件人') + (left ? L(' · ' + left + ' not added', '・' + left + ' 筆未加入') : ''))
    }} />
}

// ---------- SMS numbers ----------
export function NumbersDialog({ m }: { m: SendCtl }) {
  const num = m.s.num, close = () => m.closeNumbers()
  const people = num ? multiPeople(m.s.c) : [], d = num ? num.draft : {}
  const chosen = people.filter(p => d['p:' + p.id]).length
  return (
    <Shell open={!!num} onClose={close} width={720} title={L('Choose SMS numbers', '選擇 SMS 號碼')}
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
              <span className="flex min-w-48 flex-1 items-center gap-2"><PAvatar p={p} /><Two a={p.en + ' ' + p.zh} b={p.title + ' · ' + p.org} strong /></span>
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
    const nm = sg.name.trim(), dup = app.groups.some(g => groupInSpace(g) && g.name.toLowerCase() === nm.toLowerCase())
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
    const nm = st.name.trim(), dup = app.templates.some(t => tplInSpace(t) && t.name.toLowerCase() === nm.toLowerCase())
    const err = (st.tried && !nm) ? L('Enter a name.', '請輸入名稱。') : st.name.length > LIM.name ? L('Up to 50 characters.', '最多 50 字。') : (nm && dup) ? L('This name is taken.', '這個名稱已經有人用了。') : ''
    body = <>
      <FormField id="stpl-name" label={L('Template name', '模板名稱')} required count={st.name.length + ' / ' + LIM.name} over={st.name.length > LIM.name} error={err}>
        <Input id="stpl-name" autoFocus value={st.name} error={!!err} onChange={ev => m.set({ stpl: { ...m.s.stpl!, name: ev.target.value } })} placeholder={L('e.g. Chiller maintenance notice', '例如：冰水機維修通知')} />
      </FormField>
    </>
  }
  return <Shell open={!!st} onClose={close} title={L('Save as template', '存成模板')} foot={<><Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button><Button variant="primary" onClick={() => m.saveTpl()}>{L('Save', '儲存')}</Button></>}>{body}</Shell>
}

// ---------- choose a template ----------
export function TplPickerDialog({ m }: { m: SendCtl }) {
  const app = useApp(), s = m.s, tp = s.tp, close = () => m.set({ tp: null })
  const q = tp ? tp.q.trim().toLowerCase() : ''
  // this space's templates
  const list = app.templates.filter(t => tplInSpace(t)).filter(t => !q || [t.name, t.title, t.content, t.email && t.email.subject].join(' ').toLowerCase().indexOf(q) >= 0)
  return (
    <Shell open={!!tp} onClose={close} width={720} title={L('Choose a template', '選擇模板')} foot={<Button variant="tertiary" onClick={close}>{L('Cancel', '取消')}</Button>}>
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
              <span className="flex items-center gap-2 text-caption text-fg-muted">{t.updated} · {ow.en}{t.owner === ME ? L(' (you)', '（你）') : ''}</span>
            </button>
          )
        })}
        {list.length ? null : <p className="text-body text-fg-secondary">{L('No matching templates.', '找不到符合的模板。')}</p>}
      </div>
    </Shell>
  )
}

