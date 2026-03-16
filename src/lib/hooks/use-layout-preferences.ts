"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface SectionPreference {
  visible: boolean;
  size: "full" | "half";
  order: number;
}

export interface LayoutPreferences {
  sections: Record<string, SectionPreference>;
}

const STORAGE_KEY = "nrt-personnel-layout";

const defaultPrefs: LayoutPreferences = { sections: {} };

// Cache to avoid creating new objects on every getSnapshot call
let cachedRaw: string | null = null;
let cachedPrefs: LayoutPreferences = defaultPrefs;

function getSnapshot(): LayoutPreferences {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedPrefs;
    cachedRaw = raw;
    cachedPrefs = raw ? JSON.parse(raw) : defaultPrefs;
    return cachedPrefs;
  } catch {
    return defaultPrefs;
  }
}

function getServerSnapshot(): LayoutPreferences {
  return defaultPrefs;
}

let listeners: Array<() => void> = [];

function emitChange() {
  // Invalidate cache so next getSnapshot re-parses
  cachedRaw = "\0";
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function save(prefs: LayoutPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  emitChange();
}

export function useLayoutPreferences() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const getSectionPref = useCallback(
    (sectionId: string, defaultOrder: number): SectionPreference => {
      return (
        prefs.sections[sectionId] ?? {
          visible: true,
          size: "full",
          order: defaultOrder,
        }
      );
    },
    [prefs]
  );

  const toggleVisibility = useCallback(
    (sectionId: string, defaultOrder: number) => {
      const current = getSnapshot();
      const existing = current.sections[sectionId] ?? {
        visible: true,
        size: "full" as const,
        order: defaultOrder,
      };
      save({
        ...current,
        sections: {
          ...current.sections,
          [sectionId]: { ...existing, visible: !existing.visible },
        },
      });
    },
    []
  );

  const toggleSize = useCallback(
    (sectionId: string, defaultOrder: number) => {
      const current = getSnapshot();
      const existing = current.sections[sectionId] ?? {
        visible: true,
        size: "full" as const,
        order: defaultOrder,
      };
      save({
        ...current,
        sections: {
          ...current.sections,
          [sectionId]: {
            ...existing,
            size: existing.size === "full" ? "half" : "full",
          },
        },
      });
    },
    []
  );

  const moveSection = useCallback(
    (sectionId: string, direction: "up" | "down", allSectionIds: string[]) => {
      const current = getSnapshot();
      const ordered = allSectionIds.map((id, i) => ({
        id,
        order: current.sections[id]?.order ?? i,
      }));
      ordered.sort((a, b) => a.order - b.order);

      const idx = ordered.findIndex((s) => s.id === sectionId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ordered.length) return;

      const sections = { ...current.sections };
      const thisOrder = ordered[idx].order;
      const swapOrder = ordered[swapIdx].order;
      sections[sectionId] = {
        ...(sections[sectionId] ?? { visible: true, size: "full" as const }),
        order: swapOrder,
      };
      sections[ordered[swapIdx].id] = {
        ...(sections[ordered[swapIdx].id] ?? {
          visible: true,
          size: "full" as const,
        }),
        order: thisOrder,
      };
      save({ ...current, sections });
    },
    []
  );

  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    emitChange();
  }, []);

  return {
    prefs,
    getSectionPref,
    toggleVisibility,
    toggleSize,
    moveSection,
    resetLayout,
  };
}
