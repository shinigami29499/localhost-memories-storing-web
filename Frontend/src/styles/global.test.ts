// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const globalStyles = readFileSync(resolve("src", "styles", "global.css"), "utf8");
const sidebarStyles = readFileSync(resolve("src", "styles", "sidebar.css"), "utf8");

describe("Post footer styles", () => {
  let style: HTMLStyleElement;
  let card: HTMLElement;

  beforeEach(() => {
    style = document.createElement("style");
    style.textContent = globalStyles.replace(/^@import .*;$/gm, "") + sidebarStyles;
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
  });

  it.each(["dark", "light"])("matches the sidebar hover background in %s mode", (theme) => {
    document.documentElement.dataset.theme = theme;
    const rules = Array.from(style.sheet!.cssRules)
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
    const sidebarHover = rules.find((rule) => rule.selectorText === ".sidebar__sub-link:hover");
    expect(sidebarHover?.style.background).toBe("rgba(255, 255, 255, 0.05)");

    for (const selector of [".reactions__chip:hover:not(:disabled)", ".post-card__comment-action:hover"]) {
      const rule = rules.find((entry) => entry.selectorText.split(",").map((part) => part.trim()).includes(selector));
      expect(rule?.style.background).toBe(sidebarHover?.style.background);
    }
  });

  it("uses white text in dark mode while preserving light-theme text colors", () => {
    const text = document.createElement("span");
    text.className = "brand__dot";
    card.append(text);

    expect(getComputedStyle(text).color).toBe("rgb(255, 255, 255)");

    document.documentElement.dataset.theme = "light";
    expect(getComputedStyle(text).color).toBe("rgb(49, 248, 137)");
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
