import { Toaster } from '@qijenchen/design-system'
import { Shell } from './components/shell'
import { useApp } from './lib/store'
import { MessagesPage } from './pages/messages/MessagesPage'
import { GroupsPage } from './pages/groups/GroupsPage'
import { TemplatesPage } from './pages/templates/TemplatesPage'

export default function App() {
  const { page } = useApp()
  return (
    <>
      <Shell>
        {page === 'send' ? <MessagesPage /> : page === 'groups' ? <GroupsPage /> : <TemplatesPage />}
      </Shell>
      <Toaster position="top-center" />
    </>
  )
}
