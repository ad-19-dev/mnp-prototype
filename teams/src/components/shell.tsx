// App chrome: tWorkspace global header, MNP sidebar, and the per-page local header.
// Layout follows the DS AppShell "primary-sidebar" pattern (full-height sidebar + page header, no global top bar).
import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  AccountMenu, AppShell, AppShellAside, Avatar, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage,
  Button, ChromeHeader, Input, Sidebar, SidebarContent, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel,
  SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SegmentedControl, SegmentedControlItem, Tabs, TabsList, TabsTrigger,
} from '@qijenchen/design-system'
import { Megaphone, Plus, Settings, UserRound, UsersRound } from 'lucide-react'
import { go, setApp, setLang, useApp, type Page } from '../lib/store'
import { ME_SPACE, myTeams, spaceName, teamById } from '../lib/teams'
import { TeamDialog } from './TeamPanels'
import { L } from '../lib/i18n'

// The sidebar lists sending spaces: your personal space, then a Shared spaces group with one space per team.
// Messages, audience groups and templates are tabs inside each space.

// Pages render their header into the AppShell header slot through this context
const HeaderSlot = React.createContext<HTMLElement | null>(null)
// A space's tabs sit in the page header's second row (DS ChromeHeader tabsSlot); pages without tabs leave it empty
const TabsSlot = React.createContext<((n: React.ReactNode) => void) | null>(null)
// Clicking the current nav item asks the page to go back to its list
type HomeFn = () => void
const HomeRegistry = React.createContext<React.MutableRefObject<HomeFn | null> | null>(null)
export function useNavHome(fn: HomeFn) {
  const reg = React.useContext(HomeRegistry)
  React.useEffect(() => { if (reg) reg.current = fn })
}

// Pages put a side panel (message details) into the AppShell aside. Per the DS, it sits inline next to the
// list on desktop, without a mask, so the list stays usable; on phones the DS turns it into a sheet.
interface AsideCfg { title: string; onClose: () => void }
const AsideSlot = React.createContext<{ el: HTMLElement | null; set: (c: AsideCfg | null) => void } | null>(null)
export function ShellAside({ title, onClose, children }: AsideCfg & { children: React.ReactNode }) {
  const ctx = React.useContext(AsideSlot), close = React.useRef(onClose), set = ctx?.set
  close.current = onClose
  React.useEffect(() => { set?.({ title, onClose: () => close.current() }) }, [set, title])
  React.useEffect(() => () => set?.(null), [set])
  return ctx?.el ? createPortal(children, ctx.el) : null
}

export interface Crumb { label: string; onClick?: () => void }
export function PageHeader({ crumbs, actions }: { crumbs: Crumb[]; actions?: React.ReactNode }) {
  const el = React.useContext(HeaderSlot)
  if (!el) return null
  // the local header is a breadcrumb rooted at the space: Platform Ops / New message (Shared spaces is only a group label)
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
          <BreadcrumbItem key="current"><BreadcrumbPage className="font-bold">{last.label}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </>,
    el,
  )
}

function LangSwitch() {
  const { lang } = useApp()
  return (
    <SegmentedControl size="sm" value={lang} onValueChange={v => v && setLang(v as 'en' | 'zh')} aria-label={L('Language', '語言')} className="shrink-0 group-data-[collapsible=icon]:hidden">
      <SegmentedControlItem value="zh">中文</SegmentedControlItem>
      <SegmentedControlItem value="en">EN</SegmentedControlItem>
    </SegmentedControl>
  )
}

function MnpSidebar({ onSpace }: { onSpace: (sp: string) => void }) {
  const [creating, setCreating] = React.useState(false)
  useApp()
  const teams = myTeams()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* the product name, and the collapse button at the far right; collapsed, only the button stays */}
        <div className="flex w-full min-w-0 items-center gap-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
          <span className="min-w-0 flex-1 truncate text-body-lg font-bold group-data-[collapsible=icon]:hidden">MNP</span>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton id={'sp:' + ME_SPACE} startIcon={UserRound} tooltip={spaceName(ME_SPACE)} onClick={() => onSpace(ME_SPACE)}>{spaceName(ME_SPACE)}</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{L('Shared spaces', '共享發送空間')}</SidebarGroupLabel>
          <SidebarGroupAction icon={Plus} aria-label={L('New team', '建立團隊')} onClick={() => setCreating(true)} />
          <SidebarGroupContent>
            <SidebarMenu>
              {teams.map(t => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton id={'sp:' + t.id} startIcon={UsersRound} tooltip={t.name} onClick={() => onSpace(t.id)}>{t.name}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* DS primary-sidebar: the account sits at the bottom of the sidebar; the prototype's language switch sits with it */}
      <SidebarFooter>
        <div className="flex min-w-0 items-center gap-2 px-[var(--layout-space-tight)] py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <AccountMenu user={{ name: 'Grace Wu', avatar: { color: 'blue' } }} onViewProfile={() => {}} onOpenSettings={() => {}} onSignOut={() => {}} />
          <span className="min-w-0 flex-1 truncate text-body group-data-[collapsible=icon]:hidden">Grace Wu</span>
          <LangSwitch />
        </div>
      </SidebarFooter>
      <TeamDialog open={creating} onClose={() => setCreating(false)} />
    </Sidebar>
  )
}

// Top of every space: its name and description, then tabs for its messages, audience groups and templates.
// DS: the title repeats the breadcrumb's last item (text-h3 under an md breadcrumb), bold.
export function SpaceIntro() {
  const { space, page, lang } = useApp(), team = teamById(space), setTabs = React.useContext(TabsSlot)
  const tabs: [Page, string][] = [['send', L('Send messages', '發送訊息')], ['groups', L('Audience groups', '收件群組')], ['templates', L('Templates', '模板')]]
  // the tabs live in the page header, under the breadcrumb and the New message button
  React.useEffect(() => {
    setTabs?.(
      <Tabs value={page} onValueChange={v => go(v as Page)}>
        <TabsList aria-label={spaceName(space)}>
          {tabs.map(([k, label]) => <TabsTrigger key={k} value={k}>{label}</TabsTrigger>)}
        </TabsList>
      </Tabs>,
    )
  }, [setTabs, page, space, lang])
  React.useEffect(() => () => setTabs?.(null), [setTabs])
  // the space's name is already in the header, so the body only says what the space is for
  return <p className="text-body text-fg-secondary">{team ? team.desc : L('Private space for your personal templates, audience groups, and sending history created only within this space.', '你的私人空間，存放只在這裡建立的個人模板、收件群組和發送紀錄。')}</p>
}

// Team settings sits right of the page's primary action, in a team's space only
export function SpaceSettings() {
  const { space } = useApp(), team = teamById(space), [open, setOpen] = React.useState(false)
  if (!team) return null
  return (
    <>
      <Button variant="tertiary" iconOnly startIcon={Settings} aria-label={L('Team settings', '團隊設定')} onClick={() => setOpen(true)} />
      <TeamDialog team={team} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { space } = useApp()
  const [slot, setSlot] = React.useState<HTMLElement | null>(null)
  const [tabs, setTabs] = React.useState<React.ReactNode>(null)
  const [aside, setAside] = React.useState<AsideCfg | null>(null), [asideEl, setAsideEl] = React.useState<HTMLElement | null>(null)
  const asideCtx = React.useMemo(() => ({ el: asideEl, set: setAside }), [asideEl])
  const home = React.useRef<HomeFn | null>(null)
  // switching spaces first returns the open tab to its list (asking about unsaved work), and keeps the tab
  const onSpace = (sp: string) => {
    home.current?.()
    if (sp !== space) setApp({ space: sp })
  }
  return (
    <SidebarProvider activeId={'sp:' + space} onActiveChange={() => {}}>
      <HomeRegistry.Provider value={home}>
        <HeaderSlot.Provider value={slot}>
        <TabsSlot.Provider value={setTabs}>
        <AsideSlot.Provider value={asideCtx}>
          <AppShell
            layout="primary-sidebar"
            sidebar={<MnpSidebar onSpace={onSpace} />}
            // no global top bar; the sidebar toggle lives in the sidebar header (see MnpSidebar)
            header={<ChromeHeader className="bg-surface" tabsSlot={tabs || undefined}><div ref={setSlot} className="contents" /></ChromeHeader>}
            asideOpen={!!aside} onAsideOpenChange={o => { if (!o) aside?.onClose() }}
            aside={aside ? <AppShellAside title={aside.title} width={{ md: 400, xl: 480 }}><div ref={setAsideEl} /></AppShellAside> : undefined}
          >
            {children}
          </AppShell>
        </AsideSlot.Provider>
        </TabsSlot.Provider>
        </HeaderSlot.Provider>
      </HomeRegistry.Provider>
    </SidebarProvider>
  )
}
