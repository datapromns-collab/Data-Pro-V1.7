
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { suggestTaskLoad } from '@/ai/flows/suggest-task-load';
import { useToast } from '@/hooks/use-toast';

interface AIButtonProps {
  taskName: string;
  onSuggestion: (load: number, reasoning: string) => void;
}

export function AIButton({ taskName, onSuggestion }: AIButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    if (!taskName) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre de la tarea para recibir una sugerencia.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await suggestTaskLoad({ taskName });
      onSuggestion(result.suggestedLoadPerHour, result.reasoning);
      toast({
        title: "Sugerencia recibida",
        description: `IA sugiere ${result.suggestedLoadPerHour} por hora.`,
      });
    } catch (error) {
      toast({
        title: "Error de IA",
        description: "No se pudo obtener la sugerencia en este momento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={handleSuggest}
      disabled={loading || !taskName}
      className="flex gap-2 text-primary border-primary/20 hover:bg-primary/5"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Sugerir Carga
    </Button>
  );
}
