"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VersionStatusBadge } from "./document-status-badge";
import { SupplierStatusBadge } from "@/components/leverandorer/supplier-status-badge";
import {
  createVersion,
  submitForReview,
  approveVersion,
  linkDocumentSupplier,
  unlinkDocumentSupplier,
} from "@/app/(authenticated)/dokumenter/[id]/actions";
import {
  Layers,
  Truck,
  History,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Archive,
  ExternalLink,
  Trash2,
} from "lucide-react";

type DocumentData = {
  id: string;
  docNumber: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    changeDescription: string | null;
    fileName: string | null;
    fileUrl: string | null;
    sharePointUrl: string | null;
    isCurrent: boolean;
    approvedAt: Date | null;
    approvedByName: string | null;
    createdByName: string;
    createdAt: Date;
  }>;
  supplierLinks: Array<{
    id: string;
    description: string | null;
    supplier: { id: string; name: string; status: string };
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
  { id: "versions", label: "Versjoner", icon: Layers },
  { id: "suppliers", label: "Leverandører", icon: Truck },
  { id: "log", label: "Logg", icon: History },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function DocumentDetailTabs({ doc }: { doc: DocumentData }) {
  const [activeTab, setActiveTab] = useState<TabId>("versions");
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showLinkSupplier, setShowLinkSupplier] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNewVersion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await createVersion({
      documentId: doc.id,
      changeDescription: (fd.get("changeDescription") as string) || undefined,
      fileName: (fd.get("fileName") as string) || undefined,
      fileUrl: (fd.get("fileUrl") as string) || undefined,
    });
    setSaving(false);
    setShowNewVersion(false);
  };

  const handleLinkSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await linkDocumentSupplier({
      documentId: doc.id,
      supplierId: fd.get("supplierId") as string,
      description: (fd.get("description") as string) || undefined,
    });
    setSaving(false);
    setShowLinkSupplier(false);
  };

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === "versions"
              ? doc.versions.length
              : tab.id === "suppliers"
              ? doc.supplierLinks.length
              : doc.auditLog.length;
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
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Versions tab */}
      {activeTab === "versions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {doc.versions.length} versjoner
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewVersion(!showNewVersion)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ny versjon
            </Button>
          </div>

          {showNewVersion && (
            <Card className="border-dashed">
              <CardContent className="p-5">
                <h3 className="font-display text-sm font-semibold mb-4">
                  Opprett ny versjon
                </h3>
                <form onSubmit={handleNewVersion} className="space-y-3">
                  <div>
                    <Label className="text-xs">Endringsbeskrivelse</Label>
                    <Textarea
                      name="changeDescription"
                      rows={2}
                      className="text-sm mt-1"
                      placeholder="Hva er endret..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Filnavn</Label>
                      <Input name="fileName" className="h-9 mt-1" placeholder="dokument.pdf" />
                    </div>
                    <div>
                      <Label className="text-xs">Fil-URL</Label>
                      <Input name="fileUrl" className="h-9 mt-1" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewVersion(false)}
                    >
                      Avbryt
                    </Button>
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Oppretter..." : "Opprett versjon"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Version timeline */}
          <div className="space-y-2">
            {doc.versions.map((version) => (
              <Card
                key={version.id}
                className={version.isCurrent ? "ring-1 ring-primary/30" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          v{version.versionNumber}
                        </span>
                        <VersionStatusBadge status={version.status} />
                        {version.isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-primary/10 text-primary border-primary/30"
                          >
                            Gjeldende
                          </Badge>
                        )}
                      </div>
                      {version.changeDescription && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {version.changeDescription}
                        </p>
                      )}
                      {version.fileName && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            📎 {version.fileName}
                          </span>
                          {version.sharePointUrl && (
                            <a
                              href={version.sharePointUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              SharePoint
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                      {version.approvedByName && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Godkjent av {version.approvedByName}{" "}
                          {version.approvedAt
                            ? new Date(version.approvedAt).toLocaleDateString("nb-NO")
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {version.createdByName}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(version.createdAt).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  </div>

                  {/* Version actions */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    {version.status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6"
                        onClick={async () => {
                          await submitForReview(version.id);
                        }}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send til godkjenning
                      </Button>
                    )}
                    {version.status === "REVIEW" && doc.isAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 border-emerald-300 text-emerald-700"
                          onClick={async () => {
                            await approveVersion({ id: version.id, action: "APPROVE" });
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Godkjenn
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 border-red-300 text-red-600"
                          onClick={async () => {
                            await approveVersion({ id: version.id, action: "REJECT" });
                          }}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Avvis
                        </Button>
                      </>
                    )}
                    {version.status === "APPROVED" && doc.isAdmin && !version.isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6"
                        onClick={async () => {
                          await approveVersion({ id: version.id, action: "OBSOLETE" });
                        }}
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        Merk utgått
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers tab */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Leverandører koblet til dette dokumentet
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLinkSupplier(!showLinkSupplier)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Koble leverandør
            </Button>
          </div>

          {showLinkSupplier && (
            <Card className="border-dashed">
              <CardContent className="p-5">
                <form onSubmit={handleLinkSupplier} className="space-y-3">
                  <div>
                    <Label className="text-xs">Leverandør-ID</Label>
                    <Input name="supplierId" className="h-9 mt-1" required placeholder="Leverandør-ID" />
                  </div>
                  <div>
                    <Label className="text-xs">Beskrivelse</Label>
                    <Input name="description" className="h-9 mt-1" placeholder="f.eks. ISO 9001 sertifikat" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowLinkSupplier(false)}>
                      Avbryt
                    </Button>
                    <Button type="submit" size="sm" disabled={saving}>
                      Koble
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {doc.supplierLinks.map((link) => (
              <Card key={link.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{link.supplier.name}</p>
                      {link.description && (
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      )}
                    </div>
                    <SupplierStatusBadge status={link.supplier.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                    onClick={async () => {
                      await unlinkDocumentSupplier(link.id, doc.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {doc.supplierLinks.length === 0 && !showLinkSupplier && (
              <div className="flex flex-col items-center py-8 text-center">
                <Truck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Ingen leverandører koblet
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === "log" && (
        <div className="space-y-1">
          {doc.auditLog.map((log) => (
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
          {doc.auditLog.length === 0 && (
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
