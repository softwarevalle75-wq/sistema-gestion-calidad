import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { PlusIcon, Clock, Activity, AlertTriangle, Pencil, Paperclip, CheckCircle, Eye } from "lucide-react";
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

interface NoConformidadUI {
  id: string;
  codigo: string;
  tipo: string;
  descripcion: string;
  estado: string;
  gravedad: string;
  fechaDeteccion: string;
  responsable: string;
  plan_accion: string;
}

export default function NoConformidadesEnTratamiento() {
  const [noConformidades, setNoConformidades] = useState<NoConformidadUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "evidencias">("create");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedNoConformidad, setSelectedNoConformidad] = useState<INoConformidad | null>(null);

  // States for Finalize Dialog
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [ncToFinalize, setNcToFinalize] = useState<NoConformidadUI | null>(null);

  useEffect(() => {
    fetchNoConformidadesEnTratamiento();
  }, []);

  const fetchNoConformidadesEnTratamiento = async () => {
    try {
      const data = await noConformidadService.getEnTratamiento();
      const dataArray = Array.isArray(data) ? data : [];

      // Transformar los datos para que coincidan con el formato de la tabla
      const transformedData = dataArray.map((nc: INoConformidad) => ({
        id: nc.id,
        codigo: nc.codigo,
        tipo: nc.tipo || "No Conformidad",
        descripcion: nc.descripcion,
        estado: "En Tratamiento",
        gravedad: nc.gravedad
          ? nc.gravedad.charAt(0).toUpperCase() + nc.gravedad.slice(1)
          : "N/A",
        fechaDeteccion: nc.fecha_deteccion ? new Date(nc.fecha_deteccion).toISOString().split('T')[0] : "N/A",
        responsable: nc.responsable?.nombre
          ? `${nc.responsable.nombre} ${nc.responsable.primerApellido}`
          : "Sin asignar",
        plan_accion: nc.plan_accion || "",
      }));

      setNoConformidades(transformedData);
      setTotal(transformedData.length);
    } catch (error) {
      console.error("Error al cargar no conformidades:", error);
      setNoConformidades([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarTratamiento = async () => {
    if (!ncToFinalize) return;
    try {
      await noConformidadService.cerrar(String(ncToFinalize.id));
      toast.success("Tratamiento finalizado exitosamente");
      fetchNoConformidadesEnTratamiento();
      setIsFinalizeDialogOpen(false);
      setNcToFinalize(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar tratamiento");
    }
  };

  const handleEditar = async (id: string) => {
    try {
      const data = await noConformidadService.getById(id);
      setSelectedNoConformidad(data);
      setDialogMode("edit");
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error al cargar datos para editar:", error);
      toast.error("Error al cargar datos para editar");
    }
  };

  const handleAgregarEvidencias = async (id: string) => {
    try {
      const data = await noConformidadService.getById(id);
      setSelectedNoConformidad(data);
      setDialogMode("evidencias");
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error al cargar no conformidad para evidencias:", error);
      toast.error("Error al cargar la no conformidad");
    }
  };

  const handleCrear = () => {
    setSelectedNoConformidad(null);
    setDialogMode("create");
    setIsDialogOpen(true);
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
                <Clock className="h-9 w-9 text-[#2563EB]" />
                No Conformidades en Tratamiento
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Seguimiento de acciones correctivas y análisis de causa raíz en curso
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} en proceso
                </Badge>
                <Badge className="bg-[#EFF6FF] text-[#1D4ED8] border border-[#1D4ED8]/30">
                  Estado: En Ejecución
                </Badge>
              </div>
            </div>
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
                  <DialogTitle>
                    {dialogMode === "create" && "Nueva No Conformidad"}
                    {dialogMode === "edit" && "Editar No Conformidad"}
                    {dialogMode === "evidencias" && "Agregar Evidencias (En Tratamiento)"}
                  </DialogTitle>
                </DialogHeader>
                <NuevaNoConformidadForm
                  initialData={selectedNoConformidad}
                  onSuccess={() => {
                    fetchNoConformidadesEnTratamiento();
                    setIsDialogOpen(false);
                  }}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <VerNoConformidad
              noConformidad={selectedNoConformidad}
              open={isViewDialogOpen}
              onClose={() => setIsViewDialogOpen(false)}
              extraActions={
                selectedNoConformidad ? (
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
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        void handleAgregarEvidencias(selectedNoConformidad.id);
                      }}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Agregar evidencia
                    </Button>
                    <Button
                      className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                      onClick={() => {
                        if (!selectedNoConformidad.plan_accion) {
                          toast.error("Debe registrar un Plan de Acción antes de finalizar el tratamiento.", {
                            description: "Utilice la opción 'Editar' para agregar el análisis y plan de acción.",
                          });
                          return;
                        }
                        setIsViewDialogOpen(false);
                        setNcToFinalize({
                          id: selectedNoConformidad.id,
                          codigo: selectedNoConformidad.codigo,
                          tipo: selectedNoConformidad.tipo || "No Conformidad",
                          descripcion: selectedNoConformidad.descripcion,
                          estado: "En Tratamiento",
                          gravedad: selectedNoConformidad.gravedad || "N/A",
                          fechaDeteccion: selectedNoConformidad.fecha_deteccion || "N/A",
                          responsable: selectedNoConformidad.responsable
                            ? `${selectedNoConformidad.responsable.nombre} ${selectedNoConformidad.responsable.primerApellido}`
                            : "Sin asignar",
                          plan_accion: selectedNoConformidad.plan_accion || "",
                        });
                        setIsFinalizeDialogOpen(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Cerrar tratamiento
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
                <CardDescription className="font-bold text-[#1E3A8A]">Total en Tratamiento</CardDescription>
                <Clock className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Análisis y resolución activa
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Críticas en Proceso</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{criticas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                Prioridad Crítica
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Mayores en Proceso</CardDescription>
                <AlertTriangle className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{mayores}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Alta Prioridad
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Menores en Proceso</CardDescription>
                <div className="h-8 w-8 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{menores}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                Seguimiento
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Acciones e Información */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Gestión de Avances</CardTitle>
            <CardDescription>
              Acciones permitidas para casos en tratamiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#F0FDF4] rounded-xl border border-[#DCFCE7]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">✓</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Finalizar Tratamiento</span>
                  <span className="text-[#6B7280]">Marca la NC como "Cerrada" tras verificar la efectividad de las acciones.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">👁️</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Ver Detalles</span>
                  <span className="text-[#6B7280]">Accede a toda la documentación y evidencias colectadas hasta el momento.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F5F3FF] rounded-xl border border-[#EDE9FE]">
                <div className="h-8 w-8 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center font-bold flex-shrink-0">📝</div>
                <div>
                  <span className="font-bold text-[#4C1D95] block mb-1">Actualizar Progreso</span>
                  <span className="text-[#6B7280]">Registra nuevos hallazgos o comentarios sobre el avance del caso.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla principal */}
        <div className="rounded-2xl border border-[#DBEAFE] bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF4FF] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de No Conformidades en Tratamiento</h2>
                <p className="text-sm text-[#6B7280] mt-1">
                  Prioriza casos críticos y registra avances, evidencias y decisiones de cierre.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white text-[#1E3A8A] border border-[#DBEAFE]">
                  Total: {total}
                </Badge>
                <Badge className="bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                  Críticas: {criticas}
                </Badge>
                <Badge className="bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]">
                  Mayores: {mayores}
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#BBF7D0]">
                  Menores: {menores}
                </Badge>
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <DataTable
                data={noConformidades}
                actionsTriggerIcon={<Eye className="h-4 w-4 text-[#2563EB]" />}
                actions={[
                  {
                    label: "Ver Detalles",
                    onClick: (row) => handleVerDetalles(String(row.id)),
                  },
                  {
                    label: "Cerrar Tratamiento",
                    onClick: async (row) => {
                      const nc = row as unknown as NoConformidadUI;
                      if (!nc.plan_accion) {
                        toast.error("Debe registrar un Plan de Acción antes de finalizar el tratamiento.", {
                          description: "Utilice la opción 'Editar' para agregar el análisis y plan de acción."
                        });
                        return;
                      }
                      setNcToFinalize(nc);
                      setIsFinalizeDialogOpen(true);
                    },
                  },
                  {
                    label: "Agregar Evidencias",
                    onClick: (row) => handleAgregarEvidencias(String(row.id)),
                  },
                  {
                    label: "Editar",
                    onClick: (row) => handleEditar(String(row.id)),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AlertDialog de Confirmación */}
      <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de finalizar el tratamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción finalizará el tratamiento de la No Conformidad <strong>{ncToFinalize?.codigo}</strong>.
              Esto cambiará su estado a "Cerrada" y no se podrán realizar más cambios en este etapa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNcToFinalize(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizarTratamiento} className="bg-green-600 hover:bg-green-700">
              Confirmar Finalización
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
