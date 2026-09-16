import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { documentoService } from "@/services/documento.service";
import { toast } from "sonner";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { hasAnyPermission } from "@/lib/permissions";
import { datosSGCDesdeDocumento, exportarDocumentoSGC } from "@/utils/documentoSGC";

interface Documento {
  id: string;
  nombre: string;
  tipo_documento: string;
  codigo: string;
  version_actual: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
}

export default function Documentos() {
  const navigate = useNavigate();
  const canCreate = hasAnyPermission(["documentos.crear"]);
  const canEdit = hasAnyPermission(["documentos.revisar"]);
  const canDelete = hasAnyPermission(["documentos.anular"]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      const data = await documentoService.getAll();
      setDocumentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<
      string,
      { color: string; icon: React.ReactElement; label: string }
    > = {
      borrador: {
        color: "bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB]",
        icon: <Clock className="w-3 h-3" />,
        label: "Borrador",
      },
      en_revision: {
        color: "bg-[#E0EDFF] text-[#2563EB] border-[#2563EB]/30",
        icon: <AlertCircle className="w-3 h-3" />,
        label: "En Revisión",
      },
      pendiente_aprobacion: {
        color: "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]/30",
        icon: <Clock className="w-3 h-3" />,
        label: "Pendiente Aprobación",
      },
      aprobado: {
        color: "bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/30",
        icon: <CheckCircle className="w-3 h-3" />,
        label: "Aprobado",
      },
      obsoleto: {
        color: "bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/30",
        icon: <XCircle className="w-3 h-3" />,
        label: "Obsoleto",
      },
    };

    const badge = estados[estado] || estados.borrador;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}
      >
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getTipoColor = (tipo: string) => {
    const tipos: Record<string, string> = {
      formato: "bg-[#F5F3FF] text-[#9333EA] border-[#9333EA]/30",
      procedimiento: "bg-[#E0EDFF] text-[#2563EB] border-[#2563EB]/30",
      instructivo: "bg-[#ECFEFF] text-[#06B6D4] border-[#06B6D4]/30",
      manual: "bg-[#EEF2FF] text-[#6366F1] border-[#6366F1]/30",
      politica: "bg-[#FCE7F3] text-[#EC4899] border-[#EC4899]/30",
      registro: "bg-[#FEF9C3] text-[#EAB308] border-[#EAB308]/30",
      plan: "bg-[#FFF7ED] text-[#F59E0B] border-[#F59E0B]/30",
    };

    return tipos[tipo] || "bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB]";
  };

  const filteredDocumentos = documentos.filter((doc) => {
    const matchSearch = matchesTextSearch(searchTerm, doc);
    const matchTipo = filterTipo === "" || doc.tipo_documento === filterTipo;
    const matchEstado = filterEstado === "" || doc.estado === filterEstado;

    return matchSearch && matchTipo && matchEstado;
  });

  const handleView = (id: string) => {
    navigate(`/documentos/${id}`);
  };

  const handleDescargarPDF = async (id: string) => {
    try {
      setExportingId(id);
      const completo = await documentoService.getById(id);
      await exportarDocumentoSGC(datosSGCDesdeDocumento(completo));
      toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error(error instanceof Error ? error.message : "No se pudo generar el PDF");
    } finally {
      setExportingId(null);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/documentos/${id}/editar`);
  };

  const handleDelete = async (docId: string, nombre: string) => {
    toast.warning(
      <div>
        <p className="font-semibold">¿Eliminar documento?</p>
        <p className="text-sm text-muted-foreground mt-1">
          Se eliminará "{nombre}"
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={async () => {
              try {
                await documentoService.delete(docId);
                toast.success("Documento eliminado correctamente");
                fetchDocumentos();
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

  if (loading) {
    return (
      <LoadingSpinner message="Cargando Documentos" />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Profesional */}
        <div className="premium-gradient rounded-3xl shadow-sm p-5 sm:p-8 md:p-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 bg-white/40 rounded-full blur-3xl group-hover:bg-white/60 transition-all duration-700" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="bg-blue-600/10 text-blue-700 border-blue-200 backdrop-blur-md rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Inventario Oficial
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                Gestión Documental
              </h1>
              <p className="text-slate-600 mt-3 text-lg max-w-2xl font-medium">
                Administra el ciclo de vida de los documentos del sistema ISO 9001 con integridad y control de versiones.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-white/50 text-blue-800 border border-blue-200 backdrop-blur-md shadow-sm">
                  {documentos.length} Documentos totales
                </span>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200 backdrop-blur-md shadow-sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {documentos.filter((d) => d.estado === "aprobado").length} Validados
                </span>
              </div>
            </div>
            {canCreate && (
              <button
                onClick={() => navigate("/documentos/crear")}
                className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus className="w-6 h-6" />
                Nuevo Documento
              </button>
            )}
          </div>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
              <input
                type="text"
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg bg-white focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-4 h-4" />
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg bg-white appearance-none focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
              >
                <option value="">Todos los tipos</option>
                <option value="formato">Formato</option>
                <option value="procedimiento">Procedimiento</option>
                <option value="instructivo">Instructivo</option>
                <option value="manual">Manual</option>
                <option value="politica">Política</option>
                <option value="registro">Registro</option>
                <option value="plan">Plan</option>
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-4 h-4" />
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded-lg bg-white appearance-none focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="en_revision">En Revisión</option>
                <option value="pendiente_aprobacion">Pendiente Aprobación</option>
                <option value="aprobado">Aprobado</option>
                <option value="obsoleto">Obsoleto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="premium-card p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-blue-900 dark:text-blue-100 font-bold uppercase text-[10px] tracking-widest">Total Documentos</p>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-blue-900 dark:text-white">{documentos.length}</p>
          </div>

          <div className="premium-card p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-emerald-900 dark:text-emerald-100 font-bold uppercase text-[10px] tracking-widest">Validados</p>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-emerald-900 dark:text-white">
              {documentos.filter((d) => d.estado === "aprobado").length}
            </p>
          </div>

          <div className="premium-card p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-amber-900 dark:text-amber-100 font-bold uppercase text-[10px] tracking-widest">En Proceso</p>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-amber-900 dark:text-white">
              {
                documentos.filter(
                  (d) =>
                    d.estado === "en_revision" ||
                    d.estado === "pendiente_aprobacion",
                ).length
              }
            </p>
          </div>

          <div className="premium-card p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">Borradores</p>
              <div className="h-10 w-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white">
              {documentos.filter((d) => d.estado === "borrador").length}
            </p>
          </div>
        </div>

        {/* Content */}
        {filteredDocumentos.length === 0 ? (
          <div className="bg-white p-8 sm:p-20 rounded-2xl border border-[#E5E7EB] shadow-sm text-center">
            <div className="flex flex-col items-center">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[#1E3A8A]">
                No se encontraron documentos
              </h3>
              <p className="text-[#6B7280] mb-6">
                {searchTerm || filterTipo || filterEstado
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Comienza creando tu primer documento"}
              </p>
              {!searchTerm && !filterTipo && !filterEstado && canCreate && (
                <button
                  onClick={() => navigate("/documentos/crear")}
                  className="flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Crear Documento
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocumentos.map((documento) => (
              <div
                key={documento.id}
                className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[#1E3A8A] mb-1 line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                      {documento.nombre}
                    </h3>
                    <p className="text-xs text-[#6B7280] font-mono bg-[#F8FAFC] px-2 py-1 rounded-md inline-block border border-[#E5E7EB]">
                      {documento.codigo}
                    </p>
                  </div>
                  <div className="bg-[#E0EDFF] p-2 rounded-xl text-[#2563EB]">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTipoColor(
                      documento.tipo_documento,
                    )}`}
                  >
                    {documento.tipo_documento}
                  </span>
                  {getEstadoBadge(documento.estado)}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-tight">Versión</p>
                    <p className="text-sm font-semibold text-[#1E3A8A]">{documento.version_actual}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-tight">Actualizado</p>
                    <p className="text-sm font-semibold text-[#1E3A8A]">
                      {documento.actualizado_en
                        ? new Date(documento.actualizado_en).toLocaleDateString("es-ES")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(documento.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#EFF6FF] text-[#2563EB] rounded-xl hover:bg-[#DBEAFE] font-semibold text-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleDescargarPDF(documento.id)}
                    disabled={exportingId === documento.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-[#1E3A8A] border border-[#E5E7EB] rounded-xl hover:bg-[#F8FAFC] font-semibold text-sm transition-colors disabled:opacity-50"
                    title="Imprimir o guardar como PDF"
                  >
                    <Printer className="w-4 h-4" />
                    {exportingId === documento.id ? "..." : "Imprimir"}
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(documento.id)}
                      className="p-2.5 bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] rounded-xl hover:bg-[#F1F5F9] transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(documento.id, documento.nombre)}
                      className="p-2.5 bg-red-50 text-[#EF4444] border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
