import { Badge } from "@/components/ui/badge";

const categoryConfig: Record<string, { label: string; className: string }> = {
  PROCEDURE: {
    label: "Prosedyre",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  WORK_INSTRUCTION: {
    label: "Arbeidsinstruks",
    className: "bg-violet-500/15 text-violet-700 border-violet-300/50",
  },
  FORM_TEMPLATE: {
    label: "Skjema/Mal",
    className: "bg-teal-500/15 text-teal-700 border-teal-300/50",
  },
  POLICY: {
    label: "Retningslinje",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  RECORD: {
    label: "Registrering",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  EXTERNAL: {
    label: "Eksternt",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
};

const versionStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Utkast",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  REVIEW: {
    label: "Til godkjenning",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  APPROVED: {
    label: "Godkjent",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  OBSOLETE: {
    label: "Utgått",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
};

export function DocumentCategoryBadge({ category }: { category: string }) {
  const c = categoryConfig[category] ?? { label: category, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function VersionStatusBadge({ status }: { status: string }) {
  const c = versionStatusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}
