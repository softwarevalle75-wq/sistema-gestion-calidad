import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Archive,
  Clock,
  AlertCircle,
  Search,
  FileText,
  User,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  Download,
  Printer,
  History,
  XCircle,
  Activity,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { documentoService } from "@/services/documento.service";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { datosSGCDesdeDocumento, esContenidoHtml, exportarDocumentoSGC } from "@/utils/documentoSGC";

interface Documento {
  id: string;
  codigo: string;
  nombre: string;
  tipo_documento: string;
  version_actual: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
  ruta_archivo?: string;
}

export default function DocumentosObsoletos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroFecha, setFiltroFecha] = useState<string>("todos");

  // Dialog
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: 'eliminar' | 'restaurar' | null;
    documento: Documento | null;
  }>({ open: false, type: null, documento: null });

  useEffect(() => {
    fetchDocumentosObsoletos();
  }, []);

  const fetchDocumentosObsoletos = async () => {
    setLoading(true);
    try {
      const data = await documentoService.getAll({ estado: "obsoleto" });
      setDocumentos(data);
      setTotal(data.length);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar documentos obsoletos");
      setDocumentos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type: 'eliminar' | 'restaurar', documento: Documento) => {
    setDialogState({ open: true, type, documento });
  };

  const closeDialog = () => {
    setDialogState({ open: false, type: null, documento: null });
  };

  const handleRestaurar = async () => {
    const documento = dialogState.documento;
    if (!documento) return;

    setActionLoading(documento.id);
    try {
      await documentoService.update(documento.id, { estado: "aprobado" });
      toast.success(`Documento "${documento.nombre}" restaurado correctamente`);
      await fetchDocumentosObsoletos();
      closeDialog();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al restaurar el documento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEliminarPermanente = async () => {
    const documento = dialogState.documento;
    if (!documento) return;

    setActionLoading(documento.id);
    try {
      await documentoService.delete(documento.id);
      toast.success(`Documento "${documento.nombre}" eliminado permanentemente`);
      await fetchDocumentosObsoletos();
      closeDialog();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar el documento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVer = (documento: Documento) => {
    window.location.href = `/documentos/${documento.id}`;
  };

  const handleImprimir = async (documento: Documento) => {
    try {
      const completo = await documentoService.getById(documento.id);
      await exportarDocumentoSGC(datosSGCDesdeDocumento(completo));
      toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
    } catch (error) {
      console.error("Error al imprimir documento:", error);
      toast.error("No se pudo abrir la impresión del documento");
    }
  };

  const handleDescargar = async (documento: Documento) => {
    try {
      const completo = await documentoService.getById(documento.id);
      if (esContenidoHtml(completo.descripcion)) {
        await exportarDocumentoSGC(datosSGCDesdeDocumento(completo));
        toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
        return;
      }
      if (completo.ruta_archivo || documento.ruta_archivo) {
        window.open(completo.ruta_archivo || documento.ruta_archivo, "_blank");
        return;
      }
      toast.info(`No hay archivo disponible para "${documento.nombre}"`);
    } catch (error) {
      console.error("Error al descargar documento:", error);
      toast.error("No se pudo descargar el documento");
    }
  };

  const calcularTiempoObsoleto = (fecha: string): string => {
    const fechaDate = new Date(fecha);
    const ahora = new Date();
    const dias = Math.floor((ahora.getTime() - fechaDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 30) return `${dias} día${dias !== 1 ? 's' : ''}`;
    if (dias < 365) return `${Math.floor(dias / 30)} mes${Math.floor(dias / 30) !== 1 ? 'es' : ''}`;
    const años = Math.floor(dias / 365);
    return `${años} año${años !== 1 ? 's' : ''}`;
  };

  const getAntiguedadCategoria = (meses: number): string => {
    if (meses > 12) return "Antiguo";
    if (meses > 6) return "Medio";
    return "Reciente";
  };

  const documentosFiltrados = documentos.filter(doc => {
    const matchSearch = matchesTextSearch(searchTerm, doc);

    const matchTipo = filtroTipo === "todos" || doc.tipo_documento.toLowerCase() === filtroTipo.toLowerCase();

    let matchFecha = true;
    if (filtroFecha !== "todos") {
      const meses = (new Date().getTime() - new Date(doc.creado_en).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (filtroFecha === "reciente") matchFecha = meses <= 6;
      if (filtroFecha === "medio") matchFecha = meses > 6 && meses <= 12;
      if (filtroFecha === "antiguo") matchFecha = meses > 12;
    }

    return matchSearch && matchTipo && matchFecha;
  });

  // Cálculos para métricas
  const antiguos = documentos.filter(doc => {
    const meses = (new Date().getTime() - new Date(doc.creado_en).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return meses > 12;
  }).length;

  const medios = documentos.filter(doc => {
    const meses = (new Date().getTime() - new Date(doc.creado_en).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return meses > 6 && meses <= 12;
  }).length;

  const recientes = documentos.filter(doc => {
    const meses = (new Date().getTime() - new Date(doc.creado_en).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return meses <= 6;
  }).length;

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Archive className="h-9 w-9 text-[#2563EB]" />
                Documentos Obsoletos
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Gestión de documentos archivados y fuera de vigencia
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} totales
                </Badge>
                {antiguos > 0 && (
                  <Badge className="bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
                    {antiguos} antiguos
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Obsoletos</CardDescription>
                <Archive className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Fuera de vigencia
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Antiguos</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{antiguos}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                +1 año
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Mediana Antigüedad</CardDescription>
                <Clock className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{medios}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                6-12 meses
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Recientes</CardDescription>
                <Activity className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{recientes}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                ≤6 meses
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Guía de Gestión */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión</CardTitle>
            <CardDescription>
              Opciones disponibles para documentos obsoletos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Consultar / Descargar</span>
                  <span className="text-[#6B7280]">Accede al contenido para referencia histórica.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Restaurar</span>
                  <span className="text-[#6B7280]">Devuelve el documento a estado vigente si es necesario.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                <div className="h-8 w-8 rounded-lg bg-[#EF4444] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#991B1B] block mb-1">Eliminar Permanente</span>
                  <span className="text-[#6B7280]">Acción irreversible para limpieza definitiva.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#1E3A8A] flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de búsqueda
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              <Input
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
              />
            </div>

            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="procedimiento">Procedimiento</SelectItem>
                <SelectItem value="instructivo">Instructivo</SelectItem>
                <SelectItem value="formato">Formato</SelectItem>
                <SelectItem value="registro">Registro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroFecha} onValueChange={setFiltroFecha}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Antigüedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las fechas</SelectItem>
                <SelectItem value="reciente">Últimos 6 meses</SelectItem>
                <SelectItem value="medio">6-12 meses</SelectItem>
                <SelectItem value="antiguo">Más de 1 año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Documentos Obsoletos</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={fetchDocumentosObsoletos} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                {documentosFiltrados.length} resultados
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nombre</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tipo</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Versión</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Obsoleto desde</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Creado por</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                      <div className="flex flex-col items-center">
                        <Archive className="h-16 w-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No hay documentos obsoletos</p>
                        <p className="text-sm mt-2">
                          {searchTerm || filtroTipo !== "todos" || filtroFecha !== "todos"
                            ? "No se encontraron resultados con los filtros aplicados."
                            : "Todos los documentos están vigentes."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documentosFiltrados.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-[#F5F3FF] transition-colors">
                      <TableCell className="px-6 py-4 font-mono text-sm">{doc.codigo}</TableCell>
                      <TableCell className="px-6 py-4">
                        <div>
                          <p className="font-bold truncate max-w-[300px]">{doc.nombre}</p>
                          <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-[#EF4444]" />
                            Obsoleto
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {doc.tipo_documento}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className="bg-[#F3F4F6] font-bold">v{doc.version_actual}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-[#6B7280]">
                        {calcularTiempoObsoleto(doc.actualizado_en || doc.creado_en)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-[#6B7280]">{"Usuario"}</TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleVer(doc)} disabled={actionLoading === doc.id} className="rounded-xl">
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleImprimir(doc)} disabled={actionLoading === doc.id} className="rounded-xl">
                            <Printer className="h-4 w-4 mr-1" /> Imprimir
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDescargar(doc)} disabled={actionLoading === doc.id} className="rounded-xl">
                            <Download className="h-4 w-4 mr-1" /> Descargar
                          </Button>
                          <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl" onClick={() => openDialog('restaurar', doc)} disabled={actionLoading === doc.id}>
                            {actionLoading === doc.id ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <History className="h-4 w-4 mr-1" />}
                            Restaurar
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => openDialog('eliminar', doc)} disabled={actionLoading === doc.id}>
                            {actionLoading === doc.id ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Dialog de confirmación */}
        <AlertDialog open={dialogState.open} onOpenChange={closeDialog}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {dialogState.type === 'restaurar' ? (
                  <> <History className="w-5 h-5 text-[#10B981]" /> ¿Restaurar documento? </>
                ) : (
                  <> <Trash2 className="w-5 h-5 text-[#EF4444]" /> ¿Eliminar permanentemente? </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                {dialogState.documento && (
                  <>
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB] space-y-1">
                      <p className="font-bold text-[#111827]">{dialogState.documento.nombre}</p>
                      <p className="text-sm text-[#6B7280]">Código: {dialogState.documento.codigo}</p>
                      <p className="text-sm text-[#6B7280]">Versión: v{dialogState.documento.version_actual}</p>
                    </div>
                    {dialogState.type === 'restaurar' ? (
                      <p>El documento volverá a estado <strong className="text-[#10B981]">vigente</strong>.</p>
                    ) : (
                      <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4">
                        <p className="font-bold text-[#991B1B] mb-2">Acción irreversible</p>
                        <p className="text-[#6B7280]">El documento será eliminado para siempre.</p>
                      </div>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading !== null}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={dialogState.type === 'restaurar' ? handleRestaurar : handleEliminarPermanente}
                disabled={actionLoading !== null}
                className={dialogState.type === 'restaurar'
                  ? 'bg-[#10B981] hover:bg-[#059669] rounded-xl'
                  : 'bg-[#EF4444] hover:bg-[#DC2626] rounded-xl'
                }
              >
                {actionLoading !== null && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {dialogState.type === 'restaurar' ? 'Restaurar' : 'Eliminar permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}