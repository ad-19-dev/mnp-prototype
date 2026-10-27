// App chrome: tWorkspace global header, MNP sidebar, and the per-page local header.
// Layout follows the DS AppShell "primary-header" pattern (global header + sidebar + local header).
import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  AccountMenu, AppShell, Avatar, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage,
  Button, ChromeHeader, Input, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SegmentedControl, SegmentedControlItem,
} from '@qijenchen/design-system'
import { Bell, CircleHelp, LayoutTemplate, Radio, Search, Send, Users } from 'lucide-react'
import { go, setLang, useApp, type Page } from '../lib/store'
import { L } from '../lib/i18n'

const NAV = (): { id: Page; label: string; icon: typeof Send }[] => [
  { id: 'send', label: L('Messages', '訊息'), icon: Send },
  { id: 'groups', label: L('Audience groups', '收件群組'), icon: Users },
  { id: 'templates', label: L('Templates', '模板'), icon: LayoutTemplate },
]

// Pages render their header into the AppShell header slot through this context
const HeaderSlot = React.createContext<HTMLElement | null>(null)
// Clicking the current nav item asks the page to go back to its list
type HomeFn = () => void
const HomeRegistry = React.createContext<React.MutableRefObject<HomeFn | null> | null>(null)
export function useNavHome(fn: HomeFn) {
  const reg = React.useContext(HomeRegistry)
  React.useEffect(() => { if (reg) reg.current = fn })
}

export interface Crumb { label: string; onClick?: () => void }
export function PageHeader({ crumbs, actions }: { crumbs: Crumb[]; actions?: React.ReactNode }) {
  const el = React.useContext(HeaderSlot)
  if (!el) return null
  // the local header is a breadcrumb rooted at the section: Messages / New message
  const all = crumbs
  const last = all[all.length - 1]
  return createPortal(
    <>
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList size="lg">
          {/* items go in as a flat list: the DS BreadcrumbList adds the separators and skips Fragments */}
          {all.slice(0, -1).map((c, i) => (
            <BreadcrumbItem key={i}>
              <BreadcrumbLink asChild><button type="button" onClick={c.onClick}>{c.label}</button></BreadcrumbLink>
            </BreadcrumbItem>
          ))}
          <BreadcrumbItem key="current"><BreadcrumbPage>{last.label}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </>,
    el,
  )
}

function GlobalHeader() {
  const { lang } = useApp()
  return (
    <ChromeHeader className="bg-surface" leadingRail={<SidebarTrigger />}>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar size={24} shape="square" color="blue" solid alt="tWorkspace" />
        <span className="text-body-lg font-medium">tWorkspace</span>
        <span className="mx-1 h-4 w-px bg-divider" aria-hidden />
        <span className="text-body-lg text-fg-secondary">MNP</span>
      </div>
      <div className="mx-auto hidden w-full max-w-md px-[var(--layout-space-loose)] md:block">
        <Input size="sm" startIcon={Search} placeholder={L('Search tWorkspace', '搜尋 tWorkspace')} aria-label={L('Search tWorkspace', '搜尋 tWorkspace')} />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <SegmentedControl size="sm" value={lang} onValueChange={v => v && setLang(v as 'en' | 'zh')} aria-label={L('Language', '語言')} className="mr-1">
          <SegmentedControlItem value="zh">中文</SegmentedControlItem>
          <SegmentedControlItem value="en">EN</SegmentedControlItem>
        </SegmentedControl>
        <Button variant="text" size="sm" iconOnly startIcon={CircleHelp} aria-label={L('Help', '說明')} />
        <Button variant="text" size="sm" iconOnly startIcon={Bell} aria-label={L('Notifications, 3 unread', '通知，3 則未讀')} overlayBadge={<span className="block size-2 rounded-full bg-notification" />} />
        <AccountMenu user={{ name: 'Grace Wu', avatar: { color: 'blue' } }} onViewProfile={() => {}} onOpenSettings={() => {}} onSignOut={() => {}} />
      </div>
    </ChromeHeader>
  )
}

function MnpSidebar({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <Sidebar collapsible="icon" viewportInsetTop="var(--chrome-header-height)">
      <SidebarHeader>
        <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Avatar size={24} shape="square" color="indigo" icon={Radio} alt="MNP" />
          <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-body font-medium">MNP</span>
            <span className="truncate text-caption text-fg-secondary">{L('Notification platform', '通知平台')}</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV().map(n => (
                <SidebarMenuItem key={n.id}>
                  <SidebarMenuButton id={n.id} startIcon={n.icon} tooltip={n.label} onClick={() => onNav(n.id)}>{n.label}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { page } = useApp()
  const [slot, setSlot] = React.useState<HTMLElement | null>(null)
  const home = React.useRef<HomeFn | null>(null)
  const onNav = (p: Page) => {
    if (p === page) { home.current?.(); return }
    home.current = null
    go(p)
  }
  return (
    <SidebarProvider activeId={page} onActiveChange={() => {}}>
      <HomeRegistry.Provider value={home}>
        <HeaderSlot.Provider value={slot}>
          <AppShell
            layout="primary-header"
            globalHeader={<GlobalHeader />}
            sidebar={<MnpSidebar onNav={onNav} />}
            header={<ChromeHeader className="bg-surface"><div ref={setSlot} className="contents" /></ChromeHeader>}
          >
            {children}
          </AppShell>
        </HeaderSlot.Provider>
      </HomeRegistry.Provider>
    </SidebarProvider>
  )
}
