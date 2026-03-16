"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerForm } from "./customer-form";
import { Plus, Building, Users } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  organizationNumber: string | null;
  emailAddress: string | null;
  phoneNumber: string | null;
  poSyncStatus: string;
  contacts: { name: string }[];
  _count: { projects: number; contacts: number };
}

export function CustomerListClient({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = search
    ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : customers;

  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Sok etter kunde..."
          className="h-9 max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex-1" />
        <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Ny kunde
        </Button>
      </div>

      <div className="grid gap-3">
        {filtered.map((customer) => (
          <Link key={customer.id} href={`/kunder/${customer.id}`}>
            <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{customer.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {customer.organizationNumber && <span>Org: {customer.organizationNumber}</span>}
                      {customer.emailAddress && <span>{customer.emailAddress}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {customer._count.contacts} kontakter
                  </span>
                  <span>{customer._count.projects} prosjekter</span>
                  <SyncBadge status={customer.poSyncStatus} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Ingen kunder funnet</p>
        )}
      </div>

      {showForm && (
        <CustomerForm onClose={() => setShowForm(false)} />
      )}
    </>
  );
}

function SyncBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    SYNCED: { label: "Synkronisert", variant: "default" },
    NOT_SYNCED: { label: "Ikke synket", variant: "secondary" },
    PENDING_PUSH: { label: "Venter...", variant: "outline" },
    PUSH_FAILED: { label: "Sync feilet", variant: "destructive" },
  };
  const info = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
}
