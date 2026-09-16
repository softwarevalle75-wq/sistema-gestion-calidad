import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Download,
  Printer,
  Eye,
  Filter,
  Send,
  CheckCircle2,
  XCircle,
  History,
  Clock,
  UserCheck,
  ClipboardList,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { documentoService, type DocumentoResponse } from "@/services/documento.service";
import { esContenidoHtml, exportarDocumentoSGC, formatearFechaSGC, nombreUsuarioSGC } from "@/utils/documentoSGC";
import { datosSGCDesdeDocumentoPublico, datosSGCDesdeTicket } from "@/utils/documentosRegistrosSGC";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { areaService, type Area } from "@/services/area.service";
import ticketService, { type Ticket } from "@/services/ticket.service";
import { uploadService } from "@/services/upload.service";
import { getCurrentUser } from "@/services/auth";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { sameId } from "@/lib/permissions";

type SolicitudForm = {
  areaId: string;
  descripcion: string;
  archivo: File | null;
};

type DecisionAction = "aprobar" | "declinar";

function formatearFechaHora(fecha?: string | null) {
  if (!fecha) return "—";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleString("es-CO");
}

function etiquetaEstadoSolicitud(estado: string) {
  const map: Record<string, string> = {
    abierto: "Abierta",
    en_progreso: "En revisión",
    resuelto: "Resuelta",
    cerrado: "Cerrada",
    aprobado: "Aprobada",
    declinado: "Declinada",
  };
  return map[estado] || estado;
}

function claseEstadoSolicitud(estado: string) {
  const map: Record<string, string> = {
    abierto: "bg-[#E0EDFF] text-[#1E3A8A] border-[#2563EB]/30",
    en_progreso: "bg-[#FFF7ED] text-[#9A3412] border-[#F97316]/30",
    aprobado: "bg-[#ECFDF5] text-[#065F46] border-[#10B981]/30",
    resuelto: "bg-[#ECFDF5] text-[#065F46] border-[#10B981]/30",
    cerrado: "bg-[#F8FAFC] text-[#374151] border-[#E5E7EB]",
    declinado: "bg-[#FEF2F2] text-[#991B1B] border-[#DC2626]/30",
  };
  return map[estado] || "bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB]";
}

function solicitudesDeDocumento(doc: DocumentoResponse, tickets: Ticket[]) {
  return tickets.filter((ticket) => {
    if (ticket.categoria !== "solicitud_documento") return false;
    if (ticket.documento_publico_id && sameId(ticket.documento_publico_id, doc.id)) return true;
    return Boolean(doc.codigo && ticket.titulo?.toLowerCase().includes(doc.codigo.toLowerCase()));
  });
}

function documentoDeTicket(ticket: Ticket, documentos: DocumentoResponse[]) {
  if (ticket.documento_publico_id) {
    const porId = documentos.find((doc) => sameId(doc.id, ticket.documento_publico_id));
    if (porId) return porId;
  }
  return documentos.find((doc) => doc.codigo && ticket.titulo?.toLowerCase().includes(doc.codigo.toLowerCase()));
}

function TimelineSolicitud({ ticket }: { ticket: Ticket }) {
  const estado = (ticket.estado || "abierto").toLowerCase();
  const cerrado = ["aprobado", "declinado", "resuelto", "cerrado"].includes(estado);
  const declinado = estado === "declinado";
  const pasos = [
    {
      label: "Enviada",
      done: true,
      current: false,
      date: ticket.creado_en,
      person: nombreUsuarioSGC(ticket.solicitante, "Solicitante"),
    },
    {
      label: "En revisión",
      done: estado === "en_progreso" || cerrado,
      current: estado === "abierto" || estado === "en_progreso",
      date: estado === "abierto" ? null : ticket.actualizado_en,
      person: nombreUsuarioSGC(ticket.asignado, "Pendiente de área"),
    },
    {
      label: declinado ? "Declinada" : cerrado ? "Aprobada" : "Resolución",
      done: cerrado,
      current: false,
      negative: declinado,
      date: ticket.fecha_resolucion,
      person: cerrado ? nombreUsuarioSGC(ticket.asignado, "Responsable") : "Pendiente",
    },
  ];

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
      {pasos.map((paso, index) => (
        <div
          key={paso.label}
          className={`rounded-xl border px-3 py-2 ${
            paso.negative
              ? "bg-[#FEF2F2] border-[#FECACA]"
              : paso.done
                ? "bg-[#ECFDF5] border-[#A7F3D0]"
                : paso.current
                  ? "bg-[#E0EDFF] border-[#BFDBFE]"
                  : "bg-[#F8FAFC] border-[#E5E7EB]"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
            {index + 1}. {paso.label}
          </p>
          <p className="text-sm font-semibold text-[#111827] truncate">{paso.person}</p>
          <p className="text-xs text-[#6B7280]">{paso.date ? formatearFechaHora(paso.date) : "Pendiente"}</p>
        </div>
      ))}
    </div>
  );
}

export default function DocumentosPublicos() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [documentos, setDocumentos] = useState<DocumentoResponse[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [sending, setSending] = useState(false);
  const [resolviendoDecision, setResolviendoDecision] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoResponse | null>(null);
  const [documentoVista, setDocumentoVista] = useState<DocumentoResponse | null>(null);
  const [ticketVista, setTicketVista] = useState<Ticket | null>(null);
  const [showDocumento, setShowDocumento] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [decisionTicketId, setDecisionTicketId] = useState<string | null>(null);
  const [decisionAccion, setDecisionAccion] = useState<DecisionAction>("aprobar");
  const [decisionComentario, setDecisionComentario] = useState("");
  const [solicitudForm, setSolicitudForm] = useState<SolicitudForm>({
    areaId: "",
    descripcion: "",
    archivo: null,
  });

  useEffect(() => {
    void cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const docsPromise = documentoService.getAll({ estado: "aprobado" }).catch((error) => {
        console.error("Error al cargar documentos publicos:", error);
        toast.error("No se pudieron cargar los documentos públicos");
        return [] as DocumentoResponse[];
      });
      const areasPromise = areaService.getAll().catch((error) => {
        console.error("Error al cargar áreas:", error);
        return [] as Area[];
      });
      const ticketsPromise = ticketService.getAll().catch((error) => {
        console.error("Error al cargar solicitudes:", error);
        return [] as Ticket[];
      });
      const [docs, areasData, ticketsData] = await Promise.all([docsPromise, areasPromise, ticketsPromise]);
      setDocumentos(docs || []);
      setAreas(areasData || []);
      setTickets(ticketsData || []);
    } catch (error) {
      console.error("Error al cargar documentos publicos:", error);
      toast.error("No se pudieron cargar los datos");
      setDocumentos([]);
      setAreas([]);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const tiposDisponibles = useMemo(() => {
    return [...new Set(documentos.map((doc) => doc.tipo_documento).filter(Boolean))].sort();
  }, [documentos]);

  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      const coincideBusqueda = matchesTextSearch(search, doc);
      const coincideTipo = tipo.length === 0 || doc.tipo_documento === tipo;
      return coincideBusqueda && coincideTipo;
    });
  }, [documentos, search, tipo]);

  const solicitudesDocumento = useMemo(
    () => tickets.filter((t) => t.categoria === "solicitud_documento"),
    [tickets],
  );

  const misSolicitudes = useMemo(() => {
    if (!currentUser?.id) return [];
    return solicitudesDocumento.filter((t) => sameId(t.solicitante_id, currentUser.id));
  }, [solicitudesDocumento, currentUser]);

  const pendientesPorAprobar = useMemo(() => {
    if (!currentUser?.id) return [];
    return solicitudesDocumento.filter(
      (t) => t.estado === "abierto" && sameId(t.asignado_a, currentUser.id),
    );
  }, [solicitudesDocumento, currentUser]);

  const solicitudesAbiertas = useMemo(
    () => solicitudesDocumento.filter((t) => t.estado === "abierto" || t.estado === "en_progreso").length,
    [solicitudesDocumento],
  );

  const solicitudesAprobadas = useMemo(
    () => solicitudesDocumento.filter((t) => t.estado === "aprobado").length,
    [solicitudesDocumento],
  );

  const areasConResponsable = useMemo(() => {
    return areas.filter((a) => Array.isArray(a.asignaciones) && a.asignaciones.length > 0);
  }, [areas]);

  const areaNombrePorId = useMemo(() => {
    return new Map(areas.map((a) => [a.id, a.nombre]));
  }, [areas]);

  const datosDocumentoVista = useMemo(() => {
    if (!documentoVista) return null;
    return datosSGCDesdeDocumentoPublico(
      documentoVista,
      solicitudesDeDocumento(documentoVista, tickets),
      areaNombrePorId,
    );
  }, [documentoVista, tickets, areaNombrePorId]);

  const documentoTicketVista = useMemo(() => {
    if (!ticketVista) return null;
    return documentoDeTicket(ticketVista, documentos);
  }, [ticketVista, documentos]);

  const datosTicketVista = useMemo(() => {
    if (!ticketVista) return null;
    return datosSGCDesdeTicket(
      ticketVista,
      ticketVista.area_destino_id ? areaNombrePorId.get(ticketVista.area_destino_id) : undefined,
      documentoTicketVista
        ? {
            codigo: documentoTicketVista.codigo,
            nombre: documentoTicketVista.nombre,
            version: documentoTicketVista.version_actual,
          }
        : null,
    );
  }, [ticketVista, areaNombrePorId, documentoTicketVista]);

  const puedeDecidirTicketVista = Boolean(
    ticketVista &&
      ticketVista.estado === "abierto" &&
      currentUser?.id &&
      sameId(ticketVista.asignado_a, currentUser.id),
  );

  const handleVerDocumento = async (doc: DocumentoResponse) => {
    const toastId = toast.loading("Abriendo documento controlado...");
    try {
      const [completo, versiones] = await Promise.all([
        documentoService.getById(doc.id).catch(() => doc),
        documentoService.getVersiones(doc.id).catch(() => []),
      ]);
      setDocumentoVista({
        ...completo,
        versiones: versiones?.length ? versiones : completo.versiones || doc.versiones,
      });
      setShowDocumento(true);
    } catch (error) {
      console.error("Error al abrir documento:", error);
      setDocumentoVista(doc);
      setShowDocumento(true);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleImprimir = async (doc: DocumentoResponse) => {
    try {
      let completo = doc;
      try {
        const [detalle, versiones] = await Promise.all([
          documentoService.getById(doc.id),
          documentoService.getVersiones(doc.id).catch(() => []),
        ]);
        completo = {
          ...detalle,
          versiones: versiones?.length ? versiones : detalle.versiones || doc.versiones,
        };
      } catch {
        completo = doc;
      }
      await exportarDocumentoSGC(
        datosSGCDesdeDocumentoPublico(completo, solicitudesDeDocumento(completo, tickets), areaNombrePorId),
      );
      toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
    } catch (error) {
      console.error("Error al imprimir documento:", error);
      toast.error("No se pudo abrir la impresión del documento");
    }
  };

  const handleDescargar = async (doc: DocumentoResponse) => {
    try {
      if (esContenidoHtml(doc.descripcion) || !doc.ruta_archivo) {
        await handleImprimir(doc);
        return;
      }
      window.open(doc.ruta_archivo, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error("No se pudo generar el PDF del documento");
    }
  };

  const abrirSolicitud = (doc: DocumentoResponse) => {
    setSelectedDocumento(doc);
    setSolicitudForm({
      areaId: "",
      descripcion: "",
      archivo: null,
    });
  };

  const cerrarSolicitud = () => {
    setSelectedDocumento(null);
    setSolicitudForm({
      areaId: "",
      descripcion: "",
      archivo: null,
    });
  };

  const enviarSolicitud = async () => {
    if (!selectedDocumento) return;
    if (!solicitudForm.areaId) {
      toast.error("Selecciona el área destino");
      return;
    }
    if (!solicitudForm.descripcion.trim() && !solicitudForm.archivo) {
      toast.error("Describe la solicitud o adjunta el formato diligenciado");
      return;
    }

    try {
      setSending(true);
      let archivoUrl: string | undefined;
      if (solicitudForm.archivo) {
        const subida = await uploadService.uploadEvidencia(solicitudForm.archivo);
        archivoUrl = subida.url;
      }

      await ticketService.create({
        titulo: `Solicitud ${selectedDocumento.codigo} - ${selectedDocumento.nombre}`,
        descripcion:
          solicitudForm.descripcion.trim() ||
          `Solicitud enviada desde documentos públicos para el formato ${selectedDocumento.codigo}.`,
        categoria: "solicitud_documento",
        prioridad: "media",
        area_destino_id: solicitudForm.areaId,
        documento_publico_id: selectedDocumento.id,
        archivo_adjunto_url: archivoUrl,
      });

      toast.success("Solicitud enviada. Quedó registrada con trazabilidad para el área responsable.");
      cerrarSolicitud();
      await cargarDatos();
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la solicitud");
    } finally {
      setSending(false);
    }
  };

  const abrirDecisionModal = (ticketId: string, accion: DecisionAction) => {
    setDecisionTicketId(ticketId);
    setDecisionAccion(accion);
    setDecisionComentario("");
  };

  const cerrarDecisionModal = () => {
    setDecisionTicketId(null);
    setDecisionComentario("");
  };

  const decidirSolicitud = async (ticketId: string, accion: DecisionAction, comentario: string) => {
    try {
      setResolviendoDecision(true);
      if (accion === "aprobar") {
        await ticketService.aprobar(ticketId, { comentario });
        toast.success("Solicitud aprobada");
      } else {
        await ticketService.declinar(ticketId, { comentario });
        toast.success("Solicitud declinada");
      }
      await cargarDatos();
      cerrarDecisionModal();
      setShowTicket(false);
      setTicketVista(null);
    } catch (error) {
      console.error("Error al resolver solicitud:", error);
      toast.error("No se pudo actualizar la solicitud");
    } finally {
      setResolviendoDecision(false);
    }
  };

  const confirmarDecision = async () => {
    if (!decisionTicketId) return;
    await decidirSolicitud(decisionTicketId, decisionAccion, decisionComentario.trim());
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <FileText className="h-9 w-9 text-[#2563EB]" />
                Documentos públicos
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Formatos vigentes con ciclo de vida, firmas y solicitudes trazables al área responsable.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {documentos.length} publicados
                </Badge>
                <Badge className="bg-white text-[#1E3A8A] border border-[#E5E7EB]">
                  {solicitudesDocumento.length} solicitudes
                </Badge>
                {pendientesPorAprobar.length > 0 && (
                  <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                    {pendientesPorAprobar.length} por aprobar
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Publicados</CardDescription>
                <FileText className="h-7 w-7 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{documentos.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">En trámite</CardDescription>
                <Clock className="h-7 w-7 text-[#F97316]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{solicitudesAbiertas}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Aprobadas</CardDescription>
                <CheckCircle2 className="h-7 w-7 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{solicitudesAprobadas}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Por aprobar</CardDescription>
                <UserCheck className="h-7 w-7 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{pendientesPorAprobar.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {pendientesPorAprobar.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 md:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1E3A8A] mb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Solicitudes pendientes por aprobar
            </h2>
            <div className="space-y-3">
              {pendientesPorAprobar.map((t) => {
                const doc = documentoDeTicket(t, documentos);
                return (
                  <div key={t.id} className="border border-[#E5E7EB] rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#111827]">{t.titulo}</p>
                        {doc && (
                          <p className="text-xs text-[#6B7280] mt-1">
                            Formato {doc.codigo} · {doc.tipo_documento} · v{doc.version_actual}
                          </p>
                        )}
                      </div>
                      <Badge className={`border ${claseEstadoSolicitud(t.estado)}`}>
                        {etiquetaEstadoSolicitud(t.estado)}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-1">{t.descripcion}</p>
                    <TimelineSolicitud ticket={t} />
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => {
                          setTicketVista(t);
                          setShowTicket(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
                      >
                        <Eye className="w-4 h-4" />
                        Ver trazabilidad
                      </button>
                      {t.archivo_adjunto_url && (
                        <button
                          onClick={() => window.open(t.archivo_adjunto_url, "_blank", "noopener,noreferrer")}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
                        >
                          <Download className="w-4 h-4" />
                          Ver archivo
                        </button>
                      )}
                      <button
                        onClick={() => abrirDecisionModal(t.id, "aprobar")}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-medium hover:bg-[#15803D]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => abrirDecisionModal(t.id, "declinar")}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#DC2626] text-white text-sm font-medium hover:bg-[#B91C1C]"
                      >
                        <XCircle className="w-4 h-4" />
                        Declinar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder={SEARCH_ANY_PLACEHOLDER}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#E5E7EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <select
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-[#E5E7EB] appearance-none bg-white focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 md:p-6 shadow-sm">
          {loading ? (
            <LoadingSpinner message="Cargando documentos públicos" />
          ) : documentosFiltrados.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No hay documentos públicos con esos filtros.</p>
          ) : (
            <div className="space-y-4">
              {documentosFiltrados.map((doc) => {
                const relacionadas = solicitudesDeDocumento(doc, tickets);
                const abiertas = relacionadas.filter((t) => t.estado === "abierto" || t.estado === "en_progreso").length;
                const aprobadas = relacionadas.filter((t) => t.estado === "aprobado").length;
                return (
                  <div key={doc.id} className="border border-[#E5E7EB] rounded-2xl p-4 md:p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-[#E0EDFF] text-[#1E3A8A] border border-[#2563EB]/20">
                            {doc.codigo}
                          </Badge>
                          <Badge className="bg-white text-[#374151] border border-[#E5E7EB]">
                            {doc.tipo_documento}
                          </Badge>
                          <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30">
                            v{doc.version_actual}
                          </Badge>
                          <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30">
                            Vigente
                          </Badge>
                        </div>
                        <p className="font-semibold text-[#111827] text-lg">{doc.nombre}</p>
                        <p className="text-xs text-[#6B7280]">
                          Creado: {formatearFechaSGC(doc.creado_en)}
                          {" · Actualizado: "}
                          {formatearFechaSGC(doc.actualizado_en)}
                          {" · Aprobado: "}
                          {formatearFechaSGC(doc.fecha_aprobacion || doc.actualizado_en)}
                          {doc.fecha_vigencia ? ` · Vigencia: ${formatearFechaSGC(doc.fecha_vigencia)}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void handleVerDocumento(doc)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button
                          onClick={() => void handleImprimir(doc)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir
                        </button>
                        <button
                          onClick={() => void handleDescargar(doc)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8]"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </button>
                        <button
                          onClick={() => abrirSolicitud(doc)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0E7490] text-white text-sm font-medium hover:bg-[#155E75]"
                        >
                          <Send className="w-4 h-4" />
                          Enviar Solicitud
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2">
                        <p className="text-[11px] uppercase font-bold text-[#6B7280]">Elaboró</p>
                        <p className="text-sm font-semibold text-[#111827] truncate">
                          {nombreUsuarioSGC(doc.creador, "Sistema")}
                        </p>
                        <p className="text-xs text-[#6B7280]">{formatearFechaSGC(doc.creado_en)}</p>
                      </div>
                      <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2">
                        <p className="text-[11px] uppercase font-bold text-[#6B7280]">Revisó</p>
                        <p className="text-sm font-semibold text-[#111827] truncate">
                          {nombreUsuarioSGC(doc.revisor, "Pendiente")}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {doc.revisor ? formatearFechaSGC(doc.actualizado_en) : "Sin revisión registrada"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-2">
                        <p className="text-[11px] uppercase font-bold text-[#065F46]">Aprobó</p>
                        <p className="text-sm font-semibold text-[#111827] truncate">
                          {nombreUsuarioSGC(doc.aprobador, "Pendiente")}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {formatearFechaSGC(doc.fecha_aprobacion || doc.actualizado_en)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-1">
                        <History className="w-3.5 h-3.5" />
                        {doc.versiones?.length || 1} versión{(doc.versiones?.length || 1) === 1 ? "" : "es"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E0EDFF] border border-[#BFDBFE] px-3 py-1 text-[#1E3A8A]">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {relacionadas.length} solicitud{relacionadas.length === 1 ? "" : "es"}
                      </span>
                      {abiertas > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 text-[#9A3412]">
                          {abiertas} en trámite
                        </span>
                      )}
                      {aprobadas > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 text-[#065F46]">
                          {aprobadas} aprobada{aprobadas === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {misSolicitudes.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 md:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1E3A8A] mb-3">Mis solicitudes</h2>
            <div className="space-y-3">
              {misSolicitudes.map((t) => {
                const doc = documentoDeTicket(t, documentos);
                return (
                  <div key={t.id} className="border border-[#E5E7EB] rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#111827]">{t.titulo}</p>
                        {doc && (
                          <p className="text-xs text-[#6B7280] mt-1">
                            Formato {doc.codigo} · {doc.nombre} · v{doc.version_actual}
                          </p>
                        )}
                      </div>
                      <Badge className={`border ${claseEstadoSolicitud(t.estado)}`}>
                        {etiquetaEstadoSolicitud(t.estado)}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-2">
                      Área: {t.area_destino_id ? areaNombrePorId.get(t.area_destino_id) || "Sin área" : "Sin área"}
                      {" · Solicitante: "}
                      {nombreUsuarioSGC(t.solicitante, "—")}
                      {" · Responsable: "}
                      {nombreUsuarioSGC(t.asignado, "Sin asignar")}
                    </p>
                    <TimelineSolicitud ticket={t} />
                    {t.solucion && (
                      <p className="text-sm text-[#374151] mt-3 bg-[#F8FAFC] rounded-lg p-2">
                        Comentario: {t.solucion}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => {
                          setTicketVista(t);
                          setShowTicket(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
                      >
                        <Eye className="w-4 h-4" />
                        Ver trazabilidad
                      </button>
                      {t.archivo_adjunto_url && (
                        <button
                          onClick={() => window.open(t.archivo_adjunto_url, "_blank", "noopener,noreferrer")}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
                        >
                          <Paperclip className="w-4 h-4" />
                          Ver adjunto
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <VistaDocumentoSGCDialog
        open={showDocumento}
        onOpenChange={setShowDocumento}
        data={datosDocumentoVista}
        title="Documento público controlado"
        description="Formato vigente con firmas, versiones y solicitudes asociadas."
        extraActions={
          documentoVista ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate(`/documentos/${documentoVista.id}`)}
            >
              Abrir ficha completa
            </Button>
          ) : null
        }
      />

      <VistaDocumentoSGCDialog
        open={showTicket}
        onOpenChange={setShowTicket}
        data={datosTicketVista}
        title="Solicitud de documento"
        description="Registro controlado con envío, revisión y resolución de la solicitud."
        extraActions={
          ticketVista && puedeDecidirTicketVista ? (
            <>
              <Button
                className="rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white"
                onClick={() => abrirDecisionModal(ticketVista.id, "aprobar")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
              <Button
                className="rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                onClick={() => abrirDecisionModal(ticketVista.id, "declinar")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Declinar
              </Button>
            </>
          ) : null
        }
      />

      <Dialog
        open={Boolean(decisionTicketId)}
        onOpenChange={(open) => {
          if (!open && !resolviendoDecision) {
            cerrarDecisionModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className={decisionAccion === "aprobar" ? "text-[#166534]" : "text-[#991B1B]"}>
              {decisionAccion === "aprobar" ? "Aprobar solicitud" : "Declinar solicitud"}
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              {decisionAccion === "aprobar"
                ? "Puedes dejar un comentario opcional para la aprobación."
                : "Puedes dejar un motivo opcional para la declinación."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#111827]">
              {decisionAccion === "aprobar" ? "Comentario de aprobación" : "Motivo de declinación"} (opcional)
            </label>
            <Textarea
              value={decisionComentario}
              onChange={(e) => setDecisionComentario(e.target.value)}
              placeholder={
                decisionAccion === "aprobar"
                  ? "Ej: Solicitud revisada y aprobada."
                  : "Ej: El archivo no cumple el formato requerido."
              }
              className="min-h-[100px] border-[#E5E7EB] focus-visible:ring-[#2563EB]/30"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-[#D1D5DB]"
              onClick={cerrarDecisionModal}
              disabled={resolviendoDecision}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarDecision}
              disabled={resolviendoDecision}
              className={
                decisionAccion === "aprobar"
                  ? "bg-[#16A34A] hover:bg-[#15803D]"
                  : "bg-[#DC2626] hover:bg-[#B91C1C]"
              }
            >
              {resolviendoDecision
                ? "Procesando..."
                : decisionAccion === "aprobar"
                  ? "Aprobar solicitud"
                  : "Declinar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedDocumento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] w-full max-w-2xl p-6">
            <h3 className="text-xl font-bold text-[#1E3A8A]">Enviar Solicitud</h3>
            <p className="text-sm text-[#6B7280] mt-1">
              Documento: {selectedDocumento.codigo} - {selectedDocumento.nombre} · v{selectedDocumento.version_actual}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">
              Elaboró {nombreUsuarioSGC(selectedDocumento.creador, "Sistema")} · Aprobó{" "}
              {nombreUsuarioSGC(selectedDocumento.aprobador, "Pendiente")}
            </p>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1">Área destino</label>
                <select
                  className="w-full p-2 rounded-lg border border-[#E5E7EB]"
                  value={solicitudForm.areaId}
                  onChange={(e) => setSolicitudForm({ ...solicitudForm, areaId: e.target.value })}
                >
                  <option value="">Selecciona un área con responsable</option>
                  {(areasConResponsable.length > 0 ? areasConResponsable : areas).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                {areasConResponsable.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    El área debe tener un responsable asignado para poder enviar la solicitud.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1">Descripcion</label>
                <textarea
                  className="w-full p-2 rounded-lg border border-[#E5E7EB] min-h-[90px]"
                  placeholder="Describe brevemente tu solicitud..."
                  value={solicitudForm.descripcion}
                  onChange={(e) => setSolicitudForm({ ...solicitudForm, descripcion: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#111827] block mb-1">
                  Formato diligenciado (opcional)
                </label>
                <input
                  type="file"
                  className="w-full p-2 rounded-lg border border-[#E5E7EB]"
                  onChange={(e) =>
                    setSolicitudForm({
                      ...solicitudForm,
                      archivo: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                    })
                  }
                />
                <p className="text-xs text-[#6B7280] mt-1">
                  Puedes enviar la solicitud con una descripción o adjuntando el formato.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={cerrarSolicitud}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]"
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                onClick={enviarSolicitud}
                className="px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                disabled={sending}
              >
                {sending ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
