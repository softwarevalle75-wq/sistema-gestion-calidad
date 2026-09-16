import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Laptop, MapPin, Download, GraduationCap, Eye, RefreshCw, Search, Save } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  capacitacionService,
  Capacitacion,
  ResumenAsistenciaCapacitacion,
  ReporteCapacitacionAuditoria,
  AsistenciaCapacitacion,
} from "@/services/capacitacion.service";
import { usuarioService, Usuario } from "@/services/usuario.service";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeCapacitacion } from "@/utils/documentosRegistrosSGC";

type RegistroAsistenciaUI = {
  selected: boolean;
  asistio: boolean;
  evaluacionAprobada: boolean;
  asistenciaId?: string;
};

const CapacitacionesAsistencia: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedCapacitacion, setSelectedCapacitacion] = useState<Capacitacion | null>(null);
  const [asistenciasVista, setAsistenciasVista] = useState<AsistenciaCapacitacion[]>([]);
  const [asistencias, setAsistencias] = useState<Capacitacion[]>([]);
  const [resumenesPorCapacitacion, setResumenesPorCapacitacion] = useState<Record<string, ResumenAsistenciaCapacitacion>>({});
  const [capacitacionesDisponibles, setCapacitacionesDisponibles] = useState<Capacitacion[]>([]);
  const [usuariosActivos, setUsuariosActivos] = useState<Usuario[]>([]);
  const [capacitacionSeleccionadaId, setCapacitacionSeleccionadaId] = useState("");
  const [filtroUsuarios, setFiltroUsuarios] = useState("");
  const [registrosAsistencia, setRegistrosAsistencia] = useState<Record<string, RegistroAsistenciaUI>>({});
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  const [savingRegistro, setSavingRegistro] = useState(false);
  const [reporteAuditoria, setReporteAuditoria] = useState<ReporteCapacitacionAuditoria | null>(null);
  const [usuariosPendientes, setUsuariosPendientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      const [data, reporte, pendientes] = await Promise.all([
        capacitacionService.getHistorial(),
        capacitacionService.getReporteAuditoria(),
        capacitacionService.getUsuariosPendientesObligatoria(),
      ]);
      const [todasCapacitaciones, usuarios] = await Promise.all([
        capacitacionService.getAll(),
        usuarioService.getAllActive(),
      ]);
      setAsistencias(data);
      setCapacitacionesDisponibles(Array.isArray(todasCapacitaciones) ? todasCapacitaciones : []);
      setUsuariosActivos(Array.isArray(usuarios) ? usuarios : []);
      setReporteAuditoria(reporte);
      setUsuariosPendientes(Array.isArray(pendientes) ? pendientes.length : 0);

      const resumenes = await Promise.all(
        data.map(async (cap) => {
          try {
            const resumen = await capacitacionService.getResumenAsistencia(cap.id);
            return [cap.id, resumen] as const;
          } catch {
            return [cap.id, null] as const;
          }
        })
      );

      const resumenMap: Record<string, ResumenAsistenciaCapacitacion> = {};
      resumenes.forEach(([capId, resumen]) => {
        if (resumen) resumenMap[capId] = resumen;
      });
      setResumenesPorCapacitacion(resumenMap);
    } catch (err: any) {
      console.error("Error al cargar asistencias:", err);
      toast.error(err.message || "Error al cargar asistencias");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = async (capacitacion: Capacitacion) => {
    setSelectedCapacitacion(capacitacion);
    setOpen(true);
    try {
      const lista = await capacitacionService.getAsistencias(capacitacion.id);
      setAsistenciasVista(Array.isArray(lista) ? lista : []);
    } catch {
      setAsistenciasVista([]);
    }
  };

  const construirMapaRegistro = (
    usuarios: Usuario[],
    asistenciasExistentes: AsistenciaCapacitacion[] = []
  ): Record<string, RegistroAsistenciaUI> => {
    const existentesPorUsuario = new Map<string, AsistenciaCapacitacion>(
      asistenciasExistentes.map((item) => [item.usuarioId, item])
    );

    return usuarios.reduce<Record<string, RegistroAsistenciaUI>>((acc, usuario) => {
      const existente = existentesPorUsuario.get(usuario.id);
      acc[usuario.id] = {
        selected: Boolean(existente),
        asistio: existente?.asistio ?? true,
        evaluacionAprobada: existente?.evaluacionAprobada ?? false,
        asistenciaId: existente?.id,
      };
      return acc;
    }, {});
  };

  const cargarRegistroCapacitacion = async (capacitacionId: string) => {
    try {
      setLoadingRegistro(true);
      const asistenciasExistentes = await capacitacionService.getAsistencias(capacitacionId);
      setRegistrosAsistencia(construirMapaRegistro(usuariosActivos, asistenciasExistentes));
    } catch (error: any) {
      toast.error(error.message || "No se pudo cargar el registro de asistencias");
      setRegistrosAsistencia(construirMapaRegistro(usuariosActivos));
    } finally {
      setLoadingRegistro(false);
    }
  };

  const handleSeleccionarCapacitacion = (capacitacionId: string) => {
    setCapacitacionSeleccionadaId(capacitacionId);
    cargarRegistroCapacitacion(capacitacionId);
  };

  const toggleSeleccionUsuario = (usuarioId: string, selected: boolean) => {
    setRegistrosAsistencia((prev) => ({
      ...prev,
      [usuarioId]: {
        ...(prev[usuarioId] ?? { selected: false, asistio: true, evaluacionAprobada: false }),
        selected,
      },
    }));
  };

  const updateRegistroUsuario = (usuarioId: string, changes: Partial<RegistroAsistenciaUI>) => {
    setRegistrosAsistencia((prev) => ({
      ...prev,
      [usuarioId]: {
        ...(prev[usuarioId] ?? { selected: false, asistio: true, evaluacionAprobada: false }),
        ...changes,
      },
    }));
  };

  const usuariosFiltrados = useMemo(
    () =>
      usuariosActivos.filter((usuario) =>
        matchesTextSearch(filtroUsuarios, usuario)
      ),
    [usuariosActivos, filtroUsuarios]
  );

  const seleccionados = Object.values(registrosAsistencia).filter((registro) => registro.selected).length;

  const seleccionarTodosVisibles = (selected: boolean) => {
    setRegistrosAsistencia((prev) => {
      const next = { ...prev };
      usuariosFiltrados.forEach((usuario) => {
        next[usuario.id] = {
          ...(next[usuario.id] ?? { selected: false, asistio: true, evaluacionAprobada: false }),
          selected,
        };
      });
      return next;
    });
  };

  const guardarAsistenciaMasiva = async () => {
    if (!capacitacionSeleccionadaId) {
      toast.error("Selecciona una capacitación");
      return;
    }

    const usuariosSeleccionados = usuariosActivos.filter(
      (usuario) => registrosAsistencia[usuario.id]?.selected
    );

    if (!usuariosSeleccionados.length) {
      toast.error("Selecciona al menos una persona");
      return;
    }

    try {
      setSavingRegistro(true);
      const operaciones = usuariosSeleccionados.map(async (usuario) => {
        const registro = registrosAsistencia[usuario.id];
        const payload: Partial<AsistenciaCapacitacion> = {
          capacitacionId: capacitacionSeleccionadaId,
          usuarioId: usuario.id,
          asistio: registro.asistio,
          evaluacionAprobada: registro.asistio ? registro.evaluacionAprobada : false,
        };

        if (registro.asistenciaId) {
          return capacitacionService.actualizarAsistencia(registro.asistenciaId, payload);
        }

        return capacitacionService.registrarAsistencia(payload);
      });

      const resultado = await Promise.allSettled(operaciones);
      const exitos = resultado.filter((item) => item.status === "fulfilled").length;
      const fallidos = resultado.length - exitos;

      if (exitos) {
        toast.success(`Asistencias guardadas: ${exitos}`);
      }
      if (fallidos) {
        toast.error(`No se pudieron guardar ${fallidos} registros`);
      }

      await Promise.all([cargarAsistencias(), cargarRegistroCapacitacion(capacitacionSeleccionadaId)]);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar asistencias");
    } finally {
      setSavingRegistro(false);
    }
  };

  const handleDescargarCertificado = async () => {
    if (!selectedCapacitacion) return;

    try {
      toast.info("Obteniendo lista de asistentes...");

      const asistenciasCap = await capacitacionService.getAsistencias(selectedCapacitacion.id);
      const aprobados = asistenciasCap.filter((a) => a.asistio || a.evaluacionAprobada);

      if (aprobados.length === 0) {
        toast.error("No hay asistentes registrados para generar certificados.");
        return;
      }

      toast.info(`Generando ${aprobados.length} certificado(s)...`);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Load Logo once
      let base64data: string | null = null;
      try {
        const response = await fetch('/iudc-icon.png');
        const blob = await response.blob();
        if (blob.size > 0) {
          base64data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('No se pudo cargar el logo de la universidad', e);
      }

      aprobados.forEach((asistencia, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Buscar al participante
        const participante = usuariosActivos.find(u => u.id === asistencia.usuarioId);
        let nombreUsuario = "Estudiante / Participante";

        if (participante) {
          nombreUsuario = `${participante.nombre} ${participante.primer_apellido || ''} ${participante.segundo_apellido || ''}`.trim();
        }

        // Border or Background
        doc.setLineWidth(5);
        doc.setDrawColor(37, 99, 235); // Blue #2563EB
        doc.rect(10, 10, width - 20, height - 20);

        doc.setLineWidth(1);
        doc.setDrawColor(199, 210, 254);
        doc.rect(14, 14, width - 28, height - 28);

        // Add Logo
        if (base64data) {
          doc.addImage(base64data, 'PNG', width / 2 - 15, 20, 30, 30);
        }

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(36);
        doc.setTextColor(30, 58, 138); // Dark blue #1E3A8A
        doc.text("CERTIFICADO DE ASISTENCIA", width / 2, 65, { align: "center" });

        // Subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(18);
        doc.setTextColor(107, 114, 128); // Gray #6B7280
        doc.text("Se otorga el presente certificado a:", width / 2, 85, { align: "center" });

        // Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(17, 24, 39); // Dark #111827
        doc.text(nombreUsuario, width / 2, 100, { align: "center" });

        // Body
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.setTextColor(107, 114, 128);
        doc.text("Por haber completado exitosamente la capacitación:", width / 2, 118, { align: "center" });

        // Course Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); // #1E3A8A
        const cursoNombre = selectedCapacitacion.nombre.toUpperCase();
        const splitTitle = doc.splitTextToSize(cursoNombre, width - 40);
        doc.text(splitTitle, width / 2, 132, { align: "center" });

        const offsetTextoLargo = splitTitle.length > 1 ? (splitTitle.length - 1) * 8 : 0;

        // Details
        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(75, 85, 99); // #4B5563

        const fecha = selectedCapacitacion.fechaProgramada
          ? new Date(selectedCapacitacion.fechaProgramada).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
          : "Fecha no registrada";

        const duration = selectedCapacitacion.duracionHoras ? `${selectedCapacitacion.duracionHoras} horas` : "N/A";
        const mode = selectedCapacitacion.modalidad || "N/A";

        const detailsText = `Con una duración de ${duration} en modalidad ${mode},`;
        doc.text(detailsText, width / 2, 148 + offsetTextoLargo, { align: "center" });
        doc.text(`el día ${fecha}.`, width / 2, 156 + offsetTextoLargo, { align: "center" });

        // Instructor Signature
        doc.setLineWidth(0.5);
        doc.setDrawColor(156, 163, 175);
        doc.line(width / 2 - 40, height - 32, width / 2 + 40, height - 32);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(17, 24, 39);
        const instructorName = selectedCapacitacion.instructor || "Instructor Asignado";
        doc.text(instructorName, width / 2, height - 25, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text("Instructor", width / 2, height - 20, { align: "center" });
      });

      // Save
      doc.save(`Certificados_${selectedCapacitacion.codigo || 'Capacitacion'}.pdf`);
      toast.success("Certificados descargados correctamente");
    } catch (error) {
      console.error("Error al generar los certificados:", error);
      toast.error("Hubo un error al generar los certificados");
    }
  };

  const filteredAsistencias = asistencias.filter((a) =>
    matchesTextSearch(searchTerm, a)
  );

  const total = reporteAuditoria?.total_registros_asistencia ?? asistencias.length;
  const virtuales = asistencias.filter((a) => a.modalidad === "Virtual").length;
  const presenciales = asistencias.filter((a) => a.modalidad === "Presencial").length;
  const coberturaPromedio = reporteAuditoria?.porcentaje_asistencia_promedio ?? 0;
  const selectedResumen = selectedCapacitacion ? resumenesPorCapacitacion[selectedCapacitacion.id] : undefined;
  const allVisiblesSelected =
    usuariosFiltrados.length > 0 &&
    usuariosFiltrados.every((usuario) => registrosAsistencia[usuario.id]?.selected);

  if (loading) {
    return <LoadingSpinner message="Cargando asistencias..." />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <CheckCircle className="h-9 w-9 text-[#2563EB]" />
                  Historial de Asistencias
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Registro completo de capacitaciones completadas
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {total} asistencias registradas
                  </Badge>
                  <Badge className="bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]/50">
                    {usuariosPendientes} usuarios con obligatorias pendientes
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Asistencias</CardDescription>
                  <Users className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Capacitaciones completadas
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#F3E8FF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#6B21A8]">Virtuales</CardDescription>
                  <Laptop className="h-8 w-8 text-[#9333EA]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#6B21A8]">{virtuales}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Modalidad en línea
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Presenciales</CardDescription>
                  <MapPin className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{presenciales}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Modalidad presencial
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#9A3412]">Cobertura Promedio</CardDescription>
                  <CheckCircle className="h-8 w-8 text-[#F97316]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{coberturaPromedio.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Asistencia promedio por capacitación
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guía de Gestión */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión de Asistencias</CardTitle>
              <CardDescription>
                Mejores prácticas para el registro y seguimiento de asistencias
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Verificar Asistencia</span>
                    <span className="text-[#6B7280]">Confirma la participación de cada asistente.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Emitir Certificados</span>
                    <span className="text-[#6B7280]">Genera certificados para quienes completaron.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Archivar Registros</span>
                    <span className="text-[#6B7280]">Mantén un historial completo y organizado.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Registro Masivo de Asistencia</CardTitle>
              <CardDescription>
                Selecciona capacitación, marca asistentes y define evaluación aprobada por persona.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Capacitación</Label>
                  <Select
                    value={capacitacionSeleccionadaId}
                    onValueChange={handleSeleccionarCapacitacion}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seleccionar capacitación" />
                    </SelectTrigger>
                    <SelectContent>
                      {capacitacionesDisponibles.map((cap) => (
                        <SelectItem key={cap.id} value={cap.id}>
                          {cap.codigo} - {cap.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Buscar persona</Label>
                  <Input
                    placeholder={SEARCH_ANY_PLACEHOLDER}
                    value={filtroUsuarios}
                    onChange={(e) => setFiltroUsuarios(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex flex-col justify-end gap-2">
                  <Badge className="w-fit bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                    {seleccionados} personas seleccionadas
                  </Badge>
                  <Button
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl"
                    onClick={guardarAsistenciaMasiva}
                    disabled={!capacitacionSeleccionadaId || savingRegistro || loadingRegistro}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingRegistro ? "Guardando..." : "Guardar asistencias"}
                  </Button>
                </div>
              </div>

              {capacitacionSeleccionadaId ? (
                <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allVisiblesSelected}
                        onCheckedChange={(checked) => seleccionarTodosVisibles(Boolean(checked))}
                      />
                      <span className="text-sm font-medium text-[#374151]">Seleccionar visibles</span>
                    </div>
                    <span className="text-xs text-[#6B7280]">
                      {usuariosFiltrados.length} usuarios en la lista
                    </span>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow>
                          <TableHead className="w-[60px]">Sel.</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Asistió</TableHead>
                          <TableHead>Evaluación aprobada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingRegistro ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-[#6B7280]">
                              Cargando registros...
                            </TableCell>
                          </TableRow>
                        ) : usuariosFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-[#6B7280]">
                              No se encontraron usuarios
                            </TableCell>
                          </TableRow>
                        ) : (
                          usuariosFiltrados.map((usuario) => {
                            const registro = registrosAsistencia[usuario.id] || {
                              selected: false,
                              asistio: true,
                              evaluacionAprobada: false,
                            };

                            return (
                              <TableRow key={usuario.id} className="hover:bg-[#F5F7FA]">
                                <TableCell>
                                  <Checkbox
                                    checked={registro.selected}
                                    onCheckedChange={(checked) => toggleSeleccionUsuario(usuario.id, Boolean(checked))}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-[#111827]">
                                      {usuario.nombre} {usuario.primer_apellido}
                                    </span>
                                    <span className="text-xs text-[#6B7280]">
                                      {usuario.documento ? `CC ${usuario.documento} · ` : ""}
                                      {usuario.correo_electronico}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={registro.asistio}
                                    disabled={!registro.selected}
                                    onCheckedChange={(checked) =>
                                      updateRegistroUsuario(usuario.id, {
                                        asistio: checked,
                                        evaluacionAprobada: checked ? registro.evaluacionAprobada : false,
                                      })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={registro.evaluacionAprobada}
                                    disabled={!registro.selected || !registro.asistio}
                                    onCheckedChange={(checked) =>
                                      updateRegistroUsuario(usuario.id, {
                                        evaluacionAprobada: checked,
                                      })
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-sm text-[#6B7280]">
                  Selecciona una capacitación para registrar la asistencia de personas.
                </div>
              )}
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
              <h2 className="text-xl font-bold text-[#1E3A8A]">Registro de Asistencias</h2>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={cargarAsistencias}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredAsistencias.length} resultados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nombre</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Modalidad</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Duración</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Instructor</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Asistencia</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAsistencias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                        <div className="flex flex-col items-center">
                          <GraduationCap className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchTerm ? "No se encontraron asistencias" : "No hay asistencias registradas"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAsistencias.map((item) => (
                      <TableRow key={item.id} className="hover:bg-[#F5F3FF] transition-colors">
                        <TableCell className="px-6 py-4 font-bold">{item.nombre}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className={item.modalidad === "Virtual" ? "bg-[#E0EDFF] text-[#2563EB]" : "bg-[#F0FDF4] text-[#166534]"}>
                            {item.modalidad}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">
                          {item.fechaProgramada ? new Date(item.fechaProgramada).toLocaleDateString('es-CO') : 'N/A'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">
                          {item.duracionHoras ? `${item.duracionHoras}h` : 'N/A'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">{item.instructor || 'N/A'}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-[#ECFDF5] text-[#065F46] font-bold px-4 py-2">
                            {item.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {resumenesPorCapacitacion[item.id] ? (
                            <Badge className="bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                              {resumenesPorCapacitacion[item.id].porcentaje_asistencia.toFixed(1)}%
                            </Badge>
                          ) : (
                            <span className="text-[#9CA3AF] text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => openDialog(item)} className="rounded-xl">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ver detalles</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <VistaDocumentoSGCDialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) setAsistenciasVista([]);
            }}
            data={
              selectedCapacitacion
                ? datosSGCDesdeCapacitacion(selectedCapacitacion, {
                    resumen: selectedResumen,
                    asistencias: asistenciasVista,
                  })
                : null
            }
            title="Asistencia a capacitación"
            description="Documento controlado con el registro de asistencia, evaluación y cobertura de la capacitación."
            extraActions={
              <Button
                className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                onClick={handleDescargarCertificado}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar certificados
              </Button>
            }
          />

        </div>
      </TooltipProvider>
    </div>
  );
};

export default CapacitacionesAsistencia;
