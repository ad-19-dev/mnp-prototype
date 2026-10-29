// Who can see and change what, for items that belong to a person or a team.
// The rules (a proposal, see the Teams page):
//  - everything a team owns is visible to all of its members;
//  - any member can duplicate a team message or resend it to the people it missed;
//  - only the person who created it, or a team admin, can edit or cancel it while scheduled, or retry it;
//  - after leaving a team you still see the messages you sent for it (view and duplicate only),
//    but not the team's other messages, templates or groups.
import { ME, type Group, type Row, type Team, type Template } from './data'
import * as React from 'react'
import { getApp, setApp } from './store'
import { L } from './i18n'

export const teamById = (id?: string | null): Team | undefined => (id ? getApp().teams.find(t => t.id === id) : undefined)
export const myTeams = () => getApp().teams.filter(t => t.members.some(x => x.pid === ME))
export const inTeam = (id?: string | null) => !!teamById(id)?.members.some(x => x.pid === ME)
export const isAdmin = (id?: string | null) => !!teamById(id)?.members.some(x => x.pid === ME && x.role === 'admin')
export const teamName = (id?: string | null) => (id ? teamById(id)?.name || L('Former team', '已刪除的團隊') : L('Personal', '個人'))

export const canSeeRow = (r: Row) => r.creator === ME || (!!r.team && inTeam(r.team))
export const canManageRow = (r: Row) => (r.team ? inTeam(r.team) && (r.creator === ME || isAdmin(r.team)) : r.creator === ME)
// a message you created for a team you have left: still listed, but view and duplicate only
export const leftTeamRow = (r: Row) => !!r.team && !inTeam(r.team)

// templates and groups owned by a team are hidden once you leave it
export const canSeeItem = (x: Template | Group) => !x.team || inTeam(x.team)
export const canEditTemplate = (t: Template) => (t.team ? inTeam(t.team) : t.owner === ME)
export function groupRole(g: Group): Group['role'] {
  if (!g.team) return g.role
  return g.creator === ME || isAdmin(g.team) ? 'Owner' : 'Editor'
}

// a list opened from the Teams page starts filtered to that team; the preset is used once
export const presetFilter = () => { const t = getApp().presetTeam; return t ? [t] : [] }
export function useClearPreset() {
  React.useEffect(() => { if (getApp().presetTeam) setApp({ presetTeam: null }) }, [])
}
