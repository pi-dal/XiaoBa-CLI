export const PUBLICATION_BRANDING = Object.freeze({
  contractVersion: "catsco.publication-branding.v2",
  markerVersion: "v2",
  brandName: "CatsCo",
  descriptionText: "你的专属虚拟员工，帮助你实现任何想法",
  ctaPromptText: "喜欢这个作品？用 CatsCo 试试你的想法。",
  ctaPromptLines: Object.freeze(["喜欢这个作品？", "用 CatsCo 试试你的想法。"]),
  ctaText: "开始使用 ↗",
  officialUrl: "https://app.catsco.cc/",
  target: "_blank",
  relTokens: Object.freeze(["noopener", "noreferrer"]),
  variants: Object.freeze(["footer", "slim-bar", "brand-capsule"]),
  footerExceptionReasons: Object.freeze([
    "canvas-stage",
    "webgl-stage",
    "viewport-locked",
    "fullscreen-stage"
  ]),
  officialMark: Object.freeze({
    src: "assets/catsco-mark.png",
    width: 720,
    height: 332,
    aspectRatio: 720 / 332,
    accentColor: "#54c9ac",
    accentColorRgb: Object.freeze({ r: 84, g: 201, b: 172 })
  }),
  selectors: Object.freeze({
    root: "[data-catsco-publication-branding]",
    inner: "[data-catsco-publication-branding-inner]",
    brandBlock: "[data-catsco-publication-brand-block]",
    mark: "[data-catsco-publication-brand-mark]",
    brandCopy: "[data-catsco-publication-brand-copy]",
    brandName: "[data-catsco-publication-brand-name]",
    brandDescription: "[data-catsco-publication-brand-description]",
    ctaBlock: "[data-catsco-publication-cta-block]",
    ctaPrompt: "[data-catsco-publication-cta-prompt]",
    cta: "[data-catsco-publication-brand-cta]"
  })
});

export function publicationBrandingBrowserContract() {
  return {
    contract_version: PUBLICATION_BRANDING.contractVersion,
    marker_version: PUBLICATION_BRANDING.markerVersion,
    brand_name: PUBLICATION_BRANDING.brandName,
    description_text: PUBLICATION_BRANDING.descriptionText,
    cta_prompt_text: PUBLICATION_BRANDING.ctaPromptText,
    cta_prompt_lines: [...PUBLICATION_BRANDING.ctaPromptLines],
    cta_text: PUBLICATION_BRANDING.ctaText,
    official_url: PUBLICATION_BRANDING.officialUrl,
    target: PUBLICATION_BRANDING.target,
    rel_tokens: [...PUBLICATION_BRANDING.relTokens],
    variants: [...PUBLICATION_BRANDING.variants],
    footer_exception_reasons: [...PUBLICATION_BRANDING.footerExceptionReasons],
    official_mark: {
      ...PUBLICATION_BRANDING.officialMark,
      accentColorRgb: { ...PUBLICATION_BRANDING.officialMark.accentColorRgb }
    },
    selectors: { ...PUBLICATION_BRANDING.selectors }
  };
}
