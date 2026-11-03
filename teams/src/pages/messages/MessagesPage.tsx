// Messages page: the list of sent and scheduled messages, and the send flow
import * as React from 'react'
import { Button } from '@qijenchen/design-system'
import { Plus } from 'lucide-react'
import { useLogic } from '../../lib/logic'
import { ME_SPACE, inTeam } from '../../lib/teams'
import { scopeLabel } from './ctl'
import { getApp, setApp, useApp } from '../../lib/store'
import { ConfirmDialog } from '../../components/ui'
import { PageHeader, SpaceIntro, SpaceSettings, useNavHome } from '../../components/shell'
import { initSend, makeSendCtl } from './ctl'
import { L } from '../../lib/i18n'
import { SendList } from './List'
import { DetailSheet, NotSentDialog, RescheduleDialog } from './Detail'
import { ComposeView } from './Compose'
import { ImportDialog, NumbersDialog, SaveGroupDialog, SaveTplDialog, TplPickerDialog, UnreachDialog } from './Modals'

export function MessagesPage() {
  const app = useApp()
  const [s, m] = useLogic(initSend, makeSendCtl)
  // the open space may vanish (you left the team): fall back to your personal space
  React.useEffect(() => { if (app.space !== ME_SPACE && !inTeam(app.space)) setApp({ space: ME_SPACE }) }, [app.space, app.teams])
  // another space starts from its first page, unfiltered
  React.useEffect(() => { m.set({ page: 1, q: '', fS: [], fC: [], det: null }) }, [app.space, m])
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
          <PageHeader crumbs={[{ label: scopeLabel() }]} actions={<>
            <Button variant="primary" startIcon={Plus} onClick={() => m.startCompose('new')}>{L('New message', '新訊息')}</Button>
            <SpaceSettings />
          </>} />
          <SendList m={m} intro={<SpaceIntro />} />
        </>
      )}
      <DetailSheet m={m} />
      <NotSentDialog m={m} />
      <RescheduleDialog m={m} />
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
