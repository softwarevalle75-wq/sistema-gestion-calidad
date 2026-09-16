import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    BarChart3,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    Activity,
    Calendar,
    Users,
    Target,
    ArrowRight,
    FileDown,
    FileSpreadsheet,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accionCorrectivaService, AccionCorrectiva } from "@/services/accionCorrectiva.service";
import FiltrosAccionesCorrectivas, { FiltrosAcciones } from "@/components/FiltrosAccionesCorrectivas";
import { matchesTextSearch } from "@/utils/textSearch";
import { exportarAccionesAExcel } from "@/utils/exportToExcel";
import { exportarDashboardAPDF } from "@/utils/exportToPDF";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GraficosAcciones from "@/components/calidad/GraficosAcciones";
import CalendarioAcciones from "@/components/calidad/CalendarioAcciones";

export default function DashboardAccionesCorrectivas() {
    const navigate = useNavigate();
    const [acciones, setAcciones] = useState<AccionCorrectiva[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState<FiltrosAcciones>({});
    const [activeTab, setActiveTab] = useState("resumen");

    useEffect(() => {
        fetchAcciones();
    }, []);

    const fetchAcciones = async () => {
        try {
            setLoading(true);
            const data = await accionCorrectivaService.getAll();
            setAcciones(data);
        } catch (error) {
            console.error("Error al cargar acciones:", error);
            toast.error("No se pudieron cargar las acciones correctivas");
        } finally {
            setLoading(false);
        }
    };

    // Filtrar acciones según los filtros aplicados
    const accionesFiltradas = useMemo(() => {
        return acciones.filter(accion => {
            // Filtro por búsqueda
            if (filtros.busqueda) {
                if (!matchesTextSearch(filtros.busqueda, accion)) return false;
            }

            // Filtro por tipo
            if (filtros.tipo && accion.tipo !== filtros.tipo) {
                return false;
            }

            // Filtro por estado
            if (filtros.estado && accion.estado !== filtros.estado) {
                return false;
            }

            // Filtro por responsable
            if (filtros.responsable && accion.responsableId !== filtros.responsable) {
                return false;
            }

            // Filtro por fecha desde
            if (filtros.fechaDesde) {
                const fechaCreacion = new Date(accion.creadoEn);
                const fechaDesde = new Date(filtros.fechaDesde);
                if (fechaCreacion < fechaDesde) return false;
            }

            // Filtro por fecha hasta
            if (filtros.fechaHasta) {
                const fechaCreacion = new Date(accion.creadoEn);
                const fechaHasta = new Date(filtros.fechaHasta);
                fechaHasta.setHours(23, 59, 59, 999);
                if (fechaCreacion > fechaHasta) return false;
            }

            return true;
        });
    }, [acciones, filtros]);

    // Obtener lista única de responsables para el filtro
    const responsables = useMemo(() => {
        const uniqueResponsables = new Map();
        acciones.forEach(accion => {
            if (accion.responsable) {
                uniqueResponsables.set(accion.responsable.id, {
                    id: accion.responsable.id,
                    nombre: `${accion.responsable.nombre} ${accion.responsable.primerApellido || ''}`.trim(),
                });
            }
        });
        return Array.from(uniqueResponsables.values());
    }, [acciones]);

    // Calcular métricas (usar accionesFiltradas)
    const totalAcciones = accionesFiltradas.length;
    const enProceso = accionesFiltradas.filter(a => ["pendiente", "en_proceso", "en_ejecucion"].includes(a.estado)).length;
    const implementadas = accionesFiltradas.filter(a => a.estado === "implementada").length;
    const verificadas = accionesFiltradas.filter(a => a.estado === "verificada").length;
    const cerradas = accionesFiltradas.filter(a => a.estado === "cerrada").length;

    // Acciones vencidas
    const accionesVencidas = accionesFiltradas.filter(a => {
        if (!a.fechaCompromiso) return false;
        return new Date(a.fechaCompromiso) < new Date() && !["verificada", "cerrada"].includes(a.estado);
    });
    const vencidas = accionesVencidas.length;

    // Acciones por vencer (próximos 7 días)
    const porVencer = accionesFiltradas.filter(a => {
        if (!a.fechaCompromiso) return false;
        const diff = new Date(a.fechaCompromiso).getTime() - new Date().getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        return days <= 7 && days > 0 && !["verificada", "cerrada"].includes(a.estado);
    }).length;

    // Tasa de cumplimiento
    const tasaCumplimiento = totalAcciones > 0
        ? Math.round(((verificadas + cerradas) / totalAcciones) * 100)
        : 0;

    // Acciones por tipo
    const porTipo = {
        correctiva: accionesFiltradas.filter(a => a.tipo === "correctiva").length,
        preventiva: accionesFiltradas.filter(a => a.tipo === "preventiva").length,
        mejora: accionesFiltradas.filter(a => a.tipo === "mejora").length,
    };

    // Tiempo promedio de implementación (en días)
    const tiempoPromedioImplementacion = () => {
        const implementadasConFechas = accionesFiltradas.filter(
            a => a.fechaImplementacion && a.creadoEn
        );

        if (implementadasConFechas.length === 0) return 0;

        const totalDias = implementadasConFechas.reduce((sum, a) => {
            const inicio = new Date(a.creadoEn).getTime();
            const fin = new Date(a.fechaImplementacion!).getTime();
            const dias = (fin - inicio) / (1000 * 60 * 60 * 24);
            return sum + dias;
        }, 0);

        return Math.round(totalDias / implementadasConFechas.length);
    };

    const promedioImplementacion = tiempoPromedioImplementacion();

    // Acciones recientes (últimas 5)
    const accionesRecientes = [...accionesFiltradas]
        .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
        .slice(0, 5);

    // Funciones de exportación
    const handleExportarExcel = () => {
        try {
            exportarAccionesAExcel(accionesFiltradas, 'acciones_correctivas');
            toast.success("Archivo Excel descargado correctamente");
        } catch (error) {
            console.error("Error al exportar:", error);
            toast.error("No se pudo exportar el archivo Excel");
        }
    };

    const handleExportarPDF = () => {
        try {
            const metricas = {
                totalAcciones,
                enProceso,
                implementadas,
                verificadas,
                cerradas,
                vencidas,
                porVencer,
                tasaCumplimiento,
                promedioImplementacion,
                porTipo,
            };

            const accionesVencidasPDF = accionesVencidas.map(a => ({
                codigo: a.codigo,
                descripcion: a.descripcion || '',
                fechaCompromiso: a.fechaCompromiso || '',
                estado: a.estado,
                responsable: a.responsable
                    ? `${a.responsable.nombre} ${a.responsable.primerApellido || ''}`.trim()
                    : undefined,
            }));

            exportarDashboardAPDF(metricas, accionesVencidasPDF);
            toast.success("Archivo PDF descargado correctamente");
        } catch (error) {
            console.error("Error al exportar:", error);
            toast.error("No se pudo exportar el archivo PDF");
        }
    };

    if (loading) {
        return <LoadingSpinner message="Cargando Panel de control" />;
    }

    return (
        <div className="min-h-screen min-w-0 bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 min-w-0">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-5 sm:p-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-start sm:items-center gap-3">
                                <BarChart3 className="h-7 w-7 sm:h-9 sm:w-9 text-[#2563EB] shrink-0 mt-0.5 sm:mt-0" />
                                <span className="break-words">Tablero de Acciones Correctivas</span>
                            </h1>
                            <p className="text-[#6B7280] mt-2 text-sm sm:text-lg">
                                Seguimiento y métricas de acciones correctivas
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2 sm:gap-3">
                            <Button
                                onClick={handleExportarExcel}
                                variant="outline"
                                className="rounded-xl border-[#E5E7EB] hover:bg-[#F8FAFC] w-full sm:w-auto"
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Excel
                            </Button>
                            <Button
                                onClick={handleExportarPDF}
                                variant="outline"
                                className="rounded-xl border-[#E5E7EB] hover:bg-[#F8FAFC] w-full sm:w-auto"
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                            <Button
                                onClick={() => navigate("/Acciones_correctivas_Nuevas")}
                                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold shadow-sm w-full sm:w-auto"
                            >
                                Nueva Acción
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <FiltrosAccionesCorrectivas
                    filtros={filtros}
                    onFiltrosChange={setFiltros}
                    responsables={responsables}
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 min-w-0">
                    <div className="w-full overflow-x-auto">
                        <TabsList className="bg-white border border-[#E5E7EB] p-1 rounded-xl h-auto inline-flex w-max min-w-full justify-start">
                            <TabsTrigger
                                value="resumen"
                                className="rounded-lg px-3 sm:px-4 py-2 text-sm font-medium shrink-0 data-[state=active]:bg-[#E0EDFF] data-[state=active]:text-[#1E3A8A]"
                            >
                                Resumen
                            </TabsTrigger>
                            <TabsTrigger
                                value="analisis"
                                className="rounded-lg px-3 sm:px-4 py-2 text-sm font-medium shrink-0 data-[state=active]:bg-[#E0EDFF] data-[state=active]:text-[#1E3A8A]"
                            >
                                Análisis
                            </TabsTrigger>
                            <TabsTrigger
                                value="calendario"
                                className="rounded-lg px-3 sm:px-4 py-2 text-sm font-medium shrink-0 data-[state=active]:bg-[#E0EDFF] data-[state=active]:text-[#1E3A8A]"
                            >
                                Calendario
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="resumen" className="space-y-8 mt-6">
                        {/* Métricas Principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Total de Acciones */}
                            <Card className="bg-gradient-to-br from-[#E0EDFF] to-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="font-bold text-[#1E3A8A]">Total Acciones</CardDescription>
                                        <Activity className="h-8 w-8 text-[#2563EB]" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalAcciones}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-[#6B7280] font-medium">
                                        Todas las acciones registradas
                                    </div>
                                </CardContent>
                            </Card>

                            {/* En Proceso */}
                            <Card className="bg-gradient-to-br from-[#FFF7ED] to-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="font-bold text-[#9A3412]">En Proceso</CardDescription>
                                        <Clock className="h-8 w-8 text-[#F97316]" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-[#9A3412]">{enProceso}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate("/Acciones_correctivas_EnProceso")}
                                        className="text-xs text-[#F97316] hover:text-[#EA580C] p-0 h-auto"
                                    >
                                        Ver detalles <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Verificadas */}
                            <Card className="bg-gradient-to-br from-[#ECFDF5] to-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="font-bold text-[#065F46]">Verificadas</CardDescription>
                                        <CheckCircle className="h-8 w-8 text-[#10B981]" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-[#065F46]">{verificadas}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate("/Acciones_correctivas_Verificadas")}
                                        className="text-xs text-[#10B981] hover:text-[#059669] p-0 h-auto"
                                    >
                                        Ver detalles <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Tasa de Cumplimiento */}
                            <Card className="bg-gradient-to-br from-[#F0FDF4] to-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="font-bold text-[#065F46]">Cumplimiento</CardDescription>
                                        <Target className="h-8 w-8 text-[#22C55E]" />
                                    </div>
                                    <CardTitle className="text-4xl font-bold text-[#065F46]">{tasaCumplimiento}%</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-[#6B7280] font-medium">
                                        Acciones completadas
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Alertas y Estadísticas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Alertas */}
                            <Card className="rounded-2xl shadow-sm border-[#E5E7EB]">
                                <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                                    <CardTitle className="text-lg text-[#1E3A8A] flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Alertas y Prioridades
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    {/* Vencidas */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FEF2F2] rounded-xl border border-[#EF4444]/20">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center shrink-0">
                                                <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[#991B1B]">Acciones Vencidas</p>
                                                <p className="text-sm text-[#6B7280]">Requieren atención inmediata</p>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-[#EF4444] shrink-0 sm:ml-2">{vencidas}</div>
                                    </div>

                                    {/* Por Vencer */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#F97316]/20">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-10 rounded-full bg-[#F97316]/20 flex items-center justify-center shrink-0">
                                                <Calendar className="h-5 w-5 text-[#F97316]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[#9A3412]">Por Vencer (7 días)</p>
                                                <p className="text-sm text-[#6B7280]">Próximas a vencer</p>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-[#F97316] shrink-0 sm:ml-2">{porVencer}</div>
                                    </div>

                                    {/* Tiempo Promedio */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#2563EB]/20">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-10 rounded-full bg-[#2563EB]/20 flex items-center justify-center shrink-0">
                                                <TrendingUp className="h-5 w-5 text-[#2563EB]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[#1E3A8A]">Tiempo Promedio</p>
                                                <p className="text-sm text-[#6B7280]">De implementación</p>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-[#2563EB] shrink-0 sm:ml-2">{promedioImplementacion}d</div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Distribución por Tipo */}
                            <Card className="rounded-2xl shadow-sm border-[#E5E7EB]">
                                <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                                    <CardTitle className="text-lg text-[#1E3A8A]">Distribución por Tipo</CardTitle>
                                    <CardDescription>Clasificación de acciones correctivas</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    {/* Correctivas */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-[#1E3A8A]">Correctivas</span>
                                            <span className="text-sm font-bold text-[#1E3A8A]">{porTipo.correctiva}</span>
                                        </div>
                                        <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                                            <div
                                                className="bg-[#EF4444] h-3 rounded-full transition-all"
                                                style={{ width: `${totalAcciones > 0 ? (porTipo.correctiva / totalAcciones) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Preventivas */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-[#1E3A8A]">Preventivas</span>
                                            <span className="text-sm font-bold text-[#1E3A8A]">{porTipo.preventiva}</span>
                                        </div>
                                        <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                                            <div
                                                className="bg-[#F59E0B] h-3 rounded-full transition-all"
                                                style={{ width: `${totalAcciones > 0 ? (porTipo.preventiva / totalAcciones) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Mejora */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-[#1E3A8A]">Mejora</span>
                                            <span className="text-sm font-bold text-[#1E3A8A]">{porTipo.mejora}</span>
                                        </div>
                                        <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                                            <div
                                                className="bg-[#10B981] h-3 rounded-full transition-all"
                                                style={{ width: `${totalAcciones > 0 ? (porTipo.mejora / totalAcciones) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Leyenda */}
                                    <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap gap-4 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                                            <span className="text-[#6B7280]">Correctiva</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                                            <span className="text-[#6B7280]">Preventiva</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-[#10B981]" />
                                            <span className="text-[#6B7280]">Mejora</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Acciones Recientes */}
                        <Card className="rounded-2xl shadow-sm border-[#E5E7EB]">
                            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                                <CardTitle className="text-lg text-[#1E3A8A]">Acciones Recientes</CardTitle>
                                <CardDescription>Últimas 5 acciones correctivas creadas</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {accionesRecientes.length === 0 ? (
                                    <div className="text-center py-12 text-[#6B7280]">
                                        <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>No hay acciones correctivas registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {accionesRecientes.map((accion) => (
                                            <div
                                                key={accion.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-xl border border-[#E5E7EB] transition-colors cursor-pointer min-w-0"
                                                onClick={() => navigate(`/acciones-correctivas/${accion.id}/solucionar`)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="font-mono font-bold text-[#1E3A8A] break-all">{accion.codigo}</span>
                                                        <Badge variant="outline" className="text-xs capitalize">
                                                            {accion.tipo}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-[#6B7280] line-clamp-2 sm:line-clamp-1">
                                                        {accion.descripcion || "Sin descripción"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 sm:ml-4 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-xs text-[#6B7280]">
                                                            {new Date(accion.creadoEn).toLocaleDateString("es-CO")}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            accion.estado === "verificada"
                                                                ? "bg-[#ECFDF5] text-[#10B981] border-[#10B981]/30"
                                                                : accion.estado === "implementada"
                                                                    ? "bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/30"
                                                                    : "bg-[#FFF7ED] text-[#F97316] border-[#F97316]/30"
                                                        }
                                                    >
                                                        {accion.estado}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Accesos Rápidos */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Button
                                onClick={() => navigate("/Acciones_correctivas_EnProceso")}
                                variant="outline"
                                className="h-auto py-6 rounded-xl border-[#E5E7EB] hover:bg-[#F8FAFC] flex flex-col items-center gap-2"
                            >
                                <Clock className="h-6 w-6 text-[#F97316]" />
                                <span className="font-semibold">En Proceso</span>
                                <span className="text-2xl font-bold text-[#F97316]">{enProceso}</span>
                            </Button>

                            <Button
                                onClick={() => navigate("/Acciones_correctivas_Verificadas")}
                                variant="outline"
                                className="h-auto py-6 rounded-xl border-[#E5E7EB] hover:bg-[#F8FAFC] flex flex-col items-center gap-2"
                            >
                                <CheckCircle className="h-6 w-6 text-[#10B981]" />
                                <span className="font-semibold">Verificadas</span>
                                <span className="text-2xl font-bold text-[#10B981]">{verificadas}</span>
                            </Button>

                            <Button
                                onClick={() => navigate("/Acciones_correctivas_Cerradas")}
                                variant="outline"
                                className="h-auto py-6 rounded-xl border-[#E5E7EB] hover:bg-[#F8FAFC] flex flex-col items-center gap-2"
                            >
                                <Activity className="h-6 w-6 text-[#6B7280]" />
                                <span className="font-semibold">Cerradas</span>
                                <span className="text-2xl font-bold text-[#6B7280]">{cerradas}</span>
                            </Button>

                            <Button
                                onClick={() => navigate("/Acciones_correctivas_Nuevas")}
                                className="h-auto py-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex flex-col items-center gap-2"
                            >
                                <Users className="h-6 w-6" />
                                <span className="font-semibold">Nueva Acción</span>
                                <span className="text-sm">Crear</span>
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="analisis" className="mt-6 min-w-0">
                        <GraficosAcciones acciones={accionesFiltradas} />
                    </TabsContent>

                    <TabsContent value="calendario" className="mt-6 min-w-0">
                        <div className="min-h-[420px] min-w-0 overflow-x-auto">
                            <CalendarioAcciones
                                acciones={accionesFiltradas}
                                onSelectAccion={(id) => navigate(`/acciones-correctivas/${id}/solucionar`)}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
