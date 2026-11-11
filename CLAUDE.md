# Notes for Claude

- Make changes in `teams/` only. It is the version being developed.
- Inside `teams/`, the **one-record-per-channel version** (`src/pages/messages/split.tsx`, the default build) is the one being developed, with its UI flow and design spec (`teams/split-spec.html`, `teams/src/spec/split/`, screenshots by `tools/split-shots.mjs`).
  The earlier one-row-per-message Teams version (`--mode legacy` still builds it) is no longer maintained: don't maintain or republish it. Its separate specs and the frozen `bilingual/` and `english/` folders were removed from the repo on 2026-11-08.
- The New message UI flow and design spec of that version is `teams/newmsg-spec.html` (`teams/src/spec/newmsg/`, screenshots by `tools/newmsg-shots.mjs`).
- The Detail modal study (a record's details in a large dialog instead of the side panel) is `--mode modal` of the same app (`src/pages/messages/DetailModal.tsx`; build with `npx vite build --mode modal --outDir modal/dist`). It doesn't change the default build.
- The phone-number de-duplication study is `teams/phone-dedupe.html` (`teams/src/spec/phone/`).
- The DS component map for developers is `teams/dsmap.html` (`teams/src/spec/dsmap/`).
- The "which phone gets the SMS" comparison for PM is `teams/smsphone.html` (`teams/src/spec/smsphone/`); it does not change the prototype.
- The lock password is never written into this repo.
