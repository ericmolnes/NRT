"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface LinkedSystems {
  po: boolean;
  recman: boolean;
}

interface PersonnelCardTabsProps {
  linkedSystems: LinkedSystems;
}

export function PersonnelCardTabs({ linkedSystems }: PersonnelCardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "info";

  const tabs = useMemo(() => {
    const list: { id: string; label: string }[] = [
      { id: "info", label: "Oversikt" },
    ];

    if (linkedSystems.recman) {
      list.push({ id: "kompetanse", label: "Kompetanse" });
    }

    list.push(
      { id: "evalueringer", label: "Evalueringer" },
      { id: "notater", label: "Notater" },
      { id: "felter", label: "Felter" },
      { id: "jobber", label: "Jobber & Ressurs" },
    );

    if (linkedSystems.po || linkedSystems.recman) {
      list.push({ id: "synk", label: "Synk" });
    }

    return list;
  }, [linkedSystems]);

  return (
    <div className="flex border-b gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", tab.id);
            router.push(`?${params.toString()}`);
          }}
          className={cn(
            "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
