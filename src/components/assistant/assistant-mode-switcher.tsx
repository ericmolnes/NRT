"use client";

import type { ComponentType } from "react";
import { Bot, ClipboardList, ShieldQuestion, ZapOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AssistantUiMode = "PLAN" | "ASK" | "AUTO";

const modes: Array<{
  id: AssistantUiMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  tooltip: string;
}> = [
  {
    id: "PLAN",
    label: "Plan",
    icon: ClipboardList,
    tooltip: "Planmodus",
  },
  {
    id: "ASK",
    label: "Ask before edits",
    icon: ShieldQuestion,
    tooltip: "Krever bekreftelse",
  },
  {
    id: "AUTO",
    label: "Auto",
    icon: ZapOff,
    disabled: true,
    tooltip: "Ikke aktivert",
  },
];

export function AssistantModeSwitcher({
  value,
  onChange,
}: {
  value: AssistantUiMode;
  onChange: (value: AssistantUiMode) => void;
}) {
  return (
    <TooltipProvider>
      <div className="inline-grid w-full grid-cols-3 rounded-lg border bg-muted/30 p-1 sm:w-auto">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = value === mode.id;

          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={mode.disabled}
                    onClick={() => onChange(mode.id)}
                    className={cn(
                      "h-8 min-w-0 justify-center rounded-md px-2 text-xs",
                      active && "bg-background shadow-sm"
                    )}
                  />
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{mode.label}</span>
              </TooltipTrigger>
              <TooltipContent>{mode.tooltip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="sr-only" aria-live="polite">
        <Bot className="hidden" />
        Valgt modus: {value}
      </div>
    </TooltipProvider>
  );
}
