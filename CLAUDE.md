# Notes for Claude

- Make changes in `teams/` only. It is the version being developed.
- Inside `teams/`, the **one-record-per-channel version** (`src/pages/messages/split.tsx`, the default build) is the one being developed, with its UI flow and design spec (`teams/split-spec.html`, `teams/src/spec/split/`, screenshots by `tools/split-shots.mjs`).
  The earlier one-row-per-message Teams version (`--mode legacy` still builds it) is no longer maintained: don't maintain or republish it. Its separate specs and the frozen `bilingual/` and `english/` folders were removed from the repo on 2026-11-08.
- The New message UI flow and design spec of that version is `teams/newmsg-spec.html` (`teams/src/spec/newmsg/`, screenshots by `tools/newmsg-shots.mjs`).
- A record's details open in the Detail modal (`src/pages/messages/DetailModal.tsx`), the default since 2026-11-11 (the side panel is no longer used). The separate Detail modal study artifact is no longer used (2026-11-11): don't republish it.
- The Delivery method proposals (how to tie it to Device Notifications) are `teams/delivery.html` (`teams/src/spec/delivery/`); they do not change the prototype.
- The per-recipient delivery details proposals (Detail modal) are `teams/sendlog.html` (`teams/src/spec/sendlog/`); they do not change the prototype.
- The batch import proposals (match inline, no second match page) are `teams/importlive.html` (`teams/src/spec/importlive/`); they do not change the prototype.
- The phone-number de-duplication study is `teams/phone-dedupe.html` (`teams/src/spec/phone/`).
- The DS component map for developers is `teams/dsmap.html` (`teams/src/spec/dsmap/`).
- The "which phone gets the SMS" comparison for PM is `teams/smsphone.html` (`teams/src/spec/smsphone/`); it does not change the prototype.
- The lock password is never written into this repo.
