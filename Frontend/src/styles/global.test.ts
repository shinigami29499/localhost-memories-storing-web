// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const globalStyles = readFileSync(resolve("src", "styles", "global.css"), "utf8");
const sidebarStyles = readFileSync(resolve("src", "styles", "sidebar.css"), "utf8");
const adminStyles = readFileSync(resolve("src", "pages", "admin", "admin.css"), "utf8");

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[a-f\d]{2}/gi)!.map((channel) => parseInt(channel, 16) / 255);
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
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
    style.textContent = globalStyles.replace(/^@import .*;$/gm, "") + sidebarStyles + adminStyles;
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

  it("keeps the admin posts footer transparent and separate from scrolling content", () => {
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const footerRule = rules.find((rule) => rule.selectorText === ".admin-posts__footer");

    expect(footerRule?.style.background).toBe("transparent");
    expect(footerRule?.style.position).toBe("relative");
    const contentRule = rules.find((rule) => rule.selectorText === ".admin-posts__content");
    expect(contentRule?.style.overflow).toBe("auto");
    expect(contentRule?.style.minHeight).toBe("0px");
  });

  it("uses the theme class for the reference palette while the saved theme is unchanged during a wipe", () => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.remove("dark");
    const lightPalette = getComputedStyle(document.documentElement);
    expect(lightPalette.getPropertyValue("--bg").trim()).toBe("#eef0f2");
    expect(lightPalette.getPropertyValue("--surface").trim()).toBe("#fafaff");
    expect(lightPalette.getPropertyValue("--surface-raised").trim()).toBe("#daddd8");
    expect(lightPalette.getPropertyValue("--surface-card-raised").trim()).toBe("#ecebe4");
    expect(lightPalette.getPropertyValue("--text").trim()).toBe("#000000");
    expect(lightPalette.getPropertyValue("--text-muted").trim()).toBe("#000000");
    expect(lightPalette.getPropertyValue("--text-strong").trim()).toBe("#000000");
    expect(lightPalette.getPropertyValue("--border").trim()).toBe("#000000");
    expect(lightPalette.getPropertyValue("--border-card").trim()).toBe("#000000");
    expect(lightPalette.getPropertyValue("--accent").trim()).toBe("#000000");
    expect(lightPalette.getPropertyValue("--text-on-accent").trim()).toBe("#ffffff");

    document.documentElement.dataset.theme = "light";
    document.documentElement.classList.add("dark");
    const darkPalette = getComputedStyle(document.documentElement);
    expect(darkPalette.getPropertyValue("--bg").trim()).toBe("#0f0f0f");
    expect(darkPalette.getPropertyValue("--surface").trim()).toBe("#2b2b2b");
    expect(darkPalette.getPropertyValue("--surface-card").trim()).toBe("#2b2b2b");
    expect(darkPalette.getPropertyValue("--surface-raised").trim()).toBe("#4d4d4d");
    expect(darkPalette.getPropertyValue("--surface-card-raised").trim()).toBe("#4d4d4d");
    expect(darkPalette.getPropertyValue("--border").trim()).toBe("#777777");
    expect(darkPalette.getPropertyValue("--border-card").trim()).toBe("#777777");
    expect(darkPalette.getPropertyValue("--text").trim()).toBe("#dedede");
    expect(darkPalette.getPropertyValue("--text-muted").trim()).toBe("#dedede");
    expect(darkPalette.getPropertyValue("--text-strong").trim()).toBe("#dedede");
    expect(darkPalette.getPropertyValue("--accent-soft").trim()).toBe("#dedede");
    expect(darkPalette.getPropertyValue("--accent").trim()).toBe("#4d4d4d");
  });

  it.each(["dark", "light"])("matches the sidebar hover background in %s mode", (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const sidebarHover = rules.find((rule) => rule.selectorText === ".sidebar__sub-link:hover");
    expect(sidebarHover?.style.background).toBe("var(--surface-hover)");
    const surfaceHover = getComputedStyle(document.documentElement)
      .getPropertyValue("--surface-hover")
      .replace(/\s/g, "");
    expect(surfaceHover).toBe(theme === "dark" ? "rgba(222,222,222,0.14)" : "rgba(28,28,28,0.12)");

    for (const selector of [".reactions__chip:hover:not(:disabled)", ".post-card__comment-action:hover"]) {
      const rule = rules.find((entry) => entry.selectorText.split(",").map((part) => part.trim()).includes(selector));
      expect(rule?.style.background).toBe("var(--surface-hover)");
    }
  });

  it.each(["dark", "light"])("keeps dialogs and card actions on %s theme surfaces", (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const ruleFor = (selector: string) => rules.find((rule) => rule.selectorText === selector);

    expect(ruleFor(".confirmation-dialog")?.style.background).toBe("var(--surface-card)");
    expect(ruleFor(".confirmation-dialog__actions")?.style.background).toBe("var(--surface-card-raised)");
    expect(ruleFor(".confirmation-dialog__actions")?.style.borderTop).toBe("1px solid var(--border)");
    expect(ruleFor(".post-card__footer")?.style.background).toBe("var(--surface-raised)");
    expect(ruleFor(".confirmation-dialog-backdrop")?.style.backgroundColor).toBe("var(--overlay-backdrop)");
  });

  it("uses the supplied dark palette and full black text and borders in light mode", () => {
    const darkTokens = getComputedStyle(document.documentElement);
    expect(darkTokens.getPropertyValue("--text").trim()).toBe("#dedede");
    expect(darkTokens.getPropertyValue("--text-muted").trim()).toBe("#dedede");
    expect(darkTokens.getPropertyValue("--text-strong").trim()).toBe("#dedede");
    expect(darkTokens.getPropertyValue("--accent-soft").trim()).toBe("#dedede");
    expect(darkTokens.getPropertyValue("--border").trim()).toBe("#777777");
    expect(darkTokens.getPropertyValue("--border-card").trim()).toBe("#777777");

    document.documentElement.dataset.theme = "light";
    document.documentElement.classList.remove("dark");
    const lightTokens = getComputedStyle(document.documentElement);
    for (const token of ["--text", "--text-muted", "--text-strong", "--accent-soft", "--border", "--border-card"]) {
      expect(lightTokens.getPropertyValue(token).trim()).toBe("#000000");
    }
  });

  it.each(["dark", "light"])("keeps primary and muted text at WCAG AA contrast in %s mode", (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    const tokens = getComputedStyle(document.documentElement);
    const token = (name: string): string => {
      const value = tokens.getPropertyValue(name).trim();
      const alias = value.match(/^var\((--[^)]+)\)$/);
      return alias ? token(alias[1]) : value;
    };
    const surfaces = ["--bg", "--surface", "--surface-card", "--surface-card-raised"];

    for (const foreground of ["--text", "--text-muted"]) {
      for (const background of surfaces) {
        expect(contrastRatio(token(foreground), token(background))).toBeGreaterThanOrEqual(4.5);
      }
    }

    expect(contrastRatio(token("--text-on-accent"), token("--accent"))).toBeGreaterThanOrEqual(4.5);
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
