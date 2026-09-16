import { useEffect, useState } from "react";
import { codigoService, type EntidadCodigo } from "@/services/codigo.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function useCodigoAutomatico(
  entidad: EntidadCodigo,
  enabled = true,
  extras?: { tipo?: string; areaCodigo?: string },
) {
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelado = false;
    codigoService.siguiente(entidad, extras).then((valor) => {
      if (!cancelado) setCodigo(valor);
    });
    return () => {
      cancelado = true;
    };
  }, [entidad, enabled, extras?.tipo, extras?.areaCodigo]);

  return codigo;
}

interface CampoCodigoAutomaticoProps {
  value: string;
  label?: string;
  native?: boolean;
  className?: string;
}

export function CampoCodigoAutomatico({
  value,
  label = "Código",
  native = false,
  className,
}: CampoCodigoAutomaticoProps) {
  const inputClass =
    "w-full px-3 py-2 border rounded-md bg-[#F8FAFC] font-bold tracking-wide cursor-default";

  return (
    <div className={className || "space-y-2"}>
      {native ? (
        <label className="block text-sm font-medium mb-2">{label}</label>
      ) : (
        <Label className="font-bold">{label}</Label>
      )}
      {native ? (
        <input type="text" readOnly value={value || "Se asignará al guardar"} className={inputClass} />
      ) : (
        <Input readOnly value={value || "Se asignará al guardar"} className="bg-[#F8FAFC] font-bold tracking-wide" />
      )}
      <p className="text-xs text-[#6B7280]">Se genera automáticamente</p>
    </div>
  );
}
