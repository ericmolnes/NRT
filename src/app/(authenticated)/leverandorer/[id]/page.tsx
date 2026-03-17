import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSupplierById } from "@/lib/queries/suppliers";
import { isAdmin } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierStatusBadge, SupplierTypeBadge } from "@/components/leverandorer/supplier-status-badge";
import { SupplierDetailTabs } from "@/components/leverandorer/supplier-detail-tabs";
import {
  ArrowLeft,
  Truck,
  Mail,
  Phone,
  MapPin,
  Hash,
  Globe,
  User,
  Calendar,
  Building2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">{children}</span>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  iconColor = "text-nrt-teal",
}: {
  icon: React.ElementType;
  title: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-muted ${iconColor}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");

  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  const admin = await isAdmin();

  const initials = supplier.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avgScore =
    supplier.evaluations.length > 0
      ? Math.round(
          supplier.evaluations.reduce((sum, e) => sum + e.weightedTotal, 0) /
            supplier.evaluations.length
        )
      : null;

  return (
    <div className="stagger-in space-y-6 pb-12">
      {/* ═══════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.16_0.035_250)] text-white noise-texture">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
              render={<Link href="/leverandorer" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6 pt-6 sm:pt-2">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-2 ring-white/20 bg-[oklch(0.25_0.04_250)] flex items-center justify-center">
                <span className="font-display text-2xl sm:text-3xl font-bold text-white/80">
                  {initials}
                </span>
              </div>
              {supplier.status === "APPROVED" && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-[oklch(0.16_0.035_250)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {supplier.name}
                </h1>
                <SupplierStatusBadge status={supplier.status} />
                <SupplierTypeBadge type={supplier.type} />
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-white/70">
                {supplier.organizationNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    {supplier.organizationNumber}
                  </span>
                )}
                {supplier.email && (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {supplier.email}
                  </a>
                )}
                {supplier.phone && (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {supplier.phone}
                  </a>
                )}
                {supplier.contactPerson && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {supplier.contactPerson}
                  </span>
                )}
                {avgScore !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      avgScore >= 80 ? "text-emerald-300" : avgScore >= 60 ? "text-amber-300" : "text-red-300"
                    }`}
                  >
                    Snitt: {avgScore}/100
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          TWO-COLUMN LAYOUT
          ═══════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column — Tabs */}
        <div>
          <SupplierDetailTabs
            supplier={{
              id: supplier.id,
              name: supplier.name,
              type: supplier.type,
              status: supplier.status,
              evaluations: supplier.evaluations.map((e) => ({
                ...e,
                createdAt: e.createdAt,
                project: e.project,
              })),
              nonConformances: supplier.nonConformances.map((nc) => ({
                ...nc,
                detectedDate: nc.detectedDate,
                actions: nc.actions.map((a) => ({
                  ...a,
                  dueDate: a.dueDate,
                  completedDate: a.completedDate,
                })),
              })),
              documents: supplier.documents.map((d) => ({
                ...d,
                document: d.document,
              })),
              auditLog: supplier.auditLog.map((l) => ({
                ...l,
                createdAt: l.createdAt,
              })),
              isAdmin: admin,
            }}
          />
        </div>

        {/* Right column — Info sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={Truck} title="Leverandørinfo" />
              <div className="divide-y">
                <DataRow label="Navn">{supplier.name}</DataRow>
                <DataRow label="Org.nr">{supplier.organizationNumber}</DataRow>
                <DataRow label="Type">
                  <SupplierTypeBadge type={supplier.type} />
                </DataRow>
                <DataRow label="E-post">{supplier.email}</DataRow>
                <DataRow label="Telefon">{supplier.phone}</DataRow>
                <DataRow label="Kontakt">{supplier.contactPerson}</DataRow>
                <DataRow label="Nettside">
                  {supplier.website && (
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {supplier.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </DataRow>
                <DataRow label="Adresse">{supplier.address}</DataRow>
                <DataRow label="Poststed">
                  {supplier.postalCode && supplier.city
                    ? `${supplier.postalCode} ${supplier.city}`
                    : supplier.city}
                </DataRow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={ShieldCheck} title="Godkjenning" iconColor="text-emerald-500" />
              <div className="divide-y">
                <DataRow label="Status">
                  <SupplierStatusBadge status={supplier.status} />
                </DataRow>
                {supplier.approvedAt && (
                  <DataRow label="Godkjent">
                    {new Date(supplier.approvedAt).toLocaleDateString("nb-NO")}
                  </DataRow>
                )}
                {supplier.approvedByName && (
                  <DataRow label="Godkjent av">{supplier.approvedByName}</DataRow>
                )}
                {supplier.expiresAt && (
                  <DataRow label="Utløper">
                    {new Date(supplier.expiresAt).toLocaleDateString("nb-NO")}
                  </DataRow>
                )}
              </div>
            </CardContent>
          </Card>

          {supplier.customer && (
            <Card>
              <CardContent className="pt-1">
                <SectionTitle icon={Building2} title="Koblet kunde" />
                <Link
                  href={`/kunder/${supplier.customer.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {supplier.customer.name}
                </Link>
              </CardContent>
            </Card>
          )}

          {supplier.notes && (
            <Card>
              <CardContent className="pt-1">
                <SectionTitle icon={Truck} title="Notater" />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {supplier.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
