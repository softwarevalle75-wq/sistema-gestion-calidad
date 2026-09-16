import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { indicadorService, Indicador, TendenciaIndicador, MedicionIndicador } from "@/services/indicador.service";
import { procesoService, Proceso } from "@/services/proceso.service";
import { usuarioService, Usuario } from "@/services/usuario.service";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeIndicador } from "@/utils/documentosRegistrosSGC";
import { nombreUsuarioSGC } from "@/utils/documentoSGC";
import { getCurrentUser } from "@/services/auth";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";
import DashboardPHVA from "@/components/dashboard/DashboardPHVA";
import { dashboardPhvaService, DashboardPHVAMetrics } from "@/services/dashboardPhva.service";
import { analyticsService, HumanRiskMetrics } from "@/services/analytics";

// ========================
// Componentes auxiliares
// ========================

const TENDENCIA_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  creciente: { icon: TrendingUp, color: "text-green-700", bg: "bg-green-100", label: "Creciente" },
  decreciente: { icon: TrendingDown, color: "text-red-700", bg: "bg-red-100", label: "Decreciente" },
  estable: { icon: Minus, color: "text-blue-700", bg: "bg-blue-100", label: "Estable" },
  sin_datos: { icon: Activity, color: "text-gray-500", bg: "bg-gray-100", label: "Sin datos" },
};

function SemaforoMeta({ valor, meta }: { valor: number | null; meta: number | null }) {
  if (valor == null || meta == null) {
    return <div className="h-3 w-3 rounded-full bg-gray-300" />;
  }
  const pct = meta > 0 ? (valor / meta) * 100 : 0;
  if (pct >= 100) return <span title={`${pct.toFixed(0)}% cumplido`}><CheckCircle2 className="h-5 w-5 text-green-500" /></span>;
  if (pct >= 80) return <span title={`${pct.toFixed(0)}% cumplido`}><AlertTriangle className="h-5 w-5 text-yellow-500" /></span>;
  return <span title={`${pct.toFixed(0)}% cumplido`}><XCircle className="h-5 w-5 text-red-500" /></span>;
}

function BarraProgreso({ valor, meta }: { valor: number | null; meta: number | null }) {
  const pct = valor != null && meta != null && meta > 0 ? Math.min((valor / meta) * 100, 120) : 0;
  const color = pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-yellow-500" : pct >= 50 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ========================
// Componente principal
// ========================

export default function TableroIndicadores() {
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [usuariosActivos, setUsuariosActivos] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProcesos, setLoadingProcesos] = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Indicador | null>(null);
  const [form, setForm] = useState<Partial<Indicador>>({});
  const codigoAutomatico = useCodigoAutomatico(
    "indicador",
    showDialog && dialogMode === "create",
    { tipo: form.tipo_indicador || "eficacia" },
  );

  useEffect(() => {
    if (dialogMode === "create" && codigoAutomatico) {
      setForm((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, dialogMode]);
  const [showDocumento, setShowDocumento] = useState(false);
  const [showMedicion, setShowMedicion] = useState(false);
  const [medicionesMap, setMedicionesMap] = useState<Record<string, MedicionIndicador[]>>({});
  const [medicionForm, setMedicionForm] = useState({ periodo: "", valor: "", observaciones: "" });

  // Dialogs de confirmación
  const [indicadorAEliminar, setIndicadorAEliminar] = useState<Indicador | null>(null);
  const [indicadorAAprobar, setIndicadorAAprobar] = useState<Indicador | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Tendencias + PHVA
  const [tendencias, setTendencias] = useState<Record<string, TendenciaIndicador>>({});
  const [phvaMetrics, setPhvaMetrics] = useState<DashboardPHVAMetrics | null>(null);
  const [humanRiskMetrics, setHumanRiskMetrics] = useState<HumanRiskMetrics | null>(null);

  useEffect(() => {
    fetchIndicadores();
    fetchComplementosTablero();
    fetchProcesos();
    fetchUsuariosActivos();
  }, []);

  const fetchIndicadores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await indicadorService.getAll();
      setIndicadores(data);

      const tendenciasResp = await Promise.all(
        data.slice(0, 30).map(async (indicador) => {
          try {
            const tendencia = await indicadorService.getTendencia(indicador.id);
            return [indicador.id, tendencia] as const;
          } catch {
            return [indicador.id, {
              indicador_id: indicador.id,
              total_mediciones: 0,
              promedio: 0,
              ultimo_valor: null,
              ultimo_periodo: null,
              tendencia: "sin_datos",
            }] as const;
          }
        })
      );
      setTendencias(Object.fromEntries(tendenciasResp));
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.message);
      setIndicadores([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplementosTablero = async () => {
    try {
      const metrics = await dashboardPhvaService.getMetrics();
      setPhvaMetrics(metrics);
    } catch {
      setPhvaMetrics(null);
    }
    try {
      const human = await analyticsService.getHumanRiskMetrics();
      setHumanRiskMetrics(human);
    } catch {
      setHumanRiskMetrics(null);
    }
  };

  const fetchProcesos = async () => {
    try {
      setLoadingProcesos(true);
      const data = await procesoService.listar();
      setProcesos(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error al cargar procesos:", error);
      setProcesos([]);
    } finally {
      setLoadingProcesos(false);
    }
  };

  const fetchUsuariosActivos = async () => {
    try {
      setLoadingUsuarios(true);
      const data = await usuarioService.getAllActive();
      setUsuariosActivos(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error al cargar usuarios activos:", error);
      setUsuariosActivos([]);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelected(null);
    setForm({
      codigo: '',
      nombre: '',
      descripcion: '',
      formula: '',
      unidad_medida: '',
      meta: undefined,
      frecuencia_medicion: 'mensual',
      tipo_indicador: 'eficacia',
      responsable_medicion_id: undefined,
      proceso_id: procesos[0]?.id || '',
      activo: true
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (indicador: Indicador) => {
    setDialogMode('edit');
    setSelected(indicador);
    setForm({
      codigo: indicador.codigo,
      nombre: indicador.nombre,
      descripcion: indicador.descripcion || '',
      formula: indicador.formula || '',
      unidad_medida: indicador.unidad_medida || '',
      meta: indicador.meta,
      frecuencia_medicion: indicador.frecuencia_medicion || 'mensual',
      tipo_indicador: (indicador.tipo_indicador as any) || 'eficacia',
      responsable_medicion_id: indicador.responsable_medicion_id,
      proceso_id: indicador.proceso_id,
      activo: indicador.activo
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (!form.codigo || !form.nombre || !form.proceso_id) {
        toast.error("Código, nombre y proceso son obligatorios");
        return;
      }

      const payload: Partial<Indicador> = {
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        formula: form.formula || undefined,
        unidad_medida: form.unidad_medida || undefined,
        meta: form.meta !== undefined && form.meta !== null && String(form.meta) !== '' ? Number(form.meta) : undefined,
        frecuencia_medicion: form.frecuencia_medicion || 'mensual',
        tipo_indicador: form.tipo_indicador || 'eficacia',
        responsable_medicion_id: form.responsable_medicion_id || undefined,
        proceso_id: form.proceso_id,
        activo: form.activo !== undefined ? form.activo : true
      };

      if (dialogMode === 'create') {
        await indicadorService.create(payload);
        toast.success("Indicador creado exitosamente");
      } else if (selected) {
        await indicadorService.update(selected.id, payload);
        toast.success("Indicador actualizado exitosamente");
      }
      await fetchIndicadores();
      setShowDialog(false);
      setError(null);
    } catch (err: any) {
      console.error('Error completo:', err);
      toast.error(err?.response?.data?.detail || err.message || "Error al guardar indicador");
    }
  };

  const confirmarEliminar = async () => {
    if (!indicadorAEliminar) return;
    try {
      setActionLoading(true);
      await indicadorService.delete(indicadorAEliminar.id);
      toast.success(`Indicador ${indicadorAEliminar.codigo} eliminado correctamente`);
      setIndicadorAEliminar(null);
      await fetchIndicadores();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message || "Error al eliminar indicador");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirDocumento = async (indicador: Indicador) => {
    setSelected(indicador);
    setShowDocumento(true);
    if (!medicionesMap[indicador.id]) {
      try {
        const historial = await indicadorService.getMediciones(indicador.id);
        setMedicionesMap((prev) => ({ ...prev, [indicador.id]: historial }));
      } catch {
        setMedicionesMap((prev) => ({ ...prev, [indicador.id]: indicador.ultima_medicion ? [indicador.ultima_medicion] : [] }));
      }
    }
  };

  const abrirMedicion = (indicador: Indicador) => {
    const now = new Date();
    setSelected(indicador);
    setMedicionForm({
      periodo: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      valor: "",
      observaciones: "",
    });
    setShowMedicion(true);
  };

  const guardarMedicion = async () => {
    if (!selected) return;
    if (!medicionForm.periodo || medicionForm.valor === "") {
      toast.error("Periodo y valor son obligatorios");
      return;
    }
    try {
      await indicadorService.registrarMedicion(selected.id, {
        periodo: medicionForm.periodo,
        valor: Number(medicionForm.valor),
        observaciones: medicionForm.observaciones || undefined,
      });
      toast.success("Medición registrada exitosamente");
      setShowMedicion(false);
      await fetchIndicadores();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message);
    }
  };

  const handleAprobarClick = (indicador: Indicador) => {
    const me = getCurrentUser()?.id;
    if (me && indicador.creado_por && me === indicador.creado_por) {
      toast.error("Quien elabora el indicador no puede aprobarlo");
      return;
    }
    setIndicadorAAprobar(indicador);
  };

  const confirmarAprobar = async () => {
    if (!indicadorAAprobar) return;
    try {
      setActionLoading(true);
      await indicadorService.aprobar(indicadorAAprobar.id);
      toast.success(`Indicador ${indicadorAAprobar.codigo} aprobado exitosamente`);
      setIndicadorAAprobar(null);
      await fetchIndicadores();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message || "Error al aprobar indicador");
    } finally {
      setActionLoading(false);
    }
  };

  const solicitarAprobacion = async (indicador: Indicador) => {
    try {
      await indicadorService.solicitarAprobacion(indicador.id);
      toast.success(`Solicitud de aprobación para ${indicador.codigo} enviada`);
      await fetchIndicadores();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err.message || "Error al solicitar aprobación");
    }
  };

  // Estadísticas
  const totalIndicadores = indicadores.length;
  const indicadoresActivos = indicadores.filter(ind => ind.activo === true).length;
  const conMeta = indicadores.filter((i) => i.meta != null);
  const cumpliendo = conMeta.filter((i) => {
    const t = tendencias[i.id];
    return t?.ultimo_valor != null && i.meta != null && t.ultimo_valor >= i.meta;
  }).length;
  const pctCumplimiento = conMeta.length > 0 ? Math.round((cumpliendo / conMeta.length) * 100) : 0;

  const getValorBadge = (valor: number) => {
    if (valor >= 90) return <Badge className="bg-green-500">Excelente</Badge>;
    if (valor >= 70) return <Badge className="bg-blue-500">Bueno</Badge>;
    if (valor >= 50) return <Badge className="bg-amber-500">Regular</Badge>;
    return <Badge variant="destructive">Bajo</Badge>;
  };

  if (loading) {
    return <LoadingSpinner message="Cargando indicadores..." />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <BarChart3 className="h-9 w-9 text-[#2563EB]" />
                Tablero de Indicadores
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Seguimiento y medición — ISO 9001:2015 Cláusula 9.1
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-3 font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nuevo Indicador
            </button>
          </div>
        </div>

        {/* Riesgo humano certificable */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#FFF7ED] border border-[#FED7AA] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-[#9A3412]">Brechas abiertas</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#9A3412]">{humanRiskMetrics?.brechas_abiertas ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#FEF2F2] border border-[#FECACA] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-[#B91C1C]">Brechas críticas</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#B91C1C]">{humanRiskMetrics?.brechas_criticas ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#EFF6FF] border border-[#BFDBFE] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-[#1D4ED8]">Índice riesgo humano</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#1D4ED8]">
                {humanRiskMetrics ? `${humanRiskMetrics.indice_riesgo_humano}%` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#ECFDF5] border border-[#BBF7D0] shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="font-bold text-[#166534]">Cobertura competencias</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#166534]">
                {humanRiskMetrics ? `${humanRiskMetrics.cobertura_competencias}%` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {error && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                  <button className="text-sm underline mt-1" onClick={fetchIndicadores}>
                    Intentar nuevamente
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total</CardDescription>
                <BarChart3 className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalIndicadores}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">Indicadores registrados</div>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Activos</CardDescription>
                <Target className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{indicadoresActivos}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                <div
                  className="bg-[#10B981] h-2 rounded-full transition-all"
                  style={{ width: `${totalIndicadores === 0 ? 0 : Math.round((indicadoresActivos / totalIndicadores) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#DBEAFE] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Cumpliendo meta</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">
                {cumpliendo}<span className="text-lg text-gray-400 ml-1">/ {conMeta.length}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-white border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-gray-600">% Cumplimiento</CardDescription>
              </div>
              <CardTitle className={`text-4xl font-bold ${pctCumplimiento >= 80 ? "text-green-600" : pctCumplimiento >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                {pctCumplimiento}%
              </CardTitle>
            </CardHeader>
            <div
              className={`absolute bottom-0 left-0 h-1.5 transition-all duration-700 ${pctCumplimiento >= 80 ? "bg-green-500" : pctCumplimiento >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${pctCumplimiento}%` }}
            />
          </Card>
        </div>

        {/* Tabs: Gestión + Tendencias + PHVA */}
        <Card className="rounded-2xl shadow-sm border-[#E5E7EB]">
          <CardContent className="pt-6">
            <Tabs defaultValue="gestion" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto mb-4">
                <TabsTrigger value="gestion">Gestión de Indicadores</TabsTrigger>
                <TabsTrigger value="tendencias">Tendencias y Semáforos</TabsTrigger>
                <TabsTrigger value="phva">Ciclo PHVA</TabsTrigger>
              </TabsList>

              {/* Tab: Gestión CRUD */}
              <TabsContent value="gestion">
                <div className="border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 font-semibold text-gray-600">Código</th>
                          <th className="text-left p-3 font-semibold text-gray-600">Nombre</th>
                          <th className="text-left p-3 font-semibold text-gray-600">Tipo</th>
                          <th className="text-left p-3 font-semibold text-gray-600 w-28">Meta</th>
                          <th className="text-left p-3 font-semibold text-gray-600 w-28">Último valor</th>
                          <th className="text-left p-3 font-semibold text-gray-600">Aprobación</th>
                          <th className="text-right p-3 font-semibold text-gray-600 w-56">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicadores.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center p-12 text-gray-400">
                              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                              <p className="font-medium">Sin indicadores registrados</p>
                              <button
                                onClick={handleOpenCreate}
                                className="mt-3 text-sm text-blue-600 underline"
                              >
                                Crear primer indicador
                              </button>
                            </td>
                          </tr>
                        ) : (
                          indicadores.map((indicador) => {
                            const estado = (indicador.estado || "borrador").toLowerCase();
                            const ultimo = indicador.ultima_medicion?.valor;
                            return (
                            <tr key={indicador.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-3 font-mono text-xs text-indigo-600 font-medium">{indicador.codigo}</td>
                              <td className="p-3 font-medium text-gray-900">{indicador.nombre}</td>
                              <td className="p-3 text-sm capitalize text-gray-600">{indicador.tipo_indicador || "—"}</td>
                              <td className="p-3">
                                <span className="text-lg font-bold tabular-nums">
                                  {indicador.meta !== null && indicador.meta !== undefined ? Number(indicador.meta).toFixed(1) : "N/A"}
                                </span>
                              </td>
                              <td className="p-3">
                                {ultimo != null
                                  ? getValorBadge(Number(indicador.meta != null && Number(indicador.meta) > 0 ? (Number(ultimo) / Number(indicador.meta)) * 100 : ultimo))
                                  : <Badge variant="outline">Sin medición</Badge>
                                }
                              </td>
                              <td className="p-3">
                                {estado === "aprobado" ? (
                                  <div>
                                    <Badge className="bg-emerald-600">Aprobado</Badge>
                                    <div className="text-xs text-gray-500 mt-1">{nombreUsuarioSGC(indicador.aprobador, "Sin registro")}</div>
                                  </div>
                                ) : estado === "pendiente_aprobacion" ? (
                                  <Badge className="bg-amber-500">Pendiente</Badge>
                                ) : estado === "rechazado" ? (
                                  <Badge className="bg-red-600">Rechazado</Badge>
                                ) : (
                                  <Badge className="bg-gray-500">Sin aprobar</Badge>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end flex-wrap gap-2">
                                  <button
                                    onClick={() => abrirDocumento(indicador)}
                                    className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5 inline mr-1" /> Ver
                                  </button>
                                  <button
                                    onClick={() => abrirMedicion(indicador)}
                                    className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Medir
                                  </button>
                                  {estado !== "aprobado" && estado !== "pendiente_aprobacion" && (
                                    <button
                                      onClick={() => solicitarAprobacion(indicador)}
                                      className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                      Solicitar
                                    </button>
                                  )}
                                  {estado !== "aprobado" && (
                                    <button
                                      onClick={() => handleAprobarClick(indicador)}
                                      className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                      Aprobar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEdit(indicador)}
                                    className="text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    <Edit className="h-3.5 w-3.5 inline mr-1" /> Editar
                                  </button>
                                  <button
                                    onClick={() => setIndicadorAEliminar(indicador)}
                                    className="text-sm bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Tendencias y semáforos */}
              <TabsContent value="tendencias">
                <div className="border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 font-semibold text-gray-600">Código</th>
                          <th className="text-left p-3 font-semibold text-gray-600">Indicador</th>
                          <th className="text-center p-3 font-semibold text-gray-600">Meta</th>
                          <th className="text-center p-3 font-semibold text-gray-600">Último valor</th>
                          <th className="text-left p-3 font-semibold text-gray-600 w-40">Progreso</th>
                          <th className="text-center p-3 font-semibold text-gray-600">Semáforo</th>
                          <th className="text-center p-3 font-semibold text-gray-600">Período</th>
                          <th className="text-center p-3 font-semibold text-gray-600">Tendencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicadores.map((indicador) => {
                          const t = tendencias[indicador.id];
                          const tendenciaKey = t?.tendencia || "sin_datos";
                          const tConfig = TENDENCIA_CONFIG[tendenciaKey] || TENDENCIA_CONFIG.sin_datos;
                          const TIcon = tConfig.icon;

                          return (
                            <tr key={indicador.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-3 font-mono text-xs text-indigo-600 font-medium">{indicador.codigo}</td>
                              <td className="p-3 font-medium text-gray-900">{indicador.nombre}</td>
                              <td className="p-3 text-center text-gray-600 tabular-nums">
                                {indicador.meta != null ? Number(indicador.meta).toFixed(1) : "—"}
                              </td>
                              <td className="p-3 text-center font-semibold text-gray-900 tabular-nums">
                                {t?.ultimo_valor != null ? Number(t.ultimo_valor).toFixed(1) : "—"}
                              </td>
                              <td className="p-3">
                                <BarraProgreso valor={t?.ultimo_valor ?? null} meta={indicador.meta ?? null} />
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex justify-center">
                                  <SemaforoMeta valor={t?.ultimo_valor ?? null} meta={indicador.meta ?? null} />
                                </div>
                              </td>
                              <td className="p-3 text-center text-xs text-gray-500">{t?.ultimo_periodo || "—"}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={`${tConfig.bg} ${tConfig.color} gap-1 text-xs`}>
                                  <TIcon className="h-3 w-3" />
                                  {tConfig.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                        {indicadores.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-12 text-center text-gray-400">
                              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                              <p className="font-medium">Sin indicadores registrados</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: PHVA */}
              <TabsContent value="phva">
                <DashboardPHVA metrics={phvaMetrics} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialog crear/editar */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1E3A8A]">
                {dialogMode === 'create' ? 'Nuevo Indicador' : 'Editar Indicador'}
              </h3>
              <button onClick={() => { setShowDialog(false); setError(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <CampoCodigoAutomatico native value={form?.codigo || ""} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="Ej: Satisfacción del cliente"
                  value={form?.nombre || ''}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proceso <span className="text-red-500">*</span>
                </label>
                <select
                  value={form?.proceso_id || ''}
                  onChange={(e) => setForm({ ...form, proceso_id: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingProcesos}
                >
                  <option value="">
                    {loadingProcesos
                      ? 'Cargando procesos...'
                      : procesos.length === 0
                        ? 'No hay procesos disponibles'
                        : 'Seleccione un proceso...'}
                  </option>
                  {procesos.map((proceso) => (
                    <option key={proceso.id} value={proceso.id}>
                      {proceso.codigo} - {proceso.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  placeholder="Descripción del indicador"
                  value={form?.descripcion || ''}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fórmula</label>
                <textarea
                  placeholder="Ej: (Pedidos a tiempo / Pedidos totales) * 100"
                  value={form?.formula || ''}
                  onChange={(e) => setForm({ ...form, formula: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta (%)</label>
                <input
                  placeholder="Ej: 85"
                  type="number"
                  value={form?.meta ?? ''}
                  onChange={(e) => setForm({ ...form, meta: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
                <input
                  placeholder="Ej: porcentaje"
                  value={form?.unidad_medida || ''}
                  onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de indicador</label>
                <select
                  value={form?.tipo_indicador || 'eficacia'}
                  onChange={(e) => setForm({ ...form, tipo_indicador: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="eficacia">Eficacia</option>
                  <option value="eficiencia">Eficiencia</option>
                  <option value="cumplimiento">Cumplimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de medición</label>
                <select
                  value={form?.frecuencia_medicion || 'mensual'}
                  onChange={(e) => setForm({ ...form, frecuencia_medicion: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable de medición</label>
                <select
                  value={form?.responsable_medicion_id || ''}
                  onChange={(e) => setForm({ ...form, responsable_medicion_id: e.target.value || undefined })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingUsuarios}
                >
                  <option value="">
                    {loadingUsuarios ? 'Cargando usuarios...' : 'Sin responsable asignado'}
                  </option>
                  {usuariosActivos.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} {usuario.primer_apellido}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowDialog(false); setError(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 font-medium transition-colors"
                disabled={!form?.nombre || !form?.proceso_id}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <VistaDocumentoSGCDialog
        open={showDocumento}
        onOpenChange={(open) => {
          setShowDocumento(open);
          if (!open) setSelected(null);
        }}
        data={
          selected
            ? datosSGCDesdeIndicador(selected, medicionesMap[selected.id] || [])
            : null
        }
        title="Indicador del SGC"
        description="Documento controlado con elaboración, medición y aprobación del indicador."
      />

      {showMedicion && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-[#1E3A8A] mb-1">Registrar medición</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.codigo} · {selected.nombre}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                <input
                  value={medicionForm.periodo}
                  onChange={(e) => setMedicionForm({ ...medicionForm, periodo: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="2026-09"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  value={medicionForm.valor}
                  onChange={(e) => setMedicionForm({ ...medicionForm, valor: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={medicionForm.observaciones}
                  onChange={(e) => setMedicionForm({ ...medicionForm, observaciones: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowMedicion(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={guardarMedicion} className="px-6 py-2 bg-[#2563EB] text-white rounded-lg">Registrar</button>
            </div>
          </div>
        </div>
      )}
      {/* Dialog Confirmar Eliminación */}
      <AlertDialog open={!!indicadorAEliminar} onOpenChange={(open) => !open && setIndicadorAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1E3A8A]">
              ¿Eliminar el indicador {indicadorAEliminar?.codigo}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Esta acción no se puede deshacer. Se eliminará permanentemente el indicador{" "}
              <strong>"{indicadorAEliminar?.nombre}"</strong> y todo su historial de mediciones asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Confirmar Aprobación */}
      <AlertDialog open={!!indicadorAAprobar} onOpenChange={(open) => !open && setIndicadorAAprobar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1E3A8A]">
              ¿Aprobar el indicador {indicadorAAprobar?.codigo}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              El indicador <strong>"{indicadorAAprobar?.nombre}"</strong> pasará al estado{" "}
              <span className="text-emerald-700 font-semibold">Aprobado</span> con registro formal de trazabilidad para el Sistema de Gestión de Calidad (ISO 9001).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAprobar}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? "Aprobando..." : "Aprobar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
