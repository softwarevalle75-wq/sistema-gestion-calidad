import type { AccionCorrectiva } from "@/services/accionCorrectiva.service";
import type { Auditoria, HallazgoAuditoria, ProgramaAuditoria } from "@/services/auditoria.service";
import type {
  AsistenciaCapacitacion,
  Capacitacion,
  ResumenAsistenciaCapacitacion,
} from "@/services/capacitacion.service";
import type { Area } from "@/services/area.service";
import type { EvaluacionCompetencia } from "@/services/competencia.service";
import type { Indicador, MedicionIndicador } from "@/services/indicador.service";
import type { NoConformidad } from "@/services/noConformidad.service";
import type { ObjetivoCalidad, SeguimientoObjetivo } from "@/services/objetivoCalidad.service";
import type { Proceso } from "@/services/proceso.service";
import type { Riesgo } from "@/services/riesgo.service";
import type { Usuario } from "@/services/usuario.service";
import type { Ticket } from "@/services/ticket.service";
import type { CampoFormulario, FormularioDinamico } from "@/services/formulario-dinamico.service";
import {
  datosSGCDesdeDocumento,
  formatearFechaSGC,
  nombreUsuarioSGC,
  seccionSGC,
  tablaCamposSGC,
  textoAHtmlSGC,
  type DocumentoSGCData,
  type VersionSGC,
} from "@/utils/documentoSGC";

function tipoAccionSGC(tipo?: string): string {
  const mapa: Record<string, string> = {
    correctiva: "accion_correctiva",
    preventiva: "accion_preventiva",
    mejora: "accion_mejora",
  };
  return mapa[(tipo || "").toLowerCase()] || "accion_correctiva";
}

function etiquetaTipoAccion(tipo?: string): string {
  const mapa: Record<string, string> = {
    correctiva: "Correctiva",
    preventiva: "Preventiva",
    mejora: "Mejora",
  };
  return mapa[(tipo || "").toLowerCase()] || tipo || "—";
}

function tituloAccion(tipo?: string): string {
  const mapa: Record<string, string> = {
    correctiva: "Acción correctiva",
    preventiva: "Acción preventiva",
    mejora: "Acción de mejora",
  };
  return mapa[(tipo || "").toLowerCase()] || "Acción correctiva";
}

function evidenciasHtmlSGC(evidencias?: string | null): string {
  if (!evidencias?.trim()) return textoAHtmlSGC(null, "Sin evidencias registradas.");
  try {
    const parsed = typeof evidencias === "string" ? JSON.parse(evidencias) : evidencias;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return textoAHtmlSGC(null, "Sin evidencias registradas.");
    }
    const items = parsed
      .map((ev: { name?: string; nombre?: string; url?: string }) => {
        const name = ev.name || ev.nombre || "Evidencia";
        if (ev.url) {
          return `<li><a href="${ev.url}" target="_blank" rel="noopener noreferrer">${name}</a></li>`;
        }
        return `<li>${name}</li>`;
      })
      .join("");
    return `<ul>${items}</ul>`;
  } catch {
    return textoAHtmlSGC(evidencias);
  }
}

interface PasoTrazabilidad {
  etapa: string;
  cumplido: boolean;
  enCurso?: boolean;
  responsable: string;
  fecha?: string | null;
}

function estadoPaso(paso: PasoTrazabilidad): string {
  if (paso.cumplido) return "Completada";
  if (paso.enCurso) return "En curso";
  return "Pendiente";
}

function firmasDesdePasos(elaboracion: PasoTrazabilidad, revision: PasoTrazabilidad, aprobacion: PasoTrazabilidad) {
  const nombreSiAvanzo = (paso: PasoTrazabilidad, soloCumplido = false) => {
    if (soloCumplido) return paso.cumplido ? paso.responsable : "Pendiente";
    return paso.cumplido || paso.enCurso ? paso.responsable : "Pendiente";
  };
  return {
    elaboradoPor: nombreSiAvanzo(elaboracion),
    revisadoPor: nombreSiAvanzo(revision),
    aprobadoPor: nombreSiAvanzo(aprobacion, true),
    fechaElaboracion: elaboracion.cumplido || elaboracion.enCurso ? elaboracion.fecha || undefined : undefined,
    fechaRevision: revision.cumplido || revision.enCurso ? revision.fecha || undefined : undefined,
    fechaAprobacion: aprobacion.cumplido ? aprobacion.fecha || undefined : undefined,
  };
}

function seccionTrazabilidadSGC(pasos: PasoTrazabilidad[]): string {
  return seccionSGC(
    "Trazabilidad",
    tablaCamposSGC(
      pasos.map((paso) => [
        paso.etapa,
        [
          estadoPaso(paso),
          paso.cumplido || paso.enCurso ? paso.responsable : "Pendiente",
          paso.cumplido || paso.enCurso ? formatearFechaSGC(paso.fecha) : null,
        ]
          .filter((parte) => parte && parte !== "—")
          .join(" · "),
      ]),
    ),
  );
}

function versionesDesdePasos(pasos: PasoTrazabilidad[]): VersionSGC[] {
  return pasos
    .filter((paso) => paso.cumplido || paso.enCurso)
    .map((paso, index) => ({
      version: `${index + 1}.0`,
      descripcion_cambios: `${paso.etapa}: ${estadoPaso(paso)} por ${paso.responsable}`,
      creado_en: paso.fecha || undefined,
    }));
}

export function datosSGCDesdeAccionCorrectiva(accion: AccionCorrectiva): DocumentoSGCData {
  const estado = (accion.estado || "").toLowerCase();
  const responsable = nombreUsuarioSGC(accion.responsable, "Sistema");
  const implementador = nombreUsuarioSGC(accion.implementador, responsable);
  const verificador = nombreUsuarioSGC(accion.verificador, implementador);
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Elaboración",
      cumplido: true,
      responsable,
      fecha: accion.creadoEn || accion.creado_en,
    },
    {
      etapa: "Implementación",
      cumplido: ["implementada", "verificada", "cerrada"].includes(estado),
      enCurso: ["en_proceso", "en_ejecucion"].includes(estado),
      responsable: implementador,
      fecha: accion.fechaImplementacion || accion.actualizadoEn || accion.actualizado_en,
    },
    {
      etapa: "Verificación / cierre",
      cumplido: ["verificada", "cerrada"].includes(estado),
      responsable: verificador,
      fecha: accion.fechaVerificacion || accion.actualizadoEn || accion.actualizado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos de la acción",
      tablaCamposSGC([
        ["Código", accion.codigo || "—"],
        ["Tipo", etiquetaTipoAccion(accion.tipo)],
        ["Estado", (accion.estado || "—").replace(/_/g, " ")],
        ["Fecha de compromiso", formatearFechaSGC(accion.fechaCompromiso)],
        ["Fecha de implementación", formatearFechaSGC(accion.fechaImplementacion)],
        ["Fecha de verificación", formatearFechaSGC(accion.fechaVerificacion)],
        ["Responsable", nombreUsuarioSGC(accion.responsable, "Sin asignar")],
        ["Implementado por", nombreUsuarioSGC(accion.implementador, "Pendiente")],
        ["Verificado por", nombreUsuarioSGC(accion.verificador, "Pendiente")],
        ["Eficacia verificada", accion.eficaciaVerificada ? "Sí" : "No"],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(accion.descripcion, "Sin descripción.")),
    seccionSGC("Análisis de causa raíz", textoAHtmlSGC(accion.analisisCausaRaiz)),
    seccionSGC("Plan de acción", textoAHtmlSGC(accion.planAccion)),
    seccionSGC("Evidencias", textoAHtmlSGC(accion.evidencias, "Sin evidencias registradas.")),
    seccionSGC("Observaciones", textoAHtmlSGC(accion.observacion)),
    ...(accion.comentarios?.length
      ? [
          seccionSGC(
            "Seguimiento",
            tablaCamposSGC(
              accion.comentarios.map((comentario, index) => [
                `Registro ${index + 1} — ${formatearFechaSGC(comentario.creadoEn || comentario.creado_en)}`,
                `${nombreUsuarioSGC(comentario.usuario, "Sistema")}: ${comentario.comentario || "—"}`,
              ]),
            ),
          ),
        ]
      : []),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: `${tituloAccion(accion.tipo)} ${accion.codigo || ""}`.trim(),
    codigo: accion.codigo || "S/C",
    version: "1.0",
    tipoDocumento: tipoAccionSGC(accion.tipo),
    estado: accion.estado,
    contenidoHtml,
    fechaCreacion: accion.creadoEn || accion.creado_en,
    fechaVigencia: accion.fechaCompromiso,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeRiesgo(riesgo: Riesgo): DocumentoSGCData {
  const estado = (riesgo.estado || "identificado").toLowerCase();
  const responsable = nombreUsuarioSGC(riesgo.responsable, "Sistema");
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Identificación",
      cumplido: true,
      responsable,
      fecha: riesgo.fecha_identificacion || riesgo.creado_en,
    },
    {
      etapa: "Tratamiento",
      cumplido: ["en_tratamiento", "mitigado", "aceptado"].includes(estado),
      enCurso: Boolean(riesgo.tratamiento?.trim()) && estado === "identificado",
      responsable,
      fecha: riesgo.actualizado_en || riesgo.fecha_revision,
    },
    {
      etapa: estado === "aceptado" ? "Aceptación" : "Mitigación",
      cumplido: ["mitigado", "aceptado"].includes(estado),
      responsable,
      fecha: riesgo.actualizado_en || riesgo.fecha_revision,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Identificación del riesgo",
      tablaCamposSGC([
        ["Código", riesgo.codigo || "—"],
        ["Nombre", riesgo.nombre || "Sin nombre"],
        ["Proceso", riesgo.proceso?.nombre || "No asociado"],
        ["Categoría", riesgo.categoria || "—"],
        ["Tipo de riesgo", riesgo.tipo_riesgo || "—"],
        ["Estado", (riesgo.estado || "—").replace(/_/g, " ")],
        ["Nivel de riesgo", riesgo.nivel_riesgo || "Sin evaluar"],
        ["Probabilidad", riesgo.probabilidad != null ? String(riesgo.probabilidad) : "—"],
        ["Impacto", riesgo.impacto != null ? String(riesgo.impacto) : "—"],
        ["Nivel residual", riesgo.nivel_residual != null ? String(riesgo.nivel_residual) : "—"],
        ["Fecha de identificación", formatearFechaSGC(riesgo.fecha_identificacion)],
        ["Próxima revisión", formatearFechaSGC(riesgo.fecha_revision)],
        ["Responsable", nombreUsuarioSGC(riesgo.responsable, "Sin asignar")],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(riesgo.descripcion, "Sin descripción.")),
    seccionSGC("Causas", textoAHtmlSGC(riesgo.causas)),
    seccionSGC("Consecuencias", textoAHtmlSGC(riesgo.consecuencias)),
    seccionSGC("Plan de tratamiento", textoAHtmlSGC(riesgo.tratamiento, "No se ha definido un plan de tratamiento.")),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: riesgo.nombre || `Tratamiento de riesgo ${riesgo.codigo || ""}`.trim(),
    codigo: riesgo.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "tratamiento_riesgo",
    estado: riesgo.estado,
    contenidoHtml,
    fechaCreacion: riesgo.creado_en,
    fechaVigencia: riesgo.fecha_revision || riesgo.fecha_identificacion,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function evidenciasNoConformidadAHtml(evidencias?: string | null): string {
  if (!evidencias?.trim()) return textoAHtmlSGC("", "Sin evidencias registradas.");
  try {
    const parsed = JSON.parse(evidencias);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return tablaCamposSGC(
        parsed.map((item: { nombreArchivo?: string; descripcion?: string; url?: string }, index: number) => [
          item.nombreArchivo || item.descripcion || `Evidencia ${index + 1}`,
          item.url || item.descripcion || "—",
        ]),
      );
    }
  } catch {
    // Texto plano legado
  }
  return textoAHtmlSGC(evidencias, "Sin evidencias registradas.");
}

export function datosSGCDesdeNoConformidad(nc: NoConformidad): DocumentoSGCData {
  const estado = (nc.estado || "").toLowerCase();
  const detector = nombreUsuarioSGC(nc.detector, nc.detectado_por || "Sistema");
  const responsable = nombreUsuarioSGC(nc.responsable, detector);
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Detección",
      cumplido: true,
      responsable: detector,
      fecha: nc.fecha_deteccion || nc.creado_en,
    },
    {
      etapa: "Tratamiento",
      cumplido: ["en_tratamiento", "cerrada"].includes(estado),
      enCurso: Boolean(nc.plan_accion?.trim()) && estado === "abierta",
      responsable,
      fecha: nc.actualizado_en,
    },
    {
      etapa: "Cierre",
      cumplido: estado === "cerrada",
      responsable,
      fecha: nc.actualizado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos de la no conformidad",
      tablaCamposSGC([
        ["Código", nc.codigo || "—"],
        ["Tipo", nc.tipo || "No Conformidad"],
        ["Estado", (nc.estado || "—").replace(/_/g, " ")],
        ["Gravedad", nc.gravedad || "—"],
        ["Fuente", nc.fuente || "—"],
        ["Fecha de detección", formatearFechaSGC(nc.fecha_deteccion)],
        ["Proceso", nc.proceso?.nombre || "No asociado"],
        ["Área", nc.area?.nombre || "—"],
        ["Detectado por", nombreUsuarioSGC(nc.detector, nc.detectado_por || "—")],
        ["Responsable", nombreUsuarioSGC(nc.responsable, "Sin asignar")],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(nc.descripcion, "Sin descripción.")),
    seccionSGC("Análisis de causa", textoAHtmlSGC(nc.analisis_causa)),
    seccionSGC("Plan de acción", textoAHtmlSGC(nc.plan_accion)),
    seccionSGC("Evidencias", evidenciasHtmlSGC(nc.evidencias)),
    seccionSGC("Evidencias", evidenciasNoConformidadAHtml(nc.evidencias)),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: `No conformidad ${nc.codigo || ""}`.trim(),
    codigo: nc.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "no_conformidad",
    estado: nc.estado,
    contenidoHtml,
    fechaCreacion: nc.creado_en || nc.fecha_deteccion,
    fechaVigencia: nc.fecha_deteccion,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function etiquetaTipoAuditoria(tipo?: string): string {
  const mapa: Record<string, string> = {
    interna: "Interna",
    externa: "Externa",
    certificacion: "Certificación",
    seguimiento: "Seguimiento",
  };
  return mapa[(tipo || "").toLowerCase()] || tipo || "—";
}

function etiquetaTipoHallazgo(tipo?: string): string {
  const mapa: Record<string, string> = {
    no_conformidad_mayor: "No conformidad mayor",
    no_conformidad_menor: "No conformidad menor",
    observacion: "Observación",
    oportunidad_mejora: "Oportunidad de mejora",
  };
  return mapa[(tipo || "").toLowerCase()] || (tipo || "—").replace(/_/g, " ");
}

function hallazgosAuditoriaAHtml(hallazgos: HallazgoAuditoria[] = []): string {
  if (!hallazgos.length) return textoAHtmlSGC("", "Sin hallazgos registrados.");
  return tablaCamposSGC(
    hallazgos.map((hallazgo) => {
      const raw = hallazgo as HallazgoAuditoria & {
        tipo_hallazgo?: string;
        clausula_norma?: string;
      };
      const tipo = raw.tipo || raw.tipo_hallazgo;
      const clausula = raw.clausulaIso || raw.clausula_norma;
      return [
        `${raw.codigo || "S/C"} — ${etiquetaTipoHallazgo(tipo)}`,
        [
          raw.descripcion || "Sin descripción",
          raw.requisito ? `Requisito: ${raw.requisito}` : null,
          clausula ? `Cláusula ISO: ${clausula}` : null,
          raw.gravedad ? `Gravedad: ${raw.gravedad}` : null,
          `Estado: ${(raw.estado || "—").replace(/_/g, " ")}`,
        ]
          .filter(Boolean)
          .join(" · "),
      ];
    }),
  );
}

export function datosSGCDesdeAuditoria(
  auditoria: Auditoria,
  hallazgos: HallazgoAuditoria[] = [],
): DocumentoSGCData {
  const estado = (auditoria.estado || "").toLowerCase();
  const auditor = nombreUsuarioSGC(auditoria.auditorLider, "Sistema");
  const registrador = nombreUsuarioSGC(auditoria.creadoPorUsuario, auditor);
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Planificación",
      cumplido: true,
      responsable: registrador,
      fecha: auditoria.creadoEn || auditoria.fechaPlanificada,
    },
    {
      etapa: "Ejecución",
      cumplido: ["en_curso", "completada", "cerrada"].includes(estado),
      enCurso: estado === "en_curso",
      responsable: auditor,
      fecha: auditoria.fechaInicio || auditoria.actualizadoEn,
    },
    {
      etapa: "Cierre",
      cumplido: ["completada", "cerrada"].includes(estado),
      responsable: auditor,
      fecha: auditoria.fechaFin || auditoria.actualizadoEn,
    },
  ];

  const areas =
    auditoria.areasAuditadas?.filter(Boolean).join(", ") || "—";
  const contenidoHtml = [
    seccionSGC(
      "Datos de la auditoría",
      tablaCamposSGC([
        ["Código", auditoria.codigo || "—"],
        ["Nombre", auditoria.nombre || "—"],
        ["Tipo", etiquetaTipoAuditoria(auditoria.tipo)],
        ["Estado", (auditoria.estado || "—").replace(/_/g, " ")],
        ["Norma de referencia", auditoria.normaReferencia || "—"],
        ["Fecha planificada", formatearFechaSGC(auditoria.fechaPlanificada)],
        ["Fecha de inicio", formatearFechaSGC(auditoria.fechaInicio)],
        ["Fecha de finalización", formatearFechaSGC(auditoria.fechaFin)],
        ["Auditor líder", nombreUsuarioSGC(auditoria.auditorLider, "Sin asignar")],
        ["Registrado por", nombreUsuarioSGC(auditoria.creadoPorUsuario, "Sistema de Calidad")],
        ["Áreas auditadas", areas],
      ]),
    ),
    seccionSGC("Objetivo", textoAHtmlSGC(auditoria.objetivo || auditoria.objetivos, "Sin objetivo.")),
    seccionSGC("Alcance", textoAHtmlSGC(auditoria.alcance, "Sin alcance.")),
    seccionSGC("Informe final", textoAHtmlSGC(auditoria.informeFinal, "Sin informe final registrado.")),
    seccionSGC("Hallazgos", hallazgosAuditoriaAHtml(hallazgos)),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: auditoria.nombre || `Auditoría ${auditoria.codigo || ""}`.trim(),
    codigo: auditoria.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "auditoria",
    estado: auditoria.estado,
    contenidoHtml,
    fechaCreacion: auditoria.creadoEn,
    fechaVigencia: auditoria.fechaFin || auditoria.fechaPlanificada,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeHallazgo(
  hallazgo: Partial<HallazgoAuditoria> & { id: string },
  auditoria?: { codigo?: string; nombre?: string } | null,
): DocumentoSGCData {
  const raw = hallazgo as Partial<HallazgoAuditoria> & {
    id: string;
    tipo_hallazgo?: string;
    clausula_norma?: string;
  };
  const tipo = raw.tipo || raw.tipo_hallazgo;
  const clausula = raw.clausulaIso || raw.clausula_norma;
  const estado = (raw.estado || "abierto").toLowerCase();
  const responsable = nombreUsuarioSGC(raw.responsable, "Sistema");
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Registro",
      cumplido: true,
      responsable,
      fecha: raw.creadoEn,
    },
    {
      etapa: "Seguimiento",
      cumplido: ["en_tratamiento", "verificado", "cerrado", "cerrada"].includes(estado) || Boolean(raw.evidencia?.trim()),
      enCurso: estado === "abierto" && Boolean(raw.evidencia?.trim()),
      responsable,
      fecha: raw.fechaVerificacion,
    },
    {
      etapa: "Verificación / cierre",
      cumplido: ["verificado", "cerrado", "cerrada"].includes(estado),
      responsable,
      fecha: raw.fechaVerificacion,
    },
  ];
  const contenidoHtml = [
    seccionSGC(
      "Datos del hallazgo",
      tablaCamposSGC([
        ["Código", raw.codigo || "—"],
        ["Tipo", etiquetaTipoHallazgo(tipo)],
        ["Estado", (raw.estado || "—").replace(/_/g, " ")],
        ["Gravedad", raw.gravedad || "—"],
        ["Cláusula ISO", clausula || "—"],
        ["Requisito", raw.requisito || "—"],
        ["Auditoría", auditoria?.codigo || raw.auditoria?.codigo || "—"],
        ["Nombre de la auditoría", auditoria?.nombre || raw.auditoria?.nombre || "—"],
        ["Fecha de registro", formatearFechaSGC(raw.creadoEn)],
        ["Responsable", nombreUsuarioSGC(raw.responsable, "Sin asignar")],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(raw.descripcion, "Sin descripción.")),
    seccionSGC("Evidencia", textoAHtmlSGC(raw.evidencia, "Sin evidencia registrada.")),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: `Hallazgo ${raw.codigo || ""}`.trim() || "Hallazgo de auditoría",
    codigo: raw.codigo || auditoria?.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "hallazgo",
    estado: raw.estado,
    contenidoHtml,
    fechaCreacion: raw.creadoEn,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export interface ControlRiesgoSGC {
  id: string;
  riesgo_id: string;
  descripcion?: string;
  tipo_control?: string;
  frecuencia?: string;
  efectividad?: string;
  activo?: boolean;
  creado_en: string;
}

export function datosSGCDesdeControlRiesgo(
  control: ControlRiesgoSGC,
  riesgo?: { codigo?: string; nombre?: string; descripcion?: string; responsable?: { nombre?: string; primerApellido?: string } } | null,
): DocumentoSGCData {
  const responsable = nombreUsuarioSGC(riesgo?.responsable, "Sistema");
  const activo = control.activo !== false;
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Diseño del control",
      cumplido: true,
      responsable,
      fecha: control.creado_en,
    },
    {
      etapa: "Implementación",
      cumplido: activo,
      responsable,
      fecha: control.creado_en,
    },
    {
      etapa: "Evaluación de efectividad",
      cumplido: activo && (control.efectividad || "").toLowerCase() === "alta",
      enCurso: activo && ["media", "baja"].includes((control.efectividad || "").toLowerCase()),
      responsable,
      fecha: control.creado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos del control",
      tablaCamposSGC([
        ["Riesgo asociado", riesgo?.codigo || "—"],
        ["Nombre del riesgo", riesgo?.nombre || "Sin nombre"],
        ["Tipo de control", control.tipo_control || "—"],
        ["Frecuencia", control.frecuencia || "—"],
        ["Efectividad", control.efectividad || "—"],
        ["Estado", control.activo === false ? "Inactivo" : "Activo"],
        ["Fecha de registro", formatearFechaSGC(control.creado_en)],
      ]),
    ),
    seccionSGC("Descripción del control", textoAHtmlSGC(control.descripcion, "Sin descripción.")),
    seccionSGC("Descripción del riesgo", textoAHtmlSGC(riesgo?.descripcion, "Sin descripción del riesgo.")),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: control.descripcion?.slice(0, 80) || `Control ${riesgo?.codigo || ""}`.trim(),
    codigo: riesgo?.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "control_riesgo",
    estado: control.activo === false ? "inactivo" : "activo",
    contenidoHtml,
    fechaCreacion: control.creado_en,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function seguimientosObjetivoAHtml(seguimientos: SeguimientoObjetivo[] = [], valorMeta?: number): string {
  if (!seguimientos.length) return textoAHtmlSGC("", "Sin seguimientos registrados.");
  return tablaCamposSGC(
    seguimientos.map((seg, index) => {
      const raw = seg as SeguimientoObjetivo & {
        valor_actual?: number;
        fecha_seguimiento?: string;
        porcentaje_cumplimiento?: number;
      };
      const valorActual = raw.valorActual ?? raw.valor_actual;
      const porcentaje =
        typeof raw.porcentajeCumplimiento === "number"
          ? raw.porcentajeCumplimiento
          : typeof raw.porcentaje_cumplimiento === "number"
            ? raw.porcentaje_cumplimiento
            : valorMeta && valorActual != null
              ? (Number(valorActual) / Number(valorMeta)) * 100
              : null;
      return [
        `Seguimiento ${index + 1} — ${formatearFechaSGC(raw.creadoEn || raw.fecha_seguimiento || raw.periodo)}`,
        [
          valorActual != null ? `Valor: ${valorActual}` : null,
          porcentaje != null && Number.isFinite(porcentaje) ? `Cumplimiento: ${porcentaje.toFixed(1)}%` : null,
          raw.observaciones || null,
        ]
          .filter(Boolean)
          .join(" · ") || "—",
      ];
    }),
  );
}

export function datosSGCDesdeObjetivoCalidad(
  objetivo: ObjetivoCalidad,
  seguimientos: SeguimientoObjetivo[] = [],
): DocumentoSGCData {
  const estado = (objetivo.estado || "planificado").toLowerCase();
  const responsable = nombreUsuarioSGC(objetivo.responsable, "Sistema");
  const ultimoSeguimiento = seguimientos[seguimientos.length - 1];
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Formulación",
      cumplido: true,
      responsable,
      fecha: objetivo.creadoEn || objetivo.periodoInicio,
    },
    {
      etapa: "Seguimiento",
      cumplido: ["en_curso", "cumplido", "no_cumplido", "cancelado"].includes(estado) || seguimientos.length > 0,
      enCurso: estado === "en_curso" || (estado === "planificado" && seguimientos.length > 0),
      responsable,
      fecha: ultimoSeguimiento?.creadoEn || ultimoSeguimiento?.periodo || objetivo.actualizadoEn,
    },
    {
      etapa: "Cierre",
      cumplido: ["cumplido", "no_cumplido", "cancelado"].includes(estado),
      responsable,
      fecha: objetivo.actualizadoEn || objetivo.periodoFin,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos del objetivo",
      tablaCamposSGC([
        ["Código", objetivo.codigo || "—"],
        ["Estado", (objetivo.estado || "—").replace(/_/g, " ")],
        ["Área", objetivo.area?.nombre || "Sin área asignada"],
        ["Proceso", objetivo.proceso?.nombre || "—"],
        ["Responsable", nombreUsuarioSGC(objetivo.responsable, "Sin asignar")],
        ["Indicador", objetivo.indicador?.nombre || objetivo.indicadorId || "—"],
        ["Valor meta", objetivo.valorMeta != null ? String(objetivo.valorMeta) : "—"],
        ["Periodo de inicio", formatearFechaSGC(objetivo.periodoInicio)],
        ["Periodo de fin", formatearFechaSGC(objetivo.periodoFin)],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(objetivo.descripcion, "Sin descripción.")),
    seccionSGC("Meta", textoAHtmlSGC(objetivo.meta, "Sin meta definida.")),
    seccionSGC("Seguimientos", seguimientosObjetivoAHtml(seguimientos, objetivo.valorMeta)),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: `Objetivo de calidad ${objetivo.codigo || ""}`.trim(),
    codigo: objetivo.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "objetivo_calidad",
    estado: objetivo.estado,
    contenidoHtml,
    fechaCreacion: objetivo.creadoEn,
    fechaVigencia: objetivo.periodoFin,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function etiquetaEstadoCapacitacion(estado?: string): string {
  const mapa: Record<string, string> = {
    programada: "Programada",
    en_curso: "En curso",
    completada: "Completada",
    cancelada: "Cancelada",
  };
  return mapa[(estado || "").toLowerCase()] || (estado || "—").replace(/_/g, " ");
}

function asistenciasCapacitacionAHtml(asistencias: AsistenciaCapacitacion[] = []): string {
  if (!asistencias.length) return textoAHtmlSGC("", "Sin registros de asistencia.");
  return tablaCamposSGC(
    asistencias.map((asistencia) => [
      nombreUsuarioSGC(asistencia.usuario, "Participante"),
      [
        asistencia.asistio ? "Asistió" : "No asistió",
        asistencia.evaluacionAprobada ? "Evaluación aprobada" : "Evaluación pendiente",
        asistencia.calificacion != null ? `Calificación: ${asistencia.calificacion}` : null,
        asistencia.observaciones || null,
      ]
        .filter(Boolean)
        .join(" · "),
    ]),
  );
}

export function datosSGCDesdeCapacitacion(
  capacitacion: Capacitacion,
  extras?: {
    resumen?: ResumenAsistenciaCapacitacion | null;
    asistencias?: AsistenciaCapacitacion[];
  },
): DocumentoSGCData {
  const resumen = extras?.resumen;
  const asistencias = extras?.asistencias || [];
  const estado = (capacitacion.estado || "programada").toLowerCase();
  const responsable = nombreUsuarioSGC(capacitacion.responsable, capacitacion.instructor || "Sistema");
  const instructor = capacitacion.instructor || responsable;
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Programación",
      cumplido: true,
      responsable: instructor,
      fecha: capacitacion.creadoEn || capacitacion.fechaProgramada,
    },
    {
      etapa: "Ejecución",
      cumplido: ["en_curso", "completada"].includes(estado),
      enCurso: estado === "en_curso",
      responsable,
      fecha: capacitacion.fechaInicio || capacitacion.actualizadoEn,
    },
    {
      etapa: "Cierre / asistencia",
      cumplido: estado === "completada",
      responsable,
      fecha: capacitacion.fechaFin || capacitacion.fechaCierreAsistencia || capacitacion.actualizadoEn,
    },
  ];
  const contenidoHtml = [
    seccionSGC(
      "Datos de la capacitación",
      tablaCamposSGC([
        ["Código", capacitacion.codigo || "—"],
        ["Nombre", capacitacion.nombre || "—"],
        ["Tipo", capacitacion.tipoCapacitacion || "—"],
        ["Modalidad", capacitacion.modalidad || "—"],
        ["Estado", etiquetaEstadoCapacitacion(capacitacion.estado)],
        ["Fecha programada", formatearFechaSGC(capacitacion.fechaProgramada)],
        ["Fecha de inicio", formatearFechaSGC(capacitacion.fechaInicio)],
        ["Fecha de fin", formatearFechaSGC(capacitacion.fechaFin)],
        ["Duración", capacitacion.duracionHoras != null ? `${capacitacion.duracionHoras} horas` : "—"],
        ["Lugar / plataforma", capacitacion.lugar || "—"],
        ["Instructor", capacitacion.instructor || "—"],
        ["Cobertura", capacitacion.aplicaTodasAreas ? "Todas las áreas" : "Área específica"],
        ["Responsable", nombreUsuarioSGC(capacitacion.responsable, "Sin asignar")],
      ]),
    ),
    seccionSGC("Objetivo", textoAHtmlSGC(capacitacion.objetivo, "Sin objetivo.")),
    seccionSGC("Descripción", textoAHtmlSGC(capacitacion.descripcion, "Sin descripción.")),
    seccionSGC("Contenido", textoAHtmlSGC(capacitacion.contenido)),
    ...(resumen
      ? [
          seccionSGC(
            "Resumen de asistencia",
            tablaCamposSGC([
              ["Participantes", String(resumen.total_participantes ?? 0)],
              ["Asistieron", String(resumen.asistieron ?? 0)],
              ["No asistieron", String(resumen.no_asistieron ?? 0)],
              ["Porcentaje de asistencia", `${Number(resumen.porcentaje_asistencia || 0).toFixed(1)}%`],
              ["Evaluados", String(resumen.evaluados ?? 0)],
              ["Evaluación aprobada", String(resumen.evaluacion_aprobada ?? 0)],
              ["Porcentaje de aprobación", `${Number(resumen.porcentaje_aprobacion || 0).toFixed(1)}%`],
            ]),
          ),
        ]
      : []),
    seccionSGC("Registro de asistencia", asistenciasCapacitacionAHtml(asistencias)),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: capacitacion.nombre || `Capacitación ${capacitacion.codigo || ""}`.trim(),
    codigo: capacitacion.codigo || "S/C",
    version: "1.0",
    tipoDocumento: extras?.resumen ? "asistencia_capacitacion" : "capacitacion",
    estado: capacitacion.estado,
    contenidoHtml,
    fechaCreacion: capacitacion.creadoEn,
    fechaVigencia: capacitacion.fechaProgramada || capacitacion.fechaFin,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function etiquetaTipoProceso(tipo?: string): string {
  const mapa: Record<string, string> = {
    estrategico: "Estratégico",
    operativo: "Operativo",
    apoyo: "Apoyo",
    medicion: "Medición y mejora",
  };
  return mapa[(tipo || "").toLowerCase()] || tipo || "—";
}

function etiquetaEtapaPHVA(etapa?: string): string {
  const mapa: Record<string, string> = {
    planear: "Planear",
    hacer: "Hacer",
    verificar: "Verificar",
    actuar: "Actuar",
  };
  return mapa[(etapa || "").toLowerCase()] || etapa || "—";
}

export function datosSGCDesdeProceso(proceso: Proceso): DocumentoSGCData {
  const estado = (proceso.estado || "borrador").toLowerCase();
  const responsable = proceso.responsable_nombre || "Sistema";
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Elaboración",
      cumplido: true,
      responsable,
      fecha: proceso.creado_en,
    },
    {
      etapa: "Revisión",
      cumplido: ["revision", "activo", "suspendido", "obsoleto"].includes(estado),
      enCurso: estado === "revision",
      responsable,
      fecha: proceso.actualizado_en,
    },
    {
      etapa: "Aprobación",
      cumplido: ["activo", "obsoleto"].includes(estado) || Boolean(proceso.fecha_aprobacion),
      responsable,
      fecha: proceso.fecha_aprobacion || proceso.actualizado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Caracterización del proceso",
      tablaCamposSGC([
        ["Código", proceso.codigo || "—"],
        ["Nombre", proceso.nombre || "—"],
        ["Tipo", etiquetaTipoProceso(proceso.tipo_proceso)],
        ["Etapa PHVA", etiquetaEtapaPHVA(proceso.etapa_phva)],
        ["Estado", (proceso.estado || "—").replace(/_/g, " ")],
        ["Versión", proceso.version || "1.0"],
        ["Área", proceso.area_nombre || "Sin asignar"],
        ["Responsable", responsable],
        ["Fecha de aprobación", formatearFechaSGC(proceso.fecha_aprobacion)],
        ["Próxima revisión", formatearFechaSGC(proceso.proxima_revision)],
        ["Etapas", proceso.total_etapas != null ? String(proceso.total_etapas) : "—"],
        ["Indicadores", proceso.total_indicadores != null ? String(proceso.total_indicadores) : "—"],
        ["Riesgos asociados", proceso.total_riesgos != null ? String(proceso.total_riesgos) : "—"],
      ]),
    ),
    seccionSGC("Objetivo", textoAHtmlSGC(proceso.objetivo, "Sin objetivo.")),
    seccionSGC("Alcance", textoAHtmlSGC(proceso.alcance, "Sin alcance.")),
    seccionSGC("Entradas", textoAHtmlSGC(proceso.entradas)),
    seccionSGC("Salidas", textoAHtmlSGC(proceso.salidas)),
    seccionSGC("Recursos necesarios", textoAHtmlSGC(proceso.recursos_necesarios)),
    seccionSGC("Criterios de desempeño", textoAHtmlSGC(proceso.criterios_desempeno)),
    seccionSGC("Riesgos y oportunidades", textoAHtmlSGC(proceso.riesgos_oportunidades)),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: proceso.nombre || `Proceso ${proceso.codigo || ""}`.trim(),
    codigo: proceso.codigo || "S/C",
    version: proceso.version || "1.0",
    tipoDocumento: "proceso",
    estado: proceso.estado,
    contenidoHtml,
    fechaCreacion: proceso.creado_en,
    fechaVigencia: proceso.proxima_revision || proceso.fecha_aprobacion,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeCompetencia(evaluacion: EvaluacionCompetencia): DocumentoSGCData {
  const estado = (evaluacion.estado || "Pendiente").toLowerCase();
  const evaluado = nombreUsuarioSGC(evaluacion.usuario, "Sin asignar");
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Registro de evaluación",
      cumplido: true,
      responsable: evaluado,
      fecha: evaluacion.fechaEvaluacion,
    },
    {
      etapa: "Desarrollo",
      cumplido: ["en desarrollo", "reforzada", "desarrollada"].includes(estado),
      enCurso: estado === "en desarrollo",
      responsable: evaluado,
      fecha: evaluacion.fechaEvaluacion,
    },
    {
      etapa: "Competencia alcanzada",
      cumplido: ["reforzada", "desarrollada"].includes(estado),
      responsable: evaluado,
      fecha: evaluacion.fechaEvaluacion,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos de la evaluación",
      tablaCamposSGC([
        ["Competencia", evaluacion.competencia?.nombre || "—"],
        ["Persona evaluada", evaluado],
        ["Nivel", evaluacion.nivel || "—"],
        ["Estado", evaluacion.estado || "—"],
        ["Fecha de evaluación", formatearFechaSGC(evaluacion.fechaEvaluacion)],
      ]),
    ),
    seccionSGC("Descripción de la competencia", textoAHtmlSGC(evaluacion.competencia?.descripcion, "Sin descripción.")),
    seccionSGC("Observaciones / evidencia", textoAHtmlSGC(evaluacion.observaciones, "Sin observaciones.")),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: evaluacion.competencia?.nombre || "Evaluación de competencia",
    codigo: evaluacion.competenciaId || "S/C",
    version: "1.0",
    tipoDocumento: "competencia",
    estado: evaluacion.estado,
    contenidoHtml,
    fechaCreacion: evaluacion.fechaEvaluacion,
    fechaVigencia: evaluacion.fechaEvaluacion,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeArea(area: Area): DocumentoSGCData {
  const responsablePrincipal = area.asignaciones?.find((asignacion) => asignacion.es_principal)?.usuario;
  const responsableNombre = nombreUsuarioSGC(responsablePrincipal, "Sin asignar");
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Registro",
      cumplido: true,
      responsable: responsableNombre,
      fecha: area.creado_en,
    },
    {
      etapa: "Asignación de responsable",
      cumplido: Boolean(area.asignaciones?.length),
      enCurso: !area.asignaciones?.length,
      responsable: responsableNombre,
      fecha: area.actualizado_en,
    },
    {
      etapa: "Vigencia",
      cumplido: Boolean(area.asignaciones?.some((asignacion) => asignacion.es_principal)),
      responsable: responsableNombre,
      fecha: area.actualizado_en,
    },
  ];

  const responsables =
    area.asignaciones && area.asignaciones.length > 0
      ? tablaCamposSGC(
          area.asignaciones.map((asignacion) => [
            asignacion.es_principal ? "Principal" : "Apoyo",
            nombreUsuarioSGC(asignacion.usuario, "Sin asignar"),
          ]),
        )
      : textoAHtmlSGC("", "Sin responsables asignados.");

  const contenidoHtml = [
    seccionSGC(
      "Datos del área",
      tablaCamposSGC([
        ["Código", area.codigo || "—"],
        ["Nombre", area.nombre || "—"],
        ["Responsables", area.asignaciones?.length ? String(area.asignaciones.length) : "0"],
        ["Fecha de creación", formatearFechaSGC(area.creado_en)],
        ["Última actualización", formatearFechaSGC(area.actualizado_en)],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(area.descripcion, "Sin descripción.")),
    seccionSGC("Responsables del área", responsables),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  return {
    nombre: area.nombre || `Área ${area.codigo || ""}`.trim(),
    codigo: area.codigo || "S/C",
    version: "1.0",
    tipoDocumento: "area",
    estado: area.asignaciones?.length ? "activo" : "borrador",
    contenidoHtml,
    fechaCreacion: area.creado_en,
    fechaVigencia: area.actualizado_en || area.creado_en,
    ocultarFirmas: true,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeAsignacionResponsable(asignacion: {
  id: string;
  es_principal?: boolean;
  creado_en?: string;
  area?: { codigo?: string; nombre?: string; descripcion?: string };
  usuario?: {
    nombre?: string;
    segundo_nombre?: string;
    primer_apellido?: string;
    segundo_apellido?: string;
    correo_electronico?: string;
    rol?: string;
  };
}): DocumentoSGCData {
  const responsable = nombreUsuarioSGC(asignacion.usuario, "Sin asignar");
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Asignación",
      cumplido: true,
      responsable,
      fecha: asignacion.creado_en,
    },
    {
      etapa: "Rol en el área",
      cumplido: true,
      responsable,
      fecha: asignacion.creado_en,
    },
    {
      etapa: "Responsable principal",
      cumplido: Boolean(asignacion.es_principal),
      responsable,
      fecha: asignacion.creado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos de la asignación",
      tablaCamposSGC([
        ["Área", asignacion.area?.nombre || "—"],
        ["Código del área", asignacion.area?.codigo || "—"],
        ["Responsable", responsable],
        ["Correo", asignacion.usuario?.correo_electronico || "—"],
        ["Rol del usuario", asignacion.usuario?.rol || "—"],
        ["Tipo", asignacion.es_principal ? "Responsable principal" : "Responsable de apoyo"],
        ["Fecha de asignación", formatearFechaSGC(asignacion.creado_en)],
      ]),
    ),
    seccionSGC("Descripción del área", textoAHtmlSGC(asignacion.area?.descripcion, "Sin descripción.")),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  return {
    nombre: `${responsable} · ${asignacion.area?.nombre || "Área"}`,
    codigo: asignacion.area?.codigo || asignacion.id || "S/C",
    version: "1.0",
    tipoDocumento: "asignacion_responsable",
    estado: asignacion.es_principal ? "activo" : "asignado",
    contenidoHtml,
    fechaCreacion: asignacion.creado_en,
    fechaVigencia: asignacion.creado_en,
    ocultarFirmas: true,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeUsuario(usuario: Usuario): DocumentoSGCData {
  const nombre = nombreUsuarioSGC(usuario, usuario.nombre_usuario || "Usuario");
  const roles = (usuario.roles || [])
    .map((asignacion) => asignacion.rol?.nombre)
    .filter((nombreRol): nombreRol is string => Boolean(nombreRol));
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Registro",
      cumplido: true,
      responsable: nombre,
      fecha: usuario.creado_en,
    },
    {
      etapa: "Asignación de rol",
      cumplido: roles.length > 0,
      enCurso: roles.length === 0,
      responsable: nombre,
      fecha: usuario.actualizado_en,
    },
    {
      etapa: "Habilitación",
      cumplido: Boolean(usuario.activo),
      responsable: nombre,
      fecha: usuario.actualizado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos del usuario",
      tablaCamposSGC([
        ["Nombre completo", nombre],
        ["Usuario", usuario.nombre_usuario || "—"],
        ["Documento", usuario.documento != null ? String(usuario.documento) : "—"],
        ["Correo electrónico", usuario.correo_electronico || "—"],
        ["Área", usuario.area ? `${usuario.area.nombre} [${usuario.area.codigo}]` : "Sin área asignada"],
        ["Roles", roles.length ? roles.join(", ") : "Sin roles asignados"],
        ["Estado", usuario.activo ? "Activo" : "Inactivo"],
        ["Fecha de registro", formatearFechaSGC(usuario.creado_en)],
        ["Última actualización", formatearFechaSGC(usuario.actualizado_en)],
      ]),
    ),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  return {
    nombre,
    codigo: usuario.nombre_usuario || String(usuario.documento || usuario.id),
    version: "1.0",
    tipoDocumento: "usuario",
    estado: usuario.activo ? "activo" : "inactivo",
    contenidoHtml,
    fechaCreacion: usuario.creado_en,
    fechaVigencia: usuario.actualizado_en || usuario.creado_en,
    ocultarFirmas: true,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeRol(rol: {
  id: string;
  nombre: string;
  clave: string;
  descripcion?: string;
  creado_en?: string;
  permisos?: Array<{
    permiso_id?: string;
    permiso?: { id?: string; nombre?: string; codigo?: string; descripcion?: string };
    nombre?: string;
    codigo?: string;
    descripcion?: string;
  }>;
}): DocumentoSGCData {
  const permisos = (rol.permisos || [])
    .map((item) => item.permiso || item)
    .filter((permiso) => permiso?.nombre || permiso?.codigo);
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Creación del rol",
      cumplido: true,
      responsable: "Sistema",
      fecha: rol.creado_en,
    },
    {
      etapa: "Asignación de permisos",
      cumplido: permisos.length > 0,
      enCurso: permisos.length === 0,
      responsable: "Sistema",
      fecha: rol.creado_en,
    },
    {
      etapa: "Rol habilitado",
      cumplido: permisos.length > 0,
      responsable: "Sistema",
      fecha: rol.creado_en,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos del rol",
      tablaCamposSGC([
        ["Nombre", rol.nombre || "—"],
        ["Clave", rol.clave || "—"],
        ["Permisos asignados", String(permisos.length)],
        ["Fecha de creación", formatearFechaSGC(rol.creado_en)],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(rol.descripcion, "Sin descripción.")),
    seccionSGC(
      "Permisos del rol",
      permisos.length
        ? tablaCamposSGC(
            permisos.map((permiso) => [
              permiso.codigo || "—",
              [permiso.nombre, permiso.descripcion].filter(Boolean).join(" — ") || "—",
            ]),
          )
        : textoAHtmlSGC("", "Este rol no tiene permisos asignados."),
    ),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: rol.nombre || "Rol del SGC",
    codigo: rol.clave || rol.id || "S/C",
    version: "1.0",
    tipoDocumento: "rol",
    estado: permisos.length > 0 ? "activo" : "borrador",
    contenidoHtml,
    fechaCreacion: rol.creado_en,
    fechaVigencia: rol.creado_en,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function etiquetaTipoIndicadorSGC(tipo?: string): string {
  const mapa: Record<string, string> = {
    eficacia: "Eficacia",
    eficiencia: "Eficiencia",
    cumplimiento: "Cumplimiento",
  };
  return mapa[(tipo || "").toLowerCase()] || tipo || "—";
}

function etiquetaEstadoIndicadorSGC(estado?: string): string {
  const mapa: Record<string, string> = {
    borrador: "Borrador",
    pendiente_aprobacion: "Pendiente de aprobación",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
  };
  return mapa[(estado || "").toLowerCase()] || (estado || "—").replace(/_/g, " ");
}

function medicionesIndicadorAHtml(mediciones: MedicionIndicador[] = []): string {
  if (!mediciones.length) return textoAHtmlSGC("", "Sin mediciones registradas.");
  return tablaCamposSGC(
    mediciones.map((medicion) => [
      medicion.periodo || formatearFechaSGC(medicion.creado_en),
      [
        medicion.valor != null ? `Valor: ${medicion.valor}` : null,
        medicion.meta != null ? `Meta: ${medicion.meta}` : null,
        medicion.cumple_meta === true ? "Cumple meta" : medicion.cumple_meta === false ? "No cumple meta" : null,
        nombreUsuarioSGC(medicion.registrador, "") ? `Registró: ${nombreUsuarioSGC(medicion.registrador)}` : null,
        medicion.observaciones || null,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
    ]),
  );
}

export function datosSGCDesdeIndicador(
  indicador: Indicador,
  mediciones: MedicionIndicador[] = [],
): DocumentoSGCData {
  const estado = (indicador.estado || "borrador").toLowerCase();
  const historial = mediciones.length ? mediciones : indicador.ultima_medicion ? [indicador.ultima_medicion] : [];
  const ultima = historial[historial.length - 1];
  const elaborador = nombreUsuarioSGC(indicador.creador, "Sistema");
  const medidor = nombreUsuarioSGC(
    ultima?.registrador || indicador.revisador || indicador.responsable,
    elaborador,
  );
  const aprobador = nombreUsuarioSGC(indicador.aprobador, "Pendiente");
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Elaboración",
      cumplido: true,
      responsable: elaborador,
      fecha: indicador.creado_en,
    },
    {
      etapa: "Medición",
      cumplido: historial.length > 0,
      enCurso: estado === "pendiente_aprobacion" && historial.length > 0,
      responsable: medidor,
      fecha: ultima?.creado_en || indicador.fecha_revision,
    },
    {
      etapa: "Aprobación",
      cumplido: estado === "aprobado",
      enCurso: estado === "pendiente_aprobacion",
      responsable: estado === "aprobado" ? aprobador : "Pendiente",
      fecha: indicador.fecha_aprobacion,
    },
  ];
  const tipoDoc =
    indicador.tipo_indicador === "eficiencia"
      ? "indicador_eficiencia"
      : indicador.tipo_indicador === "cumplimiento"
        ? "indicador_cumplimiento"
        : indicador.tipo_indicador === "eficacia"
          ? "indicador_eficacia"
          : "indicador";

  const contenidoHtml = [
    seccionSGC(
      "Datos del indicador",
      tablaCamposSGC([
        ["Código", indicador.codigo || "—"],
        ["Nombre", indicador.nombre || "—"],
        ["Tipo", etiquetaTipoIndicadorSGC(indicador.tipo_indicador)],
        ["Estado documental", etiquetaEstadoIndicadorSGC(indicador.estado)],
        ["Proceso", indicador.proceso?.nombre || "—"],
        ["Fórmula", indicador.formula || "—"],
        ["Unidad de medida", indicador.unidad_medida || "—"],
        ["Meta", indicador.meta != null ? String(indicador.meta) : "—"],
        ["Frecuencia", indicador.frecuencia_medicion || "—"],
        ["Responsable de medición", nombreUsuarioSGC(indicador.responsable, "Sin asignar")],
        ["Elaborado por", elaborador],
        ["Revisado / medido por", historial.length ? medidor : "Pendiente"],
        ["Aprobado por", estado === "aprobado" ? aprobador : "Pendiente"],
        ["Fecha de aprobación", estado === "aprobado" ? formatearFechaSGC(indicador.fecha_aprobacion) : "Pendiente"],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(indicador.descripcion, "Sin descripción.")),
    seccionSGC("Historial de mediciones", medicionesIndicadorAHtml(historial)),
    ...(indicador.observacion_aprobacion
      ? [seccionSGC("Observación de aprobación / rechazo", textoAHtmlSGC(indicador.observacion_aprobacion))]
      : []),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: indicador.nombre || `Indicador ${indicador.codigo || ""}`.trim(),
    codigo: indicador.codigo || "S/C",
    version: "1.0",
    tipoDocumento: tipoDoc,
    estado: indicador.estado || "borrador",
    contenidoHtml,
    fechaCreacion: indicador.creado_en,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

function etiquetaCategoriaTicketSGC(categoria?: string): string {
  const mapa: Record<string, string> = {
    soporte: "Soporte técnico",
    consulta: "Consulta",
    mejora: "Solicitud de mejora",
    solicitud_documento: "Solicitud de documento",
  };
  return mapa[(categoria || "").toLowerCase()] || categoria || "—";
}

function etiquetaPrioridadTicketSGC(prioridad?: string): string {
  const mapa: Record<string, string> = {
    baja: "Baja",
    media: "Media",
    alta: "Alta",
    critica: "Crítica",
  };
  return mapa[(prioridad || "").toLowerCase()] || prioridad || "—";
}

function etiquetaEstadoTicketSGC(estado?: string): string {
  const mapa: Record<string, string> = {
    abierto: "Abierto",
    en_progreso: "En progreso",
    resuelto: "Resuelto",
    cerrado: "Cerrado",
    aprobado: "Aprobado",
    declinado: "Declinado",
  };
  return mapa[(estado || "").toLowerCase()] || (estado || "—").replace(/_/g, " ");
}

export function datosSGCDesdeTicket(
  ticket: Ticket,
  areaNombre?: string,
  documentoVinculado?: { codigo?: string; nombre?: string; version?: string } | null,
): DocumentoSGCData {
  const solicitante = nombreUsuarioSGC(ticket.solicitante, "Solicitante");
  const asignado = nombreUsuarioSGC(ticket.asignado, "Pendiente");
  const estado = (ticket.estado || "abierto").toLowerCase();
  const esSolicitudDoc = ticket.categoria === "solicitud_documento";
  const declinado = estado === "declinado";
  const cerrado = ["resuelto", "cerrado", "aprobado", "declinado"].includes(estado);
  const enAtencion = estado === "en_progreso" || estado === "abierto";
  const pasos: PasoTrazabilidad[] = esSolicitudDoc
    ? [
        {
          etapa: "Envío",
          cumplido: true,
          responsable: solicitante,
          fecha: ticket.creado_en,
        },
        {
          etapa: "Revisión",
          cumplido: estado === "en_progreso" || cerrado,
          enCurso: enAtencion && !cerrado,
          responsable: asignado,
          fecha: ticket.actualizado_en,
        },
        {
          etapa: declinado ? "Declinación" : "Aprobación",
          cumplido: cerrado,
          responsable: cerrado ? asignado : "Pendiente",
          fecha: ticket.fecha_resolucion,
        },
      ]
    : [
        {
          etapa: "Registro",
          cumplido: true,
          responsable: solicitante,
          fecha: ticket.creado_en,
        },
        {
          etapa: "Atención",
          cumplido: estado === "en_progreso" || cerrado,
          enCurso: estado === "en_progreso",
          responsable: asignado,
          fecha: ticket.actualizado_en,
        },
        {
          etapa: declinado ? "Declinación" : "Cierre",
          cumplido: cerrado,
          responsable: cerrado ? asignado : "Pendiente",
          fecha: ticket.fecha_resolucion,
        },
      ];

  const contenidoHtml = [
    seccionSGC(
      esSolicitudDoc ? "Datos de la solicitud" : "Datos del ticket",
      tablaCamposSGC([
        ["Título", ticket.titulo || "—"],
        ["Categoría", etiquetaCategoriaTicketSGC(ticket.categoria)],
        ["Prioridad", etiquetaPrioridadTicketSGC(ticket.prioridad)],
        ["Estado", etiquetaEstadoTicketSGC(ticket.estado)],
        ["Área destino", areaNombre || "Sin área"],
        ["Enviado por", solicitante],
        ["Asignado a", ticket.asignado ? asignado : "Sin asignar"],
        ["Fecha de registro", formatearFechaSGC(ticket.creado_en)],
        ["Última actualización", formatearFechaSGC(ticket.actualizado_en)],
        ...(documentoVinculado?.codigo || documentoVinculado?.nombre
          ? ([
              ["Documento vinculado", documentoVinculado.nombre || "—"],
              ["Código del formato", documentoVinculado.codigo || "—"],
              ["Versión consultada", documentoVinculado.version || "—"],
            ] as Array<[string, string]>)
          : []),
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(ticket.descripcion, "Sin descripción.")),
    ...(ticket.archivo_adjunto_url
      ? [
          seccionSGC(
            "Archivo adjunto",
            `<p><a href="${ticket.archivo_adjunto_url}" target="_blank" rel="noopener noreferrer">Ver archivo cargado</a></p>`,
          ),
        ]
      : []),
    ...(ticket.solucion
      ? [
          seccionSGC(
            declinado ? "Motivo de declinación" : esSolicitudDoc ? "Comentario de resolución" : "Solución",
            textoAHtmlSGC(ticket.solucion),
          ),
          seccionSGC(
            "Fecha de resolución",
            textoAHtmlSGC(formatearFechaSGC(ticket.fecha_resolucion), "Sin fecha de resolución."),
          ),
        ]
      : []),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: ticket.titulo || "Ticket de mesa de ayuda",
    codigo: `TK-${(ticket.id || "").slice(0, 8).toUpperCase() || "S/C"}`,
    version: documentoVinculado?.version || "1.0",
    tipoDocumento: esSolicitudDoc ? "solicitud_documento" : "ticket",
    estado: ticket.estado || "abierto",
    contenidoHtml,
    fechaCreacion: ticket.creado_en,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeDocumentoPublico(
  doc: Parameters<typeof datosSGCDesdeDocumento>[0],
  solicitudes: Ticket[] = [],
  areaNombrePorId?: Map<string, string>,
): DocumentoSGCData {
  const base = datosSGCDesdeDocumento(doc);
  const filas: Array<[string, string]> = solicitudes.length
    ? solicitudes.map((ticket) => [
        ticket.titulo || `Solicitud ${(ticket.id || "").slice(0, 8).toUpperCase()}`,
        [
          etiquetaEstadoTicketSGC(ticket.estado),
          ticket.area_destino_id && areaNombrePorId
            ? areaNombrePorId.get(ticket.area_destino_id) || "Sin área"
            : null,
          `Solicitante: ${nombreUsuarioSGC(ticket.solicitante, "—")}`,
          `Responsable: ${nombreUsuarioSGC(ticket.asignado, "Sin asignar")}`,
          `Enviada ${formatearFechaSGC(ticket.creado_en)}`,
          ticket.fecha_resolucion ? `Resolución ${formatearFechaSGC(ticket.fecha_resolucion)}` : "Sin resolución",
          ticket.solucion ? `Comentario: ${ticket.solucion}` : null,
        ]
          .filter((parte) => parte && parte !== "—")
          .join(" · "),
      ])
    : [["Solicitudes", "Aún no hay solicitudes registradas sobre este formato."]];

  return {
    ...base,
    contenidoHtml: `${base.contenidoHtml || ""}${seccionSGC(
      "Trazabilidad de solicitudes",
      tablaCamposSGC(filas),
    )}`,
  };
}

function etiquetaEstadoProgramaSGC(estado?: string): string {
  const mapa: Record<string, string> = {
    borrador: "Borrador",
    aprobado: "Aprobado",
    en_ejecucion: "En ejecución",
    finalizado: "Finalizado",
    cerrado: "Cerrado",
  };
  return mapa[(estado || "").toLowerCase()] || (estado || "—").replace(/_/g, " ");
}

export function datosSGCDesdeProgramaAuditoria(programa: ProgramaAuditoria): DocumentoSGCData {
  const estado = (programa.estado || "borrador").toLowerCase();
  const aprobado = ["aprobado", "en_ejecucion", "finalizado", "cerrado"].includes(estado);
  const enCurso = estado === "en_ejecucion";
  const cerrado = ["finalizado", "cerrado"].includes(estado);
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Elaboración",
      cumplido: true,
      responsable: "Gestión de calidad",
      fecha: programa.creadoEn,
    },
    {
      etapa: "Aprobación",
      cumplido: aprobado,
      enCurso: estado === "borrador",
      responsable: aprobado ? "Dirección" : "Pendiente",
      fecha: programa.fechaAprobacion,
    },
    {
      etapa: "Ejecución",
      cumplido: cerrado,
      enCurso,
      responsable: enCurso || cerrado ? "Equipo auditor" : "Pendiente",
      fecha: programa.fechaAprobacion,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos del programa anual",
      tablaCamposSGC([
        ["Año", String(programa.anio || "—")],
        ["Estado", etiquetaEstadoProgramaSGC(programa.estado)],
        ["Fecha de creación", formatearFechaSGC(programa.creadoEn)],
        ["Fecha de aprobación", formatearFechaSGC(programa.fechaAprobacion)],
        ["Norma de referencia", "ISO 9001:2015 — 9.2 Auditoría interna"],
      ]),
    ),
    seccionSGC("Objetivo general", textoAHtmlSGC(programa.objetivo, "Sin objetivo definido.")),
    seccionSGC(
      "Criterios de riesgo",
      textoAHtmlSGC(programa.criterioRiesgo, "Sin criterios de riesgo definidos."),
    ),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: `Programa anual de auditorías ${programa.anio || ""}`.trim(),
    codigo: `PA-${programa.anio || "S/C"}`,
    version: "1.0",
    tipoDocumento: "programa_auditoria",
    estado: programa.estado || "borrador",
    contenidoHtml,
    fechaCreacion: programa.creadoEn,
    fechaAprobacion: programa.fechaAprobacion,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}

export function datosSGCDesdeFormularioAuditoria(
  formulario: FormularioDinamico,
  campos: CampoFormulario[] = [],
  procesoNombre?: string,
): DocumentoSGCData {
  const camposActivos = campos.filter((campo) => campo.activo);
  const estado = formulario.activo
    ? formulario.estadoWorkflow || "activo"
    : formulario.estadoWorkflow || "borrador";
  const aprobado = (formulario.estadoWorkflow || "").toLowerCase() === "aprobado" || Boolean(formulario.fechaAprobacion);
  const pasos: PasoTrazabilidad[] = [
    {
      etapa: "Diseño",
      cumplido: true,
      responsable: "Gestión de calidad",
      fecha: formulario.creadoEn,
    },
    {
      etapa: "Campos ISO",
      cumplido: camposActivos.length > 0,
      enCurso: camposActivos.length === 0,
      responsable: "Gestión de calidad",
      fecha: formulario.actualizadoEn,
    },
    {
      etapa: "Aprobación",
      cumplido: aprobado || formulario.activo,
      responsable: aprobado ? "Dirección" : "Pendiente",
      fecha: formulario.fechaAprobacion,
    },
  ];

  const contenidoHtml = [
    seccionSGC(
      "Datos del formulario",
      tablaCamposSGC([
        ["Código", formulario.codigo || "—"],
        ["Nombre", formulario.nombre || "—"],
        ["Módulo", formulario.modulo || "—"],
        ["Tipo de entidad", formulario.entidadTipo || "—"],
        ["Proceso", procesoNombre || "General"],
        ["Versión", String(formulario.version ?? "1")],
        ["Estado de workflow", formulario.estadoWorkflow || (formulario.activo ? "Activo" : "Borrador")],
        ["Vigente desde", formatearFechaSGC(formulario.vigenteDesde)],
        ["Vigente hasta", formatearFechaSGC(formulario.vigenteHasta)],
        ["Fecha de creación", formatearFechaSGC(formulario.creadoEn)],
      ]),
    ),
    seccionSGC("Descripción", textoAHtmlSGC(formulario.descripcion, "Sin descripción.")),
    seccionSGC(
      "Campos del formulario",
      campos.length
        ? tablaCamposSGC(
            campos.map((campo) => [
              `${campo.orden}. ${campo.etiqueta || campo.nombre}`,
              [
                campo.tipoCampo,
                campo.requerido ? "Obligatorio" : "Opcional",
                campo.clausulaIso ? `ISO ${campo.clausulaIso}` : null,
                campo.evidenciaRequerida ? "Requiere evidencia" : null,
                campo.activo ? "Activo" : "Inactivo",
              ]
                .filter(Boolean)
                .join(" · "),
            ]),
          )
        : textoAHtmlSGC("", "Este formulario no tiene campos registrados."),
    ),
    seccionTrazabilidadSGC(pasos),
  ].join("");

  const firmas = firmasDesdePasos(pasos[0], pasos[1], pasos[2]);

  return {
    nombre: formulario.nombre || "Formulario de auditoría",
    codigo: formulario.codigo || "S/C",
    version: String(formulario.version ?? "1.0"),
    tipoDocumento: "formulario_auditoria",
    estado,
    contenidoHtml,
    fechaCreacion: formulario.creadoEn,
    fechaVigencia: formulario.vigenteHasta || formulario.vigenteDesde,
    fechaAprobacion: formulario.fechaAprobacion,
    ...firmas,
    versiones: versionesDesdePasos(pasos),
  };
}
