import { apiClient } from "@/lib/api";

export type EntidadCodigo =
  | "documento"
  | "riesgo"
  | "proceso"
  | "no_conformidad"
  | "accion_correctiva"
  | "capacitacion"
  | "objetivo"
  | "indicador"
  | "auditoria"
  | "hallazgo"
  | "area"
  | "formulario"
  | "accion_proceso";

const PREFIJOS_DOCUMENTO: Record<string, string> = {
  formato: "FO-GC-",
  procedimiento: "PR-GC-",
  instructivo: "IN-GC-",
  manual: "MN-GC-",
  politica: "PO-GC-",
  registro: "RG-GC-",
  plan: "PL-GC-",
  proceso: "CH-GC-",
};

const PREFIJOS_PROCESO: Record<string, string> = {
  estrategico: "PE",
  operativo: "PO",
  apoyo: "PA",
  medicion: "PM",
};

const PREFIJOS_INDICADOR: Record<string, string> = {
  eficacia: "IND-EFC-",
  eficiencia: "IND-EFI-",
  cumplimiento: "IND-CUM-",
};

function sufijoUnico(): string {
  return `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`;
}

export function codigoRespaldo(
  entidad: EntidadCodigo,
  extras?: { tipo?: string; areaCodigo?: string },
): string {
  const year = new Date().getFullYear();
  const tipo = (extras?.tipo || "").trim().toLowerCase();
  const area =
    (extras?.areaCodigo || "SGC").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "SGC";
  const n = sufijoUnico();

  switch (entidad) {
    case "documento":
      return `${PREFIJOS_DOCUMENTO[tipo] || "FO-GC-"}${n}`;
    case "riesgo":
      return `R-${n}`;
    case "proceso":
      return `${PREFIJOS_PROCESO[tipo] || "PO"}-${area}-${n}`;
    case "no_conformidad":
      return `NC-${year}-${n}`;
    case "accion_correctiva":
      return `AC-${year}-${n}`;
    case "capacitacion":
      return `CAP-${year}-${n}`;
    case "objetivo":
      return `OBJ-${year}-${n}`;
    case "indicador":
      return `${PREFIJOS_INDICADOR[tipo] || "IND-EFC-"}${n}`;
    case "auditoria":
      return `AUD-${year}-${n}`;
    case "hallazgo":
      return `HALL-${year}-${n}`;
    case "area":
      return `AREA-${n}`;
    case "formulario":
      return `FD-${n}`;
    case "accion_proceso":
      return `AP-${year}-${n}`;
    default:
      return `SGC-${n}`;
  }
}

export function codigoParaGuardar(
  valor: string | undefined,
  entidad: EntidadCodigo,
  extras?: { tipo?: string; areaCodigo?: string },
): string {
  const limpio = (valor || "").trim();
  if (limpio && limpio.toLowerCase() !== "se asignará al guardar") {
    return limpio;
  }
  return codigoRespaldo(entidad, extras);
}

class CodigoService {
  async siguiente(
    entidad: EntidadCodigo,
    extras?: { tipo?: string; areaCodigo?: string },
  ): Promise<string> {
    try {
      const response = await apiClient.get("/codigos/siguiente", {
        params: {
          entidad,
          tipo: extras?.tipo || undefined,
          area_codigo: extras?.areaCodigo || undefined,
        },
      });
      const codigo = String(response.data?.codigo || "").trim();
      return codigo || codigoRespaldo(entidad, extras);
    } catch {
      return codigoRespaldo(entidad, extras);
    }
  }
}

export const codigoService = new CodigoService();
