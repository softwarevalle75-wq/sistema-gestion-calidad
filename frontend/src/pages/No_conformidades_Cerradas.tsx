import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckCircle, AlertTriangle, Activity } from "lucide-react";
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
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { VerNoConformidad } from "@/components/calidad/VerNoConformidad";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { usuarioService } from "@/services/usuario.service";
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

export default function NoConformidadesCerradas() {
  const canCrearNc = hasAnyPermission(["noconformidades.reportar", "noconformidades.gestion"]);
  const [noConformidades, setNoConformidades] = useState<NoConformidadUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedNoConformidad, setSelectedNoConformidad] = useState<INoConformidad | null>(null);

  useEffect(() => {
    fetchNoConformidadesCerradas();
  }, []);

  const fetchNoConformidadesCerradas = async () => {
    try {
      const data = await noConformidadService.getCerradas();
      const dataArray = Array.isArray(data) ? data : [];

      // Transformar los datos para que coincidan con el formato de la tabla
      const transformedData = dataArray.map((nc: INoConformidad) => ({
        id: nc.id,
        codigo: nc.codigo,
        tipo: nc.tipo || "No Conformidad",
        descripcion: nc.descripcion,
        estado: "Cerrada",
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
      const ejemploData: NoConformidadUI[] = [
        {
          id: "21",
          codigo: "NC-2024-021",
          tipo: "Proceso",
          descripcion: "No conformidad cerrada - acción verificada",
          estado: "Cerrada",
          gravedad: "Menor",
          fechaDeteccion: "2024-09-12",
          responsable: "María López",
        },
        {
          id: "22",
          codigo: "NC-2024-022",
          tipo: "Producto",
          descripcion: "No conformidad cerrada - seguimiento completado",
          estado: "Cerrada",
          gravedad: "Mayor",
          fechaDeteccion: "2024-08-30",
          responsable: "Carlos Gómez",
        },
      ];
      setNoConformidades(ejemploData);
      setTotal(ejemploData.length);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = async (id: string) => {
    try {
      const data = await noConformidadService.getById(id);

      // Fallback: algunos registros pueden traer `detectado_por` sin expandir `detector`
      if (!data.detector && data.detectado_por) {
        try {
          const detector = await usuarioService.getById(data.detectado_por);
          data.detector = {
            id: detector.id,
            nombre: detector.nombre,
            primerApellido: detector.primer_apellido,
          };
        } catch {
          // Si falla el lookup, se mantiene el fallback actual en el modal
        }
      }

      setSelectedNoConformidad(data);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error("Error al obtener detalles:", error);
      toast.error("Error al cargar detalles");
    }
  };

  const handleGenerarReporte = async (id: string) => {
    try {
      toast.info("Generando reporte...");
      const nc = await noConformidadService.getById(id);

      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Reporte de No Conformidad (Cerrada)", 20, 20);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Código: ${nc.codigo}`, 20, 40);
      doc.text(`Estado: ${nc.estado}`, 20, 50);
      doc.text(`Gravedad: ${nc.gravedad || 'N/A'}`, 20, 60);
      doc.text(`Fecha Detección: ${nc.fecha_deteccion ? new Date(nc.fecha_deteccion).toLocaleDateString() : 'N/A'}`, 20, 70);
      doc.text(`Tipo: ${nc.tipo || 'N/A'}`, 20, 80);
      if (nc.responsable?.nombre) {
        doc.text(`Responsable: ${nc.responsable.nombre} ${nc.responsable.primerApellido || ''}`, 20, 90);
      }

      doc.setFont("helvetica", "bold");
      doc.text("Descripción:", 20, 110);
      doc.setFont("helvetica", "normal");
      const splitDesc = doc.splitTextToSize(nc.descripcion || 'Sin descripción', 170);
      doc.text(splitDesc, 20, 120);

      let currentY = 120 + (splitDesc.length * 7);

      if (nc.analisis_causa) {
        doc.setFont("helvetica", "bold");
        doc.text("Análisis de Causa:", 20, currentY);
        doc.setFont("helvetica", "normal");
        const splitCausa = doc.splitTextToSize(nc.analisis_causa, 170);
        doc.text(splitCausa, 20, currentY + 10);
        currentY += 10 + (splitCausa.length * 7);
      }

      if (nc.plan_accion) {
        doc.setFont("helvetica", "bold");
        doc.text("Plan de Acción:", 20, currentY);
        doc.setFont("helvetica", "normal");
        const splitPlan = doc.splitTextToSize(nc.plan_accion, 170);
        doc.text(splitPlan, 20, currentY + 10);
      }

      doc.save(`Reporte_NC_${nc.codigo}.pdf`);
      toast.success("Reporte descargado correctamente");
    } catch (error) {
      console.error("Error al generar reporte:", error);
      toast.error("Error al generar el reporte PDF");
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
                <CheckCircle className="h-9 w-9 text-[#2563EB]" />
                No Conformidades Cerradas
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Historial de no conformidades resueltas y verificadas
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} resueltas
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E]">
                  Cumplimiento 100%
                </Badge>
              </div>
            </div>
            {canCrearNc && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold">
                    <PlusIcon className="mr-2 h-5 w-5" />
                    Nueva No Conformidad
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nueva No Conformidad</DialogTitle>
                  </DialogHeader>
                  <NuevaNoConformidadForm
                    onSuccess={() => {
                      fetchNoConformidadesCerradas();
                      setIsDialogOpen(false);
                    }}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Cerradas</CardDescription>
                <CheckCircle className="h-6 w-6 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Casos finalizados con éxito
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Histórico Críticas</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{criticas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                Resueltas
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Histórico Mayores</CardDescription>
                <AlertTriangle className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{mayores}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Resueltas
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Histórico Menores</CardDescription>
                <div className="h-8 w-8 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{menores}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                Resueltas
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Acciones e Información */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Información de Registro</CardTitle>
            <CardDescription>
              Las no conformidades cerradas son activos de conocimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#F0FDF4] rounded-xl border border-[#DCFCE7]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">✓</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Completadas</span>
                  <span className="text-[#6B7280]">Todas las acciones correctivas fueron implementadas y verificadas.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">📁</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Archivo Histórico</span>
                  <span className="text-[#6B7280]">Disponibles para consulta y análisis de tendencias y mejora continua.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F5F3FF] rounded-xl border border-[#EDE9FE]">
                <div className="h-8 w-8 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center font-bold flex-shrink-0">⚖️</div>
                <div>
                  <span className="font-bold text-[#4C1D95] block mb-1">Evidencia Auditoría</span>
                  <span className="text-[#6B7280]">Documentación completa y trazable para auditorías internas y externas.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Historial de No Conformidades Cerradas</h2>
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
                {
                  label: "Generar Reporte",
                  onClick: (row) => handleGenerarReporte(String(row.id)),
                },
              ]}
            />
          </div>
        </div>

        <VerNoConformidad
          noConformidad={selectedNoConformidad}
          open={isViewDialogOpen}
          onClose={() => setIsViewDialogOpen(false)}
        />
      </div>
    </div>
  );
}
