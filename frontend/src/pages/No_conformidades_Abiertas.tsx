import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { PlusIcon, AlertTriangle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { noConformidadService, NoConformidad as INoConformidad } from "@/services/noConformidad.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NuevaNoConformidadForm } from "@/components/calidad/NuevaNoConformidadForm";
import { VerNoConformidad } from "@/components/calidad/VerNoConformidad";
import { toast } from "sonner";
import { Pencil, Play } from "lucide-react";
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
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { hasAnyPermission } from "@/lib/permissions";

interface NoConformidadUI {
  id: string;
  codigo: string;
  tipo: string;
  descripcion: string;
  estado: string;
  gravedad: string;
  fechaDeteccion: string;
  responsable: string;
}

export default function NoConformidadesAbiertas() {
  const canReportar = hasAnyPermission(["noconformidades.reportar"]);
  const canGestionar = hasAnyPermission(["noconformidades.gestion"]);
  const [noConformidades, setNoConformidades] = useState<NoConformidadUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedNoConformidad, setSelectedNoConformidad] = useState<INoConformidad | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchNoConformidadesAbiertas();
  }, []);

  const fetchNoConformidadesAbiertas = async () => {
    try {
      const data = await noConformidadService.getAbiertas();
      const dataArray = Array.isArray(data) ? data : [];

      const transformedData = dataArray.map((nc: INoConformidad) => ({
        id: nc.id,
        codigo: nc.codigo,
        tipo: nc.tipo || "No Conformidad",
        descripcion: nc.descripcion,
        estado: "Abierta",
        gravedad: nc.gravedad
          ? nc.gravedad.charAt(0).toUpperCase() + nc.gravedad.slice(1)
          : "N/A",
        fechaDeteccion: nc.fecha_deteccion ? new Date(nc.fecha_deteccion).toISOString().split('T')[0] : "N/A",
        responsable: nc.responsable?.nombre
          ? `${nc.responsable.nombre} ${nc.responsable.primerApellido}`
          : "Sin asignar",
      }));

      setNoConformidades(transformedData);
      setTotal(transformedData.length);
    } catch (error) {
      console.error("Error:", error);
      // Fallback data if needed, or just empty
      setNoConformidades([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarTratamiento = async (id: string) => {
    try {
      await noConformidadService.iniciarTratamiento(id);
      toast.success("Tratamiento iniciado exitosamente");
      fetchNoConformidadesAbiertas();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al iniciar tratamiento");
    }
  };

  const handleVerDetalles = async (id: string) => {
    try {
      const data = await noConformidadService.getById(id);
      setSelectedNoConformidad(data);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error("Error al obtener detalles:", error);
      toast.error("Error al cargar detalles");
    }
  };

  const handleEditar = async (id: string) => {
    try {
      const data = await noConformidadService.getById(id);
      setSelectedNoConformidad(data);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error al cargar datos para editar:", error);
      toast.error("Error al cargar datos para editar");
    }
  };

  const handleCrear = () => {
    setSelectedNoConformidad(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await noConformidadService.delete(deleteId);
      toast.success("No conformidad eliminada exitosamente");
      fetchNoConformidadesAbiertas();
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Error al eliminar la no conformidad. Verifique si tiene acciones relacionadas.");
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner message="Cargando" />
    );
  }

  const mayores = noConformidades.filter(
    (nc) => nc.gravedad === "Mayor",
  ).length;
  const menores = noConformidades.filter(
    (nc) => nc.gravedad === "Menor",
  ).length;
  const criticas = noConformidades.filter(
    (nc) => nc.gravedad === "Critica",
  ).length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <AlertTriangle className="h-9 w-9 text-[#2563EB]" />
                No Conformidades Abiertas
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Gestiona y da seguimiento a las no conformidades pendientes de tratamiento
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} totales
                </Badge>
                {criticas > 0 && (
                  <Badge className="bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
                    {criticas} críticas
                  </Badge>
                )}
              </div>
            </div>
            {(canReportar || canGestionar) && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold"
                    onClick={handleCrear}
                  >
                    <PlusIcon className="mr-2 h-5 w-5" />
                    Nueva No Conformidad
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedNoConformidad ? "Editar No Conformidad" : "Nueva No Conformidad"}</DialogTitle>
                  </DialogHeader>
                  <NuevaNoConformidadForm
                    initialData={selectedNoConformidad}
                    onSuccess={() => {
                      fetchNoConformidadesAbiertas();
                      setIsDialogOpen(false);
                    }}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
            <VerNoConformidad
              noConformidad={selectedNoConformidad}
              open={isViewDialogOpen}
              onClose={() => setIsViewDialogOpen(false)}
              extraActions={
                selectedNoConformidad && canGestionar ? (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        void handleEditar(selectedNoConformidad.id);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                      onClick={async () => {
                        setIsViewDialogOpen(false);
                        await handleIniciarTratamiento(selectedNoConformidad.id);
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar tratamiento
                    </Button>
                  </>
                ) : null
              }
            />
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Abiertas</CardDescription>
                <AlertTriangle className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Pendientes de tratamiento
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Críticas</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{criticas}</CardTitle>
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
                <CardDescription className="font-bold text-[#9A3412]">Mayores</CardDescription>
                <AlertTriangle className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{mayores}</CardTitle>
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
                <CardDescription className="font-bold text-[#065F46]">Menores</CardDescription>
                <div className="h-8 w-8 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{menores}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                Control Operativo
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Acciones e Información */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión</CardTitle>
            <CardDescription>
              Flujo de trabajo para no conformidades abiertas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Iniciar Tratamiento</span>
                  <span className="text-[#6B7280]">Mueve la NC a estado "En Tratamiento" para comenzar el análisis.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Asignar Responsable</span>
                  <span className="text-[#6B7280]">Designa al encargado de liderar las acciones correctivas.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F5F3FF] rounded-xl border border-[#EDE9FE]">
                <div className="h-8 w-8 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#4C1D95] block mb-1">Cierre y Verificación</span>
                  <span className="text-[#6B7280]">Una vez implementadas las acciones, se procede al cierre oficial.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de No Conformidades</h2>
            <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
              Total: {total}
            </Badge>
          </div>
          <div className="p-0">
            <DataTable
              data={noConformidades}
              actions={[
                {
                  label: "Ver Detalles",
                  onClick: (row) => handleVerDetalles(String(row.id)),
                },
                ...(canGestionar
                  ? [
                      {
                        label: "Iniciar Tratamiento",
                        onClick: async (row: any) => {
                          await handleIniciarTratamiento(String(row.id));
                        },
                      },
                      {
                        label: "Editar",
                        onClick: (row: any) => handleEditar(String(row.id)),
                      },
                      {
                        label: "Eliminar",
                        onClick: (row: any) => setDeleteId(String(row.id)),
                        variant: "destructive" as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la no conformidad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
