// Messages page: the list of sent and scheduled messages, and the send flow
import * as React from 'react'
import { Button } from '@qijenchen/design-system'
import { Plus } from 'lucide-react'
import { useLogic } from '../../lib/logic'
import { inTeam, myTeams } from '../../lib/teams'
import { scopeLabel } from './ctl'
import { getApp, setApp, useApp } from '../../lib/store'
import { ConfirmDialog } from '../../components/ui'
import { PageHeader, SpaceIntro, SpaceSettings, useNavHome } from '../../components/shell'
import { initSend, makeSendCtl } from './ctl'
import { L } from '../../lib/i18n'
import { SendList } from './List'
import { DetailSheet, NotSentDialog, RescheduleDialog } from './Detail'
import { SplitDetailSheet, SplitFailDialog, SplitList } from './split'
import { MODAL, PEOPLE, SPLIT, type Tag } from '../../lib/data'
import { COV_SIDE } from '../../lib/demo'
import { DetailModal } from './DetailModal'
import { ComposeView } from './Compose'
import { ImportDialog, NumbersDialog, SaveGroupDialog, SaveTplDialog, TplPickerDialog } from './Modals'

export function MessagesPage() {
  const app = useApp()
  const [s, m] = useLogic(initSend, makeSendCtl)
  // the open space may vanish (you left the team): fall back to your personal space
  React.useEffect(() => { if (!inTeam(app.space)) { const t = myTeams()[0]; if (t) setApp({ space: t.id }) } }, [app.space, app.teams])
  // another space starts from its first page, unfiltered
  React.useEffect(() => { m.set({ page: 1, q: '', fs: [], fch: [], det: null }) }, [app.space, m])
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
  // the coverage-on-the-right demo opens on New message with three channels and a long audience, so the page scrolls
  React.useEffect(() => {
    if (!COV_SIDE) return
    m.startCompose('new')
    const ppl = PEOPLE.filter(p => !p.extKind && !p.gen).slice(0, 24)
    const tags: Tag[] = [{ key: 'o:PUX', type: 'org', id: 'PUX' } as Tag].concat(ppl.map(p => ({ key: 'p:' + p.id, type: 'person', id: p.id }) as Tag))
    m.setC({ ch: { push: true, desktop: true, email: true, sms: false }, receivers: tags, dirty: false }, true)
  }, [m])
  return (
    <>
      {s.view === 'compose' ? <ComposeView m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: scopeLabel() }]} actions={<>
            <Button variant="primary" startIcon={Plus} onClick={() => m.startCompose('new')}>{L('New message', '新訊息')}</Button>
            <SpaceSettings />
          </>} />
          {SPLIT ? <SplitList m={m} intro={<SpaceIntro />} /> : <SendList m={m} intro={<SpaceIntro />} />}
        </>
      )}
      {MODAL ? <DetailModal m={m} /> : SPLIT ? <SplitDetailSheet m={m} /> : <DetailSheet m={m} />}
      {SPLIT ? <SplitFailDialog m={m} /> : <NotSentDialog m={m} />}
      <RescheduleDialog m={m} />
      <ImportDialog m={m} />
      <NumbersDialog m={m} />
      <SaveGroupDialog m={m} />
      <SaveTplDialog m={m} />
      <TplPickerDialog m={m} />
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
