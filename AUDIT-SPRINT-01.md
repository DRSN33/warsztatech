# WarsztatTech — Sprint 01 (test branch)

Status: TEST / NOT PRODUCTION. Confirmed workshop address: ul. Owocowa 7, 42-400 Zawiercie.

## Findings
- `index.html` is a self-contained static landing page with inline CSS and a year script.
- `script.js` and `style.css` belong to an older UI and are not linked from the current homepage. Do not enable them without rebuilding and testing the corresponding DOM.
- Privacy notice had a conflicting address; aligned on this branch only.
- Privacy notice still has `[NIP]`, `[data]`, and a template warning; verify legal identity and privacy practices before publishing.
- Current homepage has click-to-call and WhatsApp links, but no online booking or Notion integration. Do not claim it does.

## Acceptance criteria
- [ ] Verify confirmed legal administrator details and finalize privacy notice with qualified review.
- [ ] Browser test desktop and mobile (layout, links, console errors).
- [ ] Verify privacy link visibility and consistency.
- [ ] Verify Vercel preview and ensure no production merge.
- [ ] Design fake-data-only intake workflow; no live messages or Notion writes.

## Rollback
Do not merge this branch until approved. Discard branch or close draft PR to abandon changes. Production `main` remains untouched.
