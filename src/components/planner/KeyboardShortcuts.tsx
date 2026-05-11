
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Command, Keyboard } from "lucide-react";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const shortcuts = [
    { keys: ["Alt", "N"], action: "Nueva Tarea" },
    { keys: ["Alt", "C"], action: "Abrir Calculadora" },
    { keys: ["Alt", "G"], action: "Ver Diagrama de Gantt" },
    { keys: ["Alt", "V"], action: "Configuración de Velocidades" },
    { keys: ["Alt", "P"], action: "Exportar Reporte (Imprimir)" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Keyboard className="h-5 w-5" />
            <DialogTitle className="font-headline text-xl">Atajos de Teclado</DialogTitle>
          </div>
          <DialogDescription>
            Usa estas combinaciones para navegar más rápido por la herramienta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm font-medium text-slate-600">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((key) => (
                  <kbd key={key} className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-300 rounded shadow-sm text-slate-700">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
