"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotationPreview } from "./rotation-preview";
import { createRotationPattern, updateRotationPattern } from "@/app/(authenticated)/rotasjoner/actions";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { SegmentType } from "@/generated/prisma/client";

interface Segment {
  type: SegmentType;
  days: number;
  sortOrder: number;
  label?: string;
}

interface ExistingPattern {
  id: string;
  name: string;
  description: string | null;
  segments: { type: SegmentType; days: number; sortOrder: number; label: string | null }[];
}

interface RotationPatternFormProps {
  existing?: ExistingPattern;
  onClose: () => void;
  onSaved: () => void;
}

const SEGMENT_TYPES: { value: SegmentType; label: string }[] = [
  { value: "WORK", label: "Arbeid" },
  { value: "OFF", label: "Fri" },
  { value: "VACATION", label: "Ferie" },
  { value: "AVSPASERING", label: "Avspasering" },
  { value: "COURSE", label: "Kurs" },
];

export function RotationPatternForm({ existing, onClose, onSaved }: RotationPatternFormProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [segments, setSegments] = useState<Segment[]>(
    existing?.segments.map((s) => ({
      type: s.type,
      days: s.days,
      sortOrder: s.sortOrder,
      label: s.label ?? undefined,
    })) ?? [
      { type: "WORK", days: 14, sortOrder: 0 },
      { type: "OFF", days: 21, sortOrder: 1 },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDays = segments.reduce((s, seg) => s + seg.days, 0);

  const addSegment = () => {
    setSegments([...segments, { type: "OFF", days: 7, sortOrder: segments.length }]);
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, field: keyof Segment, value: string | number) => {
    setSegments(segments.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      segments: segments.map((s, i) => ({
        type: s.type,
        days: s.days,
        sortOrder: i,
        label: s.label,
      })),
    };

    const result = existing
      ? await updateRotationPattern({ id: existing.id, ...data })
      : await createRotationPattern(data);

    setSaving(false);

    if (result.success) {
      onSaved();
      onClose();
    } else {
      setError(result.message ?? "Noe gikk galt");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h2 className="text-base font-semibold">
            {existing ? "Rediger rotasjonsmønster" : "Nytt rotasjonsmønster"}
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <Label className="text-xs">Navn</Label>
            <Input
              className="h-8"
              placeholder="F.eks. 14-21 offshore"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Beskrivelse (valgfri)</Label>
            <Textarea
              className="text-sm"
              rows={2}
              placeholder="14 dager på, 21 dager av..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Segmenter</Label>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addSegment}>
                <Plus className="h-3 w-3" />
                Segment
              </Button>
            </div>

            <div className="space-y-2">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
                  <Select
                    value={seg.type}
                    onValueChange={(v: string | null) => v && updateSegment(i, "type", v)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 w-16 text-xs"
                    value={seg.days}
                    onChange={(e) => updateSegment(i, "days", parseInt(e.target.value) || 1)}
                  />
                  <span className="text-xs text-muted-foreground">dager</span>
                  <div className="flex-1" />
                  {segments.length > 1 && (
                    <button
                      className="text-red-400 hover:text-red-600"
                      onClick={() => removeSegment(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Forhåndsvisning</Label>
            <RotationPreview segments={segments} totalDays={totalDays} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Avbryt</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim() || segments.length === 0}>
            {saving ? "Lagrer..." : existing ? "Oppdater" : "Opprett"}
          </Button>
        </div>
      </div>
    </div>
  );
}
