export function resolveFocusMediaId(items: readonly { id: string }[], id: string | null, index: number): string | null {
  if (!id) return null;
  if (items.some((item) => item.id === id)) return id;
  return items[Math.min(index, items.length - 1)]?.id ?? null;
}
