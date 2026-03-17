import { ClipboardCheck, Users, UserSearch, FileText, Calculator, Link2, Building, FolderKanban, Receipt, CalendarRange, Briefcase, RefreshCw, ShieldCheck, Truck, FileCheck, type LucideIcon } from "lucide-react";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: LucideIcon;
  category: string;
  requiredGroupId?: string;
}

export interface CategoryDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const categories: CategoryDefinition[] = [
  { id: "personell", label: "Personell", icon: Users },
  { id: "evaluering", label: "Evaluering", icon: ClipboardCheck },
  { id: "estimering", label: "Estimering", icon: Calculator },
  { id: "kvalitet", label: "Kvalitet", icon: ShieldCheck },
  { id: "drift", label: "Drift", icon: Briefcase },
  { id: "planlegging", label: "Planlegging", icon: CalendarRange },
  { id: "integrasjoner", label: "Integrasjoner", icon: Link2 },
];

export const tools: ToolDefinition[] = [
  {
    id: "personnel-list",
    name: "Personelloversikt",
    description: "Samlet ansattportal med synk-status, kompetanse og HR-data",
    url: "/personell",
    icon: Users,
    category: "personell",
  },
  {
    id: "candidates",
    name: "Kandidater",
    description: "Kandidatoversikt fra RecMan — ikke-ansatte i kandidatpool",
    url: "/personell/kandidater",
    icon: UserSearch,
    category: "personell",
  },
  {
    id: "evaluations",
    name: "Evalueringer",
    description: "Oversikt over personellevalueringer",
    url: "/evaluering",
    icon: ClipboardCheck,
    category: "evaluering",
  },
  {
    id: "forms",
    name: "Skjema",
    description: "Delbare evalueringsskjemaer",
    url: "/skjema",
    icon: FileText,
    category: "evaluering",
  },
  {
    id: "estimates",
    name: "Estimater",
    description: "Prisberegning og estimering av arbeidspakker",
    url: "/estimering",
    icon: Calculator,
    category: "estimering",
  },
  {
    id: "product-catalog",
    name: "Produktkatalog",
    description: "Sok og bla i EFO-prislisten",
    url: "/estimering/katalog",
    icon: Receipt,
    category: "estimering",
  },
  {
    id: "suppliers",
    name: "Leverandører",
    description: "Leverandørregister med godkjenning og evaluering (ISO 9001)",
    url: "/leverandorer",
    icon: Truck,
    category: "kvalitet",
  },
  {
    id: "documents",
    name: "Dokumentkontroll",
    description: "Dokumentregister med versjonskontroll og godkjenning",
    url: "/dokumenter",
    icon: FileCheck,
    category: "kvalitet",
  },
  {
    id: "customers",
    name: "Kunder",
    description: "Kundeoversikt med kontaktpersoner og prosjekter",
    url: "/kunder",
    icon: Building,
    category: "drift",
  },
  {
    id: "projects",
    name: "Prosjekter",
    description: "Prosjekter under kunder",
    url: "/prosjekter",
    icon: FolderKanban,
    category: "drift",
  },
  {
    id: "jobs",
    name: "Jobber",
    description: "Jobber og oppdrag med bemanning",
    url: "/jobber",
    icon: Briefcase,
    category: "drift",
  },
  {
    id: "resource-plan",
    name: "Ressursplan",
    description: "Daglig ressursplanlegging og bemanningsoversikt",
    url: "/ressursplan",
    icon: CalendarRange,
    category: "planlegging",
  },
  {
    id: "rotation-patterns",
    name: "Rotasjonsmønstre",
    description: "Definer arbeidsmønstre for offshore/onshore",
    url: "/rotasjoner",
    icon: RefreshCw,
    category: "planlegging",
  },
  {
    id: "poweroffice-dashboard",
    name: "PowerOffice",
    description: "Synkronisering med PowerOffice Go",
    url: "/poweroffice",
    icon: Link2,
    category: "integrasjoner",
  },
  {
    id: "poweroffice-customers",
    name: "Kunder",
    description: "Kunder fra PowerOffice Go",
    url: "/poweroffice/kunder",
    icon: Building,
    category: "integrasjoner",
  },
  {
    id: "poweroffice-projects",
    name: "Prosjekter",
    description: "Prosjekter fra PowerOffice Go",
    url: "/poweroffice/prosjekter",
    icon: FolderKanban,
    category: "integrasjoner",
  },
  {
    id: "poweroffice-invoices",
    name: "Fakturaer",
    description: "Utgående fakturaer fra PowerOffice Go",
    url: "/poweroffice/fakturaer",
    icon: Receipt,
    category: "integrasjoner",
  },
];

export function getToolsByCategory(categoryId: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === categoryId);
}
