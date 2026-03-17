import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Venter",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  APPROVED: {
    label: "Godkjent",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  CONDITIONAL: {
    label: "Betinget",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  REJECTED: {
    label: "Avvist",
    className: "bg-red-500/15 text-red-600 border-red-300/50",
  },
  EXPIRED: {
    label: "Utløpt",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
};

const typeConfig: Record<string, { label: string; className: string }> = {
  MATERIAL: {
    label: "Materiell",
    className: "bg-sky-500/15 text-sky-700 border-sky-300/50",
  },
  SERVICE: {
    label: "Tjeneste",
    className: "bg-violet-500/15 text-violet-700 border-violet-300/50",
  },
  EQUIPMENT: {
    label: "Utstyr",
    className: "bg-orange-500/15 text-orange-700 border-orange-300/50",
  },
  RENTAL: {
    label: "Utleie",
    className: "bg-teal-500/15 text-teal-700 border-teal-300/50",
  },
};

const severityConfig: Record<number, { label: string; className: string }> = {
  1: {
    label: "Mindre",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  2: {
    label: "Alvorlig",
    className: "bg-orange-500/15 text-orange-700 border-orange-300/50",
  },
  3: {
    label: "Kritisk",
    className: "bg-red-500/15 text-red-600 border-red-300/50",
  },
};

const ncStatusConfig: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Åpen",
    className: "bg-red-500/15 text-red-600 border-red-300/50",
  },
  INVESTIGATING: {
    label: "Under etterforskning",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  ACTION_REQUIRED: {
    label: "Tiltak påkrevd",
    className: "bg-orange-500/15 text-orange-700 border-orange-300/50",
  },
  CLOSED: {
    label: "Lukket",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  CANCELLED: {
    label: "Kansellert",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
};

const capaStatusConfig: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: "Åpen",
    className: "bg-red-500/15 text-red-600 border-red-300/50",
  },
  IN_PROGRESS: {
    label: "Pågår",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  COMPLETED: {
    label: "Fullført",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  VERIFIED: {
    label: "Verifisert",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  CLOSED: {
    label: "Lukket",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
};

export function SupplierStatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function SupplierTypeBadge({ type }: { type: string }) {
  const c = typeConfig[type] ?? { label: type, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: number }) {
  const c = severityConfig[severity] ?? { label: `Nivå ${severity}`, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function NCStatusBadge({ status }: { status: string }) {
  const c = ncStatusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function CAPAStatusBadge({ status }: { status: string }) {
  const c = capaStatusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}
