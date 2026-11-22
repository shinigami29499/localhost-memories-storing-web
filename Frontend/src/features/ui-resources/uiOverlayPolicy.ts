export const minimumUiOverlayMs = 250;

export function isReturningToMainPage(from: string, to: string) {
  const mainPage = /^\/(?:album|location|users?)?\/?$/;
  const innerPage = /^\/(?:(?:album|location|users?)\/[^/]+|profile|settings|uploads)\/?$/;
  return mainPage.test(to) && innerPage.test(from);
}
