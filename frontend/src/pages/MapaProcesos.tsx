import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Network,
    TrendingUp,
    Cog,
    BarChart3,
    Target,
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    List,
    ChevronDown,
    User,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { matchesTextSearch } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import procesoService, { Proceso, TipoProceso, EstadoProceso } from "@/services/proceso.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { hasAnyPermission } from "@/lib/permissions";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeProceso } from "@/utils/documentosRegistrosSGC";

const ESTILO_TIPO: Record<
    TipoProceso,
    { acento: string; fondo: string; encabezado: string; icono: string; etiqueta: string }
> = {
    [TipoProceso.ESTRATEGICO]: {
        acento: "#1E3A8A",
        fondo: "bg-[#EEF2FF]",
        encabezado: "bg-[#E0EDFF] text-[#1E3A8A]",
        icono: "text-[#2563EB]",
        etiqueta: "Dirección",
    },
    [TipoProceso.OPERATIVO]: {
        acento: "#2563EB",
        fondo: "bg-[#EFF6FF]",
        encabezado: "bg-[#DBEAFE] text-[#1E3A8A]",
        icono: "text-[#2563EB]",
        etiqueta: "Cadena de valor",
    },
    [TipoProceso.APOYO]: {
        acento: "#059669",
        fondo: "bg-[#ECFDF5]",
        encabezado: "bg-[#D1FAE5] text-[#065F46]",
        icono: "text-[#059669]",
        etiqueta: "Soporte",
    },
    [TipoProceso.MEDICION]: {
        acento: "#EA580C",
        fondo: "bg-[#FFF7ED]",
        encabezado: "bg-[#FFEDD5] text-[#9A3412]",
        icono: "text-[#EA580C]",
        etiqueta: "Mejora",
    },
};

const ESTADO_BADGE: Record<EstadoProceso, { icon: typeof CheckCircle; className: string; label: string }> = {
    [EstadoProceso.ACTIVO]: {
        icon: CheckCircle,
        className: "bg-[#ECFDF5] text-[#065F46] border-[#10B981]/30",
        label: "Activo",
    },
    [EstadoProceso.BORRADOR]: {
        icon: Edit,
        className: "bg-[#F8FAFC] text-[#374151] border-[#E5E7EB]",
        label: "Borrador",
    },
    [EstadoProceso.REVISION]: {
        icon: Clock,
        className: "bg-[#FFF7ED] text-[#9A3412] border-[#F97316]/30",
        label: "En revisión",
    },
    [EstadoProceso.SUSPENDIDO]: {
        icon: AlertCircle,
        className: "bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]/30",
        label: "Suspendido",
    },
    [EstadoProceso.OBSOLETO]: {
        icon: XCircle,
        className: "bg-[#F8FAFC] text-[#6B7280] border-[#D1D5DB]",
        label: "Obsoleto",
    },
};

export default function MapaProcesos() {
    const navigate = useNavigate();
    const canManageProcesos = hasAnyPermission(["procesos.admin"]);
    const [procesos, setProcesos] = useState<Proceso[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");
    const [filtroEstado, setFiltroEstado] = useState<string>("todos");
    const [showDocumento, setShowDocumento] = useState(false);
    const [selectedProceso, setSelectedProceso] = useState<Proceso | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        proceso: Proceso | null;
    }>({
        open: false,
        proceso: null,
    });

    useEffect(() => {
        cargarProcesos();
    }, []);

    const cargarProcesos = async () => {
        try {
            setLoading(true);
            const data = await procesoService.listar();
            setProcesos(data);
        } catch (error) {
            console.error("Error cargando procesos:", error);
            toast.error("Error al cargar los procesos");
        } finally {
            setLoading(false);
        }
    };

    const abrirDialogoEliminar = (proceso: Proceso) => {
        setDeleteDialog({ open: true, proceso });
    };

    const cerrarDialogoEliminar = () => {
        setDeleteDialog({ open: false, proceso: null });
    };

    const confirmarEliminar = async () => {
        if (!deleteDialog.proceso) return;
        try {
            await procesoService.eliminar(deleteDialog.proceso.id);
            toast.success(`Proceso "${deleteDialog.proceso.nombre}" eliminado exitosamente`);
            cerrarDialogoEliminar();
            cargarProcesos();
        } catch (error: any) {
            console.error("Error eliminando proceso:", error);
            toast.error(error.response?.data?.detail || "Error al eliminar el proceso");
        }
    };

    const procesosFiltrados = procesos.filter((proceso) => {
        const matchBusqueda = matchesTextSearch(busqueda, proceso);
        const matchTipo = filtroTipo === "todos" || proceso.tipo_proceso === filtroTipo;
        const matchEstado = filtroEstado === "todos" || proceso.estado === filtroEstado;
        return matchBusqueda && matchTipo && matchEstado;
    });

    const procesosAgrupados = {
        estrategico: procesosFiltrados.filter((p) => p.tipo_proceso === TipoProceso.ESTRATEGICO),
        operativo: procesosFiltrados.filter((p) => p.tipo_proceso === TipoProceso.OPERATIVO),
        apoyo: procesosFiltrados.filter((p) => p.tipo_proceso === TipoProceso.APOYO),
        medicion: procesosFiltrados.filter((p) => p.tipo_proceso === TipoProceso.MEDICION),
    };

    const getIconoPorTipo = (tipo?: TipoProceso) => {
        switch (tipo) {
            case TipoProceso.ESTRATEGICO:
                return <Target className="h-5 w-5" />;
            case TipoProceso.OPERATIVO:
                return <Cog className="h-5 w-5" />;
            case TipoProceso.APOYO:
                return <TrendingUp className="h-5 w-5" />;
            case TipoProceso.MEDICION:
                return <BarChart3 className="h-5 w-5" />;
            default:
                return <Network className="h-5 w-5" />;
        }
    };

    const getEstadoBadge = (estado: EstadoProceso) => {
        const config = ESTADO_BADGE[estado] || ESTADO_BADGE[EstadoProceso.BORRADOR];
        const Icon = config.icon;
        return (
            <Badge variant="outline" className={`${config.className} flex items-center gap-1 shrink-0`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const TarjetaProceso = ({ proceso }: { proceso: Proceso }) => {
        const estilo = proceso.tipo_proceso ? ESTILO_TIPO[proceso.tipo_proceso] : ESTILO_TIPO[TipoProceso.OPERATIVO];
        return (
            <div
                className="h-full rounded-xl border border-[#E5E7EB] bg-white p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderLeftWidth: 4, borderLeftColor: estilo.acento }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${estilo.fondo} ${estilo.icono} shrink-0`}>
                            {getIconoPorTipo(proceso.tipo_proceso)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-[#111827] leading-snug">{proceso.nombre}</h3>
                            <p className="text-xs font-mono text-[#6B7280] mt-1">
                                {proceso.codigo}
                                {proceso.version ? ` · v${proceso.version}` : ""}
                            </p>
                        </div>
                    </div>
                    {getEstadoBadge(proceso.estado)}
                </div>

                {proceso.objetivo ? (
                    <p className="text-sm text-[#6B7280] line-clamp-2">{proceso.objetivo}</p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
                    {proceso.area_nombre && <span>Área: {proceso.area_nombre}</span>}
                    {proceso.responsable_nombre && (
                        <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {proceso.responsable_nombre}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-[#F3F4F6]">
                    <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => {
                            setSelectedProceso(proceso);
                            setShowDocumento(true);
                        }}
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                    </Button>
                    {canManageProcesos && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => navigate(`/procesos/${proceso.id}/editar`)}
                        >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                        </Button>
                    )}
                    {canManageProcesos && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEF2F2]"
                            onClick={() => abrirDialogoEliminar(proceso)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    const CapaMapa = ({
        titulo,
        tipo,
        icono,
        procesosCapa,
        className = "",
    }: {
        titulo: string;
        tipo: TipoProceso;
        icono: React.ReactNode;
        procesosCapa: Proceso[];
        className?: string;
    }) => {
        const estilo = ESTILO_TIPO[tipo];
        return (
            <section className={`rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm ${className}`}>
                <div className={`px-5 py-3 flex items-center justify-between gap-3 ${estilo.encabezado}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-white/70">{icono}</div>
                        <div className="min-w-0">
                            <h2 className="text-base md:text-lg font-bold">{titulo}</h2>
                            <p className="text-xs opacity-80">{estilo.etiqueta}</p>
                        </div>
                    </div>
                    <Badge className="bg-white/80 text-inherit border-white/60 shrink-0">
                        {procesosCapa.length} proceso{procesosCapa.length === 1 ? "" : "s"}
                    </Badge>
                </div>
                <div className="p-4">
                    {procesosCapa.length === 0 ? (
                        <p className="text-sm text-[#6B7280] text-center py-3">No hay procesos en esta capa.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {procesosCapa.map((proceso) => (
                                <TarjetaProceso key={proceso.id} proceso={proceso} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        );
    };

    const total = procesos.length;
    const activos = procesos.filter((p) => p.estado === EstadoProceso.ACTIVO).length;
    const enRevision = procesos.filter((p) => p.estado === EstadoProceso.REVISION).length;
    const operativos = procesos.filter((p) => p.tipo_proceso === TipoProceso.OPERATIVO).length;

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                                <Network className="h-9 w-9 text-[#2563EB]" />
                                Mapa de Procesos ISO 9001
                            </h1>
                            <p className="text-[#6B7280] mt-2 text-lg">
                                Dirección, cadena de valor, apoyo y medición del SGC.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">{total} procesos</Badge>
                                <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30">
                                    {activos} activos
                                </Badge>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                className="rounded-xl bg-white"
                                onClick={() => navigate("/procesos/listado")}
                            >
                                <List className="h-4 w-4 mr-2" />
                                Ver listado
                            </Button>
                            {canManageProcesos && (
                                <Button
                                    onClick={() => navigate("/procesos/nuevo")}
                                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6 py-5 h-auto font-bold"
                                >
                                    <Plus className="h-5 w-5 mr-2" />
                                    Nuevo Proceso
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#1E3A8A]">Total</CardDescription>
                                <Network className="h-7 w-7 text-[#2563EB]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#065F46]">Activos</CardDescription>
                                <CheckCircle className="h-7 w-7 text-[#10B981]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#065F46]">{activos}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#9A3412]">En revisión</CardDescription>
                                <Clock className="h-7 w-7 text-[#F97316]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#9A3412]">{enRevision}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="bg-[#DBEAFE] border border-[#E5E7EB] shadow-sm rounded-2xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription className="font-bold text-[#1E3A8A]">Operativos</CardDescription>
                                <Cog className="h-7 w-7 text-[#2563EB]" />
                            </div>
                            <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{operativos}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                            <input
                                placeholder="Buscar por código, nombre, área o responsable"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#E5E7EB] focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                            />
                        </div>
                        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Tipo de proceso" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los tipos</SelectItem>
                                <SelectItem value="estrategico">Estratégicos</SelectItem>
                                <SelectItem value="operativo">Operativos</SelectItem>
                                <SelectItem value="apoyo">Apoyo</SelectItem>
                                <SelectItem value="medicion">Medición</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los estados</SelectItem>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="borrador">Borrador</SelectItem>
                                <SelectItem value="revision">En revisión</SelectItem>
                                <SelectItem value="suspendido">Suspendido</SelectItem>
                                <SelectItem value="obsoleto">Obsoleto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading ? (
                    <LoadingSpinner message="Cargando mapa de procesos" />
                ) : procesosFiltrados.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-[#6B7280]">
                        <Network className="h-12 w-12 mx-auto mb-3 text-[#D1D5DB]" />
                        <p className="font-medium">No hay procesos con esos filtros.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <CapaMapa
                            titulo="Procesos estratégicos"
                            tipo={TipoProceso.ESTRATEGICO}
                            icono={<Target className="h-5 w-5 text-[#1E3A8A]" />}
                            procesosCapa={procesosAgrupados.estrategico}
                        />
                        <div className="flex justify-center text-[#94A3B8]">
                            <ChevronDown className="h-6 w-6" />
                        </div>
                        <CapaMapa
                            titulo="Procesos operativos"
                            tipo={TipoProceso.OPERATIVO}
                            icono={<Cog className="h-5 w-5 text-[#2563EB]" />}
                            procesosCapa={procesosAgrupados.operativo}
                        />
                        <div className="flex justify-center text-[#94A3B8]">
                            <ChevronDown className="h-6 w-6" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <CapaMapa
                                titulo="Procesos de apoyo"
                                tipo={TipoProceso.APOYO}
                                icono={<TrendingUp className="h-5 w-5 text-[#059669]" />}
                                procesosCapa={procesosAgrupados.apoyo}
                            />
                            <CapaMapa
                                titulo="Medición y mejora"
                                tipo={TipoProceso.MEDICION}
                                icono={<BarChart3 className="h-5 w-5 text-[#EA580C]" />}
                                procesosCapa={procesosAgrupados.medicion}
                            />
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={deleteDialog.open && canManageProcesos} onOpenChange={cerrarDialogoEliminar}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#1E3A8A]">¿Eliminar proceso?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>
                                    ¿Estás seguro de que deseas eliminar el proceso{" "}
                                    <span className="font-semibold text-gray-900">{deleteDialog.proceso?.nombre}</span>{" "}
                                    ({deleteDialog.proceso?.codigo})?
                                </p>
                                <p className="text-red-600 font-medium">
                                    Esta acción no se puede deshacer. Se eliminarán también todas las etapas,
                                    indicadores y relaciones asociadas a este proceso.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cerrarDialogoEliminar}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarEliminar} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <VistaDocumentoSGCDialog
                open={showDocumento}
                onOpenChange={(open) => {
                    setShowDocumento(open);
                    if (!open) setSelectedProceso(null);
                }}
                data={selectedProceso ? datosSGCDesdeProceso(selectedProceso) : null}
                title="Proceso del SGC"
                description="Caracterización controlada del proceso según ISO 9001."
                extraActions={
                    selectedProceso ? (
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                                setShowDocumento(false);
                                navigate(`/procesos/${selectedProceso.id}`);
                            }}
                        >
                            Ficha completa
                        </Button>
                    ) : null
                }
            />
        </div>
    );
}
