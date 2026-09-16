import React, { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Calendar, User, Filter, Search, Edit, Trash2, Eye, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { objetivoCalidadService, ObjetivoCalidad } from '@/services/objetivoCalidad.service';
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { areaService, Area } from '@/services/area.service';
import { usuarioService, Usuario } from '@/services/usuario.service';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import { SeguimientoObjetivo } from '@/services/objetivoCalidad.service';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeObjetivoCalidad } from "@/utils/documentosRegistrosSGC";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

const ObjetivosActivos: React.FC = () => {
  const [objetivos, setObjetivos] = useState<ObjetivoCalidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalTipo, setModalTipo] = useState<'crear' | 'editar' | 'ver'>('crear');
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState<ObjetivoCalidad | null>(null);
  const codigoAutomatico = useCodigoAutomatico("objetivo", modalAbierto && modalTipo === "crear");

  useEffect(() => {
    if (modalTipo === "crear" && codigoAutomatico) {
      setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, modalTipo]);
  const [showDocumento, setShowDocumento] = useState(false);

  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [seguimientosMap, setSeguimientosMap] = useState<Record<string, SeguimientoObjetivo[]>>({});
  const [chartLoading, setChartLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    procesoId: '',
    areaId: '',
    responsableId: '',
    meta: '',
    indicadorId: '',
    valorMeta: '',
    periodoInicio: '',
    periodoFin: '',
    estado: 'planificado'
  });

  // Cargar objetivos
  useEffect(() => {
    cargarObjetivos();
    cargarListas();
  }, []);

  const cargarListas = async () => {
    try {
      const [areasData, usuariosData] = await Promise.all([
        areaService.getAll(),
        usuarioService.getAllActive()
      ]);
      setAreas(areasData);
      setUsuarios(usuariosData);
    } catch (error) {
      console.error('Error al cargar listas:', error);
      toast.error('Error al cargar datos auxiliares');
    }
  };

  const cargarObjetivos = async () => {
    setLoading(true);
    try {
      const data = await objetivoCalidadService.getActivos();
      setObjetivos(data);
      await cargarSeguimientosForObjetivos(data);
    } catch (error: any) {
      console.error('Error al cargar objetivos:', error);
      setError(error.message);
      setSeguimientosMap({});
    } finally {
      setLoading(false);
    }
  };

  const cargarSeguimientosForObjetivos = async (objetivosFuente: ObjetivoCalidad[]) => {
    try {
      setChartLoading(true);
      const map: Record<string, SeguimientoObjetivo[]> = {};
      await Promise.all(objetivosFuente.map(async (o) => {
        try {
          const segs = await objetivoCalidadService.getSeguimientos(o.id);
          map[o.id] = Array.isArray(segs) ? segs : [];
        } catch (err) {
          map[o.id] = [];
        }
      }));
      setSeguimientosMap(map);
    } catch (err) {
      console.error('Error cargando seguimientos para gráficos:', err);
    } finally {
      setChartLoading(false);
    }
  };

  // Filtrar objetivos
  const objetivosFiltrados = objetivos.filter(obj => {
    const cumpleBusqueda = matchesTextSearch(searchTerm, obj);
    const cumpleEstado = estadoFiltro === 'todos' || obj.estado === estadoFiltro;
    return cumpleBusqueda && cumpleEstado;
  });

  // Estadísticas
  const stats = {
    total: objetivos.length,
    enCurso: objetivos.filter(o => o.estado === 'en_curso').length,
    cumplidos: objetivos.filter(o => o.estado === 'cumplido').length,
    planificados: objetivos.filter(o => o.estado === 'planificado').length
  };

  // Handlers
  const abrirModal = (tipo: 'crear' | 'editar' | 'ver', objetivo?: ObjetivoCalidad) => {
    if (tipo === 'ver' && objetivo) {
      setObjetivoSeleccionado(objetivo);
      setShowDocumento(true);
      return;
    }
    setModalTipo(tipo);
    // Helper: convert datetime string to YYYY-MM-DD for date inputs
    const toDateInput = (val?: string) => {
      if (!val) return '';
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      // Full ISO datetime — extract date part
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    };

    if (objetivo) {
      setObjetivoSeleccionado(objetivo);
      setFormData({
        codigo: objetivo.codigo,
        descripcion: objetivo.descripcion || '',
        procesoId: objetivo.procesoId || '',
        areaId: objetivo.areaId || '',
        responsableId: objetivo.responsableId || '',
        meta: objetivo.meta || '',
        indicadorId: objetivo.indicadorId || '',
        valorMeta: objetivo.valorMeta?.toString() || '',
        periodoInicio: toDateInput(objetivo.periodoInicio),
        periodoFin: toDateInput(objetivo.periodoFin),
        estado: objetivo.estado || 'planificado'
      });
    } else {
      setObjetivoSeleccionado(null);
      setFormData({
        codigo: '',
        descripcion: '',
        procesoId: '',
        areaId: '',
        responsableId: '',
        meta: '',
        indicadorId: '',
        valorMeta: '',
        periodoInicio: '',
        periodoFin: '',
        estado: 'planificado'
      });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setObjetivoSeleccionado(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion || formData.descripcion.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres');
      return;
    }
    if (!formData.periodoInicio || !formData.periodoFin) {
      toast.error('Debe definir periodo de inicio y fin');
      return;
    }
    if (new Date(formData.periodoFin) <= new Date(formData.periodoInicio)) {
      toast.error('La fecha fin debe ser posterior a la fecha inicio');
      return;
    }
    if (!formData.areaId) {
      toast.error('Debe seleccionar un área');
      return;
    }
    if (!formData.responsableId) {
      toast.error('Debe seleccionar un responsable');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        codigo: formData.codigo,
        descripcion: formData.descripcion,
        areaId: formData.areaId,
        responsableId: formData.responsableId,
        periodoInicio: formData.periodoInicio,
        periodoFin: formData.periodoFin,
        estado: formData.estado,
        meta: formData.meta,
        indicadorId: formData.indicadorId,
        valorMeta: formData.valorMeta ? Number(formData.valorMeta) : undefined,
      };

      if (modalTipo === 'crear') {
        await objetivoCalidadService.create(payload);
        toast.success('Objetivo creado exitosamente');
      } else if (modalTipo === 'editar' && objetivoSeleccionado) {
        await objetivoCalidadService.update(objetivoSeleccionado.id, payload);
        toast.success('Objetivo actualizado exitosamente');
      }

      cerrarModal();
      cargarObjetivos();
    } catch (error: any) {
      console.error('Error al guardar objetivo:', error);
      // Extract meaningful error message from backend response
      const detail = error?.response?.data?.detail;
      let errorMsg = 'Error al guardar el objetivo';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join('; ');
      } else if (error?.message && typeof error.message === 'string') {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    const objetivo = objetivos.find((o) => o.id === id);
    const tieneSeguimientos = (seguimientosMap[id] || []).length > 0;
    const puedeEliminar = objetivo?.estado === 'cancelado' && !tieneSeguimientos;
    if (!puedeEliminar) {
      toast.error("Solo se pueden eliminar objetivos cancelados y sin seguimientos");
      return;
    }

    if (window.confirm('¿Está seguro de eliminar este objetivo?')) {
      try {
        await objetivoCalidadService.delete(id);
        toast.success('Objetivo eliminado exitosamente');
        cargarObjetivos();
      } catch (error: any) {
        console.error('Error al eliminar objetivo:', error);
        const detail = error?.response?.data?.detail;
        const message = typeof detail === 'string'
          ? detail
          : 'Error al eliminar el objetivo';
        toast.error(message);
      }
    }
  };

  const getEstadoBadge = (estado?: string) => {
    const badges = {
      planificado: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      en_curso: { bg: 'bg-blue-100', text: 'text-blue-700', icon: TrendingUp },
      cumplido: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      no_cumplido: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      cancelado: { bg: 'bg-gray-100', text: 'text-gray-500', icon: X }
    };
    const badge = badges[estado as keyof typeof badges] || badges.planificado;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {estado?.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const calcularProgreso = (objetivo: ObjetivoCalidad) => {
    if (objetivo.estado === 'cumplido') return 100;

    // Use the latest seguimiento's valorActual vs the objective's valorMeta
    const segs = seguimientosMap[objetivo.id] || [];
    if (segs.length > 0 && objetivo.valorMeta && Number(objetivo.valorMeta) > 0) {
      const sorted = [...segs].sort((a, b) =>
        new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
      );
      const last = sorted[0];
      const valorActual = Number(last.valorActual ?? 0);
      const valorMeta = Number(objetivo.valorMeta);
      return Math.min(Math.round((valorActual / valorMeta) * 100), 100);
    }

    // Fallback: time-based progress when no seguimientos with meta
    if (objetivo.estado === 'planificado') return 0;
    if (objetivo.estado === 'no_cumplido') return 0;

    const inicio = new Date(objetivo.periodoInicio || '');
    const fin = new Date(objetivo.periodoFin || '');
    const hoy = new Date();
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return 0;
    const total = fin.getTime() - inicio.getTime();
    const transcurrido = hoy.getTime() - inicio.getTime();
    return Math.min(Math.max(Math.round((transcurrido / total) * 100), 0), 100);
  };

  const getUltimoSeguimiento = (objetivoId: string) => {
    const segs = seguimientosMap[objetivoId] || [];
    if (segs.length === 0) return null;
    return [...segs].sort((a, b) =>
      new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
    )[0];
  };

  // Preparar data para gráfico de metas vs cumplimiento (usa último seguimiento si existe)
  const buildChartData = () => {
    const data = objetivos
      .filter(o => o.valorMeta !== undefined && o.valorMeta !== null)
      .map(o => {
        const segs = seguimientosMap[o.id] || [];
        const last = segs.slice().sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())[0];
        const cumplimiento = (() => {
          if (!last) return 0;
          const raw = (last as any).porcentajeCumplimiento;
          if (typeof raw === 'number') return raw;
          const valorActual = (last as any).valorActual ?? (last as any).valor_actual ?? 0;
          const valorMeta = o.valorMeta ?? (o as any).valor_meta ?? 0;
          if (valorMeta && valorActual != null) return (Number(valorActual) / Number(valorMeta)) * 100;
          return 0;
        })();
        return {
          name: o.codigo,
          meta: o.valorMeta,
          cumplimiento
        };
      });
    return data;
  };



  if (loading) {
    return <LoadingSpinner message="Cargando objetivos de calidad..." />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-8">

          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <Target className="h-9 w-9 text-[#2563EB]" />
                  Objetivos de Calidad
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">Gestión de objetivos de calidad según ISO 9001 - Cláusula 6.2</p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">{stats.total} objetivos</Badge>
                </div>
              </div>
              <Button onClick={() => abrirModal('crear')} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Objetivo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Objetivos</CardDescription>
                  <Target className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{stats.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Registrados en el sistema</div>
              </CardContent>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#9A3412]">En Curso</CardDescription>
                  <TrendingUp className="h-8 w-8 text-[#F97316]/70" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{stats.enCurso}</CardTitle>
              </CardHeader>
              <CardContent><div className="text-xs text-[#6B7280] font-medium mb-2">Objetivos actualmente activos</div></CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Cumplidos</CardDescription>
                  <CheckCircle className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{stats.cumplidos}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-[#F8FAFC] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Planificados</CardDescription>
                  <Clock className="h-8 w-8 text-[#1E3A8A]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{stats.planificados}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión de Objetivos</CardTitle>
              <CardDescription>Buenas prácticas para establecer y revisar objetivos</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold">1</div>
                  <div><span className="font-bold text-[#1E3A8A] block mb-1">Definir Meta</span><span className="text-[#6B7280]">Meta clara y medible.</span></div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold">2</div>
                  <div><span className="font-bold text-[#065F46] block mb-1">Asignar Responsable</span><span className="text-[#6B7280]">Responsable claro para seguimiento.</span></div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold">3</div>
                  <div><span className="font-bold text-[#9A3412] block mb-1">Revisar Progreso</span><span className="text-[#6B7280]">Revisión periódica y ajustes.</span></div>
                </div>
              </div>
            </CardContent>
          </Card>



          <Card className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Metas vs Cumplimiento</CardTitle>
              <CardDescription>Comparativa de valor meta vs último seguimiento</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {chartLoading ? (
                <div className="flex items-center justify-center py-8">Cargando gráfico...</div>
              ) : (
                (() => {
                  const data = buildChartData();
                  if (data.length === 0) return <div className="text-center text-gray-600 py-8">No hay metas registradas para mostrar.</div>
                  return (
                    <div className="w-full h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <ReTooltip />
                          <Legend />
                          <Bar dataKey="meta" name="Meta (%)" fill="#2563EB" />
                          <Bar dataKey="cumplimiento" name="Último Cumplimiento (%)" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()
              )}
            </CardContent>
          </Card>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              <Input placeholder={SEARCH_ANY_PLACEHOLDER} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 py-6 rounded-xl border-[#E5E7EB]" />
            </div>
          </div>

          {/* Lista de Objetivos */}
          <div className="space-y-4">
            {objetivosFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-12 text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron objetivos</h3>
                <p className="text-gray-600">No hay objetivos que coincidan con los filtros seleccionados.</p>
              </div>
            ) : (
              objetivosFiltrados.map((objetivo) => {
                const puedeEliminar = objetivo.estado === 'cancelado' && (seguimientosMap[objetivo.id] || []).length === 0;
                return (
                  <div key={objetivo.id} className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {objetivo.codigo}
                          </span>
                          {getEstadoBadge(objetivo.estado)}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {objetivo.descripcion}
                        </h3>
                        {objetivo.meta && (
                          <p className="text-sm text-gray-600 mb-3">
                            <strong>Meta:</strong> {objetivo.meta}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => abrirModal('ver', objetivo)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', objetivo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {puedeEliminar && (
                          <button
                            onClick={() => handleEliminar(objetivo.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    {(() => {
                      const ultimoSeg = getUltimoSeguimiento(objetivo.id);
                      const tieneProgreso = ultimoSeg !== null && objetivo.valorMeta && Number(objetivo.valorMeta) > 0;
                      const progreso = calcularProgreso(objetivo);
                      const esTemporal = !tieneProgreso && objetivo.estado === 'en_curso';
                      if (!tieneProgreso && objetivo.estado !== 'en_curso') return null;
                      return (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {tieneProgreso
                                ? <>
                                  Avance real
                                  <span className="ml-2 text-gray-400 text-xs">
                                    ({Number(ultimoSeg!.valorActual).toLocaleString()} / {Number(objetivo.valorMeta).toLocaleString()})
                                  </span>
                                </>
                                : 'Progreso temporal'
                              }
                            </span>
                            <span className={`font-bold ${progreso >= 80 ? 'text-green-600' : progreso >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {progreso}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${progreso >= 80 ? 'bg-green-500' : progreso >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                          {esTemporal && (
                            <p className="text-xs text-gray-400 mt-1">Basado en tiempo transcurrido. Registra un avance para ver el progreso real.</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Info adicional */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {objetivo.area && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Target className="w-4 h-4" />
                          <span><strong>Área:</strong> {objetivo.area.nombre}</span>
                        </div>
                      )}
                      {objetivo.responsable && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span><strong>Responsable:</strong> {objetivo.responsable.nombre}</span>
                        </div>
                      )}
                      {objetivo.periodoFin && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span><strong>Vence:</strong> {new Date(objetivo.periodoFin).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <VistaDocumentoSGCDialog
            open={showDocumento}
            onOpenChange={setShowDocumento}
            data={
              objetivoSeleccionado
                ? datosSGCDesdeObjetivoCalidad(
                    objetivoSeleccionado,
                    seguimientosMap[objetivoSeleccionado.id] || [],
                  )
                : null
            }
            title="Objetivo de calidad"
            description="Documento controlado con la meta, el periodo y el seguimiento del objetivo."
            extraActions={
              objetivoSeleccionado ? (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setShowDocumento(false);
                    abrirModal("editar", objetivoSeleccionado);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : null
            }
          />

          {/* Modal */}
          {modalAbierto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {modalTipo === 'crear' && 'Nuevo Objetivo de Calidad'}
                    {modalTipo === 'editar' && 'Editar Objetivo de Calidad'}
                    {modalTipo === 'ver' && 'Detalles del Objetivo'}
                  </h2>
                  <button
                    onClick={cerrarModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <CampoCodigoAutomatico native value={formData.codigo} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado *
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={modalTipo === 'ver'}
                      >
                        <option value="planificado">Planificado</option>
                        <option value="en_curso">En Curso</option>
                        <option value="cumplido">Cumplido</option>
                        <option value="no_cumplido">No Cumplido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción *
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Descripción del objetivo de calidad"
                      required
                      disabled={modalTipo === 'ver'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta
                    </label>
                    <textarea
                      value={formData.meta}
                      onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Meta específica a alcanzar"
                      disabled={modalTipo === 'ver'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Meta
                      </label>
                      <input
                        type="number"
                        value={formData.valorMeta}
                        onChange={(e) => setFormData({ ...formData, valorMeta: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="90"
                        disabled={modalTipo === 'ver'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Indicador (KPI)
                      </label>
                      <input
                        type="text"
                        value={formData.indicadorId}
                        onChange={(e) => setFormData({ ...formData, indicadorId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: % Satisfacción del cliente"
                        disabled={modalTipo === 'ver'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Periodo Inicio
                      </label>
                      <input
                        type="date"
                        value={formData.periodoInicio}
                        onChange={(e) => setFormData({ ...formData, periodoInicio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={modalTipo === 'ver'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Periodo Fin
                      </label>
                      <input
                        type="date"
                        value={formData.periodoFin}
                        onChange={(e) => setFormData({ ...formData, periodoFin: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={modalTipo === 'ver'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Área
                      </label>
                      <select
                        value={formData.areaId}
                        onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={modalTipo === 'ver'}
                      >
                        <option value="">Seleccionar área</option>
                        {areas.map(area => (
                          <option key={area.id} value={area.id}>{area.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsable
                      </label>
                      <select
                        value={formData.responsableId}
                        onChange={(e) => setFormData({ ...formData, responsableId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={modalTipo === 'ver'}
                      >
                        <option value="">Seleccionar responsable</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{`${u.nombre} ${u.primer_apellido}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {modalTipo !== 'ver' && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={cerrarModal}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {modalTipo === 'crear' ? 'Crear' : 'Actualizar'} Objetivo
                      </button>
                    </div>
                  )}
                  {modalTipo === 'ver' && (
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={cerrarModal}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default ObjetivosActivos;
