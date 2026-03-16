"use client";

import { useState, useCallback, useRef } from "react";

export interface GridSelection {
  entryIds: string[];
  startDate: string;
  endDate: string;
}

export function useGridSelection() {
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const startRef = useRef<{ entryId: string; date: string } | null>(null);
  const currentEntriesRef = useRef<Set<string>>(new Set());

  const handleCellMouseDown = useCallback((entryId: string, date: string) => {
    startRef.current = { entryId, date };
    currentEntriesRef.current = new Set([entryId]);
    setIsSelecting(true);
    setSelection({
      entryIds: [entryId],
      startDate: date,
      endDate: date,
    });
  }, []);

  const handleCellMouseEnter = useCallback(
    (entryId: string, date: string) => {
      if (!isSelecting || !startRef.current) return;

      currentEntriesRef.current.add(entryId);
      const start = startRef.current.date;
      const startD = start < date ? start : date;
      const endD = start < date ? date : start;

      setSelection({
        entryIds: Array.from(currentEntriesRef.current),
        startDate: startD,
        endDate: endD,
      });
    },
    [isSelecting]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    startRef.current = null;
    currentEntriesRef.current.clear();
  }, []);

  return {
    selection,
    isSelecting,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    clearSelection,
  };
}
