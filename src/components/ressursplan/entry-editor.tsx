"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateEntry, removeEntry } from "@/app/(authenticated)/ressursplan/actions";
import { Trash2, ExternalLink, User } from "lucide-react";
import Link from "next/link";

interface Entry {
  id: string;
  displayName: string;
  crew: string | null;
  company: string | null;
  location: string | null;
  notes: string | null;
  personnel?: { id: string; name: string; status: string } | null;
}

interface EntryEditorProps {
  entry: Entry;
  onClose: () => void;
  onRefresh: () => void;
}

export function EntryEditor({ entry, onClose, onRefresh }: EntryEditorProps) {
  const [name, setName] = useState(entry.displayName);
  const [crew, setCrew] = useState(entry.crew ?? "");
  const [company, setCompany] = useState(entry.company ?? "");
  const [location, setLocation] = useState(entry.location ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");

  const handleSave = async () => {
    const fd = new FormData();
    fd.set("id", entry.id);
    fd.set("displayName", name);
    fd.set("crew", crew);
    fd.set("company", company);
    fd.set("location", location);
    fd.set("notes", notes);
    await updateEntry({}, fd);
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Fjern ${entry.displayName} fra ressursplanen? Alle tilordninger slettes.`)) return;
    const fd = new FormData();
    fd.set("id", entry.id);
    await removeEntry({}, fd);
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[420px] flex flex-col border border-gray-200/80" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.16_0.035_250)]/10 flex items-center justify-center">
              <User className="h-4 w-4 text-[oklch(0.16_0.035_250)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Rediger person
              </h2>
              {entry.personnel && (
                <Link
                  href={`/personell/${entry.personnel.id}`}
                  className="text-[10px] text-[oklch(0.68_0.155_220)] hover:underline inline-flex items-center gap-0.5"
                >
                  G\u00e5 til profil
                  <ExternalLink className="h-2 w-2" />
                </Link>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Lukk</Button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Navn</Label>
            <Input className="h-8 mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Crew</Label>
              <Input className="h-8 mt-1" value={crew} onChange={(e) => setCrew(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Selskap</Label>
              <Input className="h-8 mt-1" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Lokasjon</Label>
            <Input className="h-8 mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notater</Label>
            <Textarea className="text-sm mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <Button variant="destructive" size="sm" className="gap-1" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Slett
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Avbryt</Button>
            <Button size="sm" onClick={handleSave}>Lagre</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
