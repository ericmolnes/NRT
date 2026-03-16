"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { addContact, deleteContact } from "@/app/(authenticated)/kunder/[id]/actions";
import { Users, Plus, Trash2, User, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
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
    <div className="flex items-center gap-2.5">
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

export function CustomerContacts({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: Contact[];
}) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addContact({
      customerId,
      name: fd.get("name") as string,
      title: (fd.get("title") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
    });
    setShowForm(false);
    router.refresh();
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Fjern denne kontaktpersonen?")) return;
    await deleteContact(contactId, customerId);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle
          icon={Users}
          title="Kontaktpersoner"
          count={contacts.length}
        />
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3 w-3" />
          Legg til
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg mb-3"
        >
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Navn *</Label>
            <Input name="name" className="h-8 text-sm" required />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Tittel</Label>
            <Input name="title" className="h-8 text-sm" placeholder="Prosjektleder" />
          </div>
          <div>
            <Label className="text-xs">E-post</Label>
            <Input name="email" type="email" className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Telefon</Label>
            <Input name="phone" className="h-8 text-sm" />
          </div>
          <div className="col-span-2 flex items-center gap-2 pt-1">
            <Button type="submit" size="sm" className="text-xs">
              Lagre
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowForm(false)}
            >
              Avbryt
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-1">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {contact.name}
                </span>
                {contact.isPrimary && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                    Primar
                  </Badge>
                )}
              </div>
              {contact.title && (
                <span className="text-xs text-muted-foreground block truncate">
                  {contact.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" />
                  <span className="hidden xl:inline">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" />
                  <span className="hidden xl:inline">{contact.phone}</span>
                </a>
              )}
              <button
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(contact.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && !showForm && (
          <div className="flex flex-col items-center py-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Ingen kontaktpersoner lagt til
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
