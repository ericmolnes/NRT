"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LabelDef } from "./allocation-color-map";
import { createLabel, updateLabel, deleteLabel } from "@/app/(authenticated)/ressursplan/actions";
import { Trash2, Plus } from "lucide-react";

interface LabelManagerProps {
  planId: string;
  labels: LabelDef[];
  onClose: () => void;
  onRefresh: () => void;
}

export function LabelManager({ planId, labels, onClose, onRefresh }: LabelManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [newTextColor, setNewTextColor] = useState("#ffffff");
  const [newCategory, setNewCategory] = useState<"client" | "status" | "internal">("client");
  const [editingId, setEditingId] = useState<string | null>(null);

  const grouped = {
    client: labels.filter((l) => l.category === "client"),
    internal: labels.filter((l) => l.category === "internal"),
    status: labels.filter((l) => l.category === "status"),
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createLabel({
      resourcePlanId: planId,
      name: newName.trim(),
      color: newColor,
      textColor: newTextColor,
      category: newCategory,
    });
    setNewName("");
    onRefresh();
  };

  const handleUpdate = async (id: string, data: Partial<{ name: string; color: string; textColor: string; category: string }>) => {
    await updateLabel({ id, ...data });
    setEditingId(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Slett denne labelen? Alle tilordninger med denne labelen fjernes.")) return;
    await deleteLabel(id);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Administrer tilordningstyper</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Lukk</Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Ny label */}
          <div className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-xs">Navn</Label>
              <Input
                className="h-8"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="F.eks. Equinor"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <Label className="text-xs">Farge</Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-8 w-10 rounded border cursor-pointer"
                />
                <input
                  type="color"
                  value={newTextColor}
                  onChange={(e) => setNewTextColor(e.target.value)}
                  className="h-8 w-10 rounded border cursor-pointer"
                  title="Tekstfarge"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={newCategory} onValueChange={(v: string | null) => v && setNewCategory(v as "client" | "status" | "internal")}>
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Klient</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="internal">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 gap-1" onClick={handleCreate}>
              <Plus className="h-3.5 w-3.5" />
              Legg til
            </Button>
          </div>

          {/* Eksisterende labels per kategori */}
          {(["client", "internal", "status"] as const).map((cat) => {
            const catLabels = grouped[cat];
            if (catLabels.length === 0) return null;
            const catNames = { client: "Klienter", internal: "Intern", status: "Statuser" };
            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">{catNames[cat]}</h3>
                <div className="space-y-1">
                  {catLabels.map((label) => (
                    <LabelRow
                      key={label.id}
                      label={label}
                      isEditing={editingId === label.id}
                      onStartEdit={() => setEditingId(label.id)}
                      onUpdate={(data) => handleUpdate(label.id, data)}
                      onDelete={() => handleDelete(label.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LabelRow({
  label,
  isEditing,
  onStartEdit,
  onUpdate,
  onDelete,
}: {
  label: LabelDef;
  isEditing: boolean;
  onStartEdit: () => void;
  onUpdate: (data: Partial<{ name: string; color: string; textColor: string }>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [textColor, setTextColor] = useState(label.textColor);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded">
        <Input
          className="h-7 flex-1 text-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onUpdate({ name, color, textColor })}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-8 rounded border cursor-pointer"
        />
        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="h-7 w-8 rounded border cursor-pointer"
          title="Tekstfarge"
        />
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onUpdate({ name, color, textColor })}>
          Lagre
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 group">
      <div
        className="w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: label.color, color: label.textColor }}
      >
        {label.name.slice(0, 2)}
      </div>
      <span className="text-sm flex-1">{label.name}</span>
      <button
        className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
        onClick={onStartEdit}
      >
        Rediger
      </button>
      <button
        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
