import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionLine, StopEvent } from "@/lib/hpv2-types";
import { LineStatusIndicator } from "./line-status-indicator";
import { StopRegisterDialog } from "./stop-register-dialog";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, Clock, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface LineCardProps {
  line: ProductionLine;
  lastStop?: StopEvent;
  onRegisterStop: (lineId: string, stop: any) => void;
}

export function LineCard({ line, lastStop, onRegisterStop }: LineCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-primary">{line.name}</CardTitle>
        <LineStatusIndicator status={line.status} />
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-1 p-1.5 rounded-full bg-background text-primary">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Última Parada</p>
              {lastStop ? (
                <div className="mt-1">
                  <p className="text-sm font-medium text-foreground">{lastStop.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(lastStop.startTime), "PPp", { locale: es })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 italic">Sin registros recientes</p>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-2.5">
            <div className="mt-1 p-1.5 rounded-full bg-background text-primary">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duración</p>
              <p className="text-sm font-medium text-foreground">
                {lastStop ? 
                  `${Math.round((new Date(lastStop.endTime).getTime() - new Date(lastStop.startTime).getTime()) / 60000)} min` 
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-2 pb-4">
        <StopRegisterDialog 
          lineId={line.id} 
          lineName={line.name} 
          onRegister={(stop) => onRegisterStop(line.id, stop)} 
        />
        <Link href={`/lines/${line.id}`} className="w-full">
          <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary hover:bg-background">
            Ver Detalles <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
