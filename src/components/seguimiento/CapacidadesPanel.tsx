"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PRODUCTION_LINES } from "@/lib/hpv2-mock-data";
import { FixedCapacityStore } from "@/lib/hpv2-types";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeguimiento } from "./EnfardadoraPanel";

interface CapacidadesPanelProps {
  storageKey?: string;
  readOnly?: boolean;
}

export default function CapacidadesPanel({ storageKey, readOnly = false }: CapacidadesPanelProps) {
  const { data, setData } = useSeguimiento();
  const [capacities, setCapacities] = useState<FixedCapacityStore>({});
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const next = data.fixedCapacities && Object.keys(data.fixedCapacities).length > 0
      ? data.fixedCapacities
      : (() => {
          const initial: FixedCapacityStore = {};
          PRODUCTION_LINES.forEach((line) => { initial[line.id] = ""; });
          return initial;
        })();
    setCapacities(next);
    setHasHydrated(true);
  }, [data.fixedCapacities]);

  const handleUpdate = (lineId: string, value: string) => {
    setCapacities((prev) => ({
      ...prev,
      [lineId]: value
    }));
  };

  const handleSave = () => {
    if (readOnly) return;
    setData((prev) => ({ ...prev, fixedCapacities: capacities }));
    alert("Capacidades guardadas correctamente");
  };

  if (!hasHydrated) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#00263E] tracking-tight uppercase">
            Capacidades Fijas
          </h2>
          <p className="text-sm text-[#A5ADB5] font-medium">
            Definición de capacidad nominal por línea (Cajas/Hora)
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={readOnly}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl px-6"
        >
          <Save className="mr-2 h-5 w-5" />
          GUARDAR CAMBIOS
        </Button>
      </div>

      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Listado de Líneas de Producción
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                <TableHead className="text-slate-600 font-bold h-12 w-[300px]">Línea</TableHead>
                <TableHead className="text-slate-600 font-bold h-12">Capacidad de Diseño (Cajas/Hora)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PRODUCTION_LINES.map((line) => (
                <TableRow key={line.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                  <TableCell className="py-4 font-bold text-slate-900">
                    {line.name}
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      placeholder="Ej: 1200"
                      value={capacities[line.id] || ""}
                      onChange={(e) => handleUpdate(line.id, e.target.value)}
                      disabled={readOnly}
                      className="max-w-[200px] border-slate-200 focus:ring-primary font-medium"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
