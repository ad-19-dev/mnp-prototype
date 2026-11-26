// Layout demos built from the prototype (separate pages; the prototype itself never sets these).
// covside (2026-11-26): New message step 1 with Message Coverage by Channel in a column on the right, so the Audience
// table can grow with the page instead of scrolling in its own box (teams/covside.html).
export const COV_SIDE = typeof window !== 'undefined' && (window as unknown as { __MNP_COVSIDE?: boolean }).__MNP_COVSIDE === true
