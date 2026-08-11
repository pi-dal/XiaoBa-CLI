---
name: cloud-html-artifact
description: Prepare an isolated publication copy of an already-built browser-runnable HTML/CSS/JavaScript directory, add the required directly visible CatsCo publication branding with minimal page changes, publish it from the current virtual employee server as a versioned browser-trusted HTTPS URL, verify it, and register it in the server-local artifact index. Use when another skill or agent has finished a webpage, HTML game, dashboard, visualization, or static web app and the user wants it placed online. This skill does not redesign the upstream page, perform upstream domain work, or run an application backend.
---

# Cloud HTML Artifact

Publish an existing static web directory from the current virtual employee server and return a real HTTPS URL.

## Boundary

Do:

1. Accept an already-built directory whose entry point is `index.html`.
2. Create an isolated publication copy and leave the upstream directory unchanged.
3. Add the required CatsCo publication branding to that copy using the policy below.
4. Check the prepared page in desktop and mobile browser viewports.
5. Bind the current Agent UID to its canonical hostname.
6. Ensure the server-local static host, DNS, trusted certificate, Nginx, and systemd service.
7. Create an independent `vN`, verify it through public HTTPS, promote `latest`, and update the server-local index.
8. Return the published title, version, and URL.

Do not:

- Redesign or rewrite the upstream page. Only the smallest HTML/CSS changes needed for the publication branding contract are allowed, and only in the isolated publication copy.
- Modify the upstream already-built directory in place.
- Hide the publication entry in a menu, About, settings, dialog, collapsed section, hover-only state, or any surface that requires an extra action to discover.
- Use a non-footer variant only because it looks better; an observable fixed-stage conflict is required.
- Turn a request into a dashboard, game, report, or CRUD app.
- Add a dedicated Artifact Tool; run the bundled scripts through the existing shell capability.
- Invent a per-Artifact backend, database, authentication service, private API, or server-side session.
- Build arbitrary source projects. Upstream must provide browser-runnable output.
- Ask the user for an Artifact Profile, static root, hostname, public base URL, Nginx config, or certificate command.
- Upload to the old central Artifact host or return HTTP as a fallback.
- Return a placeholder, `file://` address, or failed URL as a cloud result.

## Accepted Output

The input can be:

```text
dist/
  index.html
  styles.css
  app.js
  assets/
```

Built React, Vue, Svelte, Canvas, WebGL, or WASM output is accepted when it runs from a static HTTP host. Browser state such as `localStorage` and `IndexedDB` is allowed.

A required Node/Python application process, database, secret-bearing endpoint, writable server API, or shared server state is outside this skill. The server runs one shared static file service, but an individual Artifact never receives its own process or port.

## Publication Branding

Every public Artifact must include exactly one directly visible CatsCo Standard Footer. Copy the bundled `assets/catsco-mark.png` and `assets/catsco-standard-footer.css` into the isolated publication copy; do not redraw, recolor, crop, or replace the official mark. The fixed content is:

```text
brand: CatsCo
description: 你的专属虚拟员工，帮助你实现任何想法
prompt line 1: 喜欢这个作品？
prompt line 2: 用 CatsCo 试试你的想法。
CTA: 开始使用 ↗
URL: https://app.catsco.cc/
target: _blank
rel: noopener noreferrer
```

Do not invent, translate, abbreviate, or replace these values. Mark the entry with this contract:

```html
<link rel="stylesheet" href="assets/catsco-standard-footer.css">
<footer data-catsco-publication-branding="v2" data-catsco-publication-branding-variant="footer">
  <div data-catsco-publication-branding-inner>
    <div data-catsco-publication-brand-block>
      <img data-catsco-publication-brand-mark src="assets/catsco-mark.png" alt="CatsCo 官方商标" width="720" height="332">
      <div data-catsco-publication-brand-copy>
        <strong data-catsco-publication-brand-name>CatsCo</strong>
        <span data-catsco-publication-brand-description>你的专属虚拟员工，帮助你实现任何想法</span>
      </div>
    </div>
    <div data-catsco-publication-cta-block>
      <span data-catsco-publication-cta-prompt>喜欢这个作品？<br>用 CatsCo 试试你的想法。</span>
      <a data-catsco-publication-brand-cta href="https://app.catsco.cc/" target="_blank" rel="noopener noreferrer">开始使用 ↗</a>
    </div>
  </div>
</footer>
```

Only the CTA is a link. Keep the rest of the Footer non-clickable. Preserve the explicit `<br>` between the two prompt lines. The versioned `data-*` attributes, official asset, fixed text, URL, link security attributes, and bundled CSS may not change.

### Default: CatsCo Standard Footer

Always try `footer` first. Use the bundled deep-black document-flow Footer with the official green mark and fixed one-line product description on the left. Keep the centered two-line invitation and matching green CTA together on the right. The two sides must remain one horizontal row at 1280, 800, and 630 CSS pixels. Below 520 CSS pixels, use the bundled simple stacked fallback; keep each product-description line, invitation line, and CTA label unbroken and free of overflow. The CTA must remain content-width and single-line. The scoped bundled CSS must win over upstream generic `footer`, `a`, button, and media-query rules without changing upstream elements. The Footer must follow the main content and must not use fixed, sticky, or absolute positioning.

### Restricted alternatives

Only when desktop or mobile browser inspection shows that a normal footer materially shrinks, covers, or breaks a Canvas/WebGL game, viewport-locked `100vh`/`100dvh` stage, coordinate-sensitive interaction, or fullscreen experience may the implementation step down in this order:

```text
footer → slim-bar → brand-capsule
```

Allowed alternatives remain black or near-black and directly visible without opening anything:

- `slim-bar`: a compact edge bar that does not cover controls, HUD, prompts, or touch areas.
- `brand-capsule`: a persistent, readable corner entry used only when a full-width bar is still disruptive.

Set `data-catsco-publication-branding-variant` to `slim-bar` or `brand-capsule` and add one allowed reason in `data-catsco-publication-branding-footer-exception`:

```text
canvas-stage
webgl-stage
viewport-locked
fullscreen-stage
```

Do not use a menu item, About link, settings entry, hover-only control, auto-hidden control, or a start/pause/end-only entry. When the page uses the Fullscreen API, place an alternative entry inside the element that enters fullscreen so it remains visible.

The Agent must inspect the prepared page at desktop and mobile sizes. For games or fullscreen pages with an obvious start/fullscreen action, also inspect one representative active state. The automated gate checks the contract and basic layout; the Agent remains responsible for judging whether the selected exception actually avoids buttons, HUD, gestures, and core content.

## Default Publish

Before running the publisher:

1. Create `<work-dir>/publication-input/` as an isolated copy of the already-built directory. Exclude `.git`, `node_modules`, credentials, QA output, and publish results.
2. Inspect `index.html`, the relevant CSS, and only the entry JavaScript needed to understand mounting, fixed viewport, Canvas/WebGL, or fullscreen behavior.
3. Copy the bundled official mark and Standard Footer stylesheet into `publication-input/assets/`, then add the exact v2 Standard Footer structure. Do not modify the upstream directory.
4. Open the copy at 1280, 630, and 390 CSS pixels. Keep the Standard Footer unless it causes an observable fixed-stage conflict; if it does, use the smallest allowed alternative and record the allowed reason.
5. Publish the prepared copy. The publisher owns the final local, exact-version, and `latest` QA sequence; do not run the same final QA separately before invoking it.

Use `qa-html-page.mjs` directly only while diagnosing or fixing the prepared page. Cosmetic warnings do not require a page edit and must never cause the Agent to modify a publisher or QA script.

```bash
node <skill_dir>/scripts/publish-html-directory.mjs <work-dir>/publication-input \
  --id <stable-id> \
  --title <title> \
  --expect-text <stable-visible-text> \
  --out <work-dir>/publish-result.json
```

Use `--expect-text` or `--expect-selector` for one stable acceptance marker. Use a stable lowercase ID such as `fraction-practice-game`; reuse it to publish the next version.

Do not pass a profile on a managed virtual employee. Before changing Artifact files, the publisher calls the bundled HTTPS runtime. It:

- Reads `CATSCO_BOT_UID` or `CATSCOMPANY_BOT_UID`.
- Derives `agent-<numeric-uid>.artifacts.catsco.fun`.
- Discovers the current server's public IPv4 address.
- Binds the UID and hostname in a persistent host identity file.
- Uses the current Bot API key to obtain host-level DNS configuration from CatsCo when no local DNS credentials exist.
- Creates or updates that hostname's A record through the configured DNS API.
- Installs or reuses a DNS-01 certificate, Nginx `19991`, and a systemd-owned Node static service on `19990`.
- Stores files below `$HOME/.local/share/catsco/cloud-html-artifact`.
- Reuses valid DNS, certificate, service, and Nginx state on later publishes.

The virtual employee runtime, not the end user, must provide:

```text
CATSCO_BOT_UID
CATSCO_API_KEY
root or passwordless sudo
public TCP 19990 and 19991
```

When `VOLC_ACCESSKEY` and `VOLC_SECRETKEY` are already present in the process or root-only runtime file, they remain valid explicit configuration. Otherwise, the HTTPS runtime calls CatsCo's Bot-authenticated Artifact runtime-config endpoint. It verifies that the returned Agent UID matches the local UID, then persists only the DNS settings needed by unattended Certbot renewal in root-only `/etc/catsco/cloud-html-artifact.env`.

The runtime-config endpoint never receives HTML, assets, Artifact metadata, or local paths. Never print, publish, or copy its secret values into results. If CatsCo is temporarily unavailable after a successful setup, reuse the complete cached credential pair. Never combine one explicit credential with one remotely returned credential.

The public URL shape is:

```text
https://agent-<uid>.artifacts.catsco.fun:19991/artifacts/<artifact-id>/vN/
https://agent-<uid>.artifacts.catsco.fun:19991/artifacts/<artifact-id>/latest/
```

Production publishing verifies the exact version and `latest` HTTPS URLs returned to the user. If either is unreachable or untrusted, the result remains `published: false`. Test mode may use the equivalent loopback URL.

Browser QA uses Playwright when available. If the runtime has no resolvable Playwright package, `qa-html-page.mjs` uses installed Chrome, Chromium, or Edge through the Chrome DevTools Protocol. QA is stage-aware:

- `local` checks desktop, sidebar, and mobile layouts at 1280, 630, and 390 CSS pixels.
- `version` runs one remote sidebar smoke check against the immutable URL.
- `latest` runs one remote sidebar smoke check and retries once after a short delay when a blocking check fails.

Only usability and delivery failures block publishing: an unreachable page, missing body or acceptance marker, severe overflow, uncaught page errors, failed same-origin resources, or a missing, hidden, unsafe, or unusable CatsCo entry. Exact brand copy, image dimensions, colors, line breaks, alignment, minor overflow, optional external resources, and ordinary console errors remain in the QA report as warnings. Warnings do not roll back a publish and do not justify changing page or publisher code. These mechanical checks do not replace the Agent's visual and representative interaction check.

Never switch to central upload or HTTP when direct HTTPS hosting fails. Report the structured error from the runtime.

## Host Commands

For diagnostics or host repair, run:

```bash
node <skill_dir>/scripts/direct-https-runtime.mjs inspect
node <skill_dir>/scripts/direct-https-runtime.mjs ensure
node <skill_dir>/scripts/direct-https-runtime.mjs verify
```

`inspect` is read-only. `ensure` fills missing or expired host state and is idempotent. It probes Certbot by actually running `--version`; if the host's Python packages have broken the distro command, it repairs the distro packages first and then falls back to an isolated Snap Certbot when needed. It also rewrites legacy HTTP/IP entries in the server-local Artifact registry to this Agent's canonical HTTPS `latest` URLs without moving version directories. `verify` checks identity, DNS, certificate, Nginx, systemd, renewal hooks, local health, and public HTTPS health.

Do not use `--staging` for a user-facing publish. It exists only for ACME integration testing and does not produce a browser-trusted result.

## Version Semantics

Each publish creates a new immutable `vN` directory. Existing version URLs remain intact. `latest` changes only after the new version passes its blocking remote smoke check and metadata registration.

Every full Artifact ID is independent. Do not infer a delete, replace, or ownership relationship from a shared title, ID prefix, or neighboring version number.

## Success Gate

Read `publish-result.json`; do not infer success from terminal prose.

Return a URL only when:

```text
ok == true
published == true
profile.provider == "direct-https"
qa.local.ok == true
qa.version.ok == true
qa.latest.ok == true
publication_branding.contract_version == "catsco.publication-branding.v2"
publication_branding.variant is footer, slim-bar, or brand-capsule
publication_branding.verified.local == true
publication_branding.verified.version == true
publication_branding.verified.latest == true
latest_url starts with "https://"
```

If a gate fails, report its concrete error. A failed attempt must leave the previous `latest`, version directories, registry, and index unchanged.

Hard failures include:

- Agent UID is unavailable, or neither complete cached DNS credentials nor valid Bot runtime authentication can supply them.
- The Bot-authenticated runtime configuration belongs to a different Agent UID or returns an unsupported contract.
- Host identity belongs to a different UID or hostname.
- Public IPv4 discovery or A-record propagation fails.
- Root/passwordless sudo is unavailable.
- Required directories cannot be created.
- Port `19990` or `19991` is occupied by another service.
- Certificate issuance, Nginx validation, systemd, or renewal-hook setup fails.
- The prepared page is missing the publication branding contract, points its CTA to the wrong URL, hides the CatsCo entry, or makes the CTA unusable.
- Local or remote blocking QA fails after the publisher's one bounded `latest` retry.
- The public HTTPS version or `latest` URL cannot be reached.
- Version, `latest`, registry, or index transaction fails.

Do not retry publishing manually after the same structured blocking failure, and do not patch the page, publisher, or QA implementation merely to clear warnings.

Do not turn these failures into a request for a profile or central host configuration.

## Public Index

The server-local public root contains one `artifacts-index.json`. Its items contain only public metadata:

```json
{
  "id": "fraction-practice-game",
  "title": "Fraction Practice",
  "kind": "html",
  "url": "<latest_url>",
  "updated_at": "2026-07-29T10:00:00.000Z"
}
```

Do not add local paths, credentials, logs, or internal Agent state to the public index.

## Final Reply

Keep the handoff short:

```text
已发布：<title>
打开：<latest_url>
版本：vN
```

Mention a warning only when it affects use. Do not describe roots, QA files, runtime probes, or host internals unless the user asks for debugging details.

## Regression Checks

After changing publication branding or browser QA:

```bash
node <skill_dir>/scripts/smoke-publication-branding-qa.mjs
```

After changing HTTPS hosting:

```bash
node <skill_dir>/scripts/smoke-direct-https-runtime.mjs
node <skill_dir>/scripts/smoke-direct-https-publish.mjs \
  --out-dir <temporary-https-publish-work-dir> \
  --node-modules <node-modules>
```

After changing static serving or explicit HTTP migration compatibility:

```bash
node <skill_dir>/scripts/smoke-direct-ip-publish.mjs \
  --out-dir <temporary-direct-host-work-dir> \
  --node-modules <node-modules>
```

After changing the common publisher or management:

```bash
node <skill_dir>/scripts/smoke-publish-html-directory.mjs --out-dir <temporary-work-dir>
node <skill_dir>/scripts/smoke-agent-namespaced-publish.mjs --out-dir <temporary-agent-work-dir>
node <skill_dir>/scripts/smoke-artifact-management.mjs --out-dir <temporary-management-work-dir>
node <skill_dir>/scripts/smoke-agent-namespaced-management.mjs --out-dir <temporary-agent-management-work-dir>
```

Keep smoke output outside the skill directory. Do not include logs, generated sites, screenshots, credentials, or intermediate artifacts in the SkillHub package.
