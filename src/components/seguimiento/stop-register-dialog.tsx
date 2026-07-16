"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

interface StopRegisterDialogProps {
  lineId: string;
  lineName: string;
  onRegister: (stop: { startTime: string; endTime: string; reason: string; equipment: string }) => void;
}

export function StopRegisterDialog({ lineId, lineName, onRegister }: StopRegisterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [equipment, setEquipment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !reason || !equipment) return;
    
    const today = new Date().toISOString().split('T')[0];
    onRegister({
      startTime: new Date(`${today}T${startTime}`).toISOString(),
      endTime: new Date(`${today}T${endTime}`).toISOString(),
      reason,
      equipment,
    });
    
    setIsOpen(false);
    setStartTime("");
    setEndTime("");
    setReason("");
    setEquipment("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Parada
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Parada - {lineName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Inicio de Parada</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">Fin de Parada</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                placeholder="Describa brevemente la causa de la parada..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="equipment">Equipo / Tipo</Label>
              <Select onValueChange={setEquipment} required>
                <SelectTrigger id="equipment">
                  <SelectValue placeholder="Seleccione equipo o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enfardadora">Enfardadora</SelectItem>
                  <SelectItem value="transportador">Transportador</SelectItem>
                  <SelectItem value="etiquetadora">Etiquetadora</SelectItem>
                  <SelectItem value="paletizador">Paletizador</SelectItem>
                  <SelectItem value="motor">Motor / Reductor</SelectItem>
                  <SelectItem value="electrico">Componente Eléctrico</SelectItem>
                  <SelectItem value="neumatico">Componente Neumático</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar Registro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
