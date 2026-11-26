// Layout demos built from the prototype (separate pages; the prototype itself never sets these).
// covside (2026-11-26): New message step 1 with Message Coverage by Channel in a column on the right, so the Audience
// table can grow with the page instead of scrolling in its own box (teams/covside.html).
// The switch is built into the JS by vite.covside.config.ts (the lock tool keeps only the CSS and JS, not scripts in the HTML)
export const COV_SIDE = import.meta.env.VITE_COVSIDE === '1'
