"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SupplierStatusBadge,
  SupplierTypeBadge,
  SeverityBadge,
  NCStatusBadge,
  CAPAStatusBadge,
} from "./supplier-status-badge";
import { SupplierEvaluationForm } from "./supplier-evaluation-form";
import { SupplierApprovalForm } from "./supplier-approval-form";
import { NonConformanceForm } from "./non-conformance-form";
import { CorrectiveActionForm } from "./corrective-action-form";
import { updateNCStatus, updateCAPA } from "@/app/(authenticated)/leverandorer/[id]/actions";
import {
  Star,
  AlertTriangle,
  Plus,
  ClipboardCheck,
  FileText,
  History,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

type SupplierData = {
  id: string;
  name: string;
  type: string;
  status: string;
  evaluations: Array<{
    id: string;
    qualityScore: number;
    deliveryScore: number;
    priceScore: number;
    hseScore: number;
    communicationScore: number;
    weightedTotal: number;
    period: string | null;
    comment: string | null;
    evaluatedByName: string;
    createdAt: Date;
    project: { id: string; name: string } | null;
  }>;
  nonConformances: Array<{
    id: string;
    ncNumber: string;
    title: string;
    description: string;
    severity: number;
    status: string;
    detectedDate: Date;
    reportedByName: string;
    closedDate: Date | null;
    actions: Array<{
      id: string;
      type: string;
      description: string;
      responsibleName: string;
      dueDate: Date;
      completedDate: Date | null;
      status: string;
      evidence: string | null;
    }>;
  }>;
  documents: Array<{
    id: string;
    description: string | null;
    document: { id: string; docNumber: string; title: string };
  }>;
  auditLog: Array<{
    id: string;
    action: string;
    details: string | null;
    userName: string;
    createdAt: Date;
  }>;
  isAdmin: boolean;
};

const tabs = [
  { id: "evaluations", label: "Evalueringer", icon: Star },
  { id: "nc", label: "Avvik", icon: AlertTriangle },
  { id: "documents", label: "Dokumenter", icon: FileText },
  { id: "log", label: "Logg", icon: History },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SupplierDetailTabs({ supplier }: { supplier: SupplierData }) {
  const [activeTab, setActiveTab] = useState<TabId>("evaluations");
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showNCForm, setShowNCForm] = useState(false);
  const [showCAPAForm, setShowCAPAForm] = useState<string | null>(null);

  const openNCs = supplier.nonConformances.filter(
    (nc) => nc.status !== "CLOSED" && nc.status !== "CANCELLED"
  );

  return (
    <div className="space-y-4">
      {/* Admin approval section */}
      {supplier.isAdmin && (supplier.status === "PENDING" || supplier.status === "EXPIRED") && (
        <div>
          {showApprovalForm ? (
            <SupplierApprovalForm
              supplierId={supplier.id}
              currentStatus={supplier.status}
              onDone={() => setShowApprovalForm(false)}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowApprovalForm(true)}
              className="border-dashed"
            >
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
              Godkjenn leverandør
            </Button>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === "evaluations"
              ? supplier.evaluations.length
              : tab.id === "nc"
              ? supplier.nonConformances.length
              : tab.id === "documents"
              ? supplier.documents.length
              : supplier.auditLog.length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className={`text-[9px] h-4 px-1.5 ${
                    tab.id === "nc" && openNCs.length > 0 ? "bg-red-100 text-red-700" : ""
                  }`}
                >
                  {tab.id === "nc" ? `${openNCs.length}/${count}` : count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "evaluations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Vektet scoring: Kvalitet 30%, Levering 25%, Pris 20%, HMS 15%, Kommunikasjon 10%
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowEvalForm(!showEvalForm)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ny evaluering
            </Button>
          </div>

          {showEvalForm && (
            <SupplierEvaluationForm
              supplierId={supplier.id}
              onDone={() => setShowEvalForm(false)}
            />
          )}

          {/* Evaluation history */}
          <div className="space-y-2">
            {supplier.evaluations.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-lg font-bold tabular-nums ${
                            ev.weightedTotal >= 80
                              ? "text-emerald-600"
                              : ev.weightedTotal >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {Math.round(ev.weightedTotal)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                        {ev.period && (
                          <Badge variant="secondary" className="text-[10px]">
                            {ev.period}
                          </Badge>
                        )}
                        {ev.project && (
                          <Badge variant="outline" className="text-[10px]">
                            {ev.project.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>K: {ev.qualityScore}</span>
                        <span>L: {ev.deliveryScore}</span>
                        <span>P: {ev.priceScore}</span>
                        <span>H: {ev.hseScore}</span>
                        <span>Komm: {ev.communicationScore}</span>
                      </div>
                      {ev.comment && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {ev.comment}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {ev.evaluatedByName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {supplier.evaluations.length === 0 && !showEvalForm && (
              <div className="flex flex-col items-center py-8 text-center">
                <Star className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ingen evalueringer ennå
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "nc" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {openNCs.length} åpne avvik av {supplier.nonConformances.length} totalt
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNCForm(!showNCForm)}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nytt avvik
            </Button>
          </div>

          {showNCForm && (
            <NonConformanceForm
              supplierId={supplier.id}
              onDone={() => setShowNCForm(false)}
            />
          )}

          {/* NC list */}
          <div className="space-y-3">
            {supplier.nonConformances.map((nc) => (
              <Card key={nc.id} className={nc.status !== "CLOSED" && nc.status !== "CANCELLED" ? "border-red-200/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {nc.ncNumber}
                        </span>
                        <SeverityBadge severity={nc.severity} />
                        <NCStatusBadge status={nc.status} />
                      </div>
                      <h4 className="text-sm font-medium">{nc.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {nc.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(nc.detectedDate).toLocaleDateString("nb-NO")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {nc.reportedByName}
                      </p>
                    </div>
                  </div>

                  {/* CAPA actions */}
                  {nc.actions.length > 0 && (
                    <div className="border-t pt-3 mt-3 space-y-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Korrigerende tiltak
                      </p>
                      {nc.actions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between gap-3 py-1.5 px-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs truncate">
                              {action.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {action.responsibleName}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {new Date(action.dueDate).toLocaleDateString("nb-NO")}
                            </span>
                            <CAPAStatusBadge status={action.status} />
                            {action.status === "OPEN" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px]"
                                onClick={async () => {
                                  await updateCAPA({ id: action.id, status: "IN_PROGRESS" });
                                }}
                              >
                                Start
                              </Button>
                            )}
                            {action.status === "IN_PROGRESS" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 px-1.5 text-[10px]"
                                onClick={async () => {
                                  await updateCAPA({
                                    id: action.id,
                                    status: "COMPLETED",
                                    completedDate: new Date().toISOString(),
                                  });
                                }}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions for open NCs */}
                  {nc.status !== "CLOSED" && nc.status !== "CANCELLED" && (
                    <div className="border-t pt-3 mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6"
                        onClick={() =>
                          setShowCAPAForm(showCAPAForm === nc.id ? null : nc.id)
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Tiltak
                      </Button>
                      {nc.actions.length > 0 &&
                        nc.actions.every(
                          (a) => a.status === "COMPLETED" || a.status === "VERIFIED" || a.status === "CLOSED"
                        ) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 border-emerald-300 text-emerald-700"
                            onClick={async () => {
                              await updateNCStatus(nc.id, "CLOSED");
                            }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Lukk avvik
                          </Button>
                        )}
                    </div>
                  )}

                  {showCAPAForm === nc.id && (
                    <div className="mt-3">
                      <CorrectiveActionForm
                        nonConformanceId={nc.id}
                        onDone={() => setShowCAPAForm(null)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {supplier.nonConformances.length === 0 && !showNCForm && (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ingen avvik registrert
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-2">
          {supplier.documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {doc.document.docNumber}
                    </span>
                    <p className="text-sm font-medium">{doc.document.title}</p>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {supplier.documents.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                Ingen dokumenter koblet
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "log" && (
        <div className="space-y-1">
          {supplier.auditLog.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/30"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{log.action}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {log.userName}
                  </span>
                </div>
                {log.details && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {log.details}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {new Date(log.createdAt).toLocaleString("nb-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          {supplier.auditLog.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Ingen logg</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
