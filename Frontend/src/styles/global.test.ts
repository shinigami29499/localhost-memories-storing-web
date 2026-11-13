// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const globalStyles = readFileSync(resolve("src", "styles", "global.css"), "utf8");
const sidebarStyles = readFileSync(resolve("src", "styles", "sidebar.css"), "utf8");
const usersStyles = readFileSync(resolve("src", "pages", "users", "users.css"), "utf8");
const galleryStyles = readFileSync(resolve("src", "pages", "gallery", "gallery.css"), "utf8");
const mediaStyles = readFileSync(resolve("src", "features", "media", "components", "media.css"), "utf8");
const toastStyles = readFileSync(resolve("src", "components", "ui", "toast.css"), "utf8");
const loginStyles = readFileSync(resolve("src", "pages", "login", "login.css"), "utf8");
const placeStyles = readFileSync(resolve("src", "pages", "place", "place.css"), "utf8");

function tokenValue(tokens: CSSStyleDeclaration, name: string): string {
  const value = tokens.getPropertyValue(name).trim();
  const alias = value.match(/^var\((--[^)]+)\)$/);
  return alias ? tokenValue(tokens, alias[1]) : value;
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const expanded = hex.length === 3 ? [...hex].map((channel) => channel + channel).join("") : hex;
      const channels = expanded.match(/[a-f\d]{2}/gi)!.map((channel) => parseInt(channel, 16) / 255);
      const [red, green, blue] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }
    const match = color.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/);
    if (!match) throw new Error("Unsupported color: " + color);
    const [, lightness, chroma, hue] = match.map(Number);
    const radians = hue * Math.PI / 180;
    const a = chroma * Math.cos(radians);
    const b = chroma * Math.sin(radians);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const clamp = (channel: number) => Math.max(0, Math.min(1, channel));
    const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
    const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
    const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Global styles", () => {
  let style: HTMLStyleElement;
  let card: HTMLElement;

  beforeEach(() => {
    document.documentElement.classList.add("dark");
    style = document.createElement("style");
    style.textContent = globalStyles.replace(/^@import .*;$/gm, "") + sidebarStyles + usersStyles + galleryStyles + placeStyles;
    document.head.append(style);
    card = document.createElement("article");
    card.className = "post-card";
    card.innerHTML = `
      <div class="post-card__footer">
        <div class="reactions"><button class="reactions__chip"></button></div>
        <button class="post-card__comment-action"></button>
      </div>
    `;
    document.body.append(card);
  });

  afterEach(() => {
    card.remove();
    style.remove();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
  });

  it("shows the theme toggle", () => {
    const button = document.createElement("button");
    button.className = "theme-toggler";
    card.append(button);

    expect(getComputedStyle(button).display).toBe("inline-flex");
  });

  it("keeps the sticky app header transparent", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const headerRule = rules.find((rule) => rule.selectorText === ".app-topbar");

    expect(headerRule?.style.background).toBe("transparent");
  });

  it("stacks the notification panel above the header divider", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const panelRule = rules.find((rule) => rule.selectorText === ".notification-bar__panel");
    const dividerRule = rules.find((rule) => rule.selectorText === ".app-topbar::after");

    expect(panelRule?.style.position).toBe("absolute");
    expect(Number(panelRule?.style.zIndex)).toBeGreaterThan(Number(dividerRule?.style.zIndex || 0));
  });

  it("keeps the toast layer above app and click-effect overlays", () => {
    const toastStyle = document.createElement("style");
    toastStyle.textContent = toastStyles;
    document.head.append(toastStyle);
    const layer = document.createElement("div");
    layer.className = "toast-layer";
    const toast = document.createElement("div");
    toast.className = "toast-root";
    layer.append(toast);
    card.append(layer);

    try {
      expect(Number(getComputedStyle(layer).zIndex)).toBeGreaterThan(100005);
      expect(getComputedStyle(layer).pointerEvents).toBe("none");
      expect(getComputedStyle(toast).pointerEvents).toBe("auto");
    } finally {
      toastStyle.remove();
    }
  });

  it("positions phone toasts below the top safe area without moving desktop toasts", () => {
    const toastStyle = document.createElement("style");
    toastStyle.textContent = toastStyles;
    document.head.append(toastStyle);

    try {
      const rules = Array.from(toastStyle.sheet!.cssRules);
      const desktop = rules.find(
        (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === ".toast-viewport",
      );
      const viewportAt = (maxWidth: string) => {
        const media = rules.find(
          (rule): rule is CSSMediaRule =>
            rule instanceof CSSMediaRule && rule.conditionText === `(max-width: ${maxWidth})`,
        );
        return Array.from(media?.cssRules ?? []).find(
          (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === ".toast-viewport",
        );
      };
      const mobile = viewportAt("640px");
      const narrow = viewportAt("560px");

      expect(desktop?.style.bottom).toBe("24px");
      expect(desktop?.style.top).toBe("");
      expect(toastStyles).toMatch(
        /@media\s*\(max-width:\s*640px\)\s*\{\s*\.toast-viewport\s*\{[^}]*top:\s*calc\(12px\s*\+\s*env\(safe-area-inset-top\)\)/,
      );
      expect(mobile?.style.bottom).toBe("auto");
      expect(narrow?.style.bottom).toBe("");
      expect(narrow?.style.left).toBe("12px");
      expect(narrow?.style.right).toBe("12px");
    } finally {
      toastStyle.remove();
    }
  });

  it("contains page scrolling below the transparent header", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const ruleFor = (selector: string) => rules.find((rule) => rule.selectorText === selector);

    expect(ruleFor(".app-shell")?.style.height).toBe("100dvh");
    expect(ruleFor(".app-shell__main")?.style.minHeight).toBe("0px");
    expect(ruleFor(".app-shell__content")?.style.minHeight).toBe("0px");
    expect(ruleFor(".app-shell__content")?.style.overflow).toBe("auto");
    expect(ruleFor(".app-shell__content")?.style.getPropertyValue("scroll-padding-block")).toBe("24px");
  });

  it("keeps the media gallery content independently scrollable", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const contentRule = rules.find((rule) => rule.selectorText === ".gallery-page__content");
    expect(contentRule?.style.overflow).toBe("auto");
    expect(contentRule?.style.minHeight).toBe("0px");
  });

  it("uses square tiles in dated gallery grids", () => {
    const mediaStyle = document.createElement("style");
    mediaStyle.textContent = mediaStyles;
    document.head.append(mediaStyle);
    const grid = document.createElement("div");
    grid.className = "gallery-date-grid";
    const tile = document.createElement("button");
    tile.className = "media-tile";
    grid.append(tile);
    card.append(grid);

    try {
      expect(getComputedStyle(tile).getPropertyValue("aspect-ratio")).toBe("1 / 1");
    } finally {
      mediaStyle.remove();
    }
  });

  it("keeps phone header controls touch-sized and panels below the shared header", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
      .filter((rule) => rule.conditionText === "(max-width: 640px)")
      .flatMap((rule) => Array.from(rule.cssRules))
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const controlRule = rules.find((rule) => rule.selectorText.includes(".notification-bar__trigger"));
    const panelRule = rules.find((rule) => rule.selectorText === ".notification-bar__panel");

    expect(controlRule?.style.width).toBe("44px");
    expect(controlRule?.style.height).toBe("44px");
    expect(panelRule?.style.top).toBe("calc(var(--app-topbar-height) + 8px)");
  });

  it("uses a solid background for primary buttons", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const primaryRule = rules.find((rule) => rule.selectorText === ".btn--primary");
    const hoverRule = rules.find((rule) => rule.selectorText === ".btn--primary:hover:not(:disabled)");

    expect(primaryRule?.style.background).toBe("var(--accent-strong)");
    expect(hoverRule?.style.background).toBe("");
    expect(hoverRule?.style.filter).toBe("brightness(1.15)");
  });

  it("keeps autofilled auth fields aligned with the active theme", () => {
    expect(loginStyles).toMatch(
      /\.login__card input:autofill,\s*\.login__card input:-webkit-autofill\s*\{[^}]*-webkit-box-shadow:\s*0 0 0 1000px var\(--surface-card-raised\) inset;[^}]*-webkit-text-fill-color:\s*var\(--text-strong\);/,
    );
  });

  it("centers gallery content within its maximum width", () => {
    expect(galleryStyles).toMatch(/\.gallery-page__inner\s*\{[^}]*margin-inline:\s*auto;[^}]*max-width:\s*1600px;/);
  });

  it("uses the dark palette regardless of the old theme marker", () => {
    for (const theme of ["dark", "light"]) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
      const tokens = getComputedStyle(document.documentElement);
      expect(tokenValue(tokens, "--bg")).toBe("oklch(0.15 0 20)");
      expect(tokenValue(tokens, "--surface")).toBe("oklch(0.2 0 20)");
      expect(tokenValue(tokens, "--surface-raised")).toBe("oklch(0.26 0 0)");
      expect(tokenValue(tokens, "--accent")).toBe("oklch(0.96 0 0)");
    }
  });

  it("uses neutral hover surfaces and raised dialogs", () => {
    const rules = Array.from(style.sheet!.cssRules).filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const ruleFor = (selector: string) => rules.find((rule) => rule.selectorText === selector);
    expect(ruleFor(".sidebar__sub-link:hover")?.style.background).toBe("var(--surface-hover)");
    expect(ruleFor(".confirmation-dialog")?.style.background).toBe("var(--surface-raised)");
    expect(ruleFor(".confirmation-dialog")?.style.boxShadow).toBe("var(--shadow-lg)");
    expect(ruleFor(".place-picker")?.style.boxShadow).toBe("var(--shadow-lg)");
    expect(ruleFor(".confirmation-dialog-backdrop")?.style.backgroundColor).toBe("var(--overlay-backdrop)");
  });

  it("fades custom popups and backdrops only when motion is allowed", () => {
    const motionStyles = globalStyles.slice(
      globalStyles.indexOf("@media (prefers-reduced-motion: no-preference)", globalStyles.indexOf(".confirmation-dialog-viewport")),
      globalStyles.indexOf("/* Custom dialogs */"),
    );
    expect(motionStyles).toContain(".custom-dialog--animated");
    expect(motionStyles).toContain(".custom-dialog-backdrop--animated");
    expect(motionStyles).toContain("@starting-style");
    expect(motionStyles).toContain("[data-ending-style]");
    expect(motionStyles).toContain("opacity: 0");
    expect(motionStyles).toContain("opacity 300ms ease-out");
    expect(motionStyles).toContain("opacity 150ms ease-in");
  });

  it("keeps text and controls legible on dark surfaces", () => {
    const tokens = getComputedStyle(document.documentElement);
    const token = (name: string) => tokenValue(tokens, name);
    for (const foreground of ["--text", "--text-muted"]) {
      for (const background of ["--bg", "--surface", "--surface-raised", "--surface-hover"]) {
        expect(contrastRatio(token(foreground), token(background))).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastRatio(token("--text-on-accent"), token("--accent"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token("--text-on-danger"), token("--error-solid"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token("--error-text"), token("--surface-raised"))).toBeGreaterThanOrEqual(4.5);
    for (const status of ["--success", "--warning", "--danger", "--info"]) {
      expect(contrastRatio(token("--bg-dark"), token(status))).toBeGreaterThanOrEqual(3);
    }
    for (const background of ["--surface", "--surface-raised", "--surface-hover"]) {
      expect(contrastRatio(token("--border-control"), token(background))).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(token("--focus-ring"), token(background))).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses the revised dark and semantic color roles", () => {
    const tokens = getComputedStyle(document.documentElement);
    const expected: Record<string, string> = {
      "--bg-dark": "oklch(0.1 0 20)", "--bg": "oklch(0.15 0 20)", "--bg-light": "oklch(0.2 0 20)",
      "--text": "oklch(0.96 0 20)", "--text-muted": "oklch(0.76 0 20)",
      "--highlight": "oklch(0.5 0 20)", "--border": "oklch(0.4 0 20)", "--border-muted": "oklch(0.3 0 20)",
      "--primary": "oklch(0.96 0 0)", "--secondary": "oklch(0.76 0 0)",
      "--success": "oklch(0.75 0.16 160)", "--warning": "oklch(0.86 0.17 95)",
      "--danger": "oklch(0.7 0.18 30)", "--info": "oklch(0.75 0.16 260)",
      "--success-solid": "oklch(0.55 0.16 160)", "--warning-solid": "oklch(0.78 0.17 95)",
      "--danger-solid": "oklch(0.55 0.18 30)", "--info-solid": "oklch(0.55 0.16 260)",
    };
    for (const [name, value] of Object.entries(expected)) expect(tokenValue(tokens, name)).toBe(value);
    expect(tokenValue(tokens, "--accent")).toBe(expected["--primary"]);
    expect(tokenValue(tokens, "--error-solid")).toBe(expected["--danger-solid"]);
    const dangerRule = Array.from(style.sheet!.cssRules)
      .find((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === ".btn--danger");
    expect(dangerRule?.style.background).toBe("var(--error-solid)");
  });

  it("lets SVG icons inherit their control color while preserving semantic heart color", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const iconRule = rules.find((rule) => rule.selectorText === "svg");
    const heartRule = rules.find((rule) => rule.selectorText === ".reaction-icon--heart");

    expect(iconRule?.style.color).toBe("inherit");
    expect(heartRule?.style.color).toBe("var(--danger)");
  });

  it("brightens dark-mode avatars, preserves semantic logout color, and keeps disabled send controls readable", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const ruleFor = (selector: string) => rules.find((rule) => rule.selectorText.includes(selector));
    const avatarRule = ruleFor(".dark .post-card__avatar");
    const logoutRule = ruleFor(".dark .sidebar__account-menu .sidebar__link--danger");
    const sendRule = ruleFor(".new-post__row > .btn--primary:disabled");

    expect(avatarRule?.style.background).toBe("var(--accent-soft)");
    expect(avatarRule?.style.color).toBe("var(--selection-text)");
    expect(logoutRule?.style.color).toBe("var(--danger)");
    expect(sendRule?.style.background).toBe("var(--surface-raised)");
    expect(sendRule?.style.color).toBe("var(--accent-soft)");
    expect(sendRule?.style.opacity).toBe("1");
  });

  it.each(["dark", "light"])("keeps neighboring surface layers distinct in %s mode", (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    const tokens = getComputedStyle(document.documentElement);
    const token = (name: string) => tokens.getPropertyValue(name).trim();

    for (const [outer, inner] of [
      ["--bg", "--surface"],
      ["--bg", "--sidebar-bg"],
      ["--surface", "--surface-raised"],
      ["--surface-card", "--surface-card-raised"],
    ]) {
      expect(token(outer), `${outer} and ${inner} must not blend`).not.toBe(token(inner));
    }
  });

  it("keeps rounded bottom corners while comments are collapsed", () => {
    const footer = card.querySelector<HTMLElement>(".post-card__footer")!;
    const reaction = card.querySelector<HTMLElement>(".reactions__chip")!;

    expect(getComputedStyle(footer).borderRadius).toBe("0 0 var(--radius) var(--radius)");
    expect(getComputedStyle(reaction).borderRadius).toBe("0 0 0 var(--radius)");
  });

  it("keeps the comment action rectangular while comments are collapsed", () => {
    const commentAction = card.querySelector<HTMLElement>(".post-card__comment-action")!;

    expect(getComputedStyle(commentAction).borderRadius).toMatch(/^0(?:px)?$/);
  });

  it("removes internal rounding while comments are expanded", () => {
    const comments = document.createElement("section");
    comments.className = "comments";
    card.append(comments);

    for (const selector of [".post-card__footer", ".reactions__chip", ".post-card__comment-action"]) {
      expect(getComputedStyle(card.querySelector(selector)!).borderRadius).toMatch(/^0(?:px)?$/);
    }
    expect(getComputedStyle(card).borderRadius).toBe("var(--radius)");
  });

  it("uses a theme-aware background and spacing for the first comment", () => {
    const comments = document.createElement("section");
    comments.className = "comments";
    comments.innerHTML = '<ul class="comments__list"><li class="comments__item">First</li></ul>';
    card.append(comments);

    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const commentsRule = rules.find((rule) => rule.selectorText === ".comments");
    const itemRule = rules.find((rule) => rule.selectorText === ".comments__item");

    expect(commentsRule?.style.padding).toBe("12px 16px 14px");
    expect(itemRule?.style.background).toBe("var(--surface-card-raised)");
  });
});
