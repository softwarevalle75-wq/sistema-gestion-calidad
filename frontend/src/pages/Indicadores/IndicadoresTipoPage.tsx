import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  FileCheck,
  Plus,
  Activity,
  Shield,
  Target,
  Zap,
  XCircle,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeIndicador } from "@/utils/documentosRegistrosSGC";
import { nombreUsuarioSGC } from "@/utils/documentoSGC";
import {
  indicadorService,
  type Indicador,
  type MedicionIndicador,
  type TipoIndicador,
} from "@/services/indicador.service";
import { procesoService, type Proceso } from "@/services/proceso.service";
import { usuarioService, type Usuario } from "@/services/usuario.service";
import { getCurrentUser } from "@/services/auth";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

function mensajeError(err: unknown): string {
  const anyErr = err as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = anyErr?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item: { msg?: string }) => item.msg || String(item)).join(", ");
  }
  return anyErr?.message || "Ocurrió un error";
}

function periodoActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function resultadoMedicion(indicador: Indicador): "cumple" | "no_cumple" | "sin_medicion" {
  const ultima = indicador.ultima_medicion;
  if (!ultima || ultima.valor == null) return "sin_medicion";
  if (ultima.cumple_meta === true) return "cumple";
  if (ultima.cumple_meta === false) return "no_cumple";
  if (indicador.meta != null) {
    return Number(ultima.valor) >= Number(indicador.meta) ? "cumple" : "no_cumple";
  }
  return "sin_medicion";
}

type ConfigTipo = {
  title: string;
  subtitle: string;
  icon: ElementType;
  valorLabel: string;
  guideTitle: string;
  guideItems: [string, string, string][];
  footerTitle: string;
  footerText: string;
  footerClass: string;
};

const CONFIG: Record<TipoIndicador, ConfigTipo> = {
  eficacia: {
    title: "Eficacia",
    subtitle: "Mida qué tan bien logra sus objetivos",
    icon: Target,
    valorLabel: "Logro",
    guideTitle: "Buenas prácticas para definir y mantener indicadores de eficacia",
    guideItems: [
      ["#2563EB", "Definir Objetivo", "Establece la meta, la fórmula y el resultado esperado."],
      ["#10B981", "Medir con evidencia", "Registre el valor del periodo y deje rastro de quién lo midió."],
      ["#F97316", "Aprobar el resultado", "Otra persona revisa y aprueba. Así se sabe quién firmó y quién no."],
    ],
    footerTitle: "¿Qué mide la eficacia?",
    footerText:
      "Los indicadores de eficacia miden el grado en que se alcanzan los resultados planificados. Un proceso eficaz cumple su propósito y la meta definida.",
    footerClass: "border-blue-200 bg-blue-50 text-blue-900",
  },
  eficiencia: {
    title: "Eficiencia",
    subtitle: "Evalúe el uso óptimo de recursos",
    icon: Zap,
    valorLabel: "Valor",
    guideTitle: "Buenas prácticas para definir y mantener indicadores de eficiencia",
    guideItems: [
      ["#2563EB", "Definir Métrica", "Establece la fórmula, unidad y objetivo de eficiencia."],
      ["#10B981", "Frecuencia y Fuente", "Define cuándo se mide y desde qué sistemas se extraen los datos."],
      ["#F97316", "Analizar y Actuar", "Define umbrales, responsables y acciones cuando hay desviaciones."],
    ],
    footerTitle: "¿Qué mide la eficiencia?",
    footerText:
      "Los indicadores de eficiencia miden la relación entre los recursos utilizados y los resultados obtenidos. Un proceso eficiente maximiza la producción minimizando el uso de recursos (tiempo, dinero, materiales, personal).",
    footerClass: "border-blue-200 bg-blue-50 text-blue-900",
  },
  cumplimiento: {
    title: "Cumplimiento",
    subtitle: "Verifique adherencia a estándares y regulaciones",
    icon: Shield,
    valorLabel: "Cumplimiento",
    guideTitle: "Recomendaciones para definir, medir y usar indicadores de cumplimiento",
    guideItems: [
      ["#2563EB", "Definir Qué Se Mide", "Especifique la norma, requisito y el indicador asociado."],
      ["#10B981", "Periodicidad y Evidencia", "Defina frecuencia, registro requerido y fuente de verificación."],
      ["#F97316", "Acciones y Umbrales", "Establezca umbrales, responsables y acciones correctivas ante desviaciones."],
    ],
    footerTitle: "Importancia del Cumplimiento",
    footerText:
      "Los indicadores de cumplimiento verifican que la organización sigue las normativas, estándares y regulaciones aplicables (ISO 9001, leyes laborales, normas ambientales, etc.). Un alto cumplimiento reduce riesgos legales y mejora la reputación organizacional.",
    footerClass: "border-purple-200 bg-purple-50 text-purple-900",
  },
};

const EMPTY_FORM: Partial<Indicador> = {
  frecuencia_medicion: "mensual",
  activo: true,
};

export default function IndicadoresTipoPage({ tipo }: { tipo: TipoIndicador }) {
  const cfg = CONFIG[tipo];
  const Icon = cfg.icon;
  const currentUserId = getCurrentUser()?.id;

  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [medicionesMap, setMedicionesMap] = useState<Record<string, MedicionIndicador[]>>({});
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Indicador | null>(null);
  const [showDocumento, setShowDocumento] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<Partial<Indicador>>({ ...EMPTY_FORM, tipo_indicador: tipo });
  const [showMedicion, setShowMedicion] = useState(false);
  const [medicionForm, setMedicionForm] = useState({ periodo: periodoActual(), valor: "", observaciones: "" });
  const [showRechazo, setShowRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [saving, setSaving] = useState(false);
  const codigoAutomatico = useCodigoAutomatico("indicador", showForm && formMode === "create", { tipo });

  useEffect(() => {
    if (formMode === "create" && codigoAutomatico) {
      setForm((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, formMode]);

  const cargar = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, procesosData, usuariosData] = await Promise.all([
        indicadorService.getAll({ tipo_indicador: tipo }),
        procesoService.listar().catch(() => []),
        usuarioService.getAllActive().catch(() => []),
      ]);
      setIndicadores(data);
      setProcesos(procesosData);
      setUsuarios(usuariosData);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

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

  const abrirCrear = () => {
    setFormMode("create");
    setForm({ ...EMPTY_FORM, tipo_indicador: tipo });
    setSelected(null);
    setShowForm(true);
  };

  const abrirEditar = (indicador: Indicador) => {
    setFormMode("edit");
    setSelected(indicador);
    setForm({
      proceso_id: indicador.proceso_id,
      codigo: indicador.codigo,
      nombre: indicador.nombre,
      descripcion: indicador.descripcion,
      formula: indicador.formula,
      meta: indicador.meta,
      unidad_medida: indicador.unidad_medida,
      frecuencia_medicion: indicador.frecuencia_medicion,
      responsable_medicion_id: indicador.responsable_medicion_id,
      tipo_indicador: indicador.tipo_indicador || tipo,
      activo: indicador.activo,
    });
    setShowForm(true);
  };

  const guardarIndicador = async () => {
    if (!form.nombre || !form.proceso_id) {
      toast.error("Nombre y proceso son obligatorios");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        proceso_id: form.proceso_id,
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        formula: form.formula || null,
        unidad_medida: form.unidad_medida || null,
        meta: form.meta !== undefined && form.meta !== null && String(form.meta) !== "" ? Number(form.meta) : null,
        frecuencia_medicion: form.frecuencia_medicion || "mensual",
        responsable_medicion_id: form.responsable_medicion_id || null,
        tipo_indicador: tipo,
        activo: form.activo !== undefined ? form.activo : true,
      };
      if (formMode === "create") {
        await indicadorService.create(payload as Partial<Indicador>);
        toast.success("Indicador creado");
      } else if (selected) {
        await indicadorService.update(selected.id, payload as Partial<Indicador>);
        toast.success("Indicador actualizado");
      }
      setShowForm(false);
      await cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  const abrirMedicion = (indicador: Indicador) => {
    setSelected(indicador);
    setMedicionForm({ periodo: periodoActual(), valor: "", observaciones: "" });
    setShowMedicion(true);
  };

  const guardarMedicion = async () => {
    if (!selected) return;
    if (!medicionForm.periodo.trim() || medicionForm.valor === "") {
      toast.error("Periodo y valor son obligatorios");
      return;
    }
    try {
      setSaving(true);
      await indicadorService.registrarMedicion(selected.id, {
        periodo: medicionForm.periodo.trim(),
        valor: Number(medicionForm.valor),
        observaciones: medicionForm.observaciones || undefined,
      });
      toast.success("Medición registrada");
      setShowMedicion(false);
      await cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  const [indicadorAAprobar, setIndicadorAAprobar] = useState<Indicador | null>(null);

  const solicitarAprobacion = async (indicador: Indicador) => {
    try {
      await indicadorService.solicitarAprobacion(indicador.id);
      toast.success("Solicitud de aprobación enviada exitosamente");
      await cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const handleAprobarClick = (indicador: Indicador) => {
    if (currentUserId && indicador.creado_por && currentUserId === indicador.creado_por) {
      toast.error("Quien elabora el indicador no puede aprobarlo");
      return;
    }
    setIndicadorAAprobar(indicador);
  };

  const confirmarAprobar = async () => {
    if (!indicadorAAprobar) return;
    try {
      setSaving(true);
      await indicadorService.aprobar(indicadorAAprobar.id);
      toast.success(`Indicador ${indicadorAAprobar.codigo} aprobado exitosamente`);
      setIndicadorAAprobar(null);
      await cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  const abrirRechazo = (indicador: Indicador) => {
    setSelected(indicador);
    setMotivoRechazo("");
    setShowRechazo(true);
  };

  const rechazar = async () => {
    if (!selected) return;
    if (!motivoRechazo.trim()) {
      toast.error("Indique el motivo del rechazo");
      return;
    }
    try {
      setSaving(true);
      await indicadorService.rechazar(selected.id, motivoRechazo.trim());
      toast.success("Indicador rechazado");
      setShowRechazo(false);
      await cargar();
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = indicadores.length;
    const activos = indicadores.filter((i) => i.activo).length;
    const cumplen = indicadores.filter((i) => resultadoMedicion(i) === "cumple").length;
    const noCumplen = indicadores.filter((i) => resultadoMedicion(i) === "no_cumple").length;
    const sinMedicion = indicadores.filter((i) => resultadoMedicion(i) === "sin_medicion").length;
    const pendientesAprobacion = indicadores.filter((i) => (i.estado || "borrador") !== "aprobado").length;
    return { total, activos, cumplen, noCumplen, sinMedicion, pendientesAprobacion };
  }, [indicadores]);

  if (loading) {
    return <LoadingSpinner message={`Cargando indicadores de ${cfg.title.toLowerCase()}...`} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Icon className="h-9 w-9 text-[#2563EB]" />
                {cfg.title}
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">{cfg.subtitle}</p>
            </div>
            <Button
              onClick={abrirCrear}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-3 font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo indicador
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Error de conexión</p>
                  <p className="text-sm">{error}</p>
                  <button className="text-sm underline mt-1 inline-block" onClick={cargar}>
                    Intentar nuevamente
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total Indicadores</CardDescription>
                <Activity className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">Indicadores de {cfg.title.toLowerCase()}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Cumplen meta</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{stats.cumplen}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium mb-2">Según última medición</div>
              <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                <div
                  className="bg-[#10B981] h-3 rounded-full"
                  style={{ width: `${stats.total === 0 ? 0 : Math.round((stats.cumplen / stats.total) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Sin medición</CardDescription>
                <AlertCircle className="h-8 w-8 text-[#F97316]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{stats.sinMedicion}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">Revisar</Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#991B1B]">Sin aprobar</CardDescription>
                <FileCheck className="h-8 w-8 text-[#EF4444]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#991B1B]">{stats.pendientesAprobacion}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                {stats.noCumplen} fuera de meta
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Guía de Indicadores</CardTitle>
            <CardDescription>{cfg.guideTitle}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              {cfg.guideItems.map((item, index) => (
                <div key={item[1]} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#E5E7EB]">
                  <div
                    className="h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: item[0] }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">{item[1]}</span>
                    <span className="text-[#6B7280]">{item[2]}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores de {cfg.title}</CardTitle>
            <CardDescription>
              Trazabilidad de elaboración, medición y aprobación. El resultado sale de la última medición, no de un estado fijo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-[#F8FAFC]">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Código</th>
                      <th className="text-left p-3 text-sm font-medium">Indicador</th>
                      <th className="text-left p-3 text-sm font-medium w-28">{cfg.valorLabel}</th>
                      <th className="text-left p-3 text-sm font-medium w-36">Resultado</th>
                      <th className="text-left p-3 text-sm font-medium">Elaboró</th>
                      <th className="text-left p-3 text-sm font-medium">Aprobación</th>
                      <th className="text-right p-3 text-sm font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicadores.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-12 text-gray-500">
                          No hay indicadores de {cfg.title.toLowerCase()} registrados
                        </td>
                      </tr>
                    ) : (
                      indicadores.map((indicador) => {
                        const resultado = resultadoMedicion(indicador);
                        const estado = (indicador.estado || "borrador").toLowerCase();
                        const puedeAprobar = currentUserId !== indicador.creado_por;
                        return (
                          <tr key={indicador.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs font-semibold text-[#1E3A8A]">{indicador.codigo}</td>
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{indicador.nombre}</div>
                              <div className="text-xs text-gray-500">
                                {indicador.proceso?.nombre || "Sin proceso"} · {indicador.frecuencia_medicion}
                              </div>
                            </td>
                            <td className="p-3">
                              {indicador.ultima_medicion?.valor != null ? (
                                <span className="font-semibold tabular-nums">
                                  {Number(indicador.ultima_medicion.valor).toFixed(1)}
                                  {indicador.unidad_medida ? ` ${indicador.unidad_medida}` : ""}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">Sin dato</span>
                              )}
                              {indicador.meta != null && (
                                <div className="text-[11px] text-gray-500">Meta: {Number(indicador.meta).toFixed(1)}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {resultado === "cumple" && <Badge className="bg-green-600">Cumple</Badge>}
                              {resultado === "no_cumple" && <Badge className="bg-red-600">No cumple</Badge>}
                              {resultado === "sin_medicion" && <Badge className="bg-gray-500">Sin medición</Badge>}
                            </td>
                            <td className="p-3 text-sm text-gray-700">
                              {nombreUsuarioSGC(indicador.creador, "Sistema")}
                            </td>
                            <td className="p-3">
                              {estado === "aprobado" ? (
                                <div>
                                  <Badge className="bg-emerald-600 mb-1">Aprobado</Badge>
                                  <div className="text-xs text-gray-600">
                                    {nombreUsuarioSGC(indicador.aprobador, "Sin registro")}
                                  </div>
                                </div>
                              ) : estado === "rechazado" ? (
                                <div>
                                  <Badge className="bg-red-600 mb-1">Rechazado</Badge>
                                  <div className="text-xs text-gray-600">Sin aprobación vigente</div>
                                </div>
                              ) : estado === "pendiente_aprobacion" ? (
                                <Badge className="bg-amber-500">Pendiente de aprobación</Badge>
                              ) : (
                                <Badge className="bg-gray-500">Borrador · sin aprobar</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => abrirDocumento(indicador)}>
                                  <Eye className="h-4 w-4 mr-1" /> Ver
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => abrirMedicion(indicador)}>
                                  <Activity className="h-4 w-4 mr-1" /> Medir
                                </Button>
                                {estado !== "pendiente_aprobacion" && estado !== "aprobado" && (
                                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => solicitarAprobacion(indicador)}>
                                    Solicitar
                                  </Button>
                                )}
                                {estado !== "aprobado" && puedeAprobar && (
                                  <Button size="sm" className="rounded-lg bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => handleAprobarClick(indicador)}>
                                    Aprobar
                                  </Button>
                                )}
                                {(estado === "pendiente_aprobacion" || estado === "borrador") && puedeAprobar && (
                                  <Button variant="outline" size="sm" className="rounded-lg text-red-700 border-red-200" onClick={() => abrirRechazo(indicador)}>
                                    <XCircle className="h-4 w-4 mr-1" /> Rechazar
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => abrirEditar(indicador)}>
                                  Editar
                                </Button>
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
          </CardContent>
        </Card>

        <Card className={cfg.footerClass}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">{cfg.footerTitle}</h3>
                <p className="text-sm opacity-90">{cfg.footerText}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
        title={`Indicador de ${cfg.title}`}
        description="Documento controlado con elaboración, medición y aprobación del indicador."
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1E3A8A]">
                {formMode === "create" ? `Nuevo indicador de ${cfg.title.toLowerCase()}` : "Editar indicador"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <CampoCodigoAutomatico native value={form.codigo || ""} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Proceso *</label>
                <select
                  value={form.proceso_id || ""}
                  onChange={(e) => setForm({ ...form, proceso_id: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Seleccione un proceso...</option>
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
                  value={form.descripcion || ""}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta</label>
                <input
                  type="number"
                  value={form.meta ?? ""}
                  onChange={(e) => setForm({ ...form, meta: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <input
                  value={form.unidad_medida || ""}
                  onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="%, horas, ppm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                <select
                  value={form.frecuencia_medicion || "mensual"}
                  onChange={(e) => setForm({ ...form, frecuencia_medicion: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable de medición</label>
                <select
                  value={form.responsable_medicion_id || ""}
                  onChange={(e) => setForm({ ...form, responsable_medicion_id: e.target.value || undefined })}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Sin responsable asignado</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} {usuario.primer_apellido}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={guardarIndicador} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showMedicion && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-[#1E3A8A] mb-1">Registrar medición</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.codigo} · {selected.nombre}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo *</label>
                <input
                  value={medicionForm.periodo}
                  onChange={(e) => setMedicionForm({ ...medicionForm, periodo: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="2026-09 o 2026-Q3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
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
              <Button variant="outline" onClick={() => setShowMedicion(false)}>Cancelar</Button>
              <Button onClick={guardarMedicion} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                {saving ? "Guardando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRechazo && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-[#1E3A8A] mb-1">Rechazar indicador</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.codigo} · {selected.nombre}</p>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              className="w-full p-3 border rounded-lg"
              rows={4}
              placeholder="Motivo del rechazo"
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowRechazo(false)}>Cancelar</Button>
              <Button onClick={rechazar} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
                {saving ? "Guardando..." : "Rechazar"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAprobar}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Aprobando..." : "Aprobar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
