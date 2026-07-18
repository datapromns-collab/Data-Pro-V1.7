"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Edits = Record<string, Record<string, string>>;

export default function OrdenTrabajoCelda({
  id,
  campo,
  valor,
  edits,
  onActualizar,
  tipo = "text",
  opciones,
  className = "",
}: {
  id: string;
  campo: string;
  valor: any;
  edits: Edits;
  onActualizar: (id: string, campo: string, valor: string) => void;
  tipo?: "text" | "time" | "date" | "select";
  opciones?: string[];
  className?: string;
}) {
  const value = edits[id]?.[campo] ?? (valor ?? "");
  if (tipo === "select") {
    return (
      <Select value={value ? String(value) : undefined} onValueChange={(v) => onActualizar(id, campo, v)}>
        <SelectTrigger className={`h-8 text-[10px] w-full bg-white border-slate-200 focus:bg-sky-50 ${className}`}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {(opciones || []).map((op) => (
            <SelectItem key={op} value={op} className="text-[10px]">{op}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={tipo}
      value={value}
      onChange={(e) => onActualizar(id, campo, e.target.value)}
      className={`h-8 text-[10px] w-full bg-white border-slate-200 focus:bg-sky-50 ${className}`}
    />
  );
}
