---
name: "create-transparent-desktop-widget"
description: "Create a transparent, borderless Electron desktop widget that overlays the primary display work area and renders a web app (e.g., the 今日小岛 / Today Island todo page), including the app manifest, main process with click-through pointer mode and tray controls, a preload script injecting transparent styling and floating controls, and a Windows launch script."
user-invocable: true
x-xiaoba-capability-handle: "cap_cf71e3db013845b7b74ac5acc9b69914"
x-xiaoba-transition-id: "transition-ec3e2dca-6846-4519-ba82-41bb42ad3219"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1035.jsonl#turn-1:delivery:write_file:call-id-8e09fdb8b781-1, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1035.jsonl#turn-1:delivery:write_file:call-id-0316c7963422-2, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1035.jsonl#turn-1:delivery:write_file:call-id-88cf3dce5f41-3, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1035.jsonl#turn-1:delivery:write_file:call-id-28600112e361-4, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1035.jsonl#episode-episode:1:32f8d33c:settlement-2026-07-30T08:53:27.574Z"
---

# Create Transparent Desktop Widget (Electron)

## Description
Create a transparent, borderless Electron desktop widget that overlays the primary display work area and renders a web app (for example, the "今日小岛 / Today Island" todo page) as a click-through desktop component. The widget consists of four files: the app manifest, the main process (window + tray + IPC), a preload script (transparent styling + floating controls), and a Windows launch script.

## When to use
- The user asks to set up, build, or complete a transparent desktop widget / desktop component ("透明桌面组件") for a web app as an Electron app.
- The task is about creating the widget files (package.json, main.js, preload.js, start script) for such a widget.

## Prerequisites
- The user's current authorization to create files in the widget directory on their machine (for example, `%LOCALAPPDATA%\TodayIslandWidget`).
- The web URL the widget should display.
- Electron must be installed in the widget directory before launch (`npm install`); the source evidence only confirms the four files were written, not installation, execution, or running status.

## Procedure
1. **package.json** — Declare the Electron app: `"main": "main.js"`, a `start` script `electron .`, and the `electron` dependency (observed at 37.2.6).
2. **main.js** — Create a `BrowserWindow` covering the primary display's work area with:
   - `transparent: true`, `backgroundColor: '#00000000'`, `frame: false`, `hasShadow: false`, `resizable`/`movable`/`fullscreenable: false`, `skipTaskbar: true`;
   - `preload: preload.js`, `contextIsolation: true`, `nodeIntegration: false`;
   - load the widget URL; deny popups and open them via `shell.openExternal`; after load, set a work-area-based zoom factor, `showInactive()`, and `moveBottom()`.
   - Add a tray menu with show/hide, reload, and exit.
   - Handle `pointer-mode` IPC: toggle `win.setIgnoreMouseEvents(!interactive, { forward: true })` so transparent areas pass clicks through to the desktop.
   - Handle `widget-action` IPC for hide/reload/exit.
3. **preload.js** — Inject CSS that makes the page transparent (`html,body` background transparent; translucent cards/headers with `backdrop-filter`), hides install prompts, and adds a floating control bar (reload / hide / exit) that sends `widget-action`. On `mousemove`/`dragover`, detect whether the element under the pointer is interactive (e.g., header, hero, card, dialog, controls, toast) and send `pointer-mode` to the main process.
4. **start-widget.cmd** — Windows batch file that `cd`s to the widget directory and launches `node_modules\electron\dist\electron.exe` with the widget directory.

## Boundaries
- Only applies to creating this kind of transparent desktop widget; do not generalize to arbitrary Electron apps or system changes.
- Do not claim the widget is running, that accounts/tasks were migrated, or that desktop icons or startup entries were updated — the source episode's assistant reply made those claims, but the evidence only shows the file writes.
- Do not perform account migration, startup registration, desktop icon changes, or other system/account modifications without explicit current user authorization and independent verification.
- The pointer-mode mechanism uses `setIgnoreMouseEvents` with `forward: true`; keep the interactive-region list accurate so interactive elements still receive mouse events.
- Launching the widget runs untested code and loads a remote URL; only proceed with a URL and app the user trusts.
