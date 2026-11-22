export const minimumUiOverlayMs = 300;
export const loadingPlaceholderDelayMs = 300;

export function isReturningToMainPage(from: string, to: string) {
  const mainPage = /^\/(?:album|location|users?)?\/?$/;
  const innerPage = /^\/(?:(?:album|location|users?)\/[^/]+|profile|settings|uploads)\/?$/;
  return mainPage.test(to) && innerPage.test(from);
}
