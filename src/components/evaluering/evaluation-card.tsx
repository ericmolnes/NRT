"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/evaluering/score-badge";
import { EVALUATION_CRITERIA } from "@/lib/validations/evaluation";
import type { GroupedEvaluation } from "@/lib/queries/evaluations";
import {
  User,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface EvaluationCardProps {
  group: GroupedEvaluation;
}

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-600";
  if (score >= 5) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number) {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTrackBg(score: number) {
  if (score >= 8) return "bg-emerald-500/15";
  if (score >= 5) return "bg-amber-500/15";
  return "bg-red-500/15";
}

export function EvaluationCard({ group }: EvaluationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="card-hover overflow-hidden">
      {/* Main card header */}
      <CardContent className="p-0">
        <div className="flex items-center gap-5 p-5">
          {/* Avatar / icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-secondary">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Link
                href={`/personell/${group.personnelId}`}
                className="font-semibold text-[15px] truncate hover:underline"
              >
                {group.name}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs font-normal px-2 py-0">
                {group.role}
              </Badge>
            </div>
          </div>

          {/* Score display */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold tabular-nums ${scoreColor(group.avgScore)}`}>
                {group.avgScore.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            {/* Score bar */}
            <div className={`w-24 h-1.5 rounded-full mt-1.5 ${scoreTrackBg(group.avgScore)}`}>
              <div
                className={`h-1.5 rounded-full transition-all ${scoreBg(group.avgScore)}`}
                style={{ width: `${group.avgScore * 10}%` }}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="flex-shrink-0 hidden sm:block text-right pl-3 border-l border-border">
            <p className="text-sm font-medium tabular-nums">
              {group.evaluationCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {group.evaluationCount === 1 ? "evaluering" : "evalueringer"}
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Siste: {group.latestDate.toLocaleDateString("nb-NO")} av{" "}
              {group.latestEvaluator}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              render={<Link href="/skjema" />}
            >
              <ExternalLink className="w-3 h-3" />
              Evalueringsskjema
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
              {expanded ? "Skjul" : "Se evalueringer"}
            </Button>
          </div>
        </div>

        {/* Expanded evaluation list */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-border">
            {group.evaluations.map((ev, idx) => (
              <div
                key={ev.id}
                className={`px-5 py-4 ${
                  idx < group.evaluations.length - 1
                    ? "border-b border-border/40"
                    : ""
                }`}
              >
                {/* Evaluation header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {ev.createdAt.toLocaleDateString("nb-NO")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      av {ev.evaluatorName}
                    </span>
                  </div>
                  <ScoreBadge score={ev.score} />
                </div>

                {/* Criteria scores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mb-2">
                  {(() => {
                    if (
                      ev.criteriaScores &&
                      Object.keys(ev.criteriaScores).length > 0
                    ) {
                      // Custom criteria
                      const parentKeys = Object.keys(ev.criteriaScores).filter(
                        (k) => !k.includes(".")
                      );
                      return parentKeys.map((key) => {
                        const value = ev.criteriaScores![key];
                        return (
                          <div key={key} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground truncate">
                              {key}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-8 h-1 rounded-full ${scoreTrackBg(value)}`}>
                                <div
                                  className={`h-1 rounded-full ${scoreBg(value)}`}
                                  style={{ width: `${value * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium tabular-nums w-7 text-right">
                                {value}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    }
                    // Default fixed criteria
                    return EVALUATION_CRITERIA.map((c) => {
                      const value = ev[c.key as keyof typeof ev] as number;
                      return (
                        <div key={c.key} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {c.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-8 h-1 rounded-full ${scoreTrackBg(value)}`}>
                              <div
                                className={`h-1 rounded-full ${scoreBg(value)}`}
                                style={{ width: `${value * 10}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums w-7 text-right">
                              {value}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Comment */}
                {ev.comment && (
                  <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md bg-muted/50">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {ev.comment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
