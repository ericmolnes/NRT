"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateEntry, removeEntry } from "@/app/(authenticated)/ressursplan/actions";
import { Trash2 } from "lucide-react";

interface Entry {
  id: string;
  displayName: string;
  crew: string | null;
  company: string | null;
  location: string | null;
  notes: string | null;
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
      <div className="bg-white rounded-lg shadow-xl w-[400px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Rediger person</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Lukk</Button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Navn</Label>
            <Input className="h-8" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Crew</Label>
              <Input className="h-8" value={crew} onChange={(e) => setCrew(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Selskap</Label>
              <Input className="h-8" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Lokasjon</Label>
            <Input className="h-8" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notater</Label>
            <Textarea className="text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
