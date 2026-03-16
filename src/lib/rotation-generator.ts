import type { SegmentType } from "@/generated/prisma/client";

interface RotationSegmentInput {
  type: SegmentType;
  days: number;
  sortOrder: number;
  label?: string | null;
}

interface GeneratedAllocation {
  startDate: Date;
  endDate: Date;
  label: string;
}

const SEGMENT_LABEL_MAP: Record<string, string> = {
  VACATION: "Ferie",
  AVSPASERING: "Avspasering",
  COURSE: "Kurs",
};

/**
 * Generer alle allokeringer for en rotasjon innen et tidsrom.
 *
 * For WORK-segmenter brukes jobbens label.
 * For OFF-segmenter genereres ingen allokeringer (fri = tom celle).
 * For VACATION/AVSPASERING/COURSE brukes standard-labels.
 */
export function generateRotationAllocations(
  startDate: Date,
  endDate: Date,
  segments: RotationSegmentInput[],
  jobLabel: string
): GeneratedAllocation[] {
  const allocations: GeneratedAllocation[] = [];
  const sorted = [...segments].sort((a, b) => a.sortOrder - b.sortOrder);

  if (sorted.length === 0) return allocations;

  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    for (const segment of sorted) {
      if (cursor > endDate) break;

      const segStart = new Date(cursor);
      const segEnd = new Date(cursor);
      segEnd.setDate(segEnd.getDate() + segment.days - 1);

      // Klipp til endDate
      if (segEnd > endDate) {
        segEnd.setTime(endDate.getTime());
      }

      // OFF = ingen allokering (fri)
      if (segment.type !== "OFF") {
        const label = segment.type === "WORK"
          ? jobLabel
          : (segment.label ?? SEGMENT_LABEL_MAP[segment.type] ?? segment.type);

        allocations.push({
          startDate: new Date(segStart),
          endDate: new Date(segEnd),
          label,
        });
      }

      // Flytt cursor til neste segment
      cursor.setDate(cursor.getDate() + segment.days);
    }
  }

  return allocations;
}

/**
 * Regenerer allokeringer for en JobAssignment.
 * Fjerner alle JOB_GENERATED allokeringer og oppretter nye,
 * men beholder JOB_OVERRIDDEN allokeringer.
 */
export function filterOutOverriddenDates(
  generated: GeneratedAllocation[],
  overriddenRanges: { startDate: Date; endDate: Date }[]
): GeneratedAllocation[] {
  if (overriddenRanges.length === 0) return generated;

  const result: GeneratedAllocation[] = [];

  for (const alloc of generated) {
    let remaining = [{ start: alloc.startDate, end: alloc.endDate }];

    for (const override of overriddenRanges) {
      const newRemaining: { start: Date; end: Date }[] = [];
      for (const r of remaining) {
        // Ingen overlapp
        if (r.end < override.startDate || r.start > override.endDate) {
          newRemaining.push(r);
          continue;
        }
        // Delvis overlapp — klipp
        if (r.start < override.startDate) {
          newRemaining.push({ start: r.start, end: addDays(override.startDate, -1) });
        }
        if (r.end > override.endDate) {
          newRemaining.push({ start: addDays(override.endDate, 1), end: r.end });
        }
      }
      remaining = newRemaining;
    }

    for (const r of remaining) {
      result.push({ startDate: r.start, endDate: r.end, label: alloc.label });
    }
  }

  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
