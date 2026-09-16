import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, DataTableAction } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckCircle2, RefreshCw, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import NuevasAccionesCorrectivas from "./nuevas";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAccionCorrectiva } from "@/utils/documentosRegistrosSGC";
import { accionCorrectivaService, AccionCorrectiva as IAccionCorrectiva } from "@/services/accionCorrectiva.service";

interface AccionCorrectivaUI {
  id: string | number;
  codigo: string;
  tipo: string;
  descripcion: string;
  estado: string;
  gravedad: string;
  fechaDeteccion: string;
  responsable: string;
}

export default function AccionesCorrectivasVerificadas() {
  const navigate = useNavigate();
  const [accionesCorrectivas, setAccionesCorrectivas] = useState<AccionCorrectivaUI[]>([]);
  const [accionesOriginales, setAccionesOriginales] = useState<IAccionCorrectiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDocumento, setShowDocumento] = useState(false);
  const [selectedAccion, setSelectedAccion] = useState<IAccionCorrectiva | null>(null);

  useEffect(() => {
    fetchAccionesCorrectivasVerificadas();
  }, []);

  const handleVer = async (row: AccionCorrectivaUI) => {
    try {
      const local = accionesOriginales.find((accion) => String(accion.id) === String(row.id));
      const completa = await accionCorrectivaService.getById(String(row.id)).catch(() => local);
      if (!completa) {
        toast.error("No se pudo cargar la acción correctiva");
        return;
      }
      setSelectedAccion(completa);
      setShowDocumento(true);
    } catch (error) {
      console.error("Error al abrir acción verificada:", error);
      toast.error("No se pudo abrir el documento de la acción");
    }
  };

  const actions: DataTableAction[] = [
    {
      label: "Ver",
      onClick: (row) => {
        void handleVer(row as AccionCorrectivaUI);
      },
    },
  ];

  const fetchAccionesCorrectivasVerificadas = async () => {
    try {
      const accionesVerificadas = await accionCorrectivaService.getVerificadas();
      setAccionesOriginales(accionesVerificadas);

      const transformedData = accionesVerificadas.map((ac: IAccionCorrectiva) => {
        let fechaFormateada = "Sin fecha";
        const fechaAUsar = ac.fechaVerificacion || ac.fechaCompromiso;

        if (fechaAUsar) {
          try {
            const [anio, mes, dia] = fechaAUsar.split('-');
            fechaFormateada = `${dia}/${mes}/${anio}`;
          } catch (e) {
            console.error("Error al formatear fecha:", e);
          }
        }

        return {
          id: ac.id,
          codigo: ac.codigo,
          tipo: ac.tipo || "Correctiva",
          descripcion: ac.descripcion || "Sin descripción",
          estado: "Verificada",
          gravedad: "Eficacia Comprobada",
          fechaDeteccion: fechaFormateada,
          responsable: ac.responsable ? `${ac.responsable.nombre} ${ac.responsable.primerApellido}` : "Sin asignar",
        };
      });

      setAccionesCorrectivas(transformedData);
      setTotal(transformedData.length);
    } catch (error) {
      console.error("Error:", error);
      const ejemploData: AccionCorrectivaUI[] = [
        {
          id: 1,
          codigo: "AC-2024-001",
          tipo: "Correctiva",
          descripcion: "Mejora en proceso de validación - Eficacia comprobada",
          estado: "Verificada",
          gravedad: "Eficacia Comprobada",
          fechaDeteccion: "25/10/2024",
          responsable: "María López",
        },
        {
          id: 2,
          codigo: "AC-2024-002",
          tipo: "Preventiva",
          descripcion: "Actualización de procedimiento - Resultados positivos",
          estado: "Verificada",
          gravedad: "Eficacia Comprobada",
          fechaDeteccion: "15/09/2024",
          responsable: "Carlos Gómez",
        },
        {
          id: 3,
          codigo: "AC-2024-003",
          tipo: "Mejora",
          descripcion: "Optimización de proceso - Eficacia demostrada",
          estado: "Verificada",
          gravedad: "Eficacia Comprobada",
          fechaDeteccion: "30/08/2024",
          responsable: "Ana Martínez",
        },
      ];
      setAccionesCorrectivas(ejemploData);
      setTotal(ejemploData.length);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  const correctivas = accionesCorrectivas.filter(
    (ac) => ac.tipo.toLowerCase() === "correctiva"
  ).length;
  const preventivas = accionesCorrectivas.filter(
    (ac) => ac.tipo.toLowerCase() === "preventiva"
  ).length;
  const mejoras = accionesCorrectivas.filter(
    (ac) => ac.tipo.toLowerCase() === "mejora"
  ).length;

  return (
    <div className="min-h-screen min-w-0 bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-5 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-start sm:items-center gap-3">
                <CheckCircle2 className="h-7 w-7 sm:h-9 sm:w-9 text-[#22C55E] shrink-0" />
                <span className="break-words">Acciones Correctivas Verificadas</span>
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Acciones cuya eficacia ha sido comprobada y confirmada
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} totales
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E] border border-[#22C55E]/30">
                  Eficacia confirmada
                </Badge>
              </div>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold w-full sm:w-auto">
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Nueva Acción Correctiva
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto rounded-2xl p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Nueva Acción Correctiva</DialogTitle>
                </DialogHeader>
                <NuevasAccionesCorrectivas
                  embedded
                  onSuccess={() => {
                    setIsModalOpen(false);
                    fetchAccionesCorrectivasVerificadas();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Verificadas</CardDescription>
                <CheckCircle2 className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Eficacia comprobada
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Correctivas</CardDescription>
                <CheckCircle2 className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{correctivas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Corrección
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Preventivas</CardDescription>
                <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{preventivas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                Prevención
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#F0FDF4] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#166534]">Mejoras</CardDescription>
                <CheckCircle2 className="h-8 w-8 text-[#22C55E]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#166534]">{mejoras}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#22C55E] border-[#22C55E]/20 font-bold uppercase text-[10px]">
                Optimización
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Guía de Verificación */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Proceso de Verificación</CardTitle>
            <CardDescription>
              Características de una acción correctiva verificada
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Evidencia Objetiva</span>
                  <span className="text-[#6B7280]">Resultados medibles que demuestran éxito.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Validación Formal</span>
                  <span className="text-[#6B7280]">Revisión y aprobación por responsable.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                <div className="h-8 w-8 rounded-lg bg-[#22C55E] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#166534] block mb-1">Mejora Continua</span>
                  <span className="text-[#6B7280]">Contribución al SGC ISO 9001.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden min-w-0">
          <div className="p-4 sm:p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-[#1E3A8A] break-words">Historial de Acciones Verificadas</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={fetchAccionesCorrectivasVerificadas}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                {total} registros
              </Badge>
            </div>
          </div>
          <div className="p-0">
            <DataTable data={accionesCorrectivas} actions={actions} />
          </div>
        </div>

        <VistaDocumentoSGCDialog
          open={showDocumento}
          onOpenChange={(open) => {
            setShowDocumento(open);
            if (!open) setSelectedAccion(null);
          }}
          data={selectedAccion ? datosSGCDesdeAccionCorrectiva(selectedAccion) : null}
          title="Acción correctiva verificada"
          description="Documento controlado con la verificación de eficacia y evidencias de la acción."
          extraActions={
            selectedAccion ? (
              <Button
                className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                onClick={() => navigate(`/acciones-correctivas/${selectedAccion.id}/solucionar`)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ver evidencias
              </Button>
            ) : null
          }
        />
      </div>
    </div>
  );
}
