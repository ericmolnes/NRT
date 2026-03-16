import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCustomerById } from "@/lib/queries/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerContacts } from "@/components/kunder/customer-contacts";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Hash,
  FolderKanban,
  Users,
  Briefcase,
  Link2,
  StickyNote,
  Factory,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Helpers ───

function TypeBadge({ type }: { type: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    customer: {
      label: "Kunde",
      className: "bg-blue-400/20 text-blue-200 border-blue-400/30",
    },
    prospect: {
      label: "Prospekt",
      className: "bg-amber-400/20 text-amber-200 border-amber-400/30",
    },
    collaborator: {
      label: "Samarbeidspartner",
      className: "bg-violet-400/20 text-violet-200 border-violet-400/30",
    },
    ownCompany: {
      label: "Eget selskap",
      className: "bg-emerald-400/20 text-emerald-200 border-emerald-400/30",
    },
  };
  const c = type ? config[type] : null;
  if (!c) return null;
  return (
    <Badge variant="outline" className={`text-[11px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  count,
  iconColor = "text-nrt-teal",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-lg bg-muted ${iconColor}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h2 className="font-display text-sm font-semibold tracking-tight">
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
          {count}
        </Badge>
      )}
    </div>
  );
}

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (!children || children === "\u2013") return null;
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right truncate">
        {children}
      </span>
    </div>
  );
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PLANNING: {
    label: "Planlegging",
    className: "bg-blue-500/15 text-blue-700 border-blue-300/50",
  },
  ACTIVE: {
    label: "Aktiv",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-300/50",
  },
  ON_HOLD: {
    label: "Pa vent",
    className: "bg-amber-500/15 text-amber-700 border-amber-300/50",
  },
  COMPLETED: {
    label: "Fullfort",
    className: "bg-zinc-500/15 text-zinc-600 border-zinc-300/50",
  },
  CANCELLED: {
    label: "Kansellert",
    className: "bg-red-500/15 text-red-600 border-red-300/50",
  },
};

// ─── Page ───

export default async function CustomerDetailPage({ params }: PageProps) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");

  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="stagger-in space-y-6 pb-12">
      {/* ═══════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.16_0.035_250)] text-white noise-texture">
        <div className="relative z-10 p-6 sm:p-8">
          {/* Top buttons */}
          <div className="absolute top-4 left-4 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
              render={<Link href="/kunder" />}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
              render={<Link href={`/kunder/${id}`} />}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Rediger
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6 pt-6 sm:pt-2">
            {/* Icon */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-2 ring-white/20 bg-[oklch(0.25_0.04_250)] flex items-center justify-center">
                <span className="font-display text-2xl sm:text-3xl font-bold text-white/80">
                  {initials}
                </span>
              </div>
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {customer.name}
                </h1>
                <TypeBadge type={customer.recmanCompanyType} />
                {customer.poCustomerId && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-blue-400/30 text-blue-200 bg-blue-400/10"
                  >
                    PowerOffice
                  </Badge>
                )}
                {customer.recmanCompanyId && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-400/30 text-emerald-200 bg-emerald-400/10"
                  >
                    Recman
                  </Badge>
                )}
              </div>

              {/* Key info row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-white/70">
                {customer.organizationNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    {customer.organizationNumber}
                  </span>
                )}
                {customer.emailAddress && (
                  <a
                    href={`mailto:${customer.emailAddress}`}
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {customer.emailAddress}
                  </a>
                )}
                {customer.phoneNumber && (
                  <a
                    href={`tel:${customer.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phoneNumber}
                  </a>
                )}
                {customer.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.postalCode} {customer.city}
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
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ─── Left column (wider) ─── */}
        <div className="space-y-6">
          {/* Prosjekter */}
          <Card>
            <CardContent className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <SectionTitle
                  icon={FolderKanban}
                  title="Prosjekter"
                  count={customer.projects.length}
                />
                <Link href={`/prosjekter/ny?customerId=${customer.id}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    + Nytt prosjekt
                  </Button>
                </Link>
              </div>
              <div className="space-y-1">
                {customer.projects.map((project) => {
                  const st = statusConfig[project.status] ?? {
                    label: project.status,
                    className: "",
                  };
                  return (
                    <Link key={project.id} href={`/prosjekter/${project.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium group-hover:text-primary truncate block">
                              {project.name}
                            </span>
                            {project.code && (
                              <span className="text-xs text-muted-foreground">
                                {project.code}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {project._count.jobs} jobber
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${st.className}`}
                          >
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {customer.projects.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <FolderKanban className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Ingen prosjekter enna
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kontaktpersoner */}
          <Card>
            <CardContent className="pt-1">
              <CustomerContacts
                customerId={customer.id}
                contacts={customer.contacts.map((c) => ({
                  id: c.id,
                  name: c.name,
                  title: c.title,
                  email: c.email,
                  phone: c.phone,
                  isPrimary: c.isPrimary,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* ─── Right column (narrower) ─── */}
        <div className="space-y-6">
          {/* Bedriftsinfo */}
          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={Building2} title="Bedriftsinfo" />
              <div className="divide-y">
                <DataRow label="Navn">{customer.name}</DataRow>
                <DataRow label="Org.nr">{customer.organizationNumber}</DataRow>
                <DataRow label="E-post">{customer.emailAddress}</DataRow>
                <DataRow label="Telefon">{customer.phoneNumber}</DataRow>
                <DataRow label="Adresse">{customer.address}</DataRow>
                <DataRow label="Poststed">
                  {customer.postalCode && customer.city
                    ? `${customer.postalCode} ${customer.city}`
                    : customer.city}
                </DataRow>
                <DataRow label="Land">{customer.country}</DataRow>
                <DataRow label="Bransje">{customer.industry}</DataRow>
              </div>
            </CardContent>
          </Card>

          {/* Synk-status */}
          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={Link2} title="Synk-status" iconColor="text-blue-500" />
              <div className="divide-y">
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">PowerOffice</span>
                  {customer.poCustomerId ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-blue-300/60 text-blue-700 bg-blue-50/50"
                    >
                      Koblet
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ikke koblet</span>
                  )}
                </div>
                {customer.poCustomer && (
                  <div className="py-2">
                    <span className="text-[10px] text-muted-foreground block">
                      PO ID: {String(customer.poCustomer.poId)}
                    </span>
                    {customer.poCustomer.organizationNumber && (
                      <span className="text-[10px] text-muted-foreground block">
                        PO Org: {customer.poCustomer.organizationNumber}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">Recman</span>
                  {customer.recmanCompanyId ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-300/60 text-emerald-700 bg-emerald-50/50"
                    >
                      Koblet
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ikke koblet</span>
                  )}
                </div>
                {customer.recmanCompanyId && (
                  <div className="py-2">
                    <span className="text-[10px] text-muted-foreground block">
                      Recman ID: {customer.recmanCompanyId}
                    </span>
                    {customer.recmanCompanyType && (
                      <span className="text-[10px] text-muted-foreground block">
                        Type: {customer.recmanCompanyType}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">PO-synk</span>
                  <SyncStatusBadge status={customer.poSyncStatus} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notater */}
          <Card>
            <CardContent className="pt-1">
              <SectionTitle icon={StickyNote} title="Notater" />
              {customer.notes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {customer.notes}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Ingen notater
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    SYNCED: {
      label: "Synkronisert",
      className: "border-emerald-300/50 text-emerald-700 bg-emerald-50/50",
    },
    NOT_SYNCED: {
      label: "Ikke synket",
      className: "",
    },
    PENDING_PUSH: {
      label: "Venter",
      className: "border-amber-300/50 text-amber-700 bg-amber-50/50",
    },
    PUSH_FAILED: {
      label: "Feilet",
      className: "border-red-300/50 text-red-600 bg-red-50/50",
    },
  };
  const c = config[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}
