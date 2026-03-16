"use client";

import { useEffect, useRef } from "react";
import type { LabelDef } from "./allocation-color-map";
import { Eraser } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  labels: LabelDef[];
  currentLabel?: string;
  onAssign: (labelName: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, labels, currentLabel, onAssign, onClear, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  // Grupper
  const grouped = {
    client: labels.filter((l) => l.category === "client"),
    internal: labels.filter((l) => l.category === "internal"),
    status: labels.filter((l) => l.category === "status"),
  };

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white rounded-lg shadow-xl border py-1 min-w-[160px] max-h-[300px] overflow-auto"
      style={{ left: x, top: y }}
    >
      {currentLabel && (
        <>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 text-red-600"
            onClick={onClear}
          >
            <Eraser className="h-3.5 w-3.5" />
            Fjern &quot;{currentLabel}&quot;
          </button>
          <div className="border-t my-1" />
        </>
      )}

      {(["client", "internal", "status"] as const).map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            {cat !== "client" && <div className="border-t my-1" />}
            {items.map((label) => (
              <button
                key={label.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100"
                onClick={() => onAssign(label.name)}
              >
                <div
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className={label.name === currentLabel ? "font-semibold" : ""}>
                  {label.name}
                </span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
