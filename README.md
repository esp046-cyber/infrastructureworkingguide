# 2026 Infrastructure & SCADA Engineering Working Guide (PWA)

Installable, offline-capable field guide. Pure static files, no build step.
Live URL: https://esp046-cyber.github.io/infrastructureworkingguide/

## Deploy to GitHub Pages
1. Extract `infrastructureworkingguide-pwa-2026.zip`.
2. Put the **contents** of the extracted folder (not the folder itself) in the root of the `esp046-cyber/infrastructureworkingguide` repository: `index.html`, `sw.js`, `manifest.webmanifest`, `css/`, `js/`, `icons/` and the rest. The ZIP includes an empty `.nojekyll` file so GitHub Pages serves `.well-known/` and every asset as-is; make sure hidden files are uploaded too.
3. Commit and push to `main`.
4. In the repository: **Settings > Pages > Build and deployment > Deploy from a branch > `main` / `(root)`** and save.
5. Wait about a minute, then open https://esp046-cyber.github.io/infrastructureworkingguide/

All paths are relative (`./`), so the site works under the `/infrastructureworkingguide/` subfolder.

## Before you publish: edit these
- `js/app.js` > `CONFIG.phone` and `CONFIG.email` (currently placeholders: `+971 0 000 0000`, `scada.support@example.com`). The enquiry form opens the visitor's email app with a pre-filled message; offline enquiries are queued and offered for sending on reconnect. There is no server.
- `.well-known/assetlinks.json` is a template for Play Store (TWA) wrapping. Replace the package name and SHA-256 fingerprint. Note that Digital Asset Links must be served from the domain root, which for a project site under `github.io/infrastructureworkingguide/` is not possible. Use a custom domain or a user site if you need TWA verification.

## Verify (Lighthouse PWA)
1. Open the live URL in Chrome, then DevTools > **Lighthouse**.
2. Select **Progressive Web App** (and Performance, Accessibility, Best Practices) and run on Mobile.
3. Check DevTools > **Application**: Manifest shows no errors, Service Workers shows `sw.js` activated, and Cache Storage has `scada-guide-2026-v6`.
4. Tick **Offline** in Network, reload, and confirm the app still loads.
Aim for 100 in each category. Scores can vary with hosting and your Chrome version; fix whatever the report flags.

## Updating
Change files, then bump `CACHE` in `sw.js` (for example `scada-guide-2026-v7`). Returning users see an "Update" toast.

## Notes
- Data is stored in `localStorage` with an in-memory fallback. Use Tools > Backup and restore to protect multi-week commissioning data.
- Plain-English layer: collapsible overview, one-line purpose under every section and tool, and tappable terms (PLC, SCADA, HMI, FAT/SAT, redundancy). Edit the wording in `index.html` and the `TERMS` / `STANDARDS` / `PROJECTS` data in `js/app.js`.
- Field tools: S7-400H topology diagram, 4-20 mA / S7 scaling calculator, OT lookup, tag generator, bandwidth estimator, FAT/SAT checklist.
- Standards content is a quick reference. Check the current edition of each standard before citing it.
- Icons and images were generated with Python (Pillow) by `build.py`.
