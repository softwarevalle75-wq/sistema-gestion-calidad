import { configuracionService } from "@/services/configuracion.service";

export interface MarcaSGC {
  logoUrl: string | null;
  titulo: string;
  subtitulo: string;
}

export interface UsuarioSGC {
  nombre?: string;
  segundoNombre?: string;
  segundo_nombre?: string;
  primerApellido?: string;
  primer_apellido?: string;
  segundoApellido?: string;
  segundo_apellido?: string;
}

export interface VersionSGC {
  version?: string;
  descripcion_cambios?: string;
  creado_en?: string;
}

export interface DocumentoSGCData {
  nombre: string;
  codigo: string;
  version: string;
  tipoDocumento: string;
  estado?: string;
  contenidoHtml?: string;
  fechaVigencia?: string;
  fechaAprobacion?: string;
  fechaCreacion?: string;
  fechaElaboracion?: string;
  fechaRevision?: string;
  elaboradoPor?: string;
  revisadoPor?: string;
  aprobadoPor?: string;
  versiones?: VersionSGC[];
  ocultarFirmas?: boolean;
}

const TIPOS: Record<string, string> = {
  formato: "FORMATO",
  proceso: "PROCESO",
  procedimiento: "PROCEDIMIENTO",
  instructivo: "INSTRUCTIVO",
  manual: "MANUAL",
  politica: "POLÍTICA",
  registro: "REGISTRO",
  plan: "PLAN",
  caracterizacion: "CARACTERIZACIÓN",
  guia: "GUÍA",
  accion_correctiva: "ACCIÓN CORRECTIVA",
  accion_preventiva: "ACCIÓN PREVENTIVA",
  accion_mejora: "ACCIÓN DE MEJORA",
  tratamiento_riesgo: "TRATAMIENTO DE RIESGO",
  no_conformidad: "NO CONFORMIDAD",
  auditoria: "AUDITORÍA",
  control_riesgo: "CONTROL DE RIESGO",
  objetivo_calidad: "OBJETIVO DE CALIDAD",
  capacitacion: "CAPACITACIÓN",
  asistencia_capacitacion: "ASISTENCIA A CAPACITACIÓN",
  hallazgo: "HALLAZGO DE AUDITORÍA",
  competencia: "COMPETENCIA",
  area: "ÁREA",
  asignacion_responsable: "ASIGNACIÓN DE RESPONSABLE",
  usuario: "USUARIO",
  rol: "ROL Y PERMISOS",
  indicador: "INDICADOR",
  indicador_eficacia: "INDICADOR DE EFICACIA",
  indicador_eficiencia: "INDICADOR DE EFICIENCIA",
  indicador_cumplimiento: "INDICADOR DE CUMPLIMIENTO",
  ticket: "TICKET",
  solicitud_documento: "SOLICITUD DE DOCUMENTO",
};

export function etiquetaTipoDocumento(tipo?: string): string {
  if (!tipo) return "DOCUMENTO";
  return TIPOS[tipo.toLowerCase()] || tipo.replace(/_/g, " ").toUpperCase();
}

const ESTADOS: Record<string, string> = {
  borrador: "borrador",
  en_revision: "en revisión",
  pendiente_aprobacion: "pendiente de aprobación",
  aprobado: "aprobado",
  obsoleto: "obsoleto",
  pendiente: "pendiente",
  en_proceso: "en proceso",
  en_ejecucion: "en ejecución",
  implementada: "implementada",
  verificada: "verificada",
  cerrada: "cerrada",
  abierta: "abierta",
  en_tratamiento: "en tratamiento",
  identificado: "identificado",
  mitigado: "mitigado",
  aceptado: "aceptado",
  planificada: "planificada",
  en_curso: "en curso",
  completada: "completada",
  cancelada: "cancelada",
  programada: "programada",
  cumplido: "cumplido",
  no_cumplido: "no cumplido",
  cancelado: "cancelado",
  planificado: "planificado",
  activo: "activo",
  inactivo: "inactivo",
  revision: "en revisión",
  suspendido: "suspendido",
  reforzada: "reforzada",
  desarrollada: "desarrollada",
  "en desarrollo": "en desarrollo",
  asignado: "asignado",
  rechazado: "rechazado",
  abierto: "abierto",
  en_progreso: "en progreso",
  resuelto: "resuelto",
  cerrado: "cerrado",
  declinado: "declinado",
};

export function etiquetaEstadoDocumento(estado?: string): string {
  if (!estado) return "sin estado";
  return ESTADOS[estado.toLowerCase()] || estado.replace(/_/g, " ");
}

export function logoSGCPorDefecto(): string {
  if (typeof window === "undefined") return "/logo-iudc.svg";
  return `${window.location.origin}/logo-iudc.svg`;
}

export function nombreUsuarioSGC(
  usuario?: UsuarioSGC | null,
  fallback = "Pendiente",
): string {
  if (!usuario) return fallback;
  const partes = [
    usuario.nombre,
    usuario.segundoNombre || usuario.segundo_nombre,
    usuario.primerApellido || usuario.primer_apellido,
    usuario.segundoApellido || usuario.segundo_apellido,
  ].filter(Boolean);
  return partes.length ? partes.join(" ") : fallback;
}

export function esContenidoHtml(valor?: string | null): boolean {
  if (!valor) return false;
  const texto = valor.trim();
  if (!texto.startsWith("<")) return false;
  return /<(p|div|h[1-6]|table|ul|ol|span|br|img)\b/i.test(texto);
}

export function formatearFechaSGC(fecha?: string | null): string {
  if (!fecha) return "—";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function limpiarVineta(linea: string): string {
  return linea.replace(/^\s*(?:[-•●▪◦*]|\d+[.)])\s+/, "").trim();
}

function esEtiquetaSeccion(linea: string): boolean {
  return /^.{2,48}:$/.test(linea.trim());
}

function listaOParrafoHtml(lineas: string[]): string {
  if (lineas.length === 1) return `<p>${escapeHtml(lineas[0])}</p>`;
  return `<ul>${lineas.map((linea) => `<li>${escapeHtml(limpiarVineta(linea))}</li>`).join("")}</ul>`;
}

export function textoAHtmlSGC(texto?: string | null, vacio = "No registrado."): string {
  if (!texto?.trim()) return `<p class="sgc-empty">${escapeHtml(vacio)}</p>`;
  if (esContenidoHtml(texto)) return texto;

  const bloques = texto.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return bloques
    .map((bloque) => {
      const lineas = bloque.split("\n").map((linea) => linea.trim()).filter(Boolean);
      if (lineas.length <= 1) {
        return lineas[0] ? `<p>${escapeHtml(lineas[0])}</p>` : "";
      }

      const partes: string[] = [];
      let items: string[] = [];
      const vaciar = () => {
        if (items.length) partes.push(listaOParrafoHtml(items));
        items = [];
      };

      for (const linea of lineas) {
        if (esEtiquetaSeccion(linea)) {
          vaciar();
          partes.push(`<h3>${escapeHtml(linea.replace(/:$/, ""))}</h3>`);
        } else {
          items.push(linea);
        }
      }
      vaciar();
      return partes.join("");
    })
    .join("");
}

export function tablaCamposSGC(filas: Array<[string, string]>): string {
  const cuerpo = filas
    .map(
      ([etiqueta, valor]) => `
        <tr>
          <th style="width:34%;text-align:left">${escapeHtml(etiqueta)}</th>
          <td>${escapeHtml(valor || "—")}</td>
        </tr>`,
    )
    .join("");

  return `<table class="sgc-grid sgc-kv"><tbody>${cuerpo}</tbody></table>`;
}

export function seccionSGC(titulo: string, html: string): string {
  return `<h2>${escapeHtml(titulo)}</h2>${html}`;
}

export function htmlTrazabilidadSGC(filas: Array<[string, string]>): string {
  return seccionSGC("Trazabilidad", tablaCamposSGC(filas));
}

export function datosSGCDesdeDocumento(doc: {
  nombre: string;
  codigo: string;
  version_actual?: string;
  tipo_documento: string;
  estado?: string;
  descripcion?: string;
  creado_en?: string;
  actualizado_en?: string;
  fecha_aprobacion?: string;
  fecha_vigencia?: string;
  creador?: UsuarioSGC | null;
  revisor?: UsuarioSGC | null;
  aprobador?: UsuarioSGC | null;
  versiones?: VersionSGC[];
}): DocumentoSGCData {
  const elaboradoPor = nombreUsuarioSGC(doc.creador, "Sistema");
  const revisadoPor = nombreUsuarioSGC(doc.revisor, "Pendiente");
  const aprobadoPor = nombreUsuarioSGC(doc.aprobador, "Pendiente");
  const estado = (doc.estado || "borrador").toLowerCase();
  const revisado = Boolean(doc.revisor);
  const aprobado = Boolean(doc.aprobador) || estado === "aprobado";

  const trazabilidad = htmlTrazabilidadSGC([
    [
      "Elaboración",
      ["Completada", elaboradoPor, formatearFechaSGC(doc.creado_en)].filter((parte) => parte && parte !== "—").join(" · "),
    ],
    [
      "Revisión",
      revisado
        ? ["Completada", revisadoPor, formatearFechaSGC(doc.actualizado_en)].filter((parte) => parte && parte !== "—").join(" · ")
        : "Pendiente",
    ],
    [
      "Aprobación",
      aprobado
        ? ["Completada", aprobadoPor, formatearFechaSGC(doc.fecha_aprobacion || doc.actualizado_en)]
            .filter((parte) => parte && parte !== "—")
            .join(" · ")
        : "Pendiente",
    ],
  ]);

  return {
    nombre: doc.nombre,
    codigo: doc.codigo,
    version: doc.version_actual || "1.0",
    tipoDocumento: doc.tipo_documento,
    estado: doc.estado,
    contenidoHtml: `${doc.descripcion || ""}${trazabilidad}`,
    fechaCreacion: doc.creado_en,
    fechaElaboracion: doc.creado_en,
    fechaRevision: revisado ? doc.actualizado_en : undefined,
    fechaAprobacion: doc.fecha_aprobacion || (aprobado ? doc.actualizado_en : undefined),
    fechaVigencia: doc.fecha_vigencia,
    elaboradoPor,
    revisadoPor,
    aprobadoPor,
    versiones: doc.versiones,
  };
}

export async function cargarMarcaSGC(): Promise<MarcaSGC> {
  try {
    const configs = await configuracionService.list({ categoria: "sistema", limit: 500 });
    const byKey = new Map(configs.map((cfg) => [cfg.clave, cfg.valor]));
    return {
      logoUrl: byKey.get("logo_universidad") || logoSGCPorDefecto(),
      titulo: byKey.get("sistema_titulo") || "Universitaria de Colombia",
      subtitulo: byKey.get("sistema_subtitulo") || "Sistema de Gestión de Calidad",
    };
  } catch {
    return {
      logoUrl: logoSGCPorDefecto(),
      titulo: "Universitaria de Colombia",
      subtitulo: "Sistema de Gestión de Calidad",
    };
  }
}

export function estilosDocumentoSGC(): string {
  return `
    @page { size: letter; margin: 12mm 14mm 14mm 14mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      background: #fff;
    }
    .sgc-print-hint {
      margin: 0 0 16px;
      padding: 10px 12px;
      border: 1px solid #BFDBFE;
      background: #EFF6FF;
      color: #1E3A8A;
      font-size: 12px;
      line-height: 1.4;
    }
    .sgc-doc { width: 100%; }
    .sgc-letterhead {
      width: 100%;
      border-bottom: 2px solid #1E3A8A;
      padding-bottom: 8px;
      margin-bottom: 14px;
      border-collapse: collapse;
    }
    .sgc-letterhead td { border: none; padding: 0; vertical-align: middle; }
    .sgc-brand { text-align: right; }
    .sgc-brand-title {
      font-size: 12px;
      font-weight: 700;
      color: #1E3A8A;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .sgc-brand-sub { font-size: 10px; color: #4B5563; margin-top: 2px; }
    .sgc-logo img {
      max-width: 180px;
      max-height: 56px;
      object-fit: contain;
      object-position: left center;
    }
    .sgc-logo-fallback {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.1;
      color: #111;
    }
    .sgc-logo-fallback span { color: #C8102E; }
    .sgc-title {
      margin: 0 0 12px;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #111;
    }
    .sgc-intro {
      margin: 0 0 12px;
      font-size: 11px;
      line-height: 1.5;
      text-align: justify;
    }
    .sgc-content {
      font-size: 11px;
      line-height: 1.5;
      text-align: justify;
    }
    .sgc-content > *:first-child { margin-top: 0; }
    .sgc-content h1,
    .sgc-content h2,
    .sgc-content h3,
    .sgc-content h4,
    .sgc-content h5,
    .sgc-content h6 {
      display: block;
      color: #111;
      text-align: left;
      font-weight: 700;
      line-height: 1.3;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sgc-content h1 { font-size: 14px; margin: 14px 0 6px; }
    .sgc-content h2 { font-size: 12px; margin: 14px 0 6px; }
    .sgc-content h3,
    .sgc-content h4 { font-size: 11px; margin: 12px 0 4px; }
    .sgc-content h2 + *,
    .sgc-content h3 + * { break-before: avoid; page-break-before: avoid; }
    .sgc-content p { display: block; margin: 0 0 8px; text-align: justify; }
    .sgc-content p:has(> strong:only-child),
    .sgc-content p:has(> b:only-child) {
      margin-top: 12px;
      margin-bottom: 4px;
      font-size: 12px;
      text-align: left;
    }
    .sgc-content ul,
    .sgc-content ol {
      display: block;
      margin: 4px 0 10px;
      padding-left: 18px;
      text-align: left;
    }
    .sgc-content ul { list-style-type: disc; list-style-position: outside; }
    .sgc-content ol { list-style-type: decimal; list-style-position: outside; }
    .sgc-content li {
      display: list-item;
      margin: 3px 0;
      line-height: 1.45;
      text-align: left;
    }
    .sgc-content li p { margin: 0; text-align: left; }
    .sgc-content img { max-width: 100%; height: auto; margin: 8px 0; }
    .sgc-content table,
    .sgc-grid {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0 12px;
      font-size: 10px;
    }
    .sgc-content th,
    .sgc-content td,
    .sgc-grid th,
    .sgc-grid td {
      border: 1px solid #111;
      padding: 5px 7px;
      text-align: left;
      vertical-align: top;
    }
    .sgc-content th,
    .sgc-grid th {
      background: #6B6B6B;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .sgc-kv th {
      background: #F3F4F6;
      color: #111;
      text-transform: none;
      font-size: 10px;
      width: 32%;
      white-space: nowrap;
    }
    .sgc-grid td.center,
    .sgc-content td.center { text-align: center; }
    .sgc-grid .sgc-subtotal td {
      background: #E5E5E5;
      font-weight: 700;
    }
    .sgc-grid .sgc-total td {
      background: #D4D4D4;
      font-weight: 700;
      font-size: 11px;
    }
    .sgc-section {
      margin-top: 14px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .sgc-note {
      margin: 16px 0 0;
      font-size: 10px;
      line-height: 1.45;
      text-align: justify;
    }
    .sgc-signs {
      width: 100%;
      margin-top: 28px;
      border-collapse: collapse;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sgc-signs td {
      width: 33.33%;
      text-align: center;
      vertical-align: top;
      padding: 0 10px;
      font-size: 10px;
      border: none;
    }
    .sgc-signs .line {
      display: block;
      margin: 36px auto 6px;
      width: 85%;
      border-top: 1px solid #111;
    }
    .sgc-signs .role {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .sgc-signs .date {
      font-size: 8px;
      color: #555;
      margin: 2px 0 4px;
    }
    .sgc-empty { color: #666; font-style: italic; text-align: left; }
    .sgc-grid tr, .sgc-kv tr, .sgc-content li {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      .sgc-print-hint { display: none !important; }
      html, body { background: #fff; }
    }
  `;
}

function logoHtml(marca: MarcaSGC): string {
  if (marca.logoUrl) {
    return `<img src="${escapeHtml(marca.logoUrl)}" alt="${escapeHtml(marca.titulo)}" />`;
  }
  return `<div class="sgc-logo-fallback">U ${escapeHtml(marca.titulo)}<br /><span>${escapeHtml(marca.subtitulo)}</span></div>`;
}

export function parrafoIntroSGC(data: DocumentoSGCData, marca: MarcaSGC): string {
  const vigencia = formatearFechaSGC(
    data.fechaVigencia || data.fechaAprobacion || data.fechaCreacion,
  );
  const tipo = etiquetaTipoDocumento(data.tipoDocumento).toLowerCase();
  const estado = etiquetaEstadoDocumento(data.estado);
  const encabezado = `La <strong>${escapeHtml(marca.titulo)}</strong>, ${escapeHtml(marca.subtitulo)}, hace constar que el presente ${escapeHtml(tipo)} denominado <strong>${escapeHtml(data.nombre || "Documento sin título")}</strong>, identificado con código <strong>${escapeHtml(data.codigo || "S/C")}</strong> versión <strong>${escapeHtml(data.version || "1.0")}</strong>, se encuentra en estado <strong>${escapeHtml(estado)}</strong>`;

  if (data.ocultarFirmas) {
    return `${encabezado}, con vigencia a partir del <strong>${escapeHtml(vigencia)}</strong>.`;
  }

  return `${encabezado}. Fue elaborado por <strong>${escapeHtml(data.elaboradoPor || "Pendiente")}</strong>, revisado por <strong>${escapeHtml(data.revisadoPor || "Pendiente")}</strong> y aprobado por <strong>${escapeHtml(data.aprobadoPor || "Pendiente")}</strong>, con vigencia a partir del <strong>${escapeHtml(vigencia)}</strong>.`;
}

function encabezadoHtml(data: DocumentoSGCData, marca: MarcaSGC): string {
  return `
    <table class="sgc-letterhead">
      <tr>
        <td class="sgc-logo">${logoHtml(marca)}</td>
        <td class="sgc-brand">
          <div class="sgc-brand-title">${escapeHtml(marca.titulo)}</div>
          <div class="sgc-brand-sub">${escapeHtml(marca.subtitulo)}</div>
        </td>
      </tr>
    </table>
    <h1 class="sgc-title">${escapeHtml(data.nombre || etiquetaTipoDocumento(data.tipoDocumento))}</h1>
  `;
}

function identificacionHtml(data: DocumentoSGCData): string {
  return `
    <table class="sgc-grid">
      <thead>
        <tr>
          <th>Código</th>
          <th>Tipo</th>
          <th>Versión</th>
          <th>Estado</th>
          <th>Vigencia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="center">${escapeHtml(data.codigo || "—")}</td>
          <td>${escapeHtml(etiquetaTipoDocumento(data.tipoDocumento))}</td>
          <td class="center">${escapeHtml(data.version || "1.0")}</td>
          <td class="center">${escapeHtml(etiquetaEstadoDocumento(data.estado).toUpperCase())}</td>
          <td class="center">${escapeHtml(formatearFechaSGC(data.fechaVigencia || data.fechaAprobacion || data.fechaCreacion))}</td>
        </tr>
        <tr class="sgc-total">
          <td colspan="3">DOCUMENTO CONTROLADO DEL SGC</td>
          <td class="center" colspan="2">${escapeHtml((data.estado || "borrador").toUpperCase())}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function pieHtml(data: DocumentoSGCData): string {
  const nota = `
    <p class="sgc-note">
      El presente documento se emite sin enmendaduras ni tachones. La versión vigente es la publicada
      en el Sistema de Gestión de Calidad. Cualquier copia impresa se considera no controlada.
    </p>
  `;

  if (data.ocultarFirmas) {
    return nota;
  }

  const firma = (nombre: string | undefined, rol: string, fecha?: string) => {
    const etiqueta = nombre || "Pendiente";
    const fechaHtml =
      etiqueta !== "Pendiente" && fecha
        ? `<div class="date">${escapeHtml(formatearFechaSGC(fecha))}</div>`
        : "";
    return `
        <td>
          <span class="line"></span>
          <strong>${escapeHtml(etiqueta)}</strong>
          ${fechaHtml}
          <div class="role">${rol}</div>
        </td>`;
  };

  return `
    ${nota}
    <table class="sgc-signs">
      <tr>
        ${firma(data.elaboradoPor, "Elaboró", data.fechaElaboracion || data.fechaCreacion)}
        ${firma(data.revisadoPor, "Revisó", data.fechaRevision)}
        ${firma(data.aprobadoPor, "Aprobó", data.fechaAprobacion)}
      </tr>
    </table>
  `;
}

function controlCambiosHtml(data: DocumentoSGCData): string {
  const versiones =
    data.versiones && data.versiones.length > 0
      ? data.versiones
      : [
          {
            version: data.version || "1.0",
            descripcion_cambios: "Versión vigente del documento controlado",
            creado_en: data.fechaElaboracion || data.fechaCreacion,
          },
        ];
  const filas = versiones
    .map(
      (v) => `
      <tr>
        <td class="center">${escapeHtml(v.version || "—")}</td>
        <td>${escapeHtml(v.descripcion_cambios || "Sin descripción")}</td>
        <td class="center">${escapeHtml(formatearFechaSGC(v.creado_en))}</td>
      </tr>`,
    )
    .join("");

  return `
    <div class="sgc-section">Control de cambios</div>
    <table class="sgc-grid">
      <thead>
        <tr>
          <th style="width:16%">Versión</th>
          <th>Descripción del cambio</th>
          <th style="width:20%">Fecha</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

export function generarHtmlDocumentoSGC(data: DocumentoSGCData, marca: MarcaSGC): string {
  const contenido = data.contenidoHtml?.trim()
    ? data.contenidoHtml
    : `<p class="sgc-empty">Este documento no tiene contenido.</p>`;
  const intro = parrafoIntroSGC(data, marca);

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.codigo)} — ${escapeHtml(data.nombre)}</title>
    <style>${estilosDocumentoSGC()}</style>
  </head>
  <body>
    <div class="sgc-print-hint">
      Vista lista para imprimir. En el cuadro elija <strong>Guardar como PDF</strong> y desactive
      <strong>Encabezados y pies de página</strong> para que no aparezca la URL del sistema.
    </div>
    <div class="sgc-doc">
      ${encabezadoHtml(data, marca)}
      <p class="sgc-intro">${intro}</p>
      ${identificacionHtml(data)}
      <div class="sgc-content">
        ${contenido}
        ${controlCambiosHtml(data)}
      </div>
      ${pieHtml(data)}
    </div>
  </body>
</html>`;
}

function esperarImagenes(doc: Document): Promise<void[]> {
  return Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
}

export async function exportarDocumentoSGC(
  data: DocumentoSGCData,
  marca?: MarcaSGC,
): Promise<void> {
  const branding = marca || (await cargarMarcaSGC());
  const html = generarHtmlDocumentoSGC(data, branding);
  const printWindow = window.open("", "_blank", "height=1000,width=920");
  if (!printWindow) {
    throw new Error("El navegador bloqueó la ventana de impresión");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  await esperarImagenes(printWindow.document);
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  printWindow.focus();
  printWindow.print();
}
