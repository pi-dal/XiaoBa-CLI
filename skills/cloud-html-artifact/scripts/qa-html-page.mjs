#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { publicationBrandingBrowserContract } from "./publication-branding-contract.mjs";

const args = parseArgs(process.argv.slice(2));
const input = String(args._[0] || "").trim();
const sourceDir = input && fs.existsSync(input) && fs.statSync(input).isDirectory()
  ? path.resolve(input)
  : "";
const requestedUrl = String(args.url || (!sourceDir ? input : "")).trim();
const outPath = path.resolve(args.out || path.join(sourceDir || process.cwd(), "html-page-qa.json"));
const screenshotPath = args.screenshot ? path.resolve(args.screenshot) : "";
const timeoutMs = Number(args["timeout-ms"] || 15_000);
const publicationBrandingMode = normalizePublicationBrandingMode(args["publication-branding-mode"] || "observe");
const qaStage = normalizeQaStage(args["qa-stage"] || "local");
const publicationBrandingContract = publicationBrandingBrowserContract();

main();

async function main() {
  const report = {
    ok: false,
    contract_version: "cloud-html-page.qa.v1",
    qa_stage: qaStage,
    source_dir: sourceDir,
    url: "",
    checks: [],
    views: {},
    publication_branding: {
      required: publicationBrandingMode === "required",
      mode: publicationBrandingMode,
      contract_version: publicationBrandingContract.contract_version,
      variant: "",
      footer_exception_reason: "",
      consistent_across_views: false
    },
    warnings: [],
    errors: [],
    browser: { dependency: "playwright", channel: "", resolved_from: "" },
    screenshot: { path: screenshotPath, written: false },
    started_at: new Date().toISOString(),
    finished_at: ""
  };
  let server;
  let browser;
  try {
    if (sourceDir) {
      assertFile(path.join(sourceDir, "index.html"), "index.html");
      server = await startStaticServer(sourceDir);
      report.url = `http://127.0.0.1:${server.address().port}/`;
    } else {
      if (!/^https?:\/\/\S+$/i.test(requestedUrl)) throw new Error("a source directory or HTTP(S) --url is required");
      report.url = requestedUrl;
    }

    if (!flagEnabled(args["force-cdp"])) {
      try {
        const playwright = await loadPlaywright(report);
        browser = await launchBrowser(playwright, report);
      } catch (error) {
        report.warnings.push(`playwright_unavailable_using_chrome_cdp:${messageOf(error)}`);
      }
    }
    if (!browser) browser = await launchChromeCdp(report);
    const viewports = viewportsForStage(qaStage);
    for (const [index, viewport] of viewports.entries()) {
      report.views[viewport.name] = await inspectView(browser, report.url, viewport, report, index === 0);
    }
    finalizePublicationBranding(report);
    report.ok = report.errors.length === 0 && report.checks.every(check => check.pass || check.level === "warning");
  } catch (error) {
    report.errors.push(messageOf(error));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise(resolve => server.close(resolve));
    report.errors = unique(report.errors);
    report.warnings = unique(report.warnings);
    report.finished_at = new Date().toISOString();
    writeJson(outPath, report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }
}

async function inspectView(browser, url, viewport, report, captureScreenshot) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const recordFailedRequest = (requestUrl, detail) => {
    failedRequests.push({
      detail,
      same_origin: sameOrigin(requestUrl, url)
    });
  };
  page.on("console", message => {
    if (message.type() !== "error") return;
    const locationUrl = String(message.location()?.url || "");
    if (isFaviconUrl(locationUrl)) return;
    consoleErrors.push(locationUrl ? `${message.text()} (${locationUrl})` : message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => {
    const requestUrl = request.url();
    recordFailedRequest(requestUrl, `${request.method()} ${requestUrl}: ${request.failure()?.errorText || "failed"}`);
  });
  page.on("response", response => {
    if (response.status() >= 400 && !isFaviconUrl(response.url())) {
      recordFailedRequest(response.url(), `${response.status()} ${response.url()}`);
    }
  });
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(300);
    await waitForBrandingMark(page, publicationBrandingContract.selectors.mark);
    const observed = await page.evaluate(contract => {
      const body = document.body;
      const text = String(body?.innerText || "").replace(/\s+/g, " ").trim();
      const visibleMedia = [...document.querySelectorAll("img,video,canvas,svg")].filter(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1;
      }).length;
      const roots = [...document.querySelectorAll(contract.selectors.root)];
      const root = roots[0] || null;
      const inners = root ? [...root.querySelectorAll(contract.selectors.inner)] : [];
      const brandBlocks = root ? [...root.querySelectorAll(contract.selectors.brandBlock)] : [];
      const marks = root ? [...root.querySelectorAll(contract.selectors.mark)] : [];
      const brandCopies = root ? [...root.querySelectorAll(contract.selectors.brandCopy)] : [];
      const brandNames = root ? [...root.querySelectorAll(contract.selectors.brandName)] : [];
      const brandDescriptions = root ? [...root.querySelectorAll(contract.selectors.brandDescription)] : [];
      const ctaBlocks = root ? [...root.querySelectorAll(contract.selectors.ctaBlock)] : [];
      const ctaPrompts = root ? [...root.querySelectorAll(contract.selectors.ctaPrompt)] : [];
      const ctas = root ? [...root.querySelectorAll(contract.selectors.cta)] : [];
      const inner = inners[0] || null;
      const brandBlock = brandBlocks[0] || null;
      const mark = marks[0] || null;
      const brandCopy = brandCopies[0] || null;
      const brandDescription = brandDescriptions[0] || null;
      const ctaBlock = ctaBlocks[0] || null;
      const ctaPrompt = ctaPrompts[0] || null;
      const cta = ctas[0] || null;
      const clean = value => String(value || "").replace(/\s+/g, " ").trim();
      const promptLines = [];
      if (ctaPrompt) {
        let currentLine = "";
        for (const node of ctaPrompt.childNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "br") {
            promptLines.push(clean(currentLine));
            currentLine = "";
          } else {
            currentLine += node.textContent || "";
          }
        }
        promptLines.push(clean(currentLine));
      }
      const hiddenByTree = element => {
        for (let current = element; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (current.hidden || current.inert || current.getAttribute("aria-hidden") === "true") return true;
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.05) return true;
        }
        return false;
      };
      const parseColor = value => {
        const match = String(value || "").match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)(?:[, /]+(\d+(?:\.\d+)?))?\)/i);
        return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) } : null;
      };
      const initialRect = root?.getBoundingClientRect() || null;
      const rootStyle = root ? getComputedStyle(root) : null;
      const rootColor = parseColor(rootStyle?.backgroundColor);
      const compositedRootColor = rootColor
        ? {
            r: Math.round(rootColor.r * rootColor.a + 255 * (1 - rootColor.a)),
            g: Math.round(rootColor.g * rootColor.a + 255 * (1 - rootColor.a)),
            b: Math.round(rootColor.b * rootColor.a + 255 * (1 - rootColor.a))
          }
        : null;
      const variant = clean(root?.getAttribute("data-catsco-publication-branding-variant"));
      const exceptionReason = clean(root?.getAttribute("data-catsco-publication-branding-footer-exception"));
      const forbiddenAncestor = root?.closest([
        "nav", "menu", "dialog", "details:not([open])", "[role=menu]", "[role=dialog]",
        "[popover]", "[class*=about i]", "[id*=about i]", "[class*=setting i]", "[id*=setting i]"
      ].join(",")) || null;
      const visibleCanvases = [...document.querySelectorAll("canvas")].filter(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden"
          && rect.width * rect.height >= window.innerWidth * window.innerHeight * 0.25;
      });
      const visibleCanvas = visibleCanvases[0] || null;
      const visibleWebglStage = visibleCanvases.some(element => {
        try {
          return Boolean(element.getContext("webgl2") || element.getContext("webgl") || element.getContext("experimental-webgl"));
        } catch {
          return false;
        }
      });
      const fullscreenTarget = document.fullscreenElement
        || document.querySelector("[data-catsco-fullscreen-target], [data-fullscreen-target]");
      const documentStyle = getComputedStyle(document.documentElement);
      const bodyStyle = body ? getComputedStyle(body) : null;
      const viewportLocked = [documentStyle.overflow, documentStyle.overflowY, bodyStyle?.overflow, bodyStyle?.overflowY]
        .some(value => value === "hidden" || value === "clip");
      const initiallyInViewport = Boolean(initialRect
        && initialRect.width > 1 && initialRect.height > 1
        && initialRect.right > 0 && initialRect.bottom > 0
        && initialRect.left < window.innerWidth && initialRect.top < window.innerHeight);
      if (cta) cta.scrollIntoView({ block: "center", inline: "center" });
      const ctaRect = cta?.getBoundingClientRect() || null;
      const hit = ctaRect
        ? document.elementFromPoint(
            Math.min(window.innerWidth - 1, Math.max(0, ctaRect.left + ctaRect.width / 2)),
            Math.min(window.innerHeight - 1, Math.max(0, ctaRect.top + ctaRect.height / 2))
          )
        : null;
      const ctaStyle = cta ? getComputedStyle(cta) : null;
      const rootRect = root?.getBoundingClientRect() || null;
      const innerRect = inner?.getBoundingClientRect() || null;
      const brandBlockRect = brandBlock?.getBoundingClientRect() || null;
      const brandDescriptionRect = brandDescription?.getBoundingClientRect() || null;
      const brandDescriptionStyle = brandDescription ? getComputedStyle(brandDescription) : null;
      const ctaBlockRect = ctaBlock?.getBoundingClientRect() || null;
      const ctaBlockStyle = ctaBlock ? getComputedStyle(ctaBlock) : null;
      const ctaPromptRect = ctaPrompt?.getBoundingClientRect() || null;
      const ctaPromptStyle = ctaPrompt ? getComputedStyle(ctaPrompt) : null;
      const ctaLayoutRect = cta?.getBoundingClientRect() || null;
      const relTokens = clean(cta?.getAttribute("rel")).toLowerCase().split(/\s+/).filter(Boolean);
      const markStyle = mark ? getComputedStyle(mark) : null;
      const markRect = mark?.getBoundingClientRect() || null;
      const markLoaded = Boolean(mark && (mark.complete === undefined || mark.complete) && (mark.naturalWidth === undefined || mark.naturalWidth > 0));
      const branding = {
        root_count: roots.length,
        marker_version: clean(root?.getAttribute("data-catsco-publication-branding")),
        variant,
        footer_exception_reason: exceptionReason,
        root_tag: clean(root?.tagName).toLowerCase(),
        inner_count: inners.length,
        brand_block_count: brandBlocks.length,
        mark_count: marks.length,
        mark_src: clean(mark?.getAttribute("src")),
        mark_alt: clean(mark?.getAttribute("alt")),
        mark_loaded: markLoaded,
        mark_natural_width: Number(mark?.naturalWidth || 0),
        mark_natural_height: Number(mark?.naturalHeight || 0),
        mark_width: Number(markRect?.width || 0),
        mark_height: Number(markRect?.height || 0),
        mark_display: clean(markStyle?.display),
        brand_copy_count: brandCopies.length,
        brand_name_count: brandNames.length,
        brand_name: clean(brandNames[0]?.textContent),
        brand_description_count: brandDescriptions.length,
        brand_description_text: clean(brandDescription?.textContent),
        cta_block_count: ctaBlocks.length,
        cta_prompt_count: ctaPrompts.length,
        cta_prompt_text: clean(ctaPrompt?.textContent),
        cta_prompt_lines: promptLines,
        cta_prompt_break_count: ctaPrompt ? ctaPrompt.querySelectorAll("br").length : 0,
        cta_prompt_in_block: Boolean(ctaPrompt && ctaBlock?.contains(ctaPrompt)),
        cta_in_block: Boolean(cta && ctaBlock?.contains(cta)),
        cta_count: ctas.length,
        cta_text: clean(cta?.textContent),
        cta_url: clean(cta?.href),
        cta_target: clean(cta?.getAttribute("target")),
        cta_rel_tokens: relTokens,
        hidden_by_tree: root ? hiddenByTree(root) : true,
        brand_name_hidden: brandNames[0] ? hiddenByTree(brandNames[0]) : true,
        brand_description_hidden: brandDescription ? hiddenByTree(brandDescription) : true,
        cta_prompt_hidden: ctaPrompt ? hiddenByTree(ctaPrompt) : true,
        cta_hidden: cta ? hiddenByTree(cta) : true,
        forbidden_ancestor: forbiddenAncestor ? clean(forbiddenAncestor.tagName).toLowerCase() : "",
        background_color: clean(rootStyle?.backgroundColor),
        cta_background_color: clean(ctaStyle?.backgroundColor),
        near_black_background: Boolean(compositedRootColor && Math.max(compositedRootColor.r, compositedRootColor.g, compositedRootColor.b) <= 48),
        root_position: clean(rootStyle?.position),
        root_display: clean(rootStyle?.display),
        inner_display: clean(inner ? getComputedStyle(inner).display : ""),
        inner_grid_template: clean(inner ? getComputedStyle(inner).gridTemplateColumns : ""),
        brand_block_display: clean(brandBlock ? getComputedStyle(brandBlock).display : ""),
        cta_block_display: clean(ctaBlockStyle?.display),
        cta_prompt_text_align: clean(ctaPromptStyle?.textAlign),
        cta_prompt_white_space: clean(ctaPromptStyle?.whiteSpace),
        brand_description_white_space: clean(brandDescriptionStyle?.whiteSpace),
        footer_after_main_content: Boolean(root && [...body.children].every(element => element === root || Boolean(root.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING))),
        viewport_width: window.innerWidth,
        root_width: Number(initialRect?.width || 0),
        inner_width: Number(innerRect?.width || 0),
        inner_left: Number(innerRect?.left || 0),
        inner_right: Number(innerRect?.right || 0),
        brand_block_left: Number(brandBlockRect?.left || 0),
        brand_block_right: Number(brandBlockRect?.right || 0),
        cta_left: Number(ctaLayoutRect?.left || 0),
        cta_right: Number(ctaLayoutRect?.right || 0),
        brand_block_top: Number(brandBlockRect?.top || 0),
        brand_block_bottom: Number(brandBlockRect?.bottom || 0),
        cta_block_left: Number(ctaBlockRect?.left || 0),
        cta_block_right: Number(ctaBlockRect?.right || 0),
        cta_block_top: Number(ctaBlockRect?.top || 0),
        cta_block_bottom: Number(ctaBlockRect?.bottom || 0),
        cta_block_width: Number(ctaBlockRect?.width || 0),
        brand_description_width: Number(brandDescriptionRect?.width || 0),
        brand_description_scroll_width: Number(brandDescription?.scrollWidth || 0),
        brand_description_client_width: Number(brandDescription?.clientWidth || 0),
        brand_description_text_overflow: Boolean(brandDescription && brandDescription.scrollWidth > brandDescription.clientWidth + 2),
        cta_prompt_width: Number(ctaPromptRect?.width || 0),
        cta_prompt_scroll_width: Number(ctaPrompt?.scrollWidth || 0),
        cta_prompt_client_width: Number(ctaPrompt?.clientWidth || 0),
        cta_prompt_text_overflow: Boolean(ctaPrompt && ctaPrompt.scrollWidth > ctaPrompt.clientWidth + 2),
        cta_top: Number(ctaLayoutRect?.top || 0),
        cta_bottom: Number(ctaLayoutRect?.bottom || 0),
        cta_scroll_width: Number(cta?.scrollWidth || 0),
        cta_client_width: Number(cta?.clientWidth || 0),
        cta_text_overflow: Boolean(cta && cta.scrollWidth > cta.clientWidth + 2),
        root_height: Number(initialRect?.height || 0),
        initially_in_viewport: initiallyInViewport,
        cta_width: Number(ctaRect?.width || 0),
        cta_height: Number(ctaRect?.height || 0),
        cta_pointer_events: clean(ctaStyle?.pointerEvents),
        cta_hit_test: Boolean(cta && hit && (hit === cta || cta.contains(hit) || hit.contains(cta))),
        cta_focusable: Boolean(cta && !cta.hasAttribute("disabled") && cta.tabIndex >= 0),
        visible_canvas_stage: Boolean(visibleCanvas),
        visible_webgl_stage: visibleWebglStage,
        viewport_locked: viewportLocked,
        fullscreen_target_present: Boolean(fullscreenTarget),
        branding_inside_fullscreen_target: Boolean(root && fullscreenTarget && fullscreenTarget.contains(root))
      };
      return {
        title: document.title,
        text_length: text.length,
        body_children: body?.children.length || 0,
        visible_media: visibleMedia,
        viewport_width: window.innerWidth,
        scroll_width: Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0),
        publication_branding: branding
      };
    }, publicationBrandingContract);
    const label = viewport.name || (viewport.width < 500 ? "mobile" : "desktop");
    const sameOriginFailures = failedRequests.filter(failure => failure.same_origin).map(failure => failure.detail);
    const externalFailures = failedRequests.filter(failure => !failure.same_origin).map(failure => failure.detail);
    const overflowPixels = Math.max(0, observed.scroll_width - observed.viewport_width);
    const severeOverflowLimit = Math.max(64, Math.floor(observed.viewport_width * 0.25));
    record(report, `${label}_http_ok`, Boolean(response?.ok()), `${response?.status() || 0}`);
    record(report, `${label}_body_present`, observed.body_children > 0, `${observed.body_children} children`);
    record(report, `${label}_content_visible`, observed.text_length > 0 || observed.visible_media > 0, JSON.stringify({ text_length: observed.text_length, visible_media: observed.visible_media }));
    record(report, `${label}_no_severe_horizontal_overflow`, overflowPixels <= severeOverflowLimit, `${observed.scroll_width} / ${observed.viewport_width}`);
    record(report, `${label}_no_horizontal_overflow`, overflowPixels <= 2, `${observed.scroll_width} / ${observed.viewport_width}`, "warning");
    record(report, `${label}_no_page_errors`, pageErrors.length === 0, pageErrors.join("; "));
    record(report, `${label}_no_console_errors`, consoleErrors.length === 0, consoleErrors.join("; "), "warning");
    record(report, `${label}_core_resources_loaded`, sameOriginFailures.length === 0, sameOriginFailures.join("; "));
    record(report, `${label}_external_resources_loaded`, externalFailures.length === 0, externalFailures.join("; "), "warning");
    recordPublicationBrandingChecks(report, label, observed.publication_branding);
    if (args["expect-selector"]) {
      const count = await page.locator(String(args["expect-selector"])).count();
      record(report, `${label}_expected_selector_present`, count > 0, `${args["expect-selector"]}: ${count}`);
    }
    if (args["expect-text"]) {
      const bodyText = await page.locator("body").innerText();
      record(report, `${label}_expected_text_present`, bodyText.includes(String(args["expect-text"])), String(args["expect-text"]));
    }
    if (captureScreenshot && screenshotPath) {
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.screenshot.written = fs.existsSync(screenshotPath);
    }
    return {
      ...observed,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      failed_requests: failedRequests.map(failure => failure.detail)
    };
  } finally {
    await page.close();
  }
}

function recordPublicationBrandingChecks(report, label, branding) {
  const contract = publicationBrandingContract;
  const variant = String(branding?.variant || "");
  const exceptionReason = String(branding?.footer_exception_reason || "");
  const check = (name, pass, detail) => record(
    report,
    `${label}_branding_${name}`,
    pass,
    detail,
    brandingCheckLevel(name)
  );
  const isAlternative = variant === "slim-bar" || variant === "brand-capsule";
  const hasAlternativeEvidence = exceptionReason === "canvas-stage"
    ? branding?.visible_canvas_stage === true
    : exceptionReason === "webgl-stage"
      ? branding?.visible_webgl_stage === true
      : exceptionReason === "viewport-locked"
        ? branding?.viewport_locked === true
        : exceptionReason === "fullscreen-stage"
          ? branding?.fullscreen_target_present === true && branding?.branding_inside_fullscreen_target === true
          : false;
  const exactUrl = normalizeComparableUrl(branding?.cta_url) === normalizeComparableUrl(contract.official_url);
  const relTokens = new Set(Array.isArray(branding?.cta_rel_tokens) ? branding.cta_rel_tokens : []);

  check("present_once", branding?.root_count === 1, `count=${branding?.root_count || 0}`);
  check("marker_valid", branding?.marker_version === contract.marker_version, String(branding?.marker_version || ""));
  check("variant_valid", contract.variants.includes(variant), variant);
  check("inner_valid", branding?.inner_count === 1 && branding?.brand_block_count === 1, JSON.stringify({ inner: branding?.inner_count || 0, brand_block: branding?.brand_block_count || 0 }));
  check("mark_valid", branding?.mark_count === 1 && branding?.mark_src.endsWith(contract.official_mark.src) && branding?.mark_loaded && branding?.mark_natural_width === contract.official_mark.width && branding?.mark_natural_height === contract.official_mark.height && branding?.mark_alt === "CatsCo 官方商标", JSON.stringify({ count: branding?.mark_count || 0, src: branding?.mark_src || "", loaded: branding?.mark_loaded, width: branding?.mark_natural_width, height: branding?.mark_natural_height, alt: branding?.mark_alt || "" }));
  check("brand_name_valid", branding?.brand_name_count === 1 && branding?.brand_name === contract.brand_name, String(branding?.brand_name || ""));
  check("description_valid", branding?.brand_description_count === 1 && branding?.brand_description_text === contract.description_text, String(branding?.brand_description_text || ""));
  check("cta_block_valid", branding?.cta_block_count === 1 && branding?.cta_prompt_in_block === true && branding?.cta_in_block === true, JSON.stringify({ count: branding?.cta_block_count || 0, prompt_in_block: branding?.cta_prompt_in_block, cta_in_block: branding?.cta_in_block }));
  check("cta_prompt_valid", branding?.cta_prompt_count === 1 && branding?.cta_prompt_text === contract.cta_prompt_text && branding?.cta_prompt_break_count === 1 && JSON.stringify(branding?.cta_prompt_lines || []) === JSON.stringify(contract.cta_prompt_lines), JSON.stringify({ text: branding?.cta_prompt_text || "", breaks: branding?.cta_prompt_break_count || 0, lines: branding?.cta_prompt_lines || [] }));
  check("cta_valid", branding?.cta_count === 1 && branding?.cta_text === contract.cta_text, String(branding?.cta_text || ""));
  check("url_valid", exactUrl, String(branding?.cta_url || ""));
  check("link_security_valid", branding?.cta_target === contract.target && contract.rel_tokens.every(token => relTokens.has(token)), JSON.stringify({ target: branding?.cta_target || "", rel: [...relTokens] }));
  check("visible", branding?.hidden_by_tree === false && branding?.brand_name_hidden === false && branding?.brand_description_hidden === false && branding?.cta_prompt_hidden === false && branding?.cta_hidden === false && branding?.root_width > 1 && branding?.root_height > 1, JSON.stringify({ hidden: branding?.hidden_by_tree, description_hidden: branding?.brand_description_hidden, prompt_hidden: branding?.cta_prompt_hidden, cta_hidden: branding?.cta_hidden, width: branding?.root_width, height: branding?.root_height }));
  check("directly_exposed", !branding?.forbidden_ancestor, String(branding?.forbidden_ancestor || ""));
  check("black_surface", branding?.near_black_background === true, String(branding?.background_color || ""));
  const ctaColor = parseCssColor(branding?.cta_background_color);
  const accent = contract.official_mark.accentColorRgb;
  const colorMatches = Boolean(ctaColor && Math.abs(ctaColor.r - accent.r) <= 28 && Math.abs(ctaColor.g - accent.g) <= 28 && Math.abs(ctaColor.b - accent.b) <= 28);
  check("cta_brand_color_valid", variant === "footer" ? colorMatches : true, JSON.stringify({ background: branding?.cta_background_color || "", expected: contract.official_mark.accentColor }));
  const horizontalLayout = branding?.inner_display === "grid"
    && branding?.brand_block_right <= branding?.cta_block_left
    && branding?.brand_block_left >= (branding?.inner_left || 0) - 1
    && branding?.cta_block_right <= (branding?.inner_right || Number.MAX_SAFE_INTEGER) + 1
    && branding?.cta_block_width < branding?.inner_width;
  const verticalAlignment = Math.abs(((branding?.brand_block_top + branding?.brand_block_bottom) / 2) - ((branding?.cta_block_top + branding?.cta_block_bottom) / 2)) <= 4;
  const stackedLayout = branding?.inner_display === "grid"
    && branding?.cta_block_top >= branding?.brand_block_bottom - 1
    && branding?.brand_block_left >= (branding?.inner_left || 0) - 1
    && branding?.cta_block_right <= (branding?.inner_right || Number.MAX_SAFE_INTEGER) + 1;
  const expectsHorizontal = Number(branding?.viewport_width || 0) >= 630;
  const responsiveLayout = expectsHorizontal ? horizontalLayout && verticalAlignment : stackedLayout;
  const fixedCopyLayout = branding?.brand_description_white_space === "nowrap"
    && branding?.brand_description_text_overflow === false
    && branding?.cta_prompt_text_align === "center"
    && branding?.cta_prompt_white_space === "nowrap"
    && branding?.cta_prompt_text_overflow === false
    && branding?.cta_text_overflow === false;
  check("cta_accessible", branding?.cta_focusable === true && branding?.cta_pointer_events !== "none" && branding?.cta_hit_test === true && branding?.cta_width >= 24 && branding?.cta_height >= 24, JSON.stringify({ focusable: branding?.cta_focusable, pointer_events: branding?.cta_pointer_events, hit_test: branding?.cta_hit_test, width: branding?.cta_width, height: branding?.cta_height }));
  check("fixed_copy_layout", fixedCopyLayout, JSON.stringify({ description_white_space: branding?.brand_description_white_space, description_overflow: branding?.brand_description_text_overflow, prompt_align: branding?.cta_prompt_text_align, prompt_white_space: branding?.cta_prompt_white_space, prompt_overflow: branding?.cta_prompt_text_overflow, cta_overflow: branding?.cta_text_overflow }));
  check("standard_responsive_layout", variant === "footer" ? responsiveLayout : true, JSON.stringify({ viewport: branding?.viewport_width, expected: expectsHorizontal ? "horizontal" : "stacked", display: branding?.inner_display, grid: branding?.inner_grid_template, brand_left: branding?.brand_block_left, brand_right: branding?.brand_block_right, cta_block_left: branding?.cta_block_left, cta_block_right: branding?.cta_block_right, inner_width: branding?.inner_width, horizontal: horizontalLayout, aligned: verticalAlignment, stacked: stackedLayout }));
  check("layout_valid", variant === "footer"
    ? branding?.root_tag === "footer" && !["fixed", "sticky", "absolute"].includes(branding?.root_position) && branding?.footer_after_main_content === true
    : isAlternative && branding?.initially_in_viewport === true,
  JSON.stringify({ tag: branding?.root_tag, position: branding?.root_position, after_main: branding?.footer_after_main_content, initially_in_viewport: branding?.initially_in_viewport }));
  check("exception_valid", variant === "footer"
    ? exceptionReason === ""
    : isAlternative && contract.footer_exception_reasons.includes(exceptionReason) && hasAlternativeEvidence,
  JSON.stringify({ reason: exceptionReason, canvas: branding?.visible_canvas_stage, viewport_locked: branding?.viewport_locked }));
}

function finalizePublicationBranding(report) {
  const views = Object.values(report.views).map(view => view?.publication_branding || {});
  const first = views[0] || {};
  const consistent = Boolean(first.variant)
    && views.every(view => view.variant === first.variant && view.marker_version === first.marker_version
      && view.footer_exception_reason === first.footer_exception_reason);
  report.publication_branding.variant = consistent ? first.variant : "";
  report.publication_branding.footer_exception_reason = consistent ? first.footer_exception_reason : "";
  report.publication_branding.consistent_across_views = consistent;
  record(report, "branding_consistent_across_views", consistent, JSON.stringify({ variants: views.map(view => view.variant || "") }), brandingCheckLevel("consistent_across_views"));
}

function parseCssColor(value) {
  const match = String(value || "").match(/rgba?\((\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)[, ]+(\d+(?:\.\d+)?)/i);
  return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null;
}

function normalizeComparableUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    parsed.hash = "";
    return parsed.href.replace(/\/$/, "");
  } catch {
    return String(value || "").replace(/\/$/, "");
  }
}

function normalizePublicationBrandingMode(value) {
  const mode = String(value || "observe").trim().toLowerCase();
  if (!["observe", "required"].includes(mode)) {
    throw new Error("--publication-branding-mode must be observe or required");
  }
  return mode;
}

function normalizeQaStage(value) {
  const stage = String(value || "local").trim().toLowerCase();
  if (!["local", "version", "latest"].includes(stage)) {
    throw new Error("--qa-stage must be local, version, or latest");
  }
  return stage;
}

function viewportsForStage(stage) {
  if (stage === "local") {
    return [
      { name: "desktop", width: 1280, height: 800 },
      { name: "sidebar", width: 630, height: 844 },
      { name: "mobile", width: 390, height: 844 }
    ];
  }
  return [{ name: "sidebar", width: 630, height: 844 }];
}

function brandingCheckLevel(name) {
  if (publicationBrandingMode !== "required") return "warning";
  const localAndVersionBlockers = new Set([
    "present_once",
    "marker_valid",
    "variant_valid",
    "url_valid",
    "link_security_valid",
    "visible",
    "directly_exposed",
    "cta_accessible",
    "consistent_across_views"
  ]);
  const latestBlockers = new Set([
    "present_once",
    "marker_valid",
    "variant_valid",
    "url_valid",
    "link_security_valid",
    "visible",
    "directly_exposed",
    "cta_accessible",
    "consistent_across_views"
  ]);
  return (qaStage === "latest" ? latestBlockers : localAndVersionBlockers).has(name)
    ? "error"
    : "warning";
}

async function waitForBrandingMark(page, selector) {
  await page.evaluate(async markSelector => {
    const mark = document.querySelector(markSelector);
    if (!mark || mark.tagName.toLowerCase() !== "img" || mark.complete) return;
    await Promise.race([
      new Promise(resolve => {
        mark.addEventListener("load", resolve, { once: true });
        mark.addEventListener("error", resolve, { once: true });
      }),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
  }, selector);
}

function sameOrigin(candidate, pageUrl) {
  try {
    return new URL(String(candidate), String(pageUrl)).origin === new URL(String(pageUrl)).origin;
  } catch {
    return true;
  }
}

function isFaviconUrl(value) {
  return /\/favicon\.ico(?:\?|$)/i.test(String(value || ""));
}

function record(report, name, pass, detail = "", level = "error") {
  report.checks.push({ name, pass, detail, level });
  if (!pass) {
    const message = detail ? `${name}: ${detail}` : name;
    if (level === "warning") report.warnings.push(message);
    else report.errors.push(message);
  }
}

async function loadPlaywright(report) {
  const require = createRequire(import.meta.url);
  const roots = [];
  if (args["node-modules"]) roots.push(path.resolve(args["node-modules"]));
  if (process.env.ARTIFACT_NODE_MODULES) roots.push(...splitPathList(process.env.ARTIFACT_NODE_MODULES));
  if (process.env.NODE_PATH) roots.push(...splitPathList(process.env.NODE_PATH));
  roots.push(path.join(process.cwd(), "node_modules"));
  roots.push(...defaultRuntimeNodeModuleRoots());
  const searchPaths = unique(roots.flatMap(expandNodeModulesRoot));
  try {
    const resolved = require.resolve("playwright", { paths: searchPaths });
    report.browser.resolved_from = resolved;
    const imported = await import(pathToFileURL(resolved).href);
    return imported.chromium ? imported : imported.default;
  } catch (error) {
    throw new Error(`Playwright is required for HTML QA. Pass --node-modules or set ARTIFACT_NODE_MODULES. ${messageOf(error)}`);
  }
}

async function launchBrowser(playwright, report) {
  const requested = args["browser-channel"] ? String(args["browser-channel"]) : "";
  const candidates = requested
    ? [{ name: requested, options: { headless: true, channel: requested } }]
    : [
        { name: "playwright-chromium", options: { headless: true } },
        { name: "chrome", options: { headless: true, channel: "chrome" } },
        { name: "msedge", options: { headless: true, channel: "msedge" } }
      ];
  const failures = [];
  for (const candidate of candidates) {
    try {
      const browser = await playwright.chromium.launch(candidate.options);
      report.browser.channel = candidate.name;
      if (failures.length) report.warnings.push(`browser_launch_fallback_used:${candidate.name}`);
      return browser;
    } catch (error) {
      failures.push(`${candidate.name}: ${messageOf(error)}`);
    }
  }
  throw new Error(`Unable to launch Chromium: ${failures.join(" | ")}`);
}

async function launchChromeCdp(report) {
  const executable = resolveChromeExecutable();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-html-qa-chrome-"));
  const child = spawn(executable, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-pipe",
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], {
    stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"],
    windowsHide: true
  });
  const connection = new CdpPipeConnection(child, timeoutMs);
  try {
    await connection.send("Browser.getVersion");
  } catch (error) {
    connection.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
    throw new Error(`Unable to start system Chrome through CDP: ${messageOf(error)}`);
  }
  report.browser.dependency = "system-chrome-cdp";
  report.browser.channel = path.basename(executable);
  report.browser.resolved_from = executable;
  return new CdpBrowserAdapter({ child, connection, userDataDir, timeoutMs });
}

class CdpBrowserAdapter {
  constructor({ child, connection, userDataDir, timeoutMs: browserTimeoutMs }) {
    this.child = child;
    this.connection = connection;
    this.userDataDir = userDataDir;
    this.timeoutMs = browserTimeoutMs;
    this.pages = new Set();
  }

  async newPage({ viewport }) {
    const created = await this.connection.send("Target.createTarget", { url: "about:blank" });
    const attached = await this.connection.send("Target.attachToTarget", {
      targetId: created.targetId,
      flatten: true
    });
    const page = new CdpPageAdapter({
      browser: this,
      connection: this.connection,
      targetId: created.targetId,
      sessionId: attached.sessionId,
      viewport,
      timeoutMs: this.timeoutMs
    });
    await page.initialize();
    this.pages.add(page);
    return page;
  }

  async close() {
    for (const page of [...this.pages]) await page.close().catch(() => {});
    this.connection.close();
    if (this.child.exitCode === null) this.child.kill();
    await waitForChildExit(this.child, 2000);
    fs.rmSync(this.userDataDir, { recursive: true, force: true });
  }
}

class CdpPageAdapter {
  constructor({ browser, connection, targetId, sessionId, viewport, timeoutMs: pageTimeoutMs }) {
    this.browser = browser;
    this.connection = connection;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.viewport = viewport;
    this.timeoutMs = pageTimeoutMs;
    this.listeners = new Map();
    this.waiters = new Set();
    this.requests = new Map();
    this.mainResponse = null;
    this.closed = false;
    this.unsubscribe = connection.subscribe(sessionId, message => this.handleEvent(message));
  }

  async initialize() {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Network.enable");
    await this.send("Emulation.setDeviceMetricsOverride", {
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: 1,
      mobile: this.viewport.width < 500,
      screenWidth: this.viewport.width,
      screenHeight: this.viewport.height
    });
  }

  on(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }

  async goto(url, options = {}) {
    this.mainResponse = null;
    this.requests.clear();
    const loaded = this.waitForAny(
      ["Page.domContentEventFired", "Page.loadEventFired"],
      Number(options.timeout || this.timeoutMs)
    );
    const navigation = await this.send("Page.navigate", { url });
    if (navigation.errorText) throw new Error(navigation.errorText);
    await loaded;
    await delay(50);
    const status = Number(this.mainResponse?.status || 0);
    return {
      ok: () => status >= 200 && status < 400,
      status: () => status
    };
  }

  async waitForTimeout(milliseconds) {
    await delay(milliseconds);
  }

  async evaluate(callback, argument) {
    const expression = typeof callback === "function"
      ? `(${callback.toString()})(${argument === undefined ? "" : JSON.stringify(argument)})`
      : String(callback);
    return this.evaluateExpression(expression);
  }

  locator(selector) {
    const encoded = JSON.stringify(String(selector));
    return {
      count: () => this.evaluateExpression(
        `document.querySelectorAll(${encoded}).length`
      ),
      innerText: () => this.evaluateExpression(
        `String(document.querySelector(${encoded})?.innerText || "")`
      )
    };
  }

  async screenshot(options = {}) {
    const format = String(options.path || "").toLowerCase().endsWith(".jpg")
      || String(options.path || "").toLowerCase().endsWith(".jpeg")
      ? "jpeg"
      : "png";
    const captured = await this.send("Page.captureScreenshot", {
      format,
      fromSurface: true,
      captureBeyondViewport: Boolean(options.fullPage)
    });
    fs.mkdirSync(path.dirname(options.path), { recursive: true });
    fs.writeFileSync(options.path, Buffer.from(captured.data, "base64"));
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.unsubscribe();
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Chrome page closed"));
    }
    this.waiters.clear();
    await this.connection.send("Target.closeTarget", {
      targetId: this.targetId
    }).catch(() => {});
    this.browser.pages.delete(this);
  }

  async evaluateExpression(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description
          || response.exceptionDetails.text
          || "Chrome evaluation failed"
      );
    }
    return response.result?.value;
  }

  send(method, params = {}) {
    return this.connection.send(method, params, this.sessionId);
  }

  waitForAny(methods, waitTimeoutMs) {
    return new Promise((resolve, reject) => {
      const waiter = {
        methods: new Set(methods),
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters.delete(waiter);
          reject(new Error(`Chrome page load timed out after ${waitTimeoutMs} ms`));
        }, waitTimeoutMs)
      };
      this.waiters.add(waiter);
    });
  }

  handleEvent(message) {
    for (const waiter of [...this.waiters]) {
      if (!waiter.methods.has(message.method)) continue;
      clearTimeout(waiter.timer);
      this.waiters.delete(waiter);
      waiter.resolve(message.params || {});
    }

    const params = message.params || {};
    if (message.method === "Network.requestWillBeSent") {
      this.requests.set(params.requestId, {
        method: params.request?.method || "GET",
        url: params.request?.url || ""
      });
      return;
    }
    if (message.method === "Network.responseReceived") {
      const response = params.response || {};
      if (params.type === "Document") this.mainResponse = response;
      this.emit("response", {
        status: () => Number(response.status || 0),
        url: () => String(response.url || "")
      });
      return;
    }
    if (message.method === "Network.loadingFailed") {
      const request = this.requests.get(params.requestId) || {};
      this.emit("requestfailed", {
        method: () => request.method || "GET",
        url: () => request.url || "",
        failure: () => ({ errorText: params.errorText || "failed" })
      });
      return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
      const type = String(params.type || "");
      this.emit("console", {
        type: () => type,
        text: () => (params.args || []).map(remoteObjectText).join(" "),
        location: () => {
          const frame = params.stackTrace?.callFrames?.[0];
          return { url: frame?.url || "" };
        }
      });
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = params.exceptionDetails || {};
      this.emit("pageerror", new Error(
        details.exception?.description || details.text || "Uncaught page exception"
      ));
    }
  }

  emit(name, value) {
    for (const listener of this.listeners.get(name) || []) listener(value);
  }
}

class CdpPipeConnection {
  constructor(child, commandTimeoutMs) {
    this.child = child;
    this.commandTimeoutMs = commandTimeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.subscribers = new Map();
    this.buffer = Buffer.alloc(0);
    this.stderr = "";
    this.closed = false;

    const input = child.stdio[3];
    const output = child.stdio[4];
    if (!input || !output) throw new Error("Chrome remote debugging pipes are unavailable");
    this.input = input;
    output.on("data", chunk => this.onData(chunk));
    child.stderr?.on("data", chunk => {
      this.stderr = (this.stderr + chunk.toString("utf8")).slice(-8000);
    });
    child.once("error", error => this.failAll(error));
    child.once("exit", code => {
      if (!this.closed) {
        this.failAll(new Error(
          `system Chrome exited with code ${code}${this.stderr ? `: ${this.stderr.trim()}` : ""}`
        ));
      }
    });
  }

  send(method, params = {}, sessionId = undefined) {
    if (this.closed) return Promise.reject(new Error("Chrome CDP connection is closed"));
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome CDP command timed out: ${method}`));
      }, this.commandTimeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.input.write(Buffer.from(JSON.stringify(message) + "\0"), error => {
        if (!error) return;
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  subscribe(sessionId, listener) {
    if (!this.subscribers.has(sessionId)) this.subscribers.set(sessionId, new Set());
    this.subscribers.get(sessionId).add(listener);
    return () => this.subscribers.get(sessionId)?.delete(listener);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.failAll(new Error("Chrome CDP connection closed"));
    this.input.destroy();
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const separator = this.buffer.indexOf(0);
      if (separator < 0) break;
      const raw = this.buffer.subarray(0, separator).toString("utf8");
      this.buffer = this.buffer.subarray(separator + 1);
      if (!raw) continue;
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        continue;
      }
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) continue;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(
            `${pending.method}: ${message.error.message || "Chrome CDP error"}`
          ));
        } else {
          pending.resolve(message.result || {});
        }
        continue;
      }
      if (message.sessionId) {
        for (const listener of this.subscribers.get(message.sessionId) || []) {
          listener(message);
        }
      }
    }
  }

  failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function resolveChromeExecutable() {
  const requested = [
    args["browser-executable"],
    process.env.ARTIFACT_BROWSER_EXECUTABLE
  ].map(value => String(value || "").trim()).filter(Boolean);
  const candidates = [
    ...requested,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "msedge",
    "chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  for (const candidate of unique(candidates)) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      continue;
    }
    const probe = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
      windowsHide: true
    });
    if (!probe.error && probe.status === 0) return candidate;
  }
  throw new Error(
    "Playwright is unavailable and no system Chrome executable was found. "
      + "Set ARTIFACT_BROWSER_EXECUTABLE to google-chrome, chromium, or msedge."
  );
}

function remoteObjectText(value) {
  if (Object.prototype.hasOwnProperty.call(value || {}, "value")) {
    return typeof value.value === "string" ? value.value : JSON.stringify(value.value);
  }
  return String(value?.description || value?.type || "");
}

function waitForChildExit(child, waitMs) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(resolve, waitMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function startStaticServer(root) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }
    const relative = decodeURIComponent(requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.replace(/^\/+/, ""));
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
      return;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": contentType(target) });
    fs.createReadStream(target).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function contentType(filePath) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
  })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function defaultRuntimeNodeModuleRoots() {
  const roots = [];
  const home = os.homedir();
  if (home) {
    const runtimes = path.join(home, ".cache", "codex-runtimes");
    roots.push(path.join(runtimes, "codex-primary-runtime", "dependencies", "node", "node_modules"));
    if (fs.existsSync(runtimes)) {
      for (const entry of fs.readdirSync(runtimes, { withFileTypes: true })) {
        if (entry.isDirectory()) roots.push(path.join(runtimes, entry.name, "dependencies", "node", "node_modules"));
      }
    }
  }
  const executableDir = path.dirname(process.execPath);
  roots.push(path.resolve(executableDir, "..", "node_modules"));
  roots.push(path.resolve(executableDir, "..", "..", "node", "node_modules"));
  return roots;
}

function expandNodeModulesRoot(root) {
  const paths = [root];
  const pnpm = path.join(root, ".pnpm");
  if (fs.existsSync(pnpm) && fs.statSync(pnpm).isDirectory()) {
    for (const entry of fs.readdirSync(pnpm, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("playwright@")) paths.unshift(path.join(pnpm, entry.name, "node_modules"));
    }
  }
  return paths;
}

function splitPathList(value) {
  return String(value).split(path.delimiter).map(item => path.resolve(item.trim())).filter(Boolean);
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error(`${label} not found: ${filePath}`);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) parsed._.push(arg);
    else {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) parsed[key] = true;
      else {
        parsed[key] = next;
        index += 1;
      }
    }
  }
  return parsed;
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function flagEnabled(value) {
  if (value === undefined || value === null || value === false) return false;
  if (value === true) return true;
  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}
