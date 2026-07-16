import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StopEvent } from "@/lib/hpv2-types";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface HistoryTableProps {
  stops: StopEvent[];
}

export function HistoryTable({ stops }: HistoryTableProps) {
  const sortedStops = [...stops].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return (
    <div className="rounded-md border bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-bold">Inicio</TableHead>
            <TableHead className="font-bold">Fin</TableHead>
            <TableHead className="font-bold">Duración</TableHead>
            <TableHead className="font-bold">Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStops.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                No se han registrado paradas para esta línea.
              </TableCell>
            </TableRow>
          ) : (
            sortedStops.map((stop) => {
              const start = new Date(stop.startTime);
              const end = new Date(stop.endTime);
              const duration = differenceInMinutes(end, start);

              return (
                <TableRow key={stop.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">
                    {format(start, "Pp", { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(end, "Pp", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono bg-background">
                      {duration} min
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm font-medium">
                    {stop.reason}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
