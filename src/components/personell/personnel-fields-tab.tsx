"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Plus, X } from "lucide-react";
import {
  createFieldCategory,
  deleteFieldCategory,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  type ActionState,
} from "@/app/(authenticated)/personell/[id]/actions";

interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  options: string | null;
  required: boolean;
  order: number;
}

interface Category {
  id: string;
  name: string;
  order: number;
  fields: FieldDefinition[];
}

interface PersonnelFieldsTabProps {
  personnelId: string;
  categories: Category[];
}

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Tekst",
  NUMBER: "Tall",
  DATE: "Dato",
  SELECT: "Nedtrekk",
  BOOLEAN: "Ja/Nei",
  TEXTAREA: "Fritekst",
};

export function PersonnelFieldsTab({
  personnelId,
  categories,
}: PersonnelFieldsTabProps) {
  const [createCatState, createCatAction, createCatPending] = useActionState<
    ActionState,
    FormData
  >(createFieldCategory, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ny kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCatAction} className="flex gap-4 items-end">
            <input type="hidden" name="personnelId" value={personnelId} />
            <div className="space-y-1 flex-1">
              <Label htmlFor="categoryName">Kategorinavn</Label>
              <Input
                id="categoryName"
                name="name"
                placeholder="F.eks. Størrelser, Sertifiseringer"
                required
              />
            </div>
            <div className="space-y-1 w-24">
              <Label htmlFor="categoryOrder">Rekkefølge</Label>
              <Input
                id="categoryOrder"
                name="order"
                type="number"
                defaultValue="0"
              />
            </div>
            <Button type="submit" disabled={createCatPending}>
              {createCatPending ? "Oppretter..." : "Opprett"}
            </Button>
          </form>
          {createCatState.message && (
            <p
              className={`text-sm mt-2 ${createCatState.success ? "text-emerald-600" : "text-destructive"}`}
            >
              {createCatState.message}
            </p>
          )}
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Ingen kategorier opprettet ennå. Opprett den første ovenfor.
          </p>
        </div>
      ) : (
        categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            personnelId={personnelId}
          />
        ))
      )}
    </div>
  );
}

function CategoryCard({
  category,
  personnelId,
}: {
  category: Category;
  personnelId: string;
}) {
  const [, deleteCatAction, deleteCatPending] = useActionState<
    ActionState,
    FormData
  >(deleteFieldCategory, {});
  const [showAddField, setShowAddField] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{category.name}</CardTitle>
          <form action={deleteCatAction}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="personnelId" value={personnelId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              disabled={deleteCatPending}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {category.fields.length > 0 && (
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                    Felt
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                    Valgmuligheter
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                    Påkrevd
                  </th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {category.fields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    personnelId={personnelId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAddField ? (
          <AddFieldForm
            categoryId={category.id}
            personnelId={personnelId}
            onClose={() => setShowAddField(false)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddField(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Legg til felt
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({
  field,
  personnelId,
}: {
  field: FieldDefinition;
  personnelId: string;
}) {
  const [, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteFieldDefinition,
    {}
  );
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState<
    ActionState,
    FormData
  >(updateFieldDefinition, {});
  const [editType, setEditType] = useState(field.type);

  if (editing) {
    return (
      <tr className="border-b last:border-b-0">
        <td colSpan={5} className="px-4 py-3">
          <form action={editAction} className="space-y-3">
            <input type="hidden" name="id" value={field.id} />
            <input type="hidden" name="personnelId" value={personnelId} />
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label>Feltnavn</Label>
                <Input name="name" defaultValue={field.name} required />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  name="type"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                >
                  <option value="TEXT">Tekst</option>
                  <option value="NUMBER">Tall</option>
                  <option value="DATE">Dato</option>
                  <option value="SELECT">Nedtrekk</option>
                  <option value="BOOLEAN">Ja/Nei</option>
                  <option value="TEXTAREA">Fritekst</option>
                </select>
              </div>
              {editType === "SELECT" && (
                <div className="space-y-1">
                  <Label>Valgmuligheter</Label>
                  <Input
                    name="options"
                    defaultValue={field.options ?? ""}
                    placeholder="S, M, L, XL"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Rekkefølge</Label>
                <Input
                  name="order"
                  type="number"
                  defaultValue={field.order}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="required"
                  value="true"
                  defaultChecked={field.required}
                  className="h-4 w-4 rounded border-input"
                />
                Påkrevd felt
              </label>
              <Button type="submit" size="sm" disabled={editPending}>
                {editPending ? "Lagrer..." : "Lagre"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Avbryt
              </Button>
            </div>
            {editState.message && (
              <p
                className={`text-sm ${editState.success ? "text-emerald-600" : "text-destructive"}`}
              >
                {editState.message}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2 text-sm">{field.name}</td>
      <td className="px-4 py-2">
        <Badge variant="secondary">
          {fieldTypeLabels[field.type] ?? field.type}
        </Badge>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {field.options ?? "-"}
      </td>
      <td className="px-4 py-2 text-sm">
        {field.required ? "Ja" : "Nei"}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={field.id} />
            <input type="hidden" name="personnelId" value={personnelId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              disabled={deletePending}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function AddFieldForm({
  categoryId,
  personnelId,
  onClose,
}: {
  categoryId: string;
  personnelId: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createFieldDefinition,
    {}
  );
  const [fieldType, setFieldType] = useState("TEXT");

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Legg til felt</p>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="personnelId" value={personnelId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={`fieldName-${categoryId}`}>Feltnavn</Label>
          <Input
            id={`fieldName-${categoryId}`}
            name="name"
            placeholder="F.eks. Skostørrelse"
            required
          />
          {state.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`fieldType-${categoryId}`}>Type</Label>
          <select
            id={`fieldType-${categoryId}`}
            name="type"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
          >
            <option value="TEXT">Tekst</option>
            <option value="NUMBER">Tall</option>
            <option value="DATE">Dato</option>
            <option value="SELECT">Nedtrekk</option>
            <option value="BOOLEAN">Ja/Nei</option>
            <option value="TEXTAREA">Fritekst</option>
          </select>
        </div>
        {fieldType === "SELECT" && (
          <div className="space-y-1">
            <Label htmlFor={`fieldOptions-${categoryId}`}>Valgmuligheter</Label>
            <Input
              id={`fieldOptions-${categoryId}`}
              name="options"
              placeholder="S, M, L, XL"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor={`fieldOrder-${categoryId}`}>Rekkefølge</Label>
          <Input
            id={`fieldOrder-${categoryId}`}
            name="order"
            type="number"
            defaultValue="0"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="required"
            value="true"
            className="h-4 w-4 rounded border-input"
          />
          Påkrevd felt
        </label>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Legger til..." : "Legg til felt"}
        </Button>
      </div>
      {state.message && (
        <p
          className={`text-sm ${state.success ? "text-emerald-600" : "text-destructive"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
