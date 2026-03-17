"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, FolderKanban, MapPin, Calendar, Eraser, ExternalLink } from "lucide-react";
import Link from "next/link";

interface AllocationPopoverProps {
  x: number;
  y: number;
  label: string;
  labelColor?: string;
  labelTextColor?: string;
  jobId?: string;
  jobName?: string;
  projectId?: string;
  projectName?: string;
  jobLocation?: string;
  date: string;
  source?: string;
  onClear: () => void;
  onClose: () => void;
}

export function AllocationPopover({
  x,
  y,
  label,
  labelColor,
  labelTextColor,
  jobId,
  jobName,
  projectId,
  projectName,
  jobLocation,
  date,
  source,
  onClear,
  onClose,
}: AllocationPopoverProps) {
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

  // Position the popover smartly to avoid overflow
  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 100,
  };

  if (typeof window !== "undefined") {
    const rightSpace = window.innerWidth - x;
    const bottomSpace = window.innerHeight - y;
    if (rightSpace < 280) {
      style.right = window.innerWidth - x;
    } else {
      style.left = x;
    }
    if (bottomSpace < 200) {
      style.bottom = window.innerHeight - y;
    } else {
      style.top = y;
    }
  }

  return (
    <div
      ref={ref}
      className="bg-white rounded-xl shadow-2xl border border-gray-200/80 w-[260px] overflow-hidden"
      style={style}
    >
      {/* Header with label color */}
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{
          backgroundColor: labelColor ?? "#6b7280",
          color: labelTextColor ?? "#ffffff",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{label}</p>
          <p className="text-[10px] opacity-80">
            {new Date(date).toLocaleDateString("nb-NO", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        {source === "JOB_GENERATED" && (
          <Badge className="text-[9px] bg-white/20 border-white/30 text-white shrink-0">
            Jobb
          </Badge>
        )}
      </div>

      {/* Job info */}
      {jobId && jobName && (
        <div className="px-3 py-2 border-b space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{jobName}</span>
          </div>
          {projectName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderKanban className="h-3 w-3 shrink-0" />
              <span className="truncate">{projectName}</span>
            </div>
          )}
          {jobLocation && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{jobLocation}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-2 flex flex-col gap-1">
        {jobId && (
          <Link href={`/jobber/${jobId}`} onClick={onClose}>
            <Button variant="ghost" size="sm" className="w-full justify-start h-7 text-xs gap-2">
              <Briefcase className="h-3 w-3" />
              \u00c5pne jobb
              <ExternalLink className="h-2.5 w-2.5 ml-auto text-muted-foreground" />
            </Button>
          </Link>
        )}
        {projectId && (
          <Link href={`/prosjekter/${projectId}`} onClick={onClose}>
            <Button variant="ghost" size="sm" className="w-full justify-start h-7 text-xs gap-2">
              <FolderKanban className="h-3 w-3" />
              \u00c5pne prosjekt
              <ExternalLink className="h-2.5 w-2.5 ml-auto text-muted-foreground" />
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-7 text-xs gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => { onClear(); onClose(); }}
        >
          <Eraser className="h-3 w-3" />
          Fjern allokering
        </Button>
      </div>
    </div>
  );
}
