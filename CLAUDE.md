# Notes for Claude

- Make changes in `teams/` only. It is the version being developed.
- `bilingual/` is frozen (since 2026-11-02) and `english/` is frozen (since 2026-10-29): don't edit, rebuild or republish them.
  The design-options page (`bilingual/options.html`) still builds from there; change it only when asked.
  The message-log spec now builds from `teams/` (`teams/spec.html`); its screenshots come from the teams prototype.
- Inside `teams/`, the **one-record-per-channel version** (`src/pages/messages/split.tsx`, the default build) is the one being developed, with its UI flow and design spec (`teams/split-spec.html`, `teams/src/spec/split/`, screenshots by `tools/split-shots.mjs`).
  The earlier one-row-per-message Teams version is frozen (since 2026-11-06; `--mode legacy` still builds it): don't maintain or republish its prototype, message-log spec, send-flow spec or send UI flow.
- The New message UI flow and design spec of that version is `teams/newmsg-spec.html` (`teams/src/spec/newmsg/`, screenshots by `tools/newmsg-shots.mjs`).
- The phone-number de-duplication study is `teams/phone-dedupe.html` (`teams/src/spec/phone/`).
- The lock password is never written into this repo.
