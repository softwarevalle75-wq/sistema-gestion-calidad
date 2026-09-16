import { procesoService } from "@/services/proceso.service";
import { riesgoService } from "@/services/riesgo.service";
import { competenciaService } from "@/services/competencia.service";
import { capacitacionService } from "@/services/capacitacion.service";
import { indicadorService } from "@/services/indicador.service";
import { auditoriaService } from "@/services/auditoria.service";
import { accionCorrectivaService } from "@/services/accionCorrectiva.service";

export interface DashboardPHVAMetrics {
  plan: {
    procesosDefinidos: number;
    riesgosIdentificados: number;
    competenciasDefinidas: number;
  };
  do: {
    operacionesEjecutadas: number;
    capacitacionesRealizadas: number;
    controlesAplicados: number;
  };
  check: {
    indicadoresMedidos: number;
    auditoriasEjecutadas: number;
    hallazgosDetectados: number;
  };
  act: {
    accionesCorrectivas: number;
    eficaciaVerificada: number;
    riesgosActualizados: number;
  };
}

async function cargarLista<T>(promesa: Promise<T[] | T>, etiqueta: string): Promise<T[]> {
  try {
    const data = await promesa;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`No se pudieron cargar ${etiqueta} para el tablero PHVA`, error);
    return [];
  }
}

export const dashboardPhvaService = {
  async getMetrics(): Promise<DashboardPHVAMetrics> {
    const [
      procesos,
      riesgos,
      competencias,
      capacitaciones,
      indicadores,
      auditorias,
      hallazgos,
      acciones,
    ] = await Promise.all([
      cargarLista(procesoService.listar({ limit: 1000 }), "procesos"),
      cargarLista(riesgoService.getAll(), "riesgos"),
      cargarLista(competenciaService.getAll(), "competencias"),
      cargarLista(capacitacionService.getAll(), "capacitaciones"),
      cargarLista(indicadorService.getAll(), "indicadores"),
      cargarLista(auditoriaService.getAll(), "auditorías"),
      cargarLista(auditoriaService.getAllHallazgos(), "hallazgos"),
      cargarLista(accionCorrectivaService.getAll({ limit: 1000 }), "acciones correctivas"),
    ]);

    const auditoriasEjecutadas = auditorias.filter((a) => ["en_curso", "completada", "cerrada"].includes(a.estado)).length;
    const capacitacionesRealizadas = capacitaciones.filter((c) => ["completada", "cerrada"].includes(c.estado)).length;
    const operacionesEjecutadas = procesos.filter((p) => ["activo", "revision"].includes(String(p.estado))).length;
    const riesgosActualizados = riesgos.filter((r) => !!r.fecha_revision).length;

    return {
      plan: {
        procesosDefinidos: procesos.length,
        riesgosIdentificados: riesgos.length,
        competenciasDefinidas: competencias.length,
      },
      do: {
        operacionesEjecutadas,
        capacitacionesRealizadas,
        controlesAplicados: riesgos.filter((r) => ["cerrado", "mitigado"].includes(String(r.estado))).length,
      },
      check: {
        indicadoresMedidos: indicadores.length,
        auditoriasEjecutadas,
        hallazgosDetectados: hallazgos.length,
      },
      act: {
        accionesCorrectivas: acciones.length,
        eficaciaVerificada: acciones.filter((a) => ["verificada", "cerrada"].includes(String(a.estado))).length,
        riesgosActualizados,
      },
    };
  },
};
