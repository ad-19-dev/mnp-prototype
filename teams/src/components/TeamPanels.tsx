// Creating a team and managing its members. Each team has a shared sending space; adding someone here gives
// them all of its messages, audience groups and templates. Teams are open like chat groups: any member can
// add or remove people, and anyone can leave; there are no admins.
import * as React from 'react'
import {
  Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Popover,
  PopoverAnchor, PopoverContent, Textarea,
} from '@qijenchen/design-system'
import { LogOut, UserPlus, X } from 'lucide-react'
import { ME, PEOPLE, PMAP, fmtN, type Team } from '../lib/data'
import { flash, getApp, go, setApp } from '../lib/store'
import { L, P } from '../lib/i18n'
import { ConfirmDialog, FormField, PAvatar, Two, type Confirm } from './ui'

// search the directory and add people; Enter adds the top match
function MemberPicker({ exclude, onAdd }: { exclude: string[]; onAdd: (pid: string) => void }) {
  const [q, setQ] = React.useState(''), [open, setOpen] = React.useState(false), anchor = React.useRef<HTMLDivElement>(null)
  const ql = q.trim().toLowerCase()
  const cands = ql ? PEOPLE.filter(p => exclude.indexOf(p.id) < 0 && [p.zh, p.en, p.nt, p.emp, p.org].join(' ').toLowerCase().indexOf(ql) >= 0).slice(0, 6) : []
  const add = (pid: string) => { onAdd(pid); setQ(''); setOpen(false) }
  return (
    <Popover open={open && !!ql} onOpenChange={x => { if (!x) setOpen(false) }}>
      <PopoverAnchor asChild>
        <div ref={anchor}>
          <Input startIcon={UserPlus} autoComplete="off" placeholder={L('Add people by name, NT account or employee ID', '用姓名、NT 帳號或工號加入成員')} aria-label={L('Add members', '加入成員')} value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && cands[0]) { e.preventDefault(); add(cands[0].id) } }} />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={e => e.preventDefault()} onInteractOutside={e => { if (anchor.current?.contains(e.target as Node)) e.preventDefault() }}>
        {cands.length ? cands.map(p => (
          <button key={p.id} type="button" onClick={() => add(p.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-hover">
            <PAvatar p={p} size={28} /><Two a={p.zh + ' ' + p.en} b={p.title + ' · ' + p.org} strong className="flex-1" />
          </button>
        )) : <div className="px-3 py-3 text-body text-fg-secondary">{L('No match for “' + q.trim() + '”.', '找不到「' + q.trim() + '」。')}</div>}
      </PopoverContent>
    </Popover>
  )
}

function MemberList({ pids, onRemove }: { pids: string[]; onRemove: (pid: string) => void }) {
  return (
    <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
      {pids.map(pid => {
        const p = PMAP[pid]
        if (!p) return null
        return (
          <div key={pid} className="flex min-h-12 items-center gap-3 px-3 py-2">
            <PAvatar p={p} size={28} />
            <Two a={p.zh + ' ' + p.en + (pid === ME ? L(' (you)', '（你）') : '')} b={p.title + ' · ' + p.org} strong className="flex-1" />
            {pid !== ME ? <Button variant="text" size="sm" iconOnly startIcon={X} aria-label={L('Remove ', '移除 ') + p.en} onClick={() => onRemove(pid)} /> : <span className="w-7 shrink-0" aria-hidden />}
          </div>
        )
      })}
    </div>
  )
}

// One dialog to create a team or change one: name, description and members. Changes apply on Save.
// Anyone in the team can edit it, as in a chat group; leaving is at the bottom left.
export function TeamDialog({ team, open, onClose }: { team?: Team; open: boolean; onClose: () => void }) {
  const [name, setName] = React.useState(''), [desc, setDesc] = React.useState(''), [pids, setPids] = React.useState<string[]>([ME]), [tried, setTried] = React.useState(false)
  const [cf, setCf] = React.useState<Confirm | null>(null)
  React.useEffect(() => {
    if (!open) return
    setName(team ? team.name : ''); setDesc(team ? team.desc : ''); setPids(team ? team.members.map(x => x.pid) : [ME]); setTried(false)
  }, [open, team])
  const nm = name.trim(), dup = getApp().teams.some(t => t.id !== team?.id && t.name.toLowerCase() === nm.toLowerCase())
  const err = tried && !nm ? L('Enter a name.', '請輸入名稱。') : name.length > 50 ? L('Use 50 characters or fewer.', '最多 50 個字。') : tried && dup ? L('Another team already uses this name.', '已有團隊使用這個名稱。') : ''
  const save = () => {
    if (!nm || name.length > 50 || desc.length > 200 || dup) { setTried(true); return }
    if (team) {
      setApp(a => ({ teams: a.teams.map(t => t.id === team.id ? { ...t, name: nm, desc: desc.trim(), members: pids.map(pid => ({ pid })) } : t) }))
      onClose(); flash(L('Team updated', '已更新團隊'), 'ok')
      return
    }
    const id = 'tn' + Date.now().toString(36)
    const t: Team = { id, name: nm, desc: desc.trim(), created: new Date().toISOString().slice(0, 10).replace(/-/g, '/'), members: pids.map(pid => ({ pid })) }
    setApp(a => ({ teams: a.teams.concat([t]), space: id }))
    go('send'); onClose()
    flash(L('Team created', '已建立團隊'), 'ok')
  }
  const askLeave = () => {
    if (!team) return
    const a = getApp(), last = team.members.length === 1
    const n = { msg: a.rows.filter(r => r.team === team.id).length, grp: a.groups.filter(g => g.team === team.id).length, tpl: a.templates.filter(t => t.team === team.id).length }
    const what = L(P(n.msg, 'message', '') + ', ' + P(n.grp, 'audience group', '') + ' and ' + P(n.tpl, 'template', ''), n.msg + ' 則訊息、' + n.grp + ' 個收件群組和 ' + n.tpl + ' 個模板')
    setCf({
      title: L('Leave ' + team.name + '?', '要離開「' + team.name + '」嗎？'),
      text: last ? L('You’re the last member. Leaving deletes the team and its shared space.', '你是最後一位成員，離開後團隊和它的共享發送空間會一起刪除。') : L('You’ll lose access to this team’s shared space, including what you made there. Anyone in the team can add you back.', '離開後你就看不到這個團隊的共享發送空間，包括你在裡面建立的內容。團隊裡的任何人都能再把你加回來。'),
      rows: [{ k: L('In this space', '空間裡有'), v: what },
             { k: last ? L('After you leave', '離開後') : L('The team keeps', '團隊保留'), v: last ? L('All of it is deleted', '全部刪除') : L('All of it, including what you made', '全部，包括你建立的內容') }],
      icon: LogOut, tone: 'warn', cancel: L('Cancel', '取消'), ok: last ? L('Leave and delete team', '離開並刪除團隊') : L('Leave team', '離開團隊'), danger: true,
      run: () => {
        setApp(s => last
          ? { teams: s.teams.filter(t => t.id !== team.id), rows: s.rows.filter(r => r.team !== team.id), groups: s.groups.filter(g => g.team !== team.id), templates: s.templates.filter(t => t.team !== team.id), space: 'me' }
          : { teams: s.teams.map(t => t.id === team.id ? { ...t, members: t.members.filter(x => x.pid !== ME) } : t), space: 'me' })
        setCf(null); onClose()
        flash(last ? L('Team deleted', '已刪除團隊') : L('You left ' + team.name, '已離開「' + team.name + '」'), 'ok')
      },
    })
  }
  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
        {open ? (
          <DialogContent maxWidth={560} height="hug">
            <DialogHeader><div className="flex flex-col gap-0.5"><DialogTitle>{team ? L('Team settings', '團隊設定') : L('New team', '建立團隊')}</DialogTitle><DialogDescription className="sr-only">{team ? L('Team settings', '團隊設定') : L('New team', '建立團隊')}</DialogDescription></div></DialogHeader>
            <DialogBody>
              <div className="flex flex-col gap-[var(--layout-space-loose)]">
                <FormField id="nt-name" label={L('Name', '名稱')} required count={name.length + ' / 50'} over={name.length > 50} error={err}>
                  <Input id="nt-name" autoFocus={!team} value={name} error={!!err} onChange={e => setName(e.target.value)} placeholder={L('e.g. Fab 18 Communications', '例如：Fab 18 Communications')} />
                </FormField>
                <FormField id="nt-desc" label={L('Description', '說明')} count={desc.length + ' / 200'} over={desc.length > 200} hint={L('Shown at the top of the team’s space.', '顯示在團隊空間的上方。')}>
                  <Textarea id="nt-desc" rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder={L('What this team sends', '這個團隊負責發送什麼')} />
                </FormField>
                <div className="flex flex-col gap-2">
                  <span className="text-body font-medium">{L('Members', '成員')} <span className="font-normal text-fg-secondary">· {fmtN(pids.length)}</span></span>
                  <MemberPicker exclude={pids} onAdd={pid => setPids(pids.concat([pid]))} />
                  <MemberList pids={pids} onRemove={pid => setPids(pids.filter(x => x !== pid))} />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              {team ? <Button variant="text" danger className="mr-auto" onClick={askLeave}>{L('Leave team', '離開團隊')}</Button> : null}
              <Button variant="tertiary" onClick={onClose}>{L('Cancel', '取消')}</Button>
              <Button variant="primary" onClick={save}>{team ? L('Save', '儲存') : L('Create team', '建立團隊')}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      <ConfirmDialog cf={cf} onClose={() => setCf(null)} />
    </>
  )
}
