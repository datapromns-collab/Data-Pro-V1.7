"use client";

import { useState, useEffect } from "react";
import { Factory, Tags } from "lucide-react";
import EnfardadoraPanel from "@/components/seguimiento/EnfardadoraPanel";
import EtiquetadoraPanel from "@/components/seguimiento/EtiquetadoraPanel";
import { useAuthStore } from "@/hooks/use-auth-store";

type Vista = "enfardadora" | "etiquetadora";

const SECCIONES_POR_USUARIO: Record<string, Vista[]> = {
  "enf.mds": ["enfardadora"],
  "etq.mds": ["etiquetadora"],
};

export default function SeguimientoPanel({ onVistaChange, readOnly = false }: { onVistaChange?: (vista: Vista) => void; readOnly?: boolean }) {
  const { user } = useAuthStore();
  const seccionesPermitidas = user ? (SECCIONES_POR_USUARIO[user.id] ?? (["enfardadora", "etiquetadora"] as Vista[])) : (["enfardadora", "etiquetadora"] as Vista[]);
  const [vista, setVista] = useState<Vista>(seccionesPermitidas[0]);

  useEffect(() => {
    onVistaChange?.(vista);
  }, [vista, onVistaChange]);

  const botonClass = (activo: boolean) =>
    `inline-flex items-center justify-center gap-2 h-9 px-6 rounded-full font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-none flex-shrink-0 outline-none focus:ring-0 active:scale-95 transform-none border-0 select-none ${activo ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`;

  const mostrarEnfardadora = seccionesPermitidas.includes("enfardadora");
  const mostrarEtiquetadora = seccionesPermitidas.includes("etiquetadora");

  return (
    <div className="space-y-4">
      {seccionesPermitidas.length > 1 && (
        <div className="flex items-center bg-slate-100/50 p-1 rounded-full h-11 border border-slate-200 w-fit">
          {mostrarEnfardadora && (
            <button onClick={() => setVista("enfardadora")} className={botonClass(vista === "enfardadora")}>
              <Factory className="h-3.5 w-3.5" /> Enfardadora
            </button>
          )}
          {mostrarEtiquetadora && (
            <button onClick={() => setVista("etiquetadora")} className={botonClass(vista === "etiquetadora")}>
              <Tags className="h-3.5 w-3.5" /> Etiquetadora
            </button>
          )}
        </div>
      )}

      {readOnly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest w-fit">
          Solo Lectura
        </div>
      )}

      {vista === "enfardadora" ? <EnfardadoraPanel readOnly={readOnly} /> : <EtiquetadoraPanel readOnly={readOnly} />}
    </div>
  );
}
