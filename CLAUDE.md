# Notes for Claude

- Make changes in `teams/` only. It is the version being developed.
- Inside `teams/`, the **one-record-per-channel version** (`src/pages/messages/split.tsx`, the default build) is the one being developed, with its UI flow and design spec (`teams/split-spec.html`, `teams/src/spec/split/`, screenshots by `tools/split-shots.mjs`).
  The earlier one-row-per-message Teams version (`--mode legacy` still builds it) is no longer maintained: don't maintain or republish it. Its separate specs and the frozen `bilingual/` and `english/` folders were removed from the repo on 2026-11-08.
- The Message details (Detail modal) and Resend UI flow and design spec is `teams/detail-spec.html` (`teams/src/spec/detail/`, split out of the Send messages spec on 2026-11-19; it uses that spec's screenshots, `tools/split-shots.mjs`). The Send messages spec keeps the list and row menu and links to it.
- The New message UI flow and design spec of that version is `teams/newmsg-spec.html` (`teams/src/spec/newmsg/`, screenshots by `tools/newmsg-shots.mjs`).
- A record's details open in the Detail modal (`src/pages/messages/DetailModal.tsx`), the default since 2026-11-11 (the side panel is no longer used). The separate Detail modal study artifact is no longer used (2026-11-11): don't republish it.
- The Delivery method proposals (how to tie it to Device Notifications) are `teams/delivery.html` (`teams/src/spec/delivery/`); they do not change the prototype.
- The per-recipient delivery details proposals (Detail modal) are `teams/sendlog.html` (`teams/src/spec/sendlog/`); they do not change the prototype.
- The batch import proposals (match inline, no second match page) are `teams/importlive.html` (`teams/src/spec/importlive/`); they do not change the prototype. B+ was in the prototype 2026-11-16/17, then the verify-on-Add compromise from `teams/importverify.html` (2026-11-17); since 2026-11-18 the prototype uses option A (tags) without the summary tags, the gray-tag sentence or repeated entries, and with Proceed as the button.
- The batch import comparison (B+ now vs. verify on Add with a second confirm dialog vs. the compromise that fixes invalid entries in that dialog, 2026-11-17) is `teams/importverify.html` (`teams/src/spec/importverify/`); it does not change the prototype.
- The batch import tag study (edit a tag as plain text; where a fixed tag goes; a later batch only places the new tags, new red first and new gray last; phone region; options Now / A / B / C, 2026-11-19; option D, 2026-11-20: keep the order typed; the hint is "n valid · m invalid (click a tag to edit it) · Show only these", only "m invalid" in red, no Remove all) is `teams/importtags.html` (`teams/src/spec/importtags/`); it does not change the prototype.
- The Not sent / Resend demo (answers to two prototype questions, 2026-11-16) is `teams/notsent.html` (`teams/src/spec/notsent/`); it does not change the prototype.
- The batch import tag design and why page (screenshots of the tag study's option A with labels by data type, each part with its reason; answers "why not show the person for a phone number", 2026-11-19) is `teams/tagwhy.html` (`teams/src/spec/tagwhy/`, screenshots by `tools/tagwhy-shots.mjs` from the tag study served on :4191); it does not change the prototype.
- The phone-number de-duplication study is `teams/phone-dedupe.html` (`teams/src/spec/phone/`).
- The DS component map for developers is `teams/dsmap.html` (`teams/src/spec/dsmap/`).
- The "which phone gets the SMS" comparison for PM is `teams/smsphone.html` (`teams/src/spec/smsphone/`); it does not change the prototype.
- The prototype artifact's page title is "MNP Prototype (Final)" (since 2026-11-19); lock it with that title.
- The lock password is never written into this repo.
