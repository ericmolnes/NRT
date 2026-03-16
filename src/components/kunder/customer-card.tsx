"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addContact, deleteContact } from "@/app/(authenticated)/kunder/[id]/actions";
import { Plus, Trash2, Building, User, Mail, Phone, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
  status: string;
  _count: { jobs: number };
}

interface CustomerData {
  id: string;
  name: string;
  organizationNumber: string | null;
  emailAddress: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  industry: string | null;
  notes: string | null;
  poSyncStatus: string;
  contacts: Contact[];
  projects: Project[];
}

export function CustomerCard({ customer }: { customer: CustomerData }) {
  const [showContactForm, setShowContactForm] = useState(false);
  const router = useRouter();

  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addContact({
      customerId: customer.id,
      name: fd.get("name") as string,
      title: (fd.get("title") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
    });
    setShowContactForm(false);
    router.refresh();
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Fjern denne kontaktpersonen?")) return;
    await deleteContact(contactId, customer.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/kunder">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{customer.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {customer.organizationNumber && <span>Org: {customer.organizationNumber}</span>}
              {customer.industry && <span>· {customer.industry}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Kundeinformasjon</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {customer.emailAddress && (
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {customer.emailAddress}</div>
          )}
          {customer.phoneNumber && (
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {customer.phoneNumber}</div>
          )}
          {customer.address && <div>{customer.address}</div>}
          {customer.city && <div>{customer.postalCode} {customer.city}</div>}
        </div>
        {customer.notes && <p className="text-sm text-muted-foreground mt-3">{customer.notes}</p>}
      </Card>

      {/* Kontaktpersoner */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Kontaktpersoner ({customer.contacts.length})</h2>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowContactForm(true)}>
            <Plus className="h-3 w-3" /> Legg til
          </Button>
        </div>

        {showContactForm && (
          <form onSubmit={handleAddContact} className="flex items-end gap-2 p-2 bg-gray-50 rounded mb-3">
            <div className="flex-1">
              <Label className="text-xs">Navn</Label>
              <Input name="name" className="h-7 text-sm" required />
            </div>
            <div>
              <Label className="text-xs">Tittel</Label>
              <Input name="title" className="h-7 text-sm" placeholder="Prosjektleder" />
            </div>
            <div>
              <Label className="text-xs">E-post</Label>
              <Input name="email" type="email" className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input name="phone" className="h-7 text-sm" />
            </div>
            <Button type="submit" size="sm" className="h-7">Lagre</Button>
          </form>
        )}

        <div className="space-y-2">
          {customer.contacts.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 group">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-medium">{contact.name}</span>
                {contact.title && <span className="text-muted-foreground ml-2">{contact.title}</span>}
                {contact.isPrimary && <Badge variant="secondary" className="text-[9px] ml-2">Primær</Badge>}
              </div>
              {contact.email && <span className="text-xs text-muted-foreground">{contact.email}</span>}
              {contact.phone && <span className="text-xs text-muted-foreground">{contact.phone}</span>}
              <button
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                onClick={() => handleDeleteContact(contact.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {customer.contacts.length === 0 && !showContactForm && (
            <p className="text-xs text-muted-foreground text-center py-2">Ingen kontaktpersoner</p>
          )}
        </div>
      </Card>

      {/* Prosjekter */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Prosjekter ({customer.projects.length})</h2>
          <Link href={`/prosjekter/ny?customerId=${customer.id}`}>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Nytt prosjekt
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {customer.projects.map((project) => (
            <Link key={project.id} href={`/prosjekter/${project.id}`}>
              <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div>
                  <span className="text-sm font-medium">{project.name}</span>
                  {project.code && <span className="text-xs text-muted-foreground ml-2">({project.code})</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{project._count.jobs} jobber</span>
                  <Badge variant="outline" className="text-[10px]">{project.status}</Badge>
                </div>
              </div>
            </Link>
          ))}
          {customer.projects.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Ingen prosjekter</p>
          )}
        </div>
      </Card>
    </div>
  );
}
