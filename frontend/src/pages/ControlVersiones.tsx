import React, { useMemo, useState, useEffect } from "react";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Eye, Filter, FileText, Layers, Clock, RefreshCw, Activity } from "lucide-react";
import { toast } from "sonner";
import { documentoService, type DocumentoResponse } from "@/services/documento.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { DocumentoSGCPaper } from "@/components/documents/DocumentoSGCPaper";
import { datosSGCDesdeDocumento, esContenidoHtml } from "@/utils/documentoSGC";

type Version = {
  id: string;
  version: string;
  descripcion_cambios?: string;
  creado_en: string;
  creado_por?: {
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  };
  creador?: {
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  };
  ruta_archivo?: string;
};

type Documento = {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  creado_en: string;
  version_actual: string;
  descripcion?: string;
  tipo_documento?: string;
  creado_por?: {
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  };
  creador?: {
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  };
  versiones?: Version[];
  ruta_archivo?: string;
};

function responsableDe(entidad?: { creado_por?: Version["creado_por"]; creador?: Version["creador"] }) {
  return entidad?.creador || entidad?.creado_por;
}

function normalizarDocumento(doc: any): Documento {
  const versiones = Array.isArray(doc.versiones)
    ? doc.versiones.map((v: any) => ({
        ...v,
        creado_por: v.creador || v.creado_por,
      }))
    : [];
  return {
    ...doc,
    creado_por: doc.creador || doc.creado_por,
    versiones,
  };
}

export default function ControlVersiones() {
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDocumento, setShowDocumento] = useState(false);
  const [documentoSGC, setDocumentoSGC] = useState<DocumentoResponse | null>(null);
  const [versionesSGC, setVersionesSGC] = useState<Version[]>([]);

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      const docs = await documentoService.getAll();
      setDocumentos((Array.isArray(docs) ? docs : []).map(normalizarDocumento));
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      toast.error("Error al cargar los documentos");
    } finally {
      setLoading(false);
    }
  };

  const cargarVersiones = async (documentoId: string) => {
    try {
      const versiones = await documentoService.getVersiones(documentoId);
      return (Array.isArray(versiones) ? versiones : []).map((v: any) => ({
        ...v,
        creado_por: v.creador || v.creado_por,
      }));
    } catch (error) {
      console.error("Error al cargar versiones:", error);
      toast.error("Error al cargar las versiones del documento");
      return [];
    }
  };

  const filtrados = useMemo(() => {
    return documentos.filter((doc) => {
      const matchesQuery = matchesTextSearch(search, doc);

      const docFecha = new Date(doc.creado_en).toISOString().split('T')[0];
      const matchesDate = !filterDate || docFecha === filterDate;

      return matchesQuery && matchesDate;
    });
  }, [documentos, search, filterDate]);

  const totalDocumentos = documentos.length;
  const totalVersiones = documentos.reduce((s, d) => s + (d.versiones?.length || 0), 0);

  const masVersiones = useMemo(() => {
    if (documentos.length === 0) return null;
    return documentos.reduce((best, cur) => {
      const curCount = cur.versiones?.length || 0;
      const bestCount = best ? (best.versiones?.length || 0) : -1;
      return curCount > bestCount ? cur : best;
    }, documentos[0]);
  }, [documentos]);

  const ultimoDocumento = useMemo(() => {
    if (documentos.length === 0) return null;
    return documentos.reduce((last, cur) =>
      new Date(cur.creado_en) > new Date(last.creado_en) ? cur : last
      , documentos[0]);
  }, [documentos]);

  const openDoc = async (doc: Documento) => {
    const completo = await documentoService.getById(doc.id).catch(() => null);
    const base = completo ? normalizarDocumento({ ...doc, ...completo, versiones: completo.versiones || doc.versiones }) : doc;
    setSelectedDoc(base);
    setSelectedVersion(null);

    if (!base.versiones || base.versiones.length === 0) {
      const versiones = await cargarVersiones(doc.id);
      setSelectedDoc({ ...base, versiones });
    }
  };

  const verVersion = (v: Version) => {
    setSelectedVersion(v);
  };

  const handleVerSGC = async (doc: Documento) => {
    try {
      const completo = await documentoService.getById(doc.id);
      const versiones = doc.versiones?.length
        ? doc.versiones
        : await documentoService.getVersiones(doc.id).catch(() => []);
      setDocumentoSGC(completo);
      setVersionesSGC((Array.isArray(versiones) ? versiones : []).map((v: any) => ({
        ...v,
        creado_por: v.creador || v.creado_por,
      })));
      setShowDocumento(true);
    } catch (error) {
      console.error("Error al abrir documento SGC:", error);
      toast.error("No se pudo abrir el documento controlado");
    }
  };

  const formatearEstado = (estado: string): string => {
    const estadosMap: Record<string, string> = {
      'borrador': 'Borrador',
      'en_revision': 'En Revisión',
      'aprobado': 'Aprobado',
      'vigente': 'Vigente',
      'obsoleto': 'Obsoleto',
      'archivado': 'Archivado'
    };
    return estadosMap[estado] || estado;
  };

  const obtenerNombreCompleto = (usuario?: { nombre?: string; primerApellido?: string; segundoApellido?: string }): string => {
    if (!usuario) return '-';
    const nombre = usuario.nombre || '';
    const primerApellido = usuario.primerApellido || '';
    const segundoApellido = usuario.segundoApellido || '';
    if (!nombre && !primerApellido) return '-';
    return `${nombre} ${primerApellido}${segundoApellido ? ' ' + segundoApellido : ''}`.trim();
  };

  if (loading) {
    return <LoadingSpinner message="Cargando Versiones" />
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Layers className="h-9 w-9 text-[#2563EB]" />
                Control de Versiones
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Trazabilidad completa y gestión del ciclo de vida documental
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {totalDocumentos} documentos
                </Badge>
                <Badge className="bg-[#FFF7ED]/80 text-[#F97316] border border-[#F97316]/30">
                  {totalVersiones} versiones totales
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Documentos</CardDescription>
                <FileText className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalDocumentos}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Gestionados en el sistema
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Total Versiones</CardDescription>
                <Layers className="h-8 w-8 text-[#F97316]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{totalVersiones}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Actividad Alta
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Mayor Actividad</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{masVersiones?.versiones?.length ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#6B7280] truncate max-w-[180px]">{masVersiones?.nombre ?? "-"}</p>
              <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/30 font-bold uppercase text-[10px] mt-2">
                Prioridad Máxima
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Más Reciente</CardDescription>
                <Clock className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">
                {ultimoDocumento?.creado_en ? new Date(ultimoDocumento.creado_en).toLocaleDateString('es-ES', { day: 'numeric' }) : "-"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#6B7280] truncate max-w-[180px]">{ultimoDocumento?.nombre ?? "-"}</p>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px] mt-2">
                Nueva Creación
              </Badge>
              <p className="text-xs text-[#6B7280] mt-1">
                {ultimoDocumento?.creado_en ? new Date(ultimoDocumento.creado_en).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Guía de Ciclo de Vida */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Ciclo de Vida</CardTitle>
            <CardDescription>
              Flujo de trabajo estándar para documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Elaboración</span>
                  <span className="text-[#6B7280]">Creación inicial en estado Borrador por el responsable.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#9A3412] block mb-1">Revisión y Aprobación</span>
                  <span className="text-[#6B7280]">Análisis y aprobación por los involucrados.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Vigencia y Actualización</span>
                  <span className="text-[#6B7280]">Distribución, uso y creación de nuevas versiones si es necesario.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buscador + Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
              <Input
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-6 border-[#E5E7EB] rounded-xl focus:ring-[#8B5CF6]/20"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-auto py-3 px-6 rounded-xl border-[#E5E7EB] text-[#6B7280] font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrar por Fecha
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 rounded-xl mt-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1E3A8A] mb-2 uppercase tracking-tight">Seleccionar fecha</label>
                    <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setFilterDate("")} className="flex-1 rounded-lg text-sm text-[#EF4444]">Limpiar</Button>
                    <Button className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg text-sm">Aplicar</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Explorador de Versiones</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={cargarDocumentos} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                {filtrados.length} resultados
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="px-8 py-4 font-bold text-[#1E3A8A]">Nombre</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-[#1E3A8A]">Fecha</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-[#1E3A8A]">Responsable</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-[#1E3A8A] text-center">Versiones</TableHead>
                  <TableHead className="px-8 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-[#6B7280]">
                      <div className="flex flex-col items-center">
                        <Layers className="h-16 w-16 text-gray-200 mb-4" />
                        <p className="text-lg font-medium">No se encontraron documentos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-[#F5F3FF] transition-colors group">
                      <TableCell className="px-8 py-4">
                        <div>
                          <p className="font-bold text-[#111827] group-hover:text-[#4C1D95] transition-colors">{doc.nombre}</p>
                          <p className="text-xs text-[#6B7280] font-mono">{doc.codigo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-4">
                        <Badge variant="outline" className={`capitalize ${doc.estado === 'vigente' || doc.estado === 'aprobado' ? 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]/20' :
                          doc.estado === 'borrador' ? 'bg-gray-100 text-gray-600' :
                            'bg-[#FEFCE8] text-[#854D0E] border-[#EAB308]/20'
                          }`}>
                          {formatearEstado(doc.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-4 text-[#6B7280]">
                        {new Date(doc.creado_en).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-xs font-bold">
                            {doc.creado_por?.nombre?.charAt(0) || responsableDe(doc)?.nombre?.charAt(0) || "-"}
                          </div>
                          <span className="text-sm font-medium text-[#1E3A8A]">
                            {obtenerNombreCompleto(responsableDe(doc) || doc.creado_por)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-4 text-center">
                        <Badge className="bg-[#F3F4F6] text-[#4B5563] font-bold">
                          {doc.versiones?.length || 0} · v{doc.version_actual || "1.0"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerSGC(doc)}
                            className="rounded-xl"
                          >
                            <Eye className="h-4 w-4 mr-2" /> Ver
                          </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => openDoc(doc)}
                              className="bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white rounded-xl font-bold shadow-none border-none transition-all px-4"
                            >
                              <Eye className="h-4 w-4 mr-2" /> Detallar
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="max-w-6xl rounded-2xl">
                            {/* ... (el modal queda igual que tenías, no lo toqué) ... */}
                            {/* Mantengo todo el contenido del DialogContent original */}
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                                <FileText className="h-7 w-7 text-[#8B5CF6]" />
                                Historial de Trazabilidad
                              </DialogTitle>
                            </DialogHeader>

                            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                              <div className="lg:col-span-2 space-y-6">
                                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-6 grid grid-cols-2 gap-y-4 gap-x-8">
                                  <div>
                                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Nombre del Documento</p>
                                    <p className="font-semibold text-[#1E3A8A] text-lg">{selectedDoc?.nombre}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Código</p>
                                    <Badge variant="outline" className="font-mono text-[#4B5563] bg-white border-[#9CA3AF]">
                                      {selectedDoc?.codigo}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Estado Actual</p>
                                    <Badge className={`capitalize ${selectedDoc?.estado === 'vigente' ? 'bg-[#ECFDF5] text-[#10B981]' :
                                      selectedDoc?.estado === 'borrador' ? 'bg-gray-100 text-gray-600' : 'bg-[#FEFCE8] text-[#854D0E]'
                                      }`}>
                                      {formatearEstado(selectedDoc?.estado || '')}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-1">Fecha de Creación</p>
                                    <div className="flex items-center gap-2 text-[#4B5563] font-medium">
                                      <Clock className="h-4 w-4" />
                                      {selectedDoc?.creado_en ? new Date(selectedDoc.creado_en).toLocaleDateString() : '-'}
                                    </div>
                                  </div>
                                  <div className="col-span-2 pt-4 border-t border-[#E5E7EB] mt-2">
                                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-2">Creado Por</p>
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-[#E0EDFF] text-[#2563EB] flex items-center justify-center font-bold">
                                        {selectedDoc?.creado_por?.nombre?.charAt(0) || "U"}
                                      </div>
                                      <div>
                                        <p className="font-bold text-[#1E3A8A]">{obtenerNombreCompleto(selectedDoc?.creado_por)}</p>
                                        <p className="text-xs text-[#6B7280]">Propietario del Documento</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-[#E5E7EB] overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-[#F1F5F9]">
                                      <TableRow>
                                        <TableHead className="font-bold text-[#1E3A8A]">Versión</TableHead>
                                        <TableHead className="font-bold text-[#1E3A8A]">Fecha</TableHead>
                                        <TableHead className="font-bold text-[#1E3A8A]">Responsable</TableHead>
                                        <TableHead className="font-bold text-[#1E3A8A]">Cambios</TableHead>
                                        <TableHead className="text-right font-bold text-[#1E3A8A]">Acciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedDoc?.versiones?.map((v) => (
                                        <TableRow key={v.id} className={selectedVersion?.id === v.id ? "bg-[#EFF6FF]" : ""}>
                                          <TableCell>
                                            <Badge variant="outline" className="font-mono font-bold bg-white text-[#4B5563]">
                                              {v.version}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-[#4B5563] text-sm">
                                            {new Date(v.creado_en).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <div className="h-6 w-6 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center text-[10px] font-bold">
                                                {v.creado_por?.nombre?.charAt(0) || responsableDe(v)?.nombre?.charAt(0) || "-"}
                                              </div>
                                              <span className="text-sm text-[#4B5563] truncate max-w-[100px]" title={obtenerNombreCompleto(responsableDe(v) || v.creado_por)}>
                                                {responsableDe(v)?.nombre || v.creado_por?.nombre || '-'}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="max-w-[200px]">
                                            <p className="truncate text-sm text-[#6B7280]" title={v.descripcion_cambios}>
                                              {v.descripcion_cambios || "Sin descripción"}
                                            </p>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => verVersion(v)}
                                              className="hover:bg-[#DBEAFE] text-[#2563EB]"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {(!selectedDoc?.versiones || selectedDoc.versiones.length === 0) && (
                                        <TableRow>
                                          <TableCell colSpan={5} className="text-center py-8 text-[#9CA3AF]">
                                            No hay historial de versiones disponible
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              <div className="lg:col-span-1">
                                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm h-full min-h-[500px] flex flex-col">
                                  <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC] rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-5 w-5 text-[#8B5CF6]" />
                                      <span className="font-bold text-[#1E3A8A]">
                                        {selectedVersion ? `Vista Previa: Versión ${selectedVersion.version}` : "Documento Actual"}
                                      </span>
                                    </div>
                                    {selectedVersion && (
                                      <Badge className="bg-[#8B5CF6] text-white">
                                        Histórico
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex-1 bg-[#F1F5F9] p-4 flex items-center justify-center rounded-b-2xl overflow-auto relative min-h-[420px]">
                                    {(() => {
                                      const archivo = selectedVersion?.ruta_archivo || selectedDoc?.ruta_archivo;
                                      const html = selectedDoc?.descripcion;
                                      if (archivo && !esContenidoHtml(archivo)) {
                                        return (
                                          <iframe
                                            src={archivo}
                                            className="w-full h-full min-h-[400px] rounded-xl border border-[#E5E7EB] bg-white shadow-inner"
                                            title="Visor de Documento"
                                          />
                                        );
                                      }
                                      if (html) {
                                        return (
                                          <div className="w-full max-w-[816px] bg-white rounded-xl border border-[#E5E7EB] shadow-inner">
                                            <DocumentoSGCPaper
                                              data={datosSGCDesdeDocumento({
                                                nombre: selectedDoc?.nombre || "",
                                                codigo: selectedDoc?.codigo || "",
                                                version_actual: selectedVersion?.version || selectedDoc?.version_actual,
                                                tipo_documento: (selectedDoc as Documento)?.tipo_documento || "formato",
                                                estado: selectedDoc?.estado,
                                                descripcion: html,
                                                creado_en: selectedVersion?.creado_en || selectedDoc?.creado_en,
                                                creador: responsableDe(selectedVersion) || responsableDe(selectedDoc),
                                              })}
                                              marca={{
                                                logoUrl: null,
                                                titulo: "Universitaria de Colombia",
                                                subtitulo: "Sistema de Gestión de Calidad",
                                              }}
                                            />
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="text-center p-8">
                                          <FileText className="h-16 w-16 text-[#CBD5E1] mx-auto mb-4" />
                                          <p className="text-[#6B7280] font-medium">No hay archivo disponible para visualizar</p>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <VistaDocumentoSGCDialog
        open={showDocumento}
        onOpenChange={(open) => {
          setShowDocumento(open);
          if (!open) {
            setDocumentoSGC(null);
            setVersionesSGC([]);
          }
        }}
        data={
          documentoSGC
            ? datosSGCDesdeDocumento({
                ...documentoSGC,
                versiones: versionesSGC,
              })
            : null
        }
        title="Documento controlado"
        description="Formato oficial del Sistema de Gestión de Calidad."
      />
    </div>
  );
}