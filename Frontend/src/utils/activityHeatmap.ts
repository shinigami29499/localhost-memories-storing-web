export const MOBILE_QUERY = "(max-width: 640px)";
export const MOBILE_WEEKS = 12;
export const DESKTOP_WEEKS = 36;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfHeatmap(today: Date, weeks: number): Date {
  const start = startOfDay(today);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday - (weeks - 1) * 7);
  return start;
}

export function makeHeatmapDays(start: Date, today: Date): Date[] {
  const days: Date[] = [];
  const date = new Date(start);
  while (date <= today) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}
