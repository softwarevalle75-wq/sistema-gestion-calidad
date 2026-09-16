import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import {
  Calendar,
  Clock,
  Laptop,
  MapPin,
  Users,
  Tag,
  CheckCircle,
  GraduationCap,
  RefreshCw,
  Search,
  AlertTriangle,
  ShieldCheck,
  Eye,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  capacitacionService,
  Capacitacion,
  ReporteCapacitacionAuditoria,
} from "@/services/capacitacion.service";
import { toast } from "sonner";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeCapacitacion } from "@/utils/documentosRegistrosSGC";

const CapacitacionesHistorial = () => {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<Capacitacion[]>([]);
  const [reporteAuditoria, setReporteAuditoria] = useState<ReporteCapacitacionAuditoria | null>(null);
  const [usuariosPendientes, setUsuariosPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDocumento, setShowDocumento] = useState(false);
  const [selectedCap, setSelectedCap] = useState<Capacitacion | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const [data, reporte, pendientes] = await Promise.all([
        capacitacionService.getHistorial(),
        capacitacionService.getReporteAuditoria(),
        capacitacionService.getUsuariosPendientesObligatoria(),
      ]);
      setHistorial(data);
      setReporteAuditoria(reporte);
      setUsuariosPendientes(Array.isArray(pendientes) ? pendientes.length : 0);
    } catch (err: any) {
      console.error("Error al cargar historial:", err);
      toast.error(err.message || "Error al cargar historial");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistorial = historial.filter((c) => matchesTextSearch(searchTerm, c));

  // Indicadores
  const total = reporteAuditoria?.capacitaciones_ejecutadas ?? historial.length;
  const horasTotales = historial.reduce((acc, cap) => {
    const horas = cap.duracionHoras || 0;
    return acc + horas;
  }, 0);
  const asistenciaPromedio = reporteAuditoria?.porcentaje_asistencia_promedio ?? 0;
  const sinEvidencia = reporteAuditoria?.capacitaciones_sin_evidencia ?? 0;

  if (loading) {
    return <LoadingSpinner message="Cargando historial..." />;
  }

  return (
    <div className="min-h-screen min-w-0 w-full overflow-x-hidden bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 min-w-0">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <GraduationCap className="h-7 w-7 sm:h-9 sm:w-9 text-[#2563EB] shrink-0" />
                  <span className="break-words">Historial de Capacitaciones</span>
                </h1>
                <p className="text-[#6B7280] mt-2 text-sm sm:text-lg">
                  Registro completo de todas las capacitaciones realizadas
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {total} capacitaciones
                  </Badge>
                  <Badge className="bg-[#ECFDF5] text-[#065F46] border border-[#10B981]/30">
                    {horasTotales} horas totales
                  </Badge>
                  <Badge className="bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]/50">
                    {usuariosPendientes} usuarios con obligatorias pendientes
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => navigate("/capacitaciones/programadas")}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6 py-6 h-auto font-bold w-full md:w-auto"
              >
                Ver programadas
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total</CardDescription>
                  <GraduationCap className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Capacitaciones completadas
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFEFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#0E7490]">Horas Totales</CardDescription>
                  <Clock className="h-8 w-8 text-[#06B6D4]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#0E7490]">{horasTotales}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Tiempo de formación
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FEF3C7] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#92400E]">Asistencia Promedio</CardDescription>
                  <ShieldCheck className="h-8 w-8 text-[#D97706]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#92400E]">{asistenciaPromedio.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Cobertura media de asistencia
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FEE2E2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#991B1B]">Sin Evidencia</CardDescription>
                  <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#991B1B]">{sinEvidencia}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Capacitaciones ejecutadas sin archivo
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guía de Gestión */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión del Historial</CardTitle>
              <CardDescription>
                Mejores prácticas para mantener el historial organizado y actualizado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Documentar Completamente</span>
                    <span className="text-[#6B7280]">Registra todos los detalles de cada capacitación.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Analizar Tendencias</span>
                    <span className="text-[#6B7280]">Identifica patrones y áreas de mejora.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Generar Reportes</span>
                    <span className="text-[#6B7280]">Crea informes periódicos de capacitación.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buscador */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              <Input
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
              />
            </div>
          </div>

          {/* Lista de capacitaciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden min-w-0">
            <div className="p-4 sm:p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-[#1E3A8A] break-words">Listado de Capacitaciones</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={cargarHistorial} className="w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredHistorial.length} resultados
                </Badge>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {filteredHistorial.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <GraduationCap className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-[#6B7280]">
                    {searchTerm ? "No se encontraron capacitaciones" : "No hay capacitaciones en el historial"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {filteredHistorial.map((cap) => (
                    <Card key={cap.id} className="hover:shadow-md transition-shadow border-[#E5E7EB]">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-6">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-[#111827] mb-4 break-words">{cap.nombre}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-[#6B7280]">
                              {cap.tipoCapacitacion && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <Tag className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <span className="break-words">{cap.tipoCapacitacion}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 min-w-0">
                                {cap.modalidad === "Virtual" ? (
                                  <Laptop className="w-4 h-4 text-blue-500 shrink-0" />
                                ) : (
                                  <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                                )}
                                <span className="break-words">{cap.modalidad}</span>
                              </div>
                              {cap.fechaProgramada && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                                  <span>{new Date(cap.fechaProgramada).toLocaleDateString('es-CO')}</span>
                                </div>
                              )}
                              {cap.duracionHoras && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                                  <span>{cap.duracionHoras} horas</span>
                                </div>
                              )}
                              {cap.instructor && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <Users className="w-4 h-4 text-gray-500 shrink-0" />
                                  <span className="break-words">Instructor: {cap.instructor}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 md:gap-4 shrink-0">
                            <div className="flex items-center text-[#065F46] font-semibold">
                              <CheckCircle className="w-5 h-5 mr-2 shrink-0" />
                              Completada
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl w-full sm:w-auto"
                              onClick={() => {
                                setSelectedCap(cap);
                                setShowDocumento(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>

      <VistaDocumentoSGCDialog
        open={showDocumento}
        onOpenChange={(open) => {
          setShowDocumento(open);
          if (!open) setSelectedCap(null);
        }}
        data={selectedCap ? datosSGCDesdeCapacitacion(selectedCap) : null}
        title="Capacitación realizada"
        description="Documento controlado con el historial de la capacitación completada."
      />
    </div>
  );
};

export default CapacitacionesHistorial;
