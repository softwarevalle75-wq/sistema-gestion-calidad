import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { documentoService } from "@/services/documento.service";
import { DocumentoSGCPaper } from "@/components/documents/DocumentoSGCPaper";
import { toast } from "sonner";
import {
  FileText,
  ArrowLeft,
  Edit,
  Clock,
  CheckCircle,
  Calendar,
  Eye,
  Hash,
  FileType,
  Trash2,
  FileCheck,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { BotonesImpresionDocumentoSGC } from "@/components/documents/BotonesImpresionDocumentoSGC";
import { hasAnyPermission } from "@/lib/permissions";
import {
  cargarMarcaSGC,
  datosSGCDesdeDocumento,
  exportarDocumentoSGC,
  type DocumentoSGCData,
  type MarcaSGC,
} from "@/utils/documentoSGC";

interface Documento {
  id: string;
  nombre: string;
  tipo_documento: string;
  codigo: string;
  version_actual: string;
  estado: string;
  ruta_archivo?: string;
  descripcion?: string;
  creado_en: string;
  actualizado_en: string;
  creado_por?: string;
  aprobado_por?: string;
  creador?: { nombre: string; segundoNombre?: string; primerApellido?: string; segundoApellido?: string };
  revisor?: { nombre: string; segundoNombre?: string; primerApellido?: string; segundoApellido?: string };
  aprobador?: { nombre: string; segundoNombre?: string; primerApellido?: string; segundoApellido?: string };
}

export default function VerDocumento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canEdit = hasAnyPermission(["documentos.revisar"]);
  const canDelete = hasAnyPermission(["documentos.anular"]);
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [marca, setMarca] = useState<MarcaSGC>({
    logoUrl: null,
    titulo: "Universitaria de Colombia",
    subtitulo: "Sistema de Gestión de Calidad",
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchDocumento = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await documentoService.getById(id);
      setDocumento(data as unknown as Documento);

      // Cargar versiones del documento
      fetchVersiones();
    } catch (error) {
      console.error("Error al cargar documento:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar documento",
      );
      navigate("/documentos");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersiones = async () => {
    if (!id) return;

    try {
      const data = await documentoService.getVersiones(id);
      setVersiones(data || []);
    } catch (error) {
      console.error("Error al cargar versiones:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDocumento();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    cargarMarcaSGC().then(setMarca);
  }, []);

  const construirDatosSGC = (): DocumentoSGCData | null => {
    if (!documento) return null;
    return datosSGCDesdeDocumento({
      ...documento,
      versiones,
    });
  };

  const handleExportPDF = async () => {
    const datos = construirDatosSGC();
    if (!datos) return;

    try {
      setExporting(true);
      await exportarDocumentoSGC(datos, marca);
      toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo generar el PDF del documento",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    if (!documento) return;

    toast.warning(
      <div>
        <p className="font-semibold">¿Eliminar documento?</p>
        <p className="text-sm text-muted-foreground mt-1">
          Se eliminará "{documento.nombre}"
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={async () => {
              try {
                await documentoService.delete(documento.id);
                toast.success("Documento eliminado correctamente");
                navigate("/documentos");
              } catch (error) {
                console.error("Error al eliminar documento:", error);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Error al eliminar documento",
                );
              }
            }}
            className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm"
          >
            Eliminar
          </button>
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>,
      {
        duration: 10000,
      },
    );
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<
      string,
      { color: string; icon: React.ReactElement; label: string }
    > = {
      borrador: {
        color: "bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB]",
        icon: <Clock className="w-4 h-4" />,
        label: "Borrador",
      },
      en_revision: {
        color: "bg-[#E0EDFF] text-[#2563EB] border-[#2563EB]/30",
        icon: <Eye className="w-4 h-4" />,
        label: "En Revisión",
      },
      pendiente_aprobacion: {
        color: "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]/30",
        icon: <FileCheck className="w-4 h-4" />,
        label: "Pendiente Aprobación",
      },
      aprobado: {
        color: "bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/30",
        icon: <CheckCircle className="w-4 h-4" />,
        label: "Aprobado",
      },
      obsoleto: {
        color: "bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/30",
        icon: <Trash2 className="w-4 h-4" />,
        label: "Obsoleto",
      },
    };

    const badge = estados[estado] || estados.borrador;

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${badge.color}`}
      >
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getNombreCompleto = (
    usuario?: { nombre: string; segundoNombre?: string; primerApellido?: string; segundoApellido?: string },
    defaultText: string = "No asignado / Pendiente"
  ) => {
    if (!usuario) return defaultText;
    return [
      usuario.nombre,
      usuario.segundoNombre,
      usuario.primerApellido,
      usuario.segundoApellido
    ]
      .filter(Boolean)
      .join(" ");
  };

  if (loading) {
    return (
      <LoadingSpinner message="Cargando Documento" />
    );
  }

  if (!documento) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-20 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-[#1E3A8A]">
              Documento no encontrado
            </h2>
            <p className="text-[#6B7280] mb-6">
              El documento que buscas no existe o fue eliminado
            </p>
            <button
              onClick={() => navigate("/documentos")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Documentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 w-full overflow-x-hidden bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 min-w-0">
        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-4 sm:p-6 md:p-8">
          <button
            onClick={() => navigate("/documentos")}
            className="inline-flex items-center gap-2 text-[#6B7280] hover:text-[#1E3A8A] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a documentos
          </button>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <FileText className="h-7 w-7 sm:h-9 sm:w-9 text-[#2563EB] shrink-0" />
                <span className="break-words">{documento.nombre}</span>
              </h1>
              <p className="text-[#6B7280] mt-2 text-sm sm:text-lg font-mono break-all">
                {documento.codigo}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
              <BotonesImpresionDocumentoSGC
                native
                onImprimir={handleExportPDF}
                loading={exporting}
              />
              {canEdit && (
                <button
                  onClick={() => navigate(`/documentos/${documento.id}/editar`)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#6B7280] border border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFC] font-semibold transition-all w-full sm:w-auto"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30 rounded-xl hover:bg-red-100 font-semibold transition-all w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Documento en formato oficial SGC */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F1F5F9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-xl font-semibold text-[#1E3A8A]">Documento controlado</h2>
              </div>
              <p className="text-sm text-[#6B7280] mt-1">
                Use Imprimir para enviar el documento a la impresora, o Exportar PDF para guardarlo como archivo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <BotonesImpresionDocumentoSGC
                native
                onImprimir={handleExportPDF}
                loading={exporting}
              />
            </div>
          </div>
          <div className="p-3 sm:p-6 bg-[#F8FAFC] overflow-x-auto">
            <div className="mx-auto w-full max-w-[816px] border border-[#E5E7EB] shadow-sm">
              {(() => {
                const datos = construirDatosSGC();
                return datos ? <DocumentoSGCPaper data={datos} marca={marca} /> : null;
              })()}
            </div>
          </div>
        </div>

        {/* Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estado */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[#1E3A8A]">Estado</span>
            </div>
            {getEstadoBadge(documento.estado)}
          </div>

          {/* Versión */}
          <div className="bg-[#E0EDFF] p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-5 h-5 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#1E3A8A]">Versión</span>
            </div>
            <p className="text-3xl font-bold text-[#1E3A8A]">{documento.version_actual}</p>
          </div>

          {/* Tipo de Documento */}
          <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <FileType className="w-5 h-5 text-[#6B7280]" />
              <span className="text-sm font-semibold text-[#1E3A8A]">Tipo</span>
            </div>
            <p className="text-xl font-semibold text-[#1E3A8A] capitalize">
              {documento.tipo_documento}
            </p>
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#1E3A8A]">Fecha de Creación</span>
            </div>
            <p className="text-lg text-[#6B7280]">
              {new Date(documento.creado_en).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#1E3A8A]">Última Actualización</span>
            </div>
            <p className="text-lg text-[#6B7280]">
              {new Date(documento.actualizado_en).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Responsables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Creado Por */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-[#1E3A8A]">Creado Por</span>
            </div>
            <p className="text-lg font-medium text-gray-800">
              {getNombreCompleto(documento.creador, "Sistema")}
            </p>
            <p className="text-xs text-gray-500 mt-1">Autor del documento</p>
          </div>

          {/* Revisado Por */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-semibold text-[#1E3A8A]">Revisado Por</span>
            </div>
            <p className="text-lg font-medium text-gray-800">
              {getNombreCompleto(documento.revisor)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Encargado de revisión</p>
          </div>

          {/* Aprobado Por */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-[#1E3A8A]">Aprobado Por</span>
            </div>
            <p className="text-lg font-medium text-gray-800">
              {getNombreCompleto(documento.aprobador)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Encargado de aprobación final</p>
          </div>
        </div>
      </div>
    </div>
  );
}
