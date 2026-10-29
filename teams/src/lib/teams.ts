// Who can see and change what (a proposal):
//  - a message belongs to one person or one team; a team's messages are visible to all its members,
//    and any member can edit, cancel, retry, duplicate or resend them: members are equals, as in a chat group;
//  - templates and audience groups belong to their creator and can be shared with several teams;
//    members of those teams can use and edit them;
//  - My messages lists everything you sent, personal or for a team; each team's list has what all its members sent;
//  - after leaving a team you still see the messages you sent for it in My messages (view and duplicate only),
//    but not the team's other messages, templates or groups.
import * as React from 'react'
import { ME, type Group, type Row, type Team, type Template } from './data'
import { getApp, setApp } from './store'
import { L } from './i18n'

export const teamById = (id?: string | null): Team | undefined => (id ? getApp().teams.find(t => t.id === id) : undefined)
export const myTeams = () => getApp().teams.filter(t => t.members.some(x => x.pid === ME))
export const inTeam = (id?: string | null) => !!teamById(id)?.members.some(x => x.pid === ME)
export const teamName = (id?: string | null) => (id ? teamById(id)?.name || L('Former team', '已解散的團隊') : L('Personal', '個人'))

export const canSeeRow = (r: Row) => r.creator === ME || (!!r.team && inTeam(r.team))
export const canManageRow = (r: Row) => (r.team ? inTeam(r.team) : r.creator === ME)
// a message you created for a team you have left: listed under My messages, view and duplicate only
export const leftTeamRow = (r: Row) => !!r.team && !inTeam(r.team)

const ownerOf = (x: Template | Group) => ('owner' in x ? x.owner : x.creator)
export const sharedTeams = (x: Template | Group) => (x.teams || []).filter(Boolean)
// templates and groups shared only with teams you're not in are hidden, unless you own them
export const canSeeItem = (x: Template | Group) => !sharedTeams(x).length || ownerOf(x) === ME || sharedTeams(x).some(inTeam)
export const canEditTemplate = (t: Template) => t.owner === ME || sharedTeams(t).some(inTeam)
export function groupRole(g: Group): Group['role'] {
  if (!sharedTeams(g).some(inTeam)) return g.role
  return g.creator === ME ? 'Owner' : g.role === 'Owner' ? 'Owner' : 'Editor'
}

// a list opened with a preset starts filtered to that team; the preset is used once
export const presetFilter = () => { const t = getApp().presetTeam; return t ? [t] : [] }
export function useClearPreset() {
  React.useEffect(() => { if (getApp().presetTeam) setApp({ presetTeam: null }) }, [])
}
