// Messages page: the list of sent and scheduled messages, and the send flow
import * as React from 'react'
import { Button } from '@qijenchen/design-system'
import { Plus, UsersRound } from 'lucide-react'
import { useLogic } from '../../lib/logic'
import { inTeam, presetFilter, teamById, useClearPreset } from '../../lib/teams'
import { scopeLabel } from './ctl'
import { TeamMembersSheet } from '../../components/TeamPanels'
import { PMAP, type Team } from '../../lib/data'
import { getApp, setApp, useApp } from '../../lib/store'
import { ConfirmDialog } from '../../components/ui'
import { PageHeader, useNavHome } from '../../components/shell'
import { initSend, makeSendCtl } from './ctl'
import { L } from '../../lib/i18n'
import { SendList } from './List'
import { DetailSheet, NotSentDialog } from './Detail'
import { ComposeView } from './Compose'
import { ImportDialog, NumbersDialog, SaveGroupDialog, SaveTplDialog, TplPickerDialog, UnreachDialog } from './Modals'

// a team's list opens with what the team is for and who's in it
function TeamIntro({ team }: { team: Team }) {
  const names = team.members.map(x => PMAP[x.pid]?.en).filter(Boolean)
  return (
    <div className="flex flex-col gap-0.5">
      {team.desc ? <p className="text-body text-foreground">{team.desc}</p> : null}
      <p className="text-caption text-fg-secondary">{L(names.length + ' members: ' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' and ' + (names.length - 4) + ' more' : '') + '. Everyone here sees and can change this team’s messages.', names.length + ' 位成員：' + names.slice(0, 4).join('、') + (names.length > 4 ? ' 等' : '') + '。成員都看得到、也能修改這個團隊的訊息。')}</p>
    </div>
  )
}

export function MessagesPage() {
  const app = useApp()
  const [s, m] = useLogic(() => ({ ...initSend(), fT: presetFilter() }), makeSendCtl)
  useClearPreset()
  const [members, setMembers] = React.useState(false)
  const team = app.msgScope !== 'mine' ? teamById(app.msgScope) : undefined
  // the open list may vanish (you left the team): fall back to My messages
  React.useEffect(() => { if (app.msgScope !== 'mine' && !inTeam(app.msgScope)) setApp({ msgScope: 'mine' }) }, [app.msgScope, app.teams])
  useNavHome(() => m.goList())
  // Templates › Use template lands here with a template to apply
  React.useEffect(() => {
    if (!app.useTemplateId) return
    const t = getApp().templates.find(x => x.id === app.useTemplateId)
    setApp({ useTemplateId: null })
    if (!t) return
    m.startCompose('new')
    m.applyTemplate(t, true)
    m.setC({ dirty: false }, true)
  }, [app.useTemplateId, m])
  return (
    <>
      {s.view === 'compose' ? <ComposeView m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: L('Messages', '訊息') }, { label: scopeLabel() }]} actions={<>
            {team ? (
              <Button variant="tertiary" startIcon={UsersRound} onClick={() => setMembers(true)}>{L('Members · ' + team.members.length, '成員・' + team.members.length)}</Button>
            ) : null}
            <Button variant="primary" startIcon={Plus} onClick={() => m.startCompose('new')}>{L('New message', '新訊息')}</Button>
          </>} />
          <SendList m={m} intro={team ? <TeamIntro team={team} /> : null} />
        </>
      )}
      <DetailSheet m={m} />
      <TeamMembersSheet team={team} open={members && !!team} onClose={() => setMembers(false)} />
      <NotSentDialog m={m} />
      <ImportDialog m={m} />
      <NumbersDialog m={m} />
      <SaveGroupDialog m={m} />
      <SaveTplDialog m={m} />
      <TplPickerDialog m={m} />
      <UnreachDialog m={m} />
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
