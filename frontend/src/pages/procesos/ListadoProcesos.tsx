import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  List,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { matchesTextSearch } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import procesoService, { Proceso, TipoProceso, EstadoProceso, EtapaPHVA } from "@/services/proceso.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { hasAnyPermission } from "@/lib/permissions";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeProceso } from "@/utils/documentosRegistrosSGC";

export default function ListadoProcesos() {
  const navigate = useNavigate();
  const canManageProcesos = hasAnyPermission(["procesos.admin"]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDocumento, setShowDocumento] = useState(false);
  const [selectedProceso, setSelectedProceso] = useState<Proceso | null>(null);

  useEffect(() => {
    fetchProcesos();
  }, []);

  const fetchProcesos = async () => {
    try {
      setLoading(true);
      const data = await procesoService.listar();
      setProcesos(data);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al cargar los procesos");
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: EstadoProceso) => {
    const config: Record<EstadoProceso, { bg: string; text: string; border: string; icon: any }> = {
      [EstadoProceso.ACTIVO]: {
        bg: "bg-[#ECFDF5]",
        text: "text-[#10B981]",
        border: "border-[#10B981]/30",
        icon: CheckCircle,
      },
      [EstadoProceso.BORRADOR]: {
        bg: "bg-[#F8FAFC]",
        text: "text-[#6B7280]",
        border: "border-[#E5E7EB]",
        icon: Edit,
      },
      [EstadoProceso.REVISION]: {
        bg: "bg-[#FFF7ED]",
        text: "text-[#F97316]",
        border: "border-[#F97316]/30",
        icon: Clock,
      },
      [EstadoProceso.SUSPENDIDO]: {
        bg: "bg-[#FEF2F2]",
        text: "text-[#EF4444]",
        border: "border-[#EF4444]/30",
        icon: AlertCircle,
      },
      [EstadoProceso.OBSOLETO]: {
        bg: "bg-[#F8FAFC]",
        text: "text-[#9CA3AF]",
        border: "border-[#D1D5DB]",
        icon: XCircle,
      },
    };

    const c = config[estado] || config[EstadoProceso.BORRADOR];
    const Icon = c.icon;

    const labels = {
      [EstadoProceso.ACTIVO]: "Activo",
      [EstadoProceso.BORRADOR]: "Borrador",
      [EstadoProceso.REVISION]: "En Revisión",
      [EstadoProceso.SUSPENDIDO]: "Suspendido",
      [EstadoProceso.OBSOLETO]: "Obsoleto",
    };

    return (
      <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {labels[estado]}
      </Badge>
    );
  };

  const getTipoBadge = (tipo?: TipoProceso) => {
    const config: Record<TipoProceso, { bg: string; text: string; border: string }> = {
      [TipoProceso.ESTRATEGICO]: {
        bg: "bg-[#F5F3FF]",
        text: "text-[#7C3AED]",
        border: "border-[#7C3AED]/30",
      },
      [TipoProceso.OPERATIVO]: {
        bg: "bg-[#EFF6FF]",
        text: "text-[#2563EB]",
        border: "border-[#2563EB]/30",
      },
      [TipoProceso.APOYO]: {
        bg: "bg-[#ECFDF5]",
        text: "text-[#059669]",
        border: "border-[#059669]/30",
      },
      [TipoProceso.MEDICION]: {
        bg: "bg-[#FFF7ED]",
        text: "text-[#EA580C]",
        border: "border-[#EA580C]/30",
      },
    };

    if (!tipo) {
      return <span className="text-[#6B7280] text-sm">-</span>;
    }

    const c = config[tipo];

    const labels = {
      [TipoProceso.ESTRATEGICO]: "Estratégico",
      [TipoProceso.OPERATIVO]: "Operativo",
      [TipoProceso.APOYO]: "Apoyo",
      [TipoProceso.MEDICION]: "Medición",
    };

    return (
      <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
        {labels[tipo]}
      </Badge>
    );
  };

  const getEtapaPHVABadge = (etapa?: EtapaPHVA) => {
    const config: Record<EtapaPHVA, { bg: string; text: string; border: string }> = {
      [EtapaPHVA.PLANEAR]: {
        bg: "bg-[#EFF6FF]",
        text: "text-[#1D4ED8]",
        border: "border-[#1D4ED8]/30",
      },
      [EtapaPHVA.HACER]: {
        bg: "bg-[#ECFDF5]",
        text: "text-[#047857]",
        border: "border-[#047857]/30",
      },
      [EtapaPHVA.VERIFICAR]: {
        bg: "bg-[#FFF7ED]",
        text: "text-[#C2410C]",
        border: "border-[#C2410C]/30",
      },
      [EtapaPHVA.ACTUAR]: {
        bg: "bg-[#F5F3FF]",
        text: "text-[#6D28D9]",
        border: "border-[#6D28D9]/30",
      },
    };

    if (!etapa) {
      return <span className="text-[#6B7280] text-sm">-</span>;
    }

    const c = config[etapa];

    const labels = {
      [EtapaPHVA.PLANEAR]: "Planear",
      [EtapaPHVA.HACER]: "Hacer",
      [EtapaPHVA.VERIFICAR]: "Verificar",
      [EtapaPHVA.ACTUAR]: "Actuar",
    };

    return (
      <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
        {labels[etapa]}
      </Badge>
    );
  };

  const filteredProcesos = procesos.filter((proceso) =>
    matchesTextSearch(searchTerm, proceso)
  );

  if (loading) {
    return <LoadingSpinner message="Cargando Procesos" />;
  }

  const totalProcesos = procesos.length;
  const procesosActivos = procesos.filter(p => p.estado === EstadoProceso.ACTIVO).length;
  const procesosBorrador = procesos.filter(p => p.estado === EstadoProceso.BORRADOR).length;
  const procesosRevision = procesos.filter(p => p.estado === EstadoProceso.REVISION).length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Network className="h-9 w-9 text-[#2563EB]" />
                Gestión de Procesos
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Administración de procesos ISO 9001:2015
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {totalProcesos} totales
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30">
                  {procesosActivos} activos
                </Badge>
                {procesosBorrador > 0 && (
                  <Badge className="bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB]">
                    {procesosBorrador} borradores
                  </Badge>
                )}
                {procesosRevision > 0 && (
                  <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                    {procesosRevision} en revisión
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl bg-white"
              onClick={() => navigate("/procesos")}
            >
              <List className="h-4 w-4 mr-2" />
              Ver mapa
            </Button>
            {canManageProcesos && (
            <Button
              onClick={() => navigate("/procesos/nuevo")}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proceso
            </Button>
            )}
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Procesos</CardDescription>
                <Network className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalProcesos}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Registrados en el sistema
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Activos</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{procesosActivos}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                En Operación
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#F8FAFC] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#374151]">Borradores</CardDescription>
                <Edit className="h-8 w-8 text-[#6B7280]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#374151]">{procesosBorrador}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#6B7280] border-[#E5E7EB] font-bold uppercase text-[10px]">
                En Desarrollo
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">En Revisión</CardDescription>
                <Clock className="h-8 w-8 text-[#F97316]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{procesosRevision}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Pendiente Aprobación
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Buscador */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
            <Input
              placeholder="Buscar por código, nombre, área o responsable"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
            />
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Procesos</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={fetchProcesos}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                {filteredProcesos.length} resultados
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nombre del Proceso</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tipo</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">PHVA</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Área Responsable</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Líder del Proceso</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                      <div className="flex flex-col items-center gap-3">
                        <Layers className="h-12 w-12 text-[#D1D5DB]" />
                        <p className="font-medium">No se encontraron procesos</p>
                        <p className="text-sm">Intenta con otros términos de búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesos.map((proceso) => (
                    <TableRow
                      key={proceso.id}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedProceso(proceso);
                        setShowDocumento(true);
                      }}
                    >
                      <TableCell className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-[#1E3A8A]">
                          {proceso.codigo}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#111827]">{proceso.nombre}</span>
                          {proceso.version && (
                            <span className="text-xs text-[#6B7280] mt-1">v{proceso.version}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getTipoBadge(proceso.tipo_proceso)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getEtapaPHVABadge(proceso.etapa_phva)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-[#374151]">
                          {proceso.area_nombre || <span className="text-[#9CA3AF]">Sin asignar</span>}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-[#374151]">
                          {proceso.responsable_nombre || <span className="text-[#9CA3AF]">Sin asignar</span>}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getEstadoBadge(proceso.estado)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProceso(proceso);
                              setShowDocumento(true);
                            }}
                            className="rounded-lg"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          {canManageProcesos && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/procesos/${proceso.id}/editar`);
                            }}
                            className="rounded-lg"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

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
    </div>
  );
}
