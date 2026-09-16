import { useEffect, useState } from "react";
import { DataTable, DataTableAction } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckCircle, Activity, RefreshCw } from "lucide-react";
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

export default function AccionesCorrectivasCerradas() {
  const [accionesCorrectivas, setAccionesCorrectivas] = useState<AccionCorrectivaUI[]>([]);
  const [accionesOriginales, setAccionesOriginales] = useState<IAccionCorrectiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDocumento, setShowDocumento] = useState(false);
  const [selectedAccion, setSelectedAccion] = useState<IAccionCorrectiva | null>(null);

  useEffect(() => {
    fetchAccionesCorrectivasCerradas();
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
      console.error("Error al abrir acción cerrada:", error);
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

  const fetchAccionesCorrectivasCerradas = async () => {
    try {
      const accionesCerradas = await accionCorrectivaService.getCerradas();
      setAccionesOriginales(accionesCerradas);

      const transformedData = accionesCerradas.map((ac: IAccionCorrectiva) => {
        let fechaFormateada = "Sin fecha";
        if (ac.fechaCompromiso) {
          try {
            const [anio, mes, dia] = ac.fechaCompromiso.split('-');
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
          estado: "Cerrada",
          gravedad: ac.eficaciaVerificada ? "Verificada" : "Pendiente Verificación",
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
          descripcion: "Mejora en proceso de validación de documentos",
          estado: "Cerrada",
          gravedad: "Verificada",
          fechaDeteccion: "15/10/2024",
          responsable: "María López",
        },
        {
          id: 2,
          codigo: "AC-2024-002",
          tipo: "Preventiva",
          descripcion: "Actualización de procedimiento de auditoría",
          estado: "Cerrada",
          gravedad: "Verificada",
          fechaDeteccion: "01/09/2024",
          responsable: "Carlos Gómez",
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
  const verificadas = accionesCorrectivas.filter(
    (ac) => ac.gravedad === "Verificada"
  ).length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <CheckCircle className="h-9 w-9 text-[#10B981]" />
                Acciones Correctivas Cerradas
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Registro histórico de acciones implementadas y verificadas
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {total} totales
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30">
                  {verificadas} verificadas
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
                    fetchAccionesCorrectivasCerradas();
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
                <CardDescription className="font-bold text-[#1E3A8A]">Total Cerradas</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Implementadas completamente
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Correctivas</CardDescription>
                <Activity className="h-8 w-8 text-[#F97316]/50" />
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
                <CardDescription className="font-bold text-[#065F46]">Preventivas / Mejora</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{preventivas + mejoras}</CardTitle>
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
                <CardDescription className="font-bold text-[#166534]">Eficacia Verificada</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#22C55E]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#166534]">{verificadas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#22C55E] border-[#22C55E]/20 font-bold uppercase text-[10px]">
                Confirmadas
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Guía de Cierre */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Ciclo de Cierre</CardTitle>
            <CardDescription>
              Características de una acción correctiva cerrada
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Implementación Completa</span>
                  <span className="text-[#6B7280]">Todas las tareas del plan fueron ejecutadas.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Verificación de Eficacia</span>
                  <span className="text-[#6B7280]">Se comprobó que la acción resolvió el problema.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                <div className="h-8 w-8 rounded-lg bg-[#22C55E] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#166534] block mb-1">Documentación Histórica</span>
                  <span className="text-[#6B7280]">Registro para auditorías y mejora continua.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Historial de Acciones Cerradas</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={fetchAccionesCorrectivasCerradas}>
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
          title="Acción correctiva cerrada"
          description="Documento controlado con la información de cierre, verificación y evidencias."
        />
      </div>
    </div>
  );
}
