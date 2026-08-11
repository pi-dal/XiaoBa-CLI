#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const args = parseArgs(process.argv.slice(2));

if (args.serve) serveDirectory(path.resolve(String(args.serve)), Number(args.port || 0));
else await runSmoke();

async function runSmoke() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catsco-publication-branding-smoke-"));
  const results = [];
  try {
    const cases = [
      { name: "footer", expectOk: true, html: page(`<main><h1>普通内容页</h1><p>页面正文</p></main>${branding("footer")}`, `main { min-height: 110vh; padding: 40px; }`) },
      { name: "css-isolation", expectOk: true, html: page(`<main>污染样式</main>${branding("footer")}`, hostileCss()) },
      { name: "slim-bar", expectOk: true, html: page(`<canvas width="800" height="600"></canvas>${branding("slim-bar", "canvas-stage")}`, fixedStageCss("slim-bar")) },
      { name: "brand-capsule", expectOk: true, html: page(`<canvas width="800" height="600"></canvas>${branding("brand-capsule", "viewport-locked")}`, fixedStageCss("brand-capsule")) },
      { name: "missing", expectOk: false, failed: "desktop_branding_present_once", html: page("<main>无入口</main>") },
      { name: "duplicate", expectOk: false, failed: "desktop_branding_present_once", html: page(`${branding("footer")}${branding("footer")}`) },
      { name: "hidden", expectOk: false, failed: "desktop_branding_visible", html: page(branding("footer"), "[data-catsco-publication-branding] { display: none !important; }") },
      { name: "menu", expectOk: false, failed: "desktop_branding_directly_exposed", html: page(`<nav>${branding("footer")}</nav>`) },
      { name: "bad-link-security", expectOk: false, failed: "desktop_branding_link_security_valid", html: page(branding("footer").replace('rel="noopener noreferrer"', 'rel="nofollow"')) },
      { name: "wrong-description", expectOk: true, warning: "desktop_branding_description_valid", html: page(branding("footer").replace("你的专属虚拟员工，帮助你实现任何想法", "由 CatsCo Agent 创建")) },
      { name: "missing-prompt-break", expectOk: true, warning: "desktop_branding_cta_prompt_valid", html: page(branding("footer").replace("？<br>", "？")) },
      { name: "gold-cta", expectOk: true, warning: "desktop_branding_cta_brand_color_valid", html: page(branding("footer"), "", '[data-catsco-publication-branding="v2"] [data-catsco-publication-brand-cta] { background: #d4a853 !important; }') },
      { name: "false-canvas-exception", expectOk: true, warning: "desktop_branding_exception_valid", html: page(`<main>普通文章</main>${branding("brand-capsule", "canvas-stage")}`, fixedStageCss("brand-capsule", false)) }
    ];

    for (const testCase of cases) {
      const directory = path.join(root, testCase.name);
      prepareFixture(directory, testCase.html);
      const reportPath = path.join(root, `${testCase.name}.json`);
      const completed = spawnSync(process.execPath, qaArgs(directory, reportPath), { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000 });
      const report = fs.existsSync(reportPath) ? readJson(reportPath) : null;
      const failedChecks = (report?.checks || []).filter(check => !check.pass && check.level !== "warning").map(check => check.name);
      const warningChecks = (report?.checks || []).filter(check => !check.pass && check.level === "warning").map(check => check.name);
      const passed = testCase.expectOk
        ? completed.status === 0 && report?.ok === true
          && ["desktop", "sidebar", "mobile"].every(name => report?.views?.[name])
          && (!testCase.warning || warningChecks.includes(testCase.warning))
        : completed.status !== 0 && report?.ok === false && (!testCase.failed || failedChecks.includes(testCase.failed));
      results.push({ name: testCase.name, passed, status: completed.status, failed_checks: failedChecks, warning_checks: warningChecks, error: clean(completed.stderr) || (report?.errors || []).join("; ") });
    }

    results.push(await runPublisherGateSmoke(root));
    results.push(runPublisherRejectsUnbrandedSmoke(root));
    const ok = results.every(result => result.passed);
    console.log(JSON.stringify({ ok, contract_version: "catsco.publication-branding.smoke.v2", results }, null, 2));
    if (!ok) process.exitCode = 1;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function qaArgs(directory, reportPath) {
  return [path.join(scriptDir, "qa-html-page.mjs"), directory, "--publication-branding-mode", "required", "--out", reportPath,
    ...(args["node-modules"] ? ["--node-modules", String(args["node-modules"])] : []),
    ...(args["browser-channel"] ? ["--browser-channel", String(args["browser-channel"])] : [])];
}

function prepareFixture(directory, html) {
  fs.mkdirSync(path.join(directory, "assets"), { recursive: true });
  fs.copyFileSync(path.join(skillDir, "assets", "catsco-mark.png"), path.join(directory, "assets", "catsco-mark.png"));
  fs.writeFileSync(path.join(directory, "assets", "catsco-standard-footer.css"), fs.readFileSync(path.join(skillDir, "assets", "catsco-standard-footer.css")));
  fs.writeFileSync(path.join(directory, "index.html"), html, "utf8");
}

function runPublisherRejectsUnbrandedSmoke(root) {
  const source = path.join(root, "unbranded-source");
  const staticRoot = path.join(root, "unbranded-static");
  const outPath = path.join(root, "unbranded-result.json");
  prepareFixture(source, page("<main>没有宣传入口</main>"));
  fs.mkdirSync(staticRoot, { recursive: true });
  const completed = runPublisher(source, staticRoot, "unbranded-smoke", "http://127.0.0.1:9", outPath);
  const result = fs.existsSync(outPath) ? readJson(outPath) : null;
  return {
    name: "publisher-rejects-unbranded-before-version",
    passed: completed.status !== 0 && result?.ok === false && result?.published === false
      && result?.qa?.local?.failed_checks?.includes("desktop_branding_present_once")
      && !fs.existsSync(path.join(staticRoot, "unbranded-smoke")),
    status: completed.status,
    failed_checks: result?.qa?.local?.failed_checks || [],
    error: clean(completed.stderr) || (result?.errors || []).join("; ")
  };
}

async function runPublisherGateSmoke(root) {
  const source = path.join(root, "publisher-source");
  const staticRoot = path.join(root, "publisher-static");
  prepareFixture(source, page(`<main>发布门禁</main>${branding("footer")}`));
  fs.mkdirSync(staticRoot, { recursive: true });
  const port = await reservePort();
  const server = spawn(process.execPath, [fileURLToPath(import.meta.url), "--serve", staticRoot, "--port", String(port), "--transient-latest-mark"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    await waitForUrl(`http://127.0.0.1:${port}/__smoke_health`, 10_000);
    const outPath = path.join(root, "publisher-result.json");
    const completed = runPublisher(source, staticRoot, "branding-smoke", `http://127.0.0.1:${port}`, outPath);
    const result = fs.existsSync(outPath) ? readJson(outPath) : null;
    const verified = result?.publication_branding?.verified || {};
    return {
      name: "publisher-local-version-latest-gate",
      passed: completed.status === 0 && result?.ok === true
        && result?.publication_branding?.contract_version === "catsco.publication-branding.v2"
        && verified.local === true && verified.version === true && verified.latest === true
        && result?.qa?.latest?.attempts === 2,
      status: completed.status,
      failed_checks: [],
      error: clean(completed.stderr) || (result?.errors || []).join("; ")
    };
  } finally { server.kill(); }
}

function runPublisher(source, staticRoot, id, publicBaseUrl, outPath) {
  return spawnSync(process.execPath, [path.join(scriptDir, "publish-html-directory.mjs"), source, "--id", id, "--title", "Branding Smoke", "--provider", "static-dir", "--static-root", staticRoot, "--public-base-url", publicBaseUrl, "--out", outPath,
    ...(args["node-modules"] ? ["--node-modules", String(args["node-modules"])] : []),
    ...(args["browser-channel"] ? ["--browser-channel", String(args["browser-channel"])] : [])], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300_000,
    env: { ...process.env, NODE_ENV: "test", CLOUD_HTML_ARTIFACT_ALLOW_NON_PUBLIC_TEST_URL: "1" }
  });
}

function branding(variant, exception = "") {
  const tag = variant === "footer" ? "footer" : "aside";
  const reason = exception ? ` data-catsco-publication-branding-footer-exception="${exception}"` : "";
  return `<${tag} data-catsco-publication-branding="v2" data-catsco-publication-branding-variant="${variant}"${reason}>
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
  </${tag}>`;
}

function page(content, extraCss = "", trailingCss = "") {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smoke</title><style>* { box-sizing: border-box; } html, body { margin: 0; min-height: 100%; } ${extraCss}</style><link rel="stylesheet" href="assets/catsco-standard-footer.css">${trailingCss ? `<style>${trailingCss}</style>` : ""}</head><body>${content}</body></html>`;
}

function hostileCss() {
  return `footer { display:flex; flex-direction:column; } footer a, a { display:block; width:100%; } @media(max-width:900px){ footer, footer div { flex-direction:column; } footer a { width:100%; } }`;
}

function fixedStageCss(variant, withLock = true) {
  return `${withLock ? "html, body { width: 100%; height: 100%; overflow: hidden; }" : ""} canvas { display:block; width:100vw; height:100vh; background:#123; }
    [data-catsco-publication-branding-variant="slim-bar"] { position:fixed!important; left:0; bottom:0; width:100%; padding:8px 16px!important; z-index:10; }
    [data-catsco-publication-branding-variant="brand-capsule"] { position:fixed!important; right:16px; bottom:16px; width:auto!important; padding:8px 16px!important; border-radius:999px!important; z-index:10; }`;
}

function serveDirectory(root, port) {
  let failedLatestMarkOnce = false;
  const server = http.createServer((request, response) => {
    if (request.url === "/__smoke_health") return void response.writeHead(200, { "content-type": "text/plain" }).end("ok");
    let relative = decodeURIComponent(String(request.url || "/").split("?")[0]).replace(/^\/+/, "");
    if (args["transient-latest-mark"] && !failedLatestMarkOnce && /\/latest\/assets\/catsco-mark\.png$/i.test(`/${relative}`)) {
      failedLatestMarkOnce = true;
      return void response.writeHead(503, { "content-type": "text/plain" }).end("retry");
    }
    if (!relative || relative.endsWith("/")) relative += "index.html";
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(root + path.sep)) return void response.writeHead(403).end();
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return void response.writeHead(404).end();
    const mime = target.endsWith(".html") ? "text/html; charset=utf-8" : target.endsWith(".css") ? "text/css; charset=utf-8" : target.endsWith(".png") ? "image/png" : "application/octet-stream";
    response.writeHead(200, { "content-type": mime });
    fs.createReadStream(target).pipe(response);
  });
  server.listen(port, "127.0.0.1", () => console.log(JSON.stringify({ port })));
}

async function reservePort() { return new Promise((resolve, reject) => { const server = http.createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(error => error ? reject(error) : resolve(port)); }); }); }
async function waitForUrl(url, timeoutMs) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error(`timed out waiting for ${url}`); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function parseArgs(argv) { const parsed = { _: [] }; for (let index = 0; index < argv.length; index += 1) { const arg = argv[index]; if (!arg.startsWith("--")) parsed._.push(arg); else { const key = arg.slice(2); const next = argv[index + 1]; if (!next || next.startsWith("--")) parsed[key] = true; else { parsed[key] = next; index += 1; } } } return parsed; }
function clean(value) { return String(value || "").trim(); }
