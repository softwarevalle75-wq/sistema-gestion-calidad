import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Calendar,
    User,
    Building2,
    FileText,
    Target,
    Layers,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    Network,
    ShieldAlert,
    Gauge,
    FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import procesoService, { Proceso, TipoProceso, EtapaPHVA, EstadoProceso } from "@/services/proceso.service";
import EtapasProceso from "@/components/procesos/EtapasProceso";
import ResponsablesProceso from "@/components/procesos/ResponsablesProceso";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { indicadorService, Indicador } from "@/services/indicador.service";
import { riesgoService, Riesgo } from "@/services/riesgo.service";
import { documentoService, DocumentoResponse } from "@/services/documento.service";
import { hasAnyPermission } from "@/lib/permissions";
import { DocumentoSGCPaper } from "@/components/documents/DocumentoSGCPaper";
import { BotonesImpresionDocumentoSGC } from "@/components/documents/BotonesImpresionDocumentoSGC";
import {
    cargarMarcaSGC,
    exportarDocumentoSGC,
    type MarcaSGC,
} from "@/utils/documentoSGC";
import { datosSGCDesdeProceso } from "@/utils/documentosRegistrosSGC";

export default function DetalleProceso() {
    const navigate = useNavigate();
    const canManageProcesos = hasAnyPermission(["procesos.admin"]);
    const canAsociarDocumentos = hasAnyPermission(["documentos.crear", "procesos.admin"]);
    const { id } = useParams();
    const [proceso, setProceso] = useState<Proceso | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingGestion, setLoadingGestion] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [indicadoresProceso, setIndicadoresProceso] = useState<Indicador[]>([]);
    const [riesgosProceso, setRiesgosProceso] = useState<Riesgo[]>([]);
    const [documentosProceso, setDocumentosProceso] = useState<DocumentoResponse[]>([]);
    const [todosDocumentos, setTodosDocumentos] = useState<DocumentoResponse[]>([]);
    const [documentoSeleccionado, setDocumentoSeleccionado] = useState<string>("");
    const [asociandoDocumento, setAsociandoDocumento] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [marca, setMarca] = useState<MarcaSGC>({
        logoUrl: null,
        titulo: "Universitaria de Colombia",
        subtitulo: "Sistema de Gestión de Calidad",
    });

    useEffect(() => {
        if (id) {
            cargarProceso();
        }
    }, [id]);

    useEffect(() => {
        cargarMarcaSGC().then(setMarca);
    }, []);

    const cargarProceso = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const data = await procesoService.obtener(id);
            setProceso(data);
            await cargarGestionProceso(data.id);
        } catch (error) {
            console.error("Error cargando proceso:", error);
            toast.error("Error al cargar el proceso");
            navigate("/procesos/listado");
        } finally {
            setLoading(false);
        }
    };

    const cargarGestionProceso = async (procesoId: string) => {
        try {
            setLoadingGestion(true);
            const [indicadores, riesgos, documentos] = await Promise.all([
                indicadorService.getAll({ proceso_id: procesoId }),
                riesgoService.getAll({ proceso_id: procesoId }),
                documentoService.getByProceso(procesoId),
            ]);
            const todos = await documentoService.getAll();
            setIndicadoresProceso(indicadores);
            setRiesgosProceso(riesgos);
            setDocumentosProceso(documentos);
            setTodosDocumentos(todos);
        } catch (error) {
            console.error("Error cargando gestión del proceso:", error);
            setIndicadoresProceso([]);
            setRiesgosProceso([]);
            setDocumentosProceso([]);
        } finally {
            setLoadingGestion(false);
        }
    };

    const asociarDocumento = async () => {
        if (!proceso || !documentoSeleccionado) return;
        try {
            setAsociandoDocumento(true);
            await documentoService.asociarDocumentoProceso({
                documento_id: documentoSeleccionado,
                proceso_id: proceso.id,
            });
            toast.success("Documento asociado al proceso");
            setDocumentoSeleccionado("");
            await cargarGestionProceso(proceso.id);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "No se pudo asociar el documento");
        } finally {
            setAsociandoDocumento(false);
        }
    };

    const confirmarEliminar = async () => {
        if (!id || !proceso) return;

        try {
            await procesoService.eliminar(id);
            toast.success(`Proceso "${proceso.nombre}" eliminado exitosamente`);
            navigate("/procesos/listado");
        } catch (error: any) {
            console.error("Error eliminando proceso:", error);
            toast.error(error.response?.data?.detail || "Error al eliminar el proceso");
        } finally {
            setDeleteDialogOpen(false);
        }
    };

    const handleExportPDF = async () => {
        if (!proceso) return;
        try {
            setExporting(true);
            await exportarDocumentoSGC(datosSGCDesdeProceso(proceso), marca);
            toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            toast.error(
                error instanceof Error ? error.message : "No se pudo generar el PDF del proceso",
            );
        } finally {
            setExporting(false);
        }
    };

    const getColorPorTipo = (tipo?: TipoProceso) => {
        switch (tipo) {
            case TipoProceso.ESTRATEGICO:
                return { bg: "bg-purple-500", text: "text-purple-700", bgLight: "bg-purple-50" };
            case TipoProceso.OPERATIVO:
                return { bg: "bg-blue-500", text: "text-blue-700", bgLight: "bg-blue-50" };
            case TipoProceso.APOYO:
                return { bg: "bg-green-500", text: "text-green-700", bgLight: "bg-green-50" };
            case TipoProceso.MEDICION:
                return { bg: "bg-orange-500", text: "text-orange-700", bgLight: "bg-orange-50" };
            default:
                return { bg: "bg-gray-500", text: "text-gray-700", bgLight: "bg-gray-50" };
        }
    };

    const getEstadoBadge = (estado: EstadoProceso) => {
        const configs = {
            [EstadoProceso.ACTIVO]: {
                icon: CheckCircle,
                className: "bg-green-100 text-green-800 border-green-200"
            },
            [EstadoProceso.BORRADOR]: {
                icon: Edit,
                className: "bg-gray-100 text-gray-800 border-gray-200"
            },
            [EstadoProceso.REVISION]: {
                icon: Clock,
                className: "bg-yellow-100 text-yellow-800 border-yellow-200"
            },
            [EstadoProceso.SUSPENDIDO]: {
                icon: AlertCircle,
                className: "bg-orange-100 text-orange-800 border-orange-200"
            },
            [EstadoProceso.OBSOLETO]: {
                icon: XCircle,
                className: "bg-red-100 text-red-800 border-red-200"
            },
        };

        const config = configs[estado];
        const Icon = config.icon;

        return (
            <Badge variant="outline" className={`${config.className} flex items-center gap-1 text-sm px-3 py-1`}>
                <Icon className="h-4 w-4" />
                {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </Badge>
        );
    };

    const getTipoLabel = (tipo?: TipoProceso) => {
        const labels = {
            [TipoProceso.ESTRATEGICO]: "Estratégico",
            [TipoProceso.OPERATIVO]: "Operativo",
            [TipoProceso.APOYO]: "Apoyo",
            [TipoProceso.MEDICION]: "Medición y Mejora",
        };
        return tipo ? labels[tipo] : "No definido";
    };

    const getEtapaPHVALabel = (etapa?: EtapaPHVA) => {
        const labels = {
            [EtapaPHVA.PLANEAR]: "Planear",
            [EtapaPHVA.HACER]: "Hacer",
            [EtapaPHVA.VERIFICAR]: "Verificar",
            [EtapaPHVA.ACTUAR]: "Actuar",
        };
        return etapa ? labels[etapa] : "No definido";
    };

    if (loading) {
        return <LoadingSpinner message="Cargando Procesos" />;
    }

    if (!proceso) {
        return null;
    }

    const colorScheme = getColorPorTipo(proceso.tipo_proceso);

    return (
        <div className="min-h-screen min-w-0 bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate("/procesos/listado")}
                            className="rounded-xl shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] break-words">Detalle del Proceso</h1>
                            <p className="text-gray-500 mt-1 text-sm sm:text-base">Información completa del proceso</p>
                        </div>
                    </div>
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
                        <BotonesImpresionDocumentoSGC
                            onImprimir={handleExportPDF}
                            loading={exporting}
                        />
                        {canManageProcesos && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/procesos/${id}/editar`)}
                                    className="rounded-xl w-full sm:w-auto"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    className="rounded-xl w-full sm:w-auto"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
                    <div className="mx-auto w-full max-w-[816px]">
                        <DocumentoSGCPaper data={datosSGCDesdeProceso(proceso)} marca={marca} />
                    </div>
                </div>

                {/* Información Principal */}
                <Card className={`rounded-2xl shadow-sm border-l-4 ${colorScheme.bg}`}>
                    <CardHeader className={`${colorScheme.bgLight} rounded-t-2xl`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-3 mb-2">
                                    <Network className={`h-7 w-7 sm:h-8 sm:w-8 ${colorScheme.text} shrink-0 mt-0.5`} />
                                    <div className="min-w-0">
                                        <CardTitle className="text-xl sm:text-2xl text-gray-900 break-words">{proceso.nombre}</CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">Código: {proceso.codigo}</p>
                                    </div>
                                </div>
                            </div>
                            {getEstadoBadge(proceso.estado)}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                                <Layers className="h-5 w-5 text-gray-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs text-gray-500">Tipo de Proceso</p>
                                    <p className="font-semibold text-gray-900 break-words">{getTipoLabel(proceso.tipo_proceso)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                                <TrendingUp className="h-5 w-5 text-gray-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs text-gray-500">Etapa PHVA</p>
                                    <p className="font-semibold text-gray-900 break-words">{getEtapaPHVALabel(proceso.etapa_phva)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl min-w-0">
                                <FileText className="h-5 w-5 text-gray-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs text-gray-500">Versión</p>
                                    <p className="font-semibold text-gray-900 break-words">{proceso.version || "1.0"}</p>
                                </div>
                            </div>
                        </div>

                        {proceso.responsable_nombre && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl min-w-0">
                                <User className="h-5 w-5 text-blue-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs text-blue-600">Responsable</p>
                                    <p className="font-semibold text-gray-900 break-words">{proceso.responsable_nombre}</p>
                                </div>
                            </div>
                        )}

                        {proceso.area_nombre && (
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                                <Building2 className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-xs text-green-600">Área</p>
                                    <p className="font-semibold text-gray-900">{proceso.area_nombre}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Objetivo y Alcance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {proceso.objetivo && (
                        <Card className="rounded-2xl shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Target className="h-5 w-5 text-blue-600" />
                                    Objetivo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 leading-relaxed">{proceso.objetivo}</p>
                            </CardContent>
                        </Card>
                    )}

                    {proceso.alcance && (
                        <Card className="rounded-2xl shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Layers className="h-5 w-5 text-purple-600" />
                                    Alcance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 leading-relaxed">{proceso.alcance}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Caracterización ISO 9001 */}
                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Caracterización del Proceso (ISO 9001)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {proceso.entradas && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <span className="text-blue-600">→</span> Entradas
                                </h3>
                                <p className="text-gray-700 bg-blue-50 p-4 rounded-xl leading-relaxed">
                                    {proceso.entradas}
                                </p>
                            </div>
                        )}

                        {proceso.salidas && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <span className="text-green-600">←</span> Salidas
                                </h3>
                                <p className="text-gray-700 bg-green-50 p-4 rounded-xl leading-relaxed">
                                    {proceso.salidas}
                                </p>
                            </div>
                        )}

                        {proceso.recursos_necesarios && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-purple-600" />
                                    Recursos Necesarios
                                </h3>
                                <p className="text-gray-700 bg-purple-50 p-4 rounded-xl leading-relaxed">
                                    {proceso.recursos_necesarios}
                                </p>
                            </div>
                        )}

                        {proceso.criterios_desempeno && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-orange-600" />
                                    Criterios de Desempeño
                                </h3>
                                <p className="text-gray-700 bg-orange-50 p-4 rounded-xl leading-relaxed">
                                    {proceso.criterios_desempeno}
                                </p>
                            </div>
                        )}

                        {proceso.riesgos_oportunidades && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    Riesgos y Oportunidades
                                </h3>
                                <p className="text-gray-700 bg-red-50 p-4 rounded-xl leading-relaxed">
                                    {proceso.riesgos_oportunidades}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Gestión del Proceso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="etapas" className="w-full min-w-0">
                            <div className="w-full overflow-x-auto">
                            <TabsList className="h-auto justify-start inline-flex w-max min-w-full">
                                <TabsTrigger value="informacion" className="shrink-0">Información</TabsTrigger>
                                <TabsTrigger value="equipo" className="shrink-0">Equipo</TabsTrigger>
                                <TabsTrigger value="etapas" className="shrink-0">Etapas</TabsTrigger>
                                <TabsTrigger value="indicadores" className="shrink-0">Indicadores</TabsTrigger>
                                <TabsTrigger value="riesgos" className="shrink-0">Riesgos</TabsTrigger>
                                <TabsTrigger value="documentos" className="shrink-0">Documentos</TabsTrigger>
                            </TabsList>
                            </div>

                            <TabsContent value="informacion">
                                <p className="text-sm text-gray-600">
                                    La información general del proceso se visualiza en las secciones superiores.
                                </p>
                            </TabsContent>
                            <TabsContent value="equipo">
                                <ResponsablesProceso procesoId={proceso.id} />
                            </TabsContent>
                            <TabsContent value="etapas">
                                <EtapasProceso procesoId={proceso.id} />
                            </TabsContent>
                            <TabsContent value="indicadores">
                                {loadingGestion ? (
                                    <p className="text-sm text-gray-600">Cargando indicadores...</p>
                                ) : indicadoresProceso.length === 0 ? (
                                    <p className="text-sm text-gray-600">No hay indicadores asociados a este proceso.</p>
                                ) : (
                                    <div className="space-y-3 mt-3">
                                        {indicadoresProceso.map((ind) => (
                                            <div key={ind.id} className="p-3 border rounded-xl bg-gray-50">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Gauge className="h-4 w-4 text-blue-600 shrink-0" />
                                                        <p className="font-semibold text-gray-900 break-words">{ind.nombre}</p>
                                                    </div>
                                                    <Badge variant="outline" className="w-fit shrink-0">{ind.codigo}</Badge>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Frecuencia: {ind.frecuencia_medicion} {ind.meta != null ? `| Meta: ${ind.meta}` : ""}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                            <TabsContent value="riesgos">
                                {loadingGestion ? (
                                    <p className="text-sm text-gray-600">Cargando riesgos...</p>
                                ) : riesgosProceso.length === 0 ? (
                                    <p className="text-sm text-gray-600">No hay riesgos asociados a este proceso.</p>
                                ) : (
                                    <div className="space-y-3 mt-3">
                                        {riesgosProceso.map((riesgo) => (
                                            <div key={riesgo.id} className="p-3 border rounded-xl bg-gray-50">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                                                        <p className="font-semibold text-gray-900 break-words">{riesgo.descripcion || "Sin descripción"}</p>
                                                    </div>
                                                    <Badge variant="outline" className="w-fit shrink-0">{riesgo.codigo}</Badge>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Nivel: {riesgo.nivel_riesgo || "—"} {riesgo.nivel_residual != null ? `| Residual: ${riesgo.nivel_residual}` : ""} | Estado: {riesgo.estado || "activo"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                            <TabsContent value="documentos">
                                {canAsociarDocumentos && (
                                    <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-3">
                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                            <select
                                                value={documentoSeleccionado}
                                                onChange={(e) => setDocumentoSeleccionado(e.target.value)}
                                                className="w-full min-w-0 p-2 border rounded-lg bg-white text-sm"
                                            >
                                                <option value="">Seleccionar documento para asociar...</option>
                                                {todosDocumentos
                                                    .filter((doc) => !documentosProceso.some((d) => d.id === doc.id))
                                                    .map((doc) => (
                                                        <option key={doc.id} value={doc.id}>
                                                            {doc.codigo} - {doc.nombre}
                                                        </option>
                                                    ))}
                                            </select>
                                            <Button
                                                onClick={asociarDocumento}
                                                disabled={!documentoSeleccionado || asociandoDocumento}
                                                className="rounded-lg"
                                            >
                                                {asociandoDocumento ? "Asociando..." : "Asociar"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {loadingGestion ? (
                                    <p className="text-sm text-gray-600">Cargando documentos...</p>
                                ) : documentosProceso.length === 0 ? (
                                    <p className="text-sm text-gray-600">No hay documentos asociados a este proceso.</p>
                                ) : (
                                    <div className="space-y-3 mt-3">
                                        {documentosProceso.map((doc) => (
                                            <div key={doc.id} className="p-3 border rounded-xl bg-gray-50">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                                                        <p className="font-semibold text-gray-900 break-words">{doc.nombre}</p>
                                                    </div>
                                                    <Badge variant="outline" className="w-fit shrink-0">{doc.codigo}</Badge>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Tipo: {doc.tipo_documento} | Estado: {doc.estado} | Versión: {doc.version_actual}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Fechas */}
                {(proceso.fecha_aprobacion || proceso.proxima_revision) && (
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5 text-gray-600" />
                                Fechas Importantes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {proceso.fecha_aprobacion && (
                                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <div>
                                            <p className="text-xs text-green-600">Fecha de Aprobación</p>
                                            <p className="font-semibold text-gray-900">
                                                {new Date(proceso.fecha_aprobacion).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {proceso.proxima_revision && (
                                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                                        <Clock className="h-5 w-5 text-yellow-600" />
                                        <div>
                                            <p className="text-xs text-yellow-600">Próxima Revisión</p>
                                            <p className="font-semibold text-gray-900">
                                                {new Date(proceso.proxima_revision).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Diálogo de confirmación de eliminación */}
            <AlertDialog open={deleteDialogOpen && canManageProcesos} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#1E3A8A]">
                            ¿Eliminar proceso?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>
                                    ¿Estás seguro de que deseas eliminar el proceso{" "}
                                    <span className="font-semibold text-gray-900">
                                        {proceso?.nombre}
                                    </span>{" "}
                                    ({proceso?.codigo})?
                                </p>
                                <p className="text-red-600 font-medium">
                                    Esta acción no se puede deshacer. Se eliminarán también todas las etapas,
                                    indicadores y relaciones asociadas a este proceso.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarEliminar}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
