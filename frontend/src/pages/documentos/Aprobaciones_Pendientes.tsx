import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  FileText,
  Calendar,
  User,
  Filter,
  RefreshCw,
  Activity,
  UserCheck,
  Users
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { documentoService } from "@/services/documento.service";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Documento {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  version: string;
  estado: string;
  fechaSolicitud: string;
  solicitadoPor: string;
  prioridad: string;
}

export default function AprobacionesPendientes() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [verMisPendientes, setVerMisPendientes] = useState<boolean>(true); // Nuevo estado para el toggle
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: 'aprobar' | 'rechazar' | null;
    documento: Documento | null;
  }>({ open: false, type: null, documento: null });

  useEffect(() => {
    fetchAprobacionesPendientes();
  }, [verMisPendientes]); // Recargar cuando cambia el modo de vista

  const fetchAprobacionesPendientes = async () => {
    setLoading(true);
    try {
      const params: any = { estado: "pendiente_aprobacion" };
      if (verMisPendientes && user?.id) {
        params.aprobado_por = user.id;
      }

      const data = await documentoService.getAll(params);

      // Transformar datos
      const transformedData = data.map((doc: any) => ({
        id: doc.id,
        codigo: doc.codigo,
        nombre: doc.nombre,
        tipo: doc.tipo_documento || "Documento",
        version: doc.version_actual,
        estado: "Pendiente de Aprobación",
        fechaSolicitud: doc.creado_en,
        solicitadoPor: doc.creador ? `${doc.creador.nombre} ${doc.creador.primerApellido || ''}` : "Desconocido",
        prioridad: calcularPrioridad(doc.creado_en),
      }));

      setDocumentos(transformedData);
      setTotal(transformedData.length);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar aprobaciones pendientes");
      setDocumentos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const calcularPrioridad = (fecha: string): string => {
    const diasTranscurridos = Math.floor(
      (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasTranscurridos > 7) return "Urgente";
    if (diasTranscurridos > 3) return "Alta";
    return "Media";
  };

  const openDialog = (type: 'aprobar' | 'rechazar', documento: Documento) => {
    setDialogState({ open: true, type, documento });
  };

  const closeDialog = () => {
    setDialogState({ open: false, type: null, documento: null });
  };

  const handleAprobar = async () => {
    const documento = dialogState.documento;
    if (!documento) return;

    setActionLoading(documento.id);
    try {
      await documentoService.update(documento.id, { estado: "aprobado" });
      toast.success(`Documento "${documento.nombre}" aprobado correctamente`);
      await fetchAprobacionesPendientes();
      closeDialog();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al aprobar el documento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazar = async () => {
    const documento = dialogState.documento;
    if (!documento) return;

    setActionLoading(documento.id);
    try {
      await documentoService.update(documento.id, { estado: "borrador" });
      toast.success(`Documento "${documento.nombre}" rechazado. Devuelto a borrador.`);
      await fetchAprobacionesPendientes();
      closeDialog();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al rechazar el documento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVer = (documento: Documento) => {
    window.location.href = `/documentos/${documento.id}`;
  };

  const documentosFiltrados = documentos.filter(doc => {
    if (filtro === "todos") return true;
    return doc.prioridad.toLowerCase() === filtro;
  });

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  const urgentes = documentos.filter((d) => d.prioridad === "Urgente").length;
  const altas = documentos.filter((d) => d.prioridad === "Alta").length;
  const medias = documentos.filter((d) => d.prioridad === "Media").length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <FileCheck className="h-9 w-9 text-[#2563EB]" />
                Aprobaciones Pendientes
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Revisa y decide sobre los documentos en espera de aprobación
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} pendientes
                </Badge>
                {urgentes > 0 && (
                  <Badge className="bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
                    {urgentes} urgentes
                  </Badge>
                )}
              </div>
            </div>

            {/* Control de Vista (Mis Pendientes vs Todos) */}
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/50 flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="view-mode"
                  checked={verMisPendientes}
                  onCheckedChange={setVerMisPendientes}
                />
                <Label htmlFor="view-mode" className="font-medium text-[#1E3A8A] cursor-pointer">
                  {verMisPendientes ? "Mis Asignados" : "Ver Todos"}
                </Label>
              </div>
              <p className="text-xs text-[#6B7280]">
                {verMisPendientes
                  ? "Mostrando solo documentos asignados a mí"
                  : "Mostrando todos los documentos pendientes"}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Pendientes</CardDescription>
                <FileText className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Requieren aprobación
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Urgente</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{urgentes}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                Prioridad Máxima
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Alta</CardDescription>
                <AlertCircle className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{altas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Prioridad Alta
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Media</CardDescription>
                <Activity className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{medias}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                Control Operativo
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Guía de Proceso */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Aprobación</CardTitle>
            <CardDescription>
              Pasos recomendados para gestionar documentos pendientes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Revisar Documento</span>
                  <span className="text-[#6B7280]">Analiza el contenido y verifica cumplimiento de requisitos.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Aprobar</span>
                  <span className="text-[#6B7280]">Si cumple, marca como aprobado para publicación.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                <div className="h-8 w-8 rounded-lg bg-[#EF4444] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#991B1B] block mb-1">Rechazar (Alternativa)</span>
                  <span className="text-[#6B7280]">Si necesita correcciones, devuelve a borrador.</span>
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
              Filtrar por prioridad
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {["todos", "urgente", "alta", "media"].map((f) => (
              <Button
                key={f}
                variant={filtro === f ? "default" : "outline"}
                onClick={() => setFiltro(f)}
                className="capitalize rounded-xl"
              >
                {f === "todos" ? "Todos" : f}
                {f !== "todos" && (
                  <Badge className="ml-2 bg-white/80" variant="secondary">
                    {f === "urgente" ? urgentes : f === "alta" ? altas : medias}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Documentos Pendientes</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={fetchAprobacionesPendientes} disabled={loading}>
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
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Prioridad</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha Solicitud</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Solicitado Por</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-[#10B981] mb-4" />
                        <p className="text-lg font-medium">¡No hay documentos pendientes!</p>
                        <p className="text-sm mt-2">
                          {filtro !== "todos"
                            ? `No hay documentos con prioridad "${filtro}".`
                            : "Todos los documentos han sido revisados."}
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
                          <p className="text-xs text-[#6B7280] mt-1">{doc.estado}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline">{doc.tipo}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className="bg-[#F3F4F6] font-bold">v{doc.version}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={
                            doc.prioridad === "Urgente"
                              ? "bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/30"
                              : doc.prioridad === "Alta"
                                ? "bg-[#FFF7ED] text-[#F97316] border-[#F97316]/30"
                                : "bg-[#ECFDF5] text-[#10B981] border-[#10B981]/30"
                          }
                        >
                          {doc.prioridad === "Urgente" && <AlertCircle className="w-3 h-3 mr-1" />}
                          {doc.prioridad}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-[#6B7280]">
                        {new Date(doc.fechaSolicitud).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-[#6B7280]">{doc.solicitadoPor}</TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVer(doc)}
                            disabled={actionLoading === doc.id}
                            className="rounded-xl"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
                            onClick={() => openDialog('aprobar', doc)}
                            disabled={actionLoading === doc.id}
                          >
                            {actionLoading === doc.id ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-xl"
                            onClick={() => openDialog('rechazar', doc)}
                            disabled={actionLoading === doc.id}
                          >
                            {actionLoading === doc.id ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 mr-1" />
                            )}
                            Rechazar
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
                {dialogState.type === 'aprobar' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    ¿Aprobar documento?
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-600" />
                    ¿Rechazar documento?
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                {dialogState.documento && (
                  <>
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB] space-y-1">
                      <p className="font-bold text-[#111827]">{dialogState.documento.nombre}</p>
                      <p className="text-sm text-[#6B7280]">Código: {dialogState.documento.codigo}</p>
                      <p className="text-sm text-[#6B7280]">Versión: v{dialogState.documento.version}</p>
                    </div>
                    {dialogState.type === 'aprobar' ? (
                      <p>
                        El documento será marcado como <strong className="text-green-600">aprobado</strong> y estará disponible para uso.
                      </p>
                    ) : (
                      <p>
                        El documento volverá a <strong className="text-orange-600">borrador</strong> para correcciones.
                      </p>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading !== null}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={dialogState.type === 'aprobar' ? handleAprobar : handleRechazar}
                disabled={actionLoading !== null}
                className={dialogState.type === 'aprobar'
                  ? 'bg-[#10B981] hover:bg-[#059669] rounded-xl'
                  : 'bg-[#EF4444] hover:bg-[#DC2626] rounded-xl'
                }
              >
                {actionLoading !== null && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {dialogState.type === 'aprobar' ? 'Aprobar' : 'Rechazar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}