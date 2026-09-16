import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Eye, AlertCircle, Calendar, Activity, RefreshCw, CheckCircle } from "lucide-react";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAccionCorrectiva } from "@/utils/documentosRegistrosSGC";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { accionCorrectivaService, AccionCorrectiva } from "@/services/accionCorrectiva.service";

export default function EnProcesoAccionesCorrectivas() {
  const navigate = useNavigate();
  const [acciones, setAcciones] = useState<AccionCorrectiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAccion, setSelectedAccion] = useState<AccionCorrectiva | null>(null);

  useEffect(() => {
    fetchAcciones();
  }, []);

  const fetchAcciones = async () => {
    try {
      setLoading(true);
      const enProceso = await accionCorrectivaService.getEnProceso();
      setAcciones(enProceso);
    } catch (error: any) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (accion: AccionCorrectiva) => {
    setSelectedAccion(accion);
    setShowDialog(true);
  };

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { bg: string; text: string; border: string }> = {
      pendiente: { bg: "bg-[#F8FAFC]", text: "text-[#6B7280]", border: "border-[#E5E7EB]" },
      en_proceso: { bg: "bg-[#E0EDFF]", text: "text-[#2563EB]", border: "border-[#2563EB]/30" },
      en_ejecucion: { bg: "bg-[#ECFDF5]", text: "text-[#10B981]", border: "border-[#10B981]/30" },
    };
    const c = config[estado] || { bg: "bg-[#F8FAFC]", text: "text-[#6B7280]", border: "border-[#E5E7EB]" };
    const label = {
      pendiente: "Pendiente",
      en_proceso: "En Proceso",
      en_ejecucion: "En Ejecución",
    }[estado] || estado;

    return (
      <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
        {label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const labels: Record<string, string> = {
      correctiva: "Correctiva",
      preventiva: "Preventiva",
      mejora: "Mejora",
    };
    return labels[tipo] || tipo;
  };

  const filteredAcciones = acciones.filter((accion) =>
    matchesTextSearch(searchTerm, accion)
  );

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  const totalEnProceso = acciones.length;
  const porVencer = acciones.filter(a => {
    const fechaCompromiso = a.fechaCompromiso || (a as any).fecha_compromiso;
    if (!fechaCompromiso) return false;
    const diff = new Date(fechaCompromiso).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 7 && days > 0;
  }).length;
  const vencidas = acciones.filter(a => {
    const fechaCompromiso = a.fechaCompromiso || (a as any).fecha_compromiso;
    if (!fechaCompromiso) return false;
    return new Date(fechaCompromiso) < new Date();
  }).length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <ClipboardList className="h-9 w-9 text-[#2563EB]" />
                Acciones Correctivas en Proceso
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Seguimiento de acciones correctivas pendientes de cierre
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {totalEnProceso} totales
                </Badge>
                {vencidas > 0 && (
                  <Badge className="bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
                    {vencidas} vencidas
                  </Badge>
                )}
                {porVencer > 0 && (
                  <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                    {porVencer} por vencer
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total en Proceso</CardDescription>
                <Activity className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalEnProceso}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">
                Pendientes de cierre
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Vencidas</CardDescription>
                <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{vencidas}</CardTitle>
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
                <CardDescription className="font-bold text-[#9A3412]">Por Vencer</CardDescription>
                <Calendar className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{porVencer}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                ≤7 días
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Guía de Seguimiento */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Seguimiento</CardTitle>
            <CardDescription>
              Pasos para gestionar acciones correctivas en proceso
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Implementación</span>
                  <span className="text-[#6B7280]">Ejecutar el plan de acción definido.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Verificación</span>
                  <span className="text-[#6B7280]">Comprobar la efectividad de la acción.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#9A3412] block mb-1">Cierre</span>
                  <span className="text-[#6B7280]">Documentar resultados y cerrar la acción.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buscador */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
            <Input
              placeholder={SEARCH_ANY_PLACEHOLDER}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
            />
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Acciones</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={fetchAcciones}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                {filteredAcciones.length} resultados
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tipo</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Descripción</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha Compromiso</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-[#6B7280]">
                      <div className="flex flex-col items-center">
                        <ClipboardList className="h-16 w-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium">
                          {searchTerm ? "No se encontraron resultados" : "No hay acciones en proceso"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAcciones.map((accion) => {
                    const fechaCompromiso = accion.fechaCompromiso || (accion as any).fecha_compromiso;
                    const isVencida = fechaCompromiso && new Date(fechaCompromiso) < new Date();
                    const isPorVencer = fechaCompromiso &&
                      new Date(fechaCompromiso).getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000 &&
                      !isVencida;

                    return (
                      <TableRow key={accion.id} className="hover:bg-[#F5F3FF] transition-colors">
                        <TableCell className="px-6 py-4 font-mono font-bold">{accion.codigo}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className="capitalize">
                            {getTipoBadge(accion.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="line-clamp-2 max-w-md">
                            {accion.descripcion || "Sin descripción"}
                          </p>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {accion.fechaCompromiso || (accion as any).fecha_compromiso ? (
                            <div className="flex items-center gap-2">
                              {isVencida && <AlertCircle className="h-4 w-4 text-[#EF4444]" />}
                              {isPorVencer && <Calendar className="h-4 w-4 text-[#F97316]" />}
                              <span className={isVencida ? "text-[#EF4444] font-bold" : isPorVencer ? "text-[#F97316] font-medium" : ""}>
                                {new Date(accion.fechaCompromiso || (accion as any).fecha_compromiso).toLocaleDateString("es-CO")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#6B7280]">No definida</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">{getEstadoBadge(accion.estado)}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(accion)}
                              className="rounded-xl"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/acciones-correctivas/${accion.id}/solucionar`)}
                              className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Dar Solución
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <VistaDocumentoSGCDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          data={selectedAccion ? datosSGCDesdeAccionCorrectiva(selectedAccion) : null}
          title="Acción correctiva"
          description="Documento controlado con la información de seguimiento de la acción."
          extraActions={
            selectedAccion ? (
              <Button
                className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                onClick={() => navigate(`/acciones-correctivas/${selectedAccion.id}/solucionar`)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Dar Solución
              </Button>
            ) : null
          }
        />
      </div>
    </div>
  );
}