import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Circle, AlertCircle, PlayCircle } from "lucide-react";

interface LineStatusIndicatorProps {
  status: 'running' | 'stopped';
  className?: string;
}

export function LineStatusIndicator({ status, className }: LineStatusIndicatorProps) {
  const isRunning = status === 'running';
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant={isRunning ? "default" : "destructive"} 
        className={cn(
          "px-3 py-1 flex items-center gap-1.5 font-medium",
          isRunning ? "bg-green-500 hover:bg-green-600" : "bg-destructive hover:bg-destructive/90"
        )}
      >
        {isRunning ? (
          <PlayCircle className="w-3.5 h-3.5" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5" />
        )}
        {isRunning ? "Operativa" : "Detenida"}
      </Badge>
    </div>
  );
}
