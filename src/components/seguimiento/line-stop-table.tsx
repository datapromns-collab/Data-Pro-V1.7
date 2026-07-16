 
"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StopEvent } from "@/lib/hpv2-types";
import { format, differenceInMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface LineStopTableProps {
  lineName: string;
  stops: StopEvent[];
  onEdit?: (stop: StopEvent) => void;
  onDelete?: (stopId: string) => void;
  readOnly?: boolean;
}

export function LineStopTable({ lineName, stops, onEdit, onDelete, readOnly = false }: LineStopTableProps) {
  const sortedStops = useMemo(() => {
    return [...stops].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [stops]);

  const totalMinutes = sortedStops.reduce((acc, stop) => {
    const start = new Date(stop.startTime);
    const end = new Date(stop.endTime);
    return acc + differenceInMinutes(end, start);
  }, 0);

  const totalHours = totalMinutes / 60;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[#00263E] uppercase tracking-wider px-1">
        {lineName}
      </h3>
      <div className="rounded-lg border border-[#D1FAE5] overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#A7F3D0] hover:bg-[#A7F3D0] border-b-[#D1FAE5]">
              <TableHead className="text-[#065F46] font-bold h-10">Inicio</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10">Fin</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10">Tiempo (Hrs)</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10">Observacion</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10">Turno</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10">Equipo</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10">Tipo</TableHead>
              <TableHead className="text-[#065F46] font-bold h-10 w-[160px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStops.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center py-4 text-[#A5ADB5] italic text-xs">
                  Sin registros para este día
                </TableCell>
              </TableRow>
            ) : (
              sortedStops.map((stop) => {
                const start = new Date(stop.startTime);
                const end = new Date(stop.endTime);
                const durationMinutes = differenceInMinutes(end, start);
                const durationHours = durationMinutes / 60;

                return (
                  <TableRow key={stop.id} className="border-b-[#D1FAE5] hover:bg-[#F0FDF4]">
                    <TableCell className="py-2 text-xs font-medium">
                      {format(start, "HH:mm")}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-medium">
                      {format(end, "HH:mm")}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-bold text-primary">
                      {durationHours.toFixed(2)} h
                    </TableCell>
                    <TableCell className="py-2 text-xs text-[#00263E]">
                      {stop.reason}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      <span className="bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        {stop.turno}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-xs font-medium capitalize">
                      {stop.equipment}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-medium capitalize">
                      {stop.stopType}
                    </TableCell>
                    <TableCell className="py-2">
                      {readOnly ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solo lectura</span>
                      ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-primary hover:bg-primary/10 font-bold text-[10px] flex items-center gap-1"
                          onClick={() => onEdit?.(stop)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          EDITAR
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:bg-destructive/10 font-bold text-[10px] flex items-center gap-1"
                          onClick={() => onDelete?.(stop.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          ELIMINAR
                        </Button>
                      </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {sortedStops.length > 0 && (
            <TableFooter>
              <TableRow className="bg-[#F0FDF4] border-t-2 border-[#D1FAE5]">
                <TableCell colSpan={2} className="text-right font-bold text-[#065F46] py-3 uppercase text-[10px] tracking-wider">
                  Total Tiempo de Parada:
                </TableCell>
                <TableCell className="py-3 text-xs font-black text-primary">
                  {totalHours.toFixed(2)} h
                </TableCell>
                <TableCell colSpan={5} className="bg-white" />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
