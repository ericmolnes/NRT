export interface AllocationRange {
  id?: string;
  entryId: string;
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Beregn handlinger for å sette en ny allokering over et datoområde.
 */
export function computeAllocationChanges(
  existing: AllocationRange[],
  newStart: Date,
  newEnd: Date,
  newLabel: string
): {
  toDelete: string[];
  toUpdate: { id: string; startDate: Date; endDate: Date }[];
  toCreate: { startDate: Date; endDate: Date; label: string }[];
} {
  const toDelete: string[] = [];
  const toUpdate: { id: string; startDate: Date; endDate: Date }[] = [];
  const toCreate: { startDate: Date; endDate: Date; label: string }[] = [];

  for (const alloc of existing) {
    if (!alloc.id) continue;
    const allocStart = new Date(alloc.startDate);
    const allocEnd = new Date(alloc.endDate);

    if (allocEnd < newStart || allocStart > newEnd) continue;

    if (allocStart >= newStart && allocEnd <= newEnd) {
      toDelete.push(alloc.id);
      continue;
    }

    if (allocStart >= newStart && allocStart <= newEnd && allocEnd > newEnd) {
      toUpdate.push({ id: alloc.id, startDate: addDays(newEnd, 1), endDate: allocEnd });
      continue;
    }

    if (allocEnd >= newStart && allocEnd <= newEnd && allocStart < newStart) {
      toUpdate.push({ id: alloc.id, startDate: allocStart, endDate: addDays(newStart, -1) });
      continue;
    }

    if (allocStart < newStart && allocEnd > newEnd) {
      toUpdate.push({ id: alloc.id, startDate: allocStart, endDate: addDays(newStart, -1) });
      toCreate.push({ startDate: addDays(newEnd, 1), endDate: allocEnd, label: alloc.label });
      continue;
    }
  }

  toCreate.push({ startDate: newStart, endDate: newEnd, label: newLabel });
  return { toDelete, toUpdate, toCreate };
}

/**
 * Beregn handlinger for å fjerne allokeringer i et datoområde.
 */
export function computeClearChanges(
  existing: AllocationRange[],
  clearStart: Date,
  clearEnd: Date
): {
  toDelete: string[];
  toUpdate: { id: string; startDate: Date; endDate: Date }[];
  toCreate: { startDate: Date; endDate: Date; label: string }[];
} {
  const toDelete: string[] = [];
  const toUpdate: { id: string; startDate: Date; endDate: Date }[] = [];
  const toCreate: { startDate: Date; endDate: Date; label: string }[] = [];

  for (const alloc of existing) {
    if (!alloc.id) continue;
    const allocStart = new Date(alloc.startDate);
    const allocEnd = new Date(alloc.endDate);

    if (allocEnd < clearStart || allocStart > clearEnd) continue;

    if (allocStart >= clearStart && allocEnd <= clearEnd) {
      toDelete.push(alloc.id);
      continue;
    }

    if (allocStart >= clearStart && allocStart <= clearEnd && allocEnd > clearEnd) {
      toUpdate.push({ id: alloc.id, startDate: addDays(clearEnd, 1), endDate: allocEnd });
      continue;
    }

    if (allocEnd >= clearStart && allocEnd <= clearEnd && allocStart < clearStart) {
      toUpdate.push({ id: alloc.id, startDate: allocStart, endDate: addDays(clearStart, -1) });
      continue;
    }

    if (allocStart < clearStart && allocEnd > clearEnd) {
      toUpdate.push({ id: alloc.id, startDate: allocStart, endDate: addDays(clearStart, -1) });
      toCreate.push({ startDate: addDays(clearEnd, 1), endDate: allocEnd, label: alloc.label });
      continue;
    }
  }

  return { toDelete, toUpdate, toCreate };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
