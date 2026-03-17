"use client";

import { useEffect, useRef } from "react";
import type { LabelDef } from "./allocation-color-map";
import { Eraser, Briefcase, FolderKanban, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ContextMenuProps {
  x: number;
  y: number;
  labels: LabelDef[];
  currentLabel?: string;
  jobId?: string;
  jobName?: string;
  projectId?: string;
  projectName?: string;
  onAssign: (labelName: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  labels,
  currentLabel,
  jobId,
  jobName,
  projectId,
  projectName,
  onAssign,
  onClear,
  onClose,
}: ContextMenuProps) {
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

  const grouped = {
    client: labels.filter((l) => l.category === "client"),
    internal: labels.filter((l) => l.category === "internal"),
    status: labels.filter((l) => l.category === "status"),
  };

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-gray-200/80 py-1 min-w-[180px] max-h-[360px] overflow-auto"
      style={{ left: x, top: y }}
    >
      {/* Job navigation */}
      {jobId && jobName && (
        <>
          <Link
            href={`/jobber/${jobId}`}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[oklch(0.96_0.01_220)] text-[oklch(0.35_0.1_220)] font-medium"
            onClick={onClose}
          >
            <Briefcase className="h-3.5 w-3.5" />
            G\u00e5 til jobb: {jobName}
            <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-50" />
          </Link>
          {projectId && projectName && (
            <Link
              href={`/prosjekter/${projectId}`}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[oklch(0.96_0.01_220)] text-muted-foreground"
              onClick={onClose}
            >
              <FolderKanban className="h-3.5 w-3.5" />
              G\u00e5 til prosjekt: {projectName}
              <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-50" />
            </Link>
          )}
          <div className="border-t my-1" />
        </>
      )}

      {/* Clear current */}
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

      {/* Labels grouped by category */}
      {(["client", "internal", "status"] as const).map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            {cat !== "client" && <div className="border-t my-1" />}
            <div className="px-3 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              {cat === "client" ? "Klienter" : cat === "internal" ? "Intern" : "Status"}
            </div>
            {items.map((label) => (
              <button
                key={label.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                onClick={() => onAssign(label.name)}
              >
                <div
                  className="w-4 h-4 rounded shrink-0"
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
