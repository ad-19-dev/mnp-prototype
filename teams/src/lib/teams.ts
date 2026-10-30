// Sending spaces (decided with PM):
//  - every person has a personal space, created by the system and visible only to them: good for tests
//    and small personal notices;
//  - every team has a shared space. Its messages, audience groups and templates belong to the team, so a
//    new member gets all of them by being added to the team once, and nothing is lost when its creator
//    leaves. Members are equals: they can use, edit, cancel and delete anything in the space;
//  - a team is open like a chat group: any member can add or remove members, and anyone can leave.
//    Leaving takes away access to the whole space, including what you made there.
import { ME, type Group, type Row, type Team, type Template } from './data'
import { getApp } from './store'
import { L } from './i18n'

export const ME_SPACE = 'me'
export const teamById = (id?: string | null): Team | undefined => (id ? getApp().teams.find(t => t.id === id) : undefined)
export const myTeams = () => getApp().teams.filter(t => t.members.some(x => x.pid === ME))
export const inTeam = (id?: string | null) => !!teamById(id)?.members.some(x => x.pid === ME)
export const spaceName = (sp: string) => (sp === ME_SPACE ? L('My sending space', '個人發送空間') : teamById(sp)?.name || '')
// the team a new item in the open space belongs to; null for the personal space
export const spaceTeam = (sp = getApp().space) => (sp === ME_SPACE ? null : sp)

const inSpace = (team: string | null | undefined, owner: string, sp: string) => (sp === ME_SPACE ? !team && owner === ME : team === sp)
export const rowInSpace = (r: Row, sp = getApp().space) => inSpace(r.team, r.creator, sp)
export const tplInSpace = (t: Template, sp = getApp().space) => inSpace(t.team, t.owner, sp)
export const groupInSpace = (g: Group, sp = getApp().space) => inSpace(g.team, g.creator, sp)
