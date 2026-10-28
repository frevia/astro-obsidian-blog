export interface NotesMonth {
  month: string;
  count: number;
}

export interface NotesMonthYear {
  year: string;
  months: NotesMonth[];
}

export function getNotesMonth(id: string): string | undefined {
  const date = id.split("/").pop()?.replace(/\.md$/, "") ?? "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return undefined;

  const [, year, month, day] = match;
  const value = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day))
  );
  if (
    value.getUTCFullYear() !== Number(year) ||
    value.getUTCMonth() !== Number(month) - 1 ||
    value.getUTCDate() !== Number(day)
  ) {
    return undefined;
  }
  return `${year}-${month}`;
}

export function groupNotesMonths(ids: string[]): NotesMonthYear[] {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const month = getNotesMonth(id);
    if (month) counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  const grouped = new Map<string, NotesMonth[]>();
  for (const [month, count] of [...counts].sort(([a], [b]) =>
    b.localeCompare(a)
  )) {
    const year = month.slice(0, 4);
    grouped.set(year, [...(grouped.get(year) ?? []), { month, count }]);
  }
  return [...grouped].map(([year, months]) => ({ year, months }));
}
