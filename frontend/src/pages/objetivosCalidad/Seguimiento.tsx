import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Eye, Search, RefreshCw, TrendingUp, Target,
  CheckCircle, Clock, Save, BarChart3
} from 'lucide-react';
import { objetivoCalidadService, ObjetivoCalidad, SeguimientoObjetivo } from '@/services/objetivoCalidad.service';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";
import { datosSGCDesdeObjetivoCalidad } from "@/utils/documentosRegistrosSGC";

interface Seguimiento extends SeguimientoObjetivo { }



const ObjetivosCalidad: React.FC = () => {
  const [objetivos, setObjetivos] = useState<ObjetivoCalidad[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);

  // Diálogos
  const [showObjetivoDialog, setShowObjetivoDialog] = useState(false);
  const [objetivoDialogMode, setObjetivoDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedObjetivo, setSelectedObjetivo] = useState<ObjetivoCalidad | null>(null);
  const [showDocumento, setShowDocumento] = useState(false);
  const codigoAutomatico = useCodigoAutomatico("objetivo", showObjetivoDialog && objetivoDialogMode === "create");

  useEffect(() => {
    if (objetivoDialogMode === "create" && codigoAutomatico) {
      setObjetivoForm((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, objetivoDialogMode]);

  const [showSeguimientoDialog, setShowSeguimientoDialog] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; objetivo: ObjetivoCalidad | null }>({
    open: false, objetivo: null
  });

  // Formularios
  const [objetivoForm, setObjetivoForm] = useState({
    codigo: '',
    descripcion: '',
    meta: '',
    valorMeta: '',
    periodoInicio: '',
    periodoFin: '',
    estado: 'planificado'
  });

  const [seguimientoForm, setSeguimientoForm] = useState({
    periodo: '',
    valorAlcanzado: '',
    observaciones: ''
  });

  const [savingObjetivo, setSavingObjetivo] = useState(false);
  const [savingSeguimiento, setSavingSeguimiento] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const objetivosData = await objetivoCalidadService.getAll();
      setObjetivos(objetivosData);

      const allSeguimientos: Seguimiento[] = [];
      for (const obj of objetivosData) {
        try {
          const segs = await objetivoCalidadService.getSeguimientos(obj.id);
          allSeguimientos.push(...segs);
        } catch (err) {
          console.error(`Error cargando seguimientos de ${obj.id}`);
        }
      }
      setSeguimientos(allSeguimientos);
    } catch (err) {
      toast.error("Error al cargar los objetivos de calidad");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setObjetivoDialogMode('create');
    setObjetivoForm({
      codigo: '', descripcion: '', meta: '', valorMeta: '', periodoInicio: '', periodoFin: '', estado: 'planificado'
    });
    setSelectedObjetivo(null);
    setShowObjetivoDialog(true);
  };

  const handleEdit = (obj: ObjetivoCalidad) => {
    const toDateInput = (val?: string) => {
      if (!val) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    };
    setObjetivoDialogMode('edit');
    setObjetivoForm({
      codigo: obj.codigo,
      descripcion: obj.descripcion || '',
      meta: obj.meta || '',
      valorMeta: obj.valorMeta?.toString() || '',
      periodoInicio: toDateInput(obj.periodoInicio),
      periodoFin: toDateInput(obj.periodoFin),
      estado: obj.estado || 'planificado'
    });
    setSelectedObjetivo(obj);
    setShowObjetivoDialog(true);
  };

  const handleView = (obj: ObjetivoCalidad) => {
    setSelectedObjetivo(obj);
    setShowDocumento(true);
  };

  const handleAddSeguimiento = (obj: ObjetivoCalidad) => {
    setSelectedObjetivo(obj);
    setSeguimientoForm({
      periodo: new Date().toISOString().split('T')[0],
      valorAlcanzado: '',
      observaciones: ''
    });
    setShowSeguimientoDialog(true);
  };

  const handleSaveObjetivo = async () => {
    if (!objetivoForm.descripcion || objetivoForm.descripcion.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres');
      return;
    }

    try {
      setSavingObjetivo(true);
      const payload = {
        codigo: objetivoForm.codigo,
        descripcion: objetivoForm.descripcion,
        meta: objetivoForm.meta,
        valorMeta: objetivoForm.valorMeta ? Number(objetivoForm.valorMeta) : undefined,
        periodoInicio: objetivoForm.periodoInicio,
        periodoFin: objetivoForm.periodoFin,
        estado: objetivoForm.estado,
      };

      if (objetivoDialogMode === 'create') {
        await objetivoCalidadService.create(payload);
      } else if (selectedObjetivo) {
        await objetivoCalidadService.update(selectedObjetivo.id, payload);
      }

      await cargarDatos();
      setShowObjetivoDialog(false);
      toast.success(objetivoDialogMode === 'create' ? 'Objetivo creado con éxito' : 'Objetivo actualizado con éxito');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      let errorMsg = 'Error al guardar';
      if (typeof detail === 'string') errorMsg = detail;
      else if (Array.isArray(detail)) errorMsg = detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ');
      else if (err?.message) errorMsg = err.message;
      toast.error(errorMsg);
    } finally {
      setSavingObjetivo(false);
    }
  };

  const handleSaveSeguimiento = async () => {
    if (!selectedObjetivo) return;

    // Validación básica
    if (!seguimientoForm.valorAlcanzado || seguimientoForm.valorAlcanzado.toString().trim() === '') {
      toast.error('El valor alcanzado es obligatorio');
      return;
    }
    const valorParsed = parseFloat(seguimientoForm.valorAlcanzado as unknown as string);
    if (!isFinite(valorParsed)) {
      toast.error('El valor alcanzado debe ser un número válido');
      return;
    }

    try {
      setSavingSeguimiento(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      await objetivoCalidadService.createSeguimiento({
        objetivoId: selectedObjetivo.id,
        valorActual: valorParsed,
        observaciones: seguimientoForm.observaciones,
        periodo: seguimientoForm.periodo || new Date().toISOString().split('T')[0],
        creadoEn: seguimientoForm.periodo ? `${seguimientoForm.periodo}T00:00:00` : new Date().toISOString(),
      });

      toast.success('Seguimiento registrado correctamente');
      await cargarDatos();
      setShowSeguimientoDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar seguimiento');
    } finally {
      setSavingSeguimiento(false);
    }
  };

  const openDeleteDialog = (obj: ObjetivoCalidad) => {
    setDeleteDialog({ open: true, objetivo: obj });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, objetivo: null });
  };

  const handleDelete = async () => {
    const obj = deleteDialog.objetivo;
    if (!obj) return;
    const numSeguimientos = getSeguimientosObjetivo(obj.id).length;
    const puedeEliminar = obj.estado === 'cancelado' && numSeguimientos === 0;
    if (!puedeEliminar) {
      toast.error("Solo se pueden eliminar objetivos cancelados y sin seguimientos");
      closeDeleteDialog();
      return;
    }

    try {
      await objetivoCalidadService.delete(obj.id);
      await cargarDatos();
      toast.success('Objetivo eliminado correctamente');
      closeDeleteDialog();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : (err?.message || 'Error al eliminar el objetivo');
      toast.error(message);
    }
  };

  const getSeguimientosObjetivo = (id: string) => seguimientos.filter(s => s.objetivoId === id || (s as any).objetivo_calidad_id === id);

  const getUltimoSeguimiento = (id: string) => {
    const segs = getSeguimientosObjetivo(id);
    return segs.sort((a, b) => {
      const dateA = new Date((a as any).creadoEn || (a as any).fecha_seguimiento || '').getTime();
      const dateB = new Date((b as any).creadoEn || (b as any).fecha_seguimiento || '').getTime();
      return dateB - dateA;
    })[0];
  };

  const getEstadoColor = (estado: string) => {
    const colores: { [key: string]: string } = {
      'planificado': 'bg-[#F8FAFC] text-[#1E3A8A]',
      'en_curso': 'bg-[#FFF7ED] text-[#F97316]',
      'cumplido': 'bg-[#ECFDF5] text-[#065F46]',
      'no_cumplido': 'bg-[#FEF2F2] text-[#991B1B]',
      'cancelado': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  const getCumplimientoColor = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-green-600';
    if (porcentaje >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredObjetivos = objetivos.filter(o =>
    matchesTextSearch(searchTerm, o)
  );

  const stats = {
    total: objetivos.length,
    enCurso: objetivos.filter(o => o.estado === 'en_curso').length,
    cumplidos: objetivos.filter(o => o.estado === 'cumplido').length,
    planificados: objetivos.filter(o => o.estado === 'planificado').length
  };

  const pendientes = stats.enCurso + stats.planificados;
  const coveragePercentage = stats.total === 0 ? 0 : Math.round((stats.cumplidos / stats.total) * 100);

  if (loading) {
    return <LoadingSpinner message="Cargando objetivos de calidad..." />;
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
                  <Target className="h-9 w-9 text-[#2563EB]" />
                  Seguimiento Objetivos de Calidad
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Administra los objetivos de calidad del sistema
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {stats.total} objetivos
                  </Badge>
                  {pendientes > 0 && (
                    <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                      {pendientes} pendientes
                    </Badge>
                  )}
                </div>
              </div>
              <Button onClick={handleCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Objetivo
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
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

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Cumplidos</CardDescription>
                  <CheckCircle className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{stats.cumplidos}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium mb-2">
                  Cobertura: {coveragePercentage}%
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                  <div className="bg-[#10B981] h-3 rounded-full transition-all" style={{ width: `${coveragePercentage}%` }} />
                </div>
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
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Con seguimiento activo</div>
              </CardContent>
            </Card>

            <Card className="bg-[#F8FAFC] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Planificados</CardDescription>
                  <Clock className="h-8 w-8 text-[#1E3A8A]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{stats.planificados}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">Pendientes de iniciar</div>
              </CardContent>
            </Card>
          </div>

          {/* Guía */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión de Objetivos</CardTitle>
              <CardDescription>Buenas prácticas para seguimiento y registro de resultados</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Registrar Periodicidad</span>
                    <span className="text-[#6B7280]">Define frecuencia y responsables del seguimiento.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Documentar Evidencias</span>
                    <span className="text-[#6B7280]">Adjunta datos para justificar el avance.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Ajustar Plan</span>
                    <span className="text-[#6B7280]">Revisa y actualiza metas según resultados.</span>
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

          {/* Tabla */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Objetivos</h2>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={cargarDatos}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredObjetivos.length} resultados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Descripción</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Valor Meta</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Periodo</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Avance</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]"># Seg.</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredObjetivos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                        <div className="flex flex-col items-center">
                          <Target className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchTerm ? "No se encontraron objetivos" : "No hay objetivos registrados"}
                          </p>
                          {!searchTerm && (
                            <Button onClick={handleCreate} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
                              <Plus className="mr-2 h-5 w-5" />
                              Crear primer objetivo
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredObjetivos.map((obj) => {
                      const ultimo = getUltimoSeguimiento(obj.id);
                      const numSeg = getSeguimientosObjetivo(obj.id).length;
                      const puedeEliminar = obj.estado === 'cancelado' && numSeg === 0;
                      const porcentaje = (() => {
                        if (!ultimo) return 0;
                        // porcentajeCumplimiento is always 0 in the mapper — compute directly
                        const valorActual = Number((ultimo as any).valorActual ?? (ultimo as any).valor_actual ?? 0);
                        const valorMeta = Number(obj.valorMeta ?? (obj as any).valor_meta ?? 0);
                        if (valorMeta > 0) return Math.min((valorActual / valorMeta) * 100, 100);
                        return 0;
                      })();

                      return (
                        <TableRow key={obj.id} className="hover:bg-[#F5F3FF] transition-colors">
                          <TableCell className="px-6 py-4">
                            <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold px-4 py-2">
                              {obj.codigo}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-medium max-w-md">
                            {obj.descripcion || <span className="italic text-[#6B7280]">Sin descripción</span>}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {obj.valorMeta ? `${obj.valorMeta}%` : '-'}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-[#6B7280]">
                            {obj.periodoInicio ? new Date(obj.periodoInicio).toLocaleDateString('es-CO') : ''} {obj.periodoInicio && obj.periodoFin ? '-' : ''} {obj.periodoFin ? new Date(obj.periodoFin).toLocaleDateString('es-CO') : ''}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={getEstadoColor(obj.estado || '')}>
                              {obj.estado?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {ultimo ? (
                              <div className="flex items-center gap-3">
                                <span className={`font-bold ${getCumplimientoColor(porcentaje)}`}>
                                  {porcentaje.toFixed(1)}%
                                </span>
                                <div className="w-20 bg-[#E5E7EB] rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${porcentaje >= 90 ? 'bg-[#10B981]' : porcentaje >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="italic text-[#6B7280]">Sin seguimiento</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-[#6B7280]">{numSeg}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => handleView(obj)} className="rounded-xl">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Ver detalles</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(obj)} className="rounded-xl">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => handleAddSeguimiento(obj)} className="rounded-xl">
                                    <TrendingUp className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Registrar seguimiento</p></TooltipContent>
                              </Tooltip>
                              {puedeEliminar && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(obj)} className="rounded-xl">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Eliminar</p></TooltipContent>
                                </Tooltip>
                              )}
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
            open={showDocumento}
            onOpenChange={setShowDocumento}
            data={
              selectedObjetivo
                ? datosSGCDesdeObjetivoCalidad(
                    selectedObjetivo,
                    getSeguimientosObjetivo(selectedObjetivo.id),
                  )
                : null
            }
            title="Objetivo de calidad"
            description="Documento controlado con la meta, el periodo y el seguimiento del objetivo."
            extraActions={
              selectedObjetivo ? (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setShowDocumento(false);
                    handleEdit(selectedObjetivo);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : null
            }
          />

          {/* Diálogo Objetivo (create/edit/view) */}
          <Dialog open={showObjetivoDialog} onOpenChange={setShowObjetivoDialog}>
            <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  {objetivoDialogMode === 'create' && <><Plus className="h-7 w-7 text-[#2563EB]" /> Nuevo Objetivo</>}
                  {objetivoDialogMode === 'edit' && <><Edit className="h-7 w-7 text-[#2563EB]" /> Editar Objetivo</>}
                  {objetivoDialogMode === 'view' && <><BarChart3 className="h-7 w-7 text-[#2563EB]" /> Detalle del Objetivo</>}
                </DialogTitle>
              </DialogHeader>

              {objetivoDialogMode === 'view' && selectedObjetivo ? (
                // Contenido de vista (detalle + historial)
                <div className="space-y-8 py-4">
                  {/* Información principal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                    <div>
                      <Label className="text-[#6B7280] uppercase text-xs font-bold">Código</Label>
                      <Badge className="mt-2 text-lg px-6 py-3 bg-[#2563EB]/10 text-[#2563EB] font-bold">
                        {selectedObjetivo.codigo}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-[#6B7280] uppercase text-xs font-bold">Estado</Label>
                      <Badge className={`mt-2 ${getEstadoColor(selectedObjetivo.estado || '')}`}>
                        {selectedObjetivo.estado?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {selectedObjetivo.descripcion && (
                    <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                      <Label className="text-[#6B7280] uppercase text-xs font-bold mb-3 block">Descripción</Label>
                      <p className="text-[#111827] leading-relaxed">{selectedObjetivo.descripcion}</p>
                    </div>
                  )}

                  {selectedObjetivo.meta && (
                    <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                      <Label className="text-[#6B7280] uppercase text-xs font-bold mb-3 block">Meta</Label>
                      <p className="text-[#111827] leading-relaxed">{selectedObjetivo.meta}</p>
                    </div>
                  )}

                  {/* Estadísticas de seguimiento */}
                  {(() => {
                    const segs = getSeguimientosObjetivo(selectedObjetivo.id);
                    if (segs.length === 0) return null;
                    const valores = segs.map(s => {
                      const raw = (s as any).porcentajeCumplimiento;
                      if (typeof raw === 'number' && raw > 0) return raw;
                      const valAct = (s as any).valorActual ?? (s as any).valor_actual ?? 0;
                      const valMeta = selectedObjetivo.valorMeta ?? (selectedObjetivo as any).valor_meta ?? 0;
                      if (valAct && valMeta) return (Number(valAct) / Number(valMeta)) * 100;
                      return 0;
                    }).filter(v => v > 0);
                    const promedio = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
                    const maximo = valores.length > 0 ? Math.max(...valores) : 0;
                    const minimo = valores.length > 0 ? Math.min(...valores) : 0;

                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{promedio.toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">Promedio</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{maximo.toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">Máximo</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                          <p className="text-2xl font-bold text-yellow-600">{minimo.toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">Mínimo</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Historial de seguimientos */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4">Historial de Seguimientos ({getSeguimientosObjetivo(selectedObjetivo.id).length})</h3>
                    {getSeguimientosObjetivo(selectedObjetivo.id).length === 0 ? (
                      <p className="text-[#6B7280] text-center py-8">No hay seguimientos registrados.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Cumplimiento</TableHead>
                            <TableHead>Observaciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSeguimientosObjetivo(selectedObjetivo.id)
                            .sort((a, b) => {
                              const dateA = new Date((a as any).creadoEn || (a as any).fecha_seguimiento || '').getTime();
                              const dateB = new Date((b as any).creadoEn || (b as any).fecha_seguimiento || '').getTime();
                              return dateB - dateA;
                            })
                            .map((seg) => {
                              const valorActual = (seg as any).valorActual ?? (seg as any).valor_actual ?? 0;
                              const valorMeta = selectedObjetivo.valorMeta ?? (selectedObjetivo as any).valor_meta ?? 0;
                              const porcentajeBackend = (seg as any).porcentajeCumplimiento;
                              const porcentajeSeg = (typeof porcentajeBackend === 'number' && porcentajeBackend > 0)
                                ? porcentajeBackend
                                : (Number(valorMeta) > 0 && isFinite(Number(valorActual)))
                                  ? (Number(valorActual) / Number(valorMeta)) * 100
                                  : 0;

                              const porcentajeDisplay = isFinite(Number(porcentajeSeg)) ? Number(porcentajeSeg) : 0;

                              return (
                                <TableRow key={seg.id}>
                                  <TableCell>{new Date((seg as any).creadoEn || (seg as any).fecha_seguimiento || '').toLocaleDateString('es-CO')}</TableCell>
                                  <TableCell>{valorActual}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold ${getCumplimientoColor(porcentajeDisplay || 0)}`}>
                                        {porcentajeDisplay.toFixed(1)}%
                                      </span>
                                      <div className="w-20 bg-[#E5E7EB] rounded-full h-2">
                                        <div className={`h-2 rounded-full ${porcentajeDisplay >= 90 ? 'bg-[#10B981]' : porcentajeDisplay >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(porcentajeDisplay || 0, 100)}%` }} />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[#6B7280]">{seg.observaciones || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              ) : (
                // Formulario create/edit
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CampoCodigoAutomatico value={objetivoForm.codigo} />
                    <div className="space-y-2">
                      <Label className="font-bold">Estado</Label>
                      <select
                        value={objetivoForm.estado}
                        onChange={(e) => setObjetivoForm({ ...objetivoForm, estado: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]"
                      >
                        <option value="planificado">Planificado</option>
                        <option value="en_curso">En Curso</option>
                        <option value="cumplido">Cumplido</option>
                        <option value="no_cumplido">No Cumplido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Descripción</Label>
                    <Textarea
                      value={objetivoForm.descripcion}
                      onChange={(e) => setObjetivoForm({ ...objetivoForm, descripcion: e.target.value })}
                      rows={4}
                      placeholder="Describe el objetivo..."
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Meta</Label>
                    <Textarea
                      value={objetivoForm.meta}
                      onChange={(e) => setObjetivoForm({ ...objetivoForm, meta: e.target.value })}
                      rows={3}
                      placeholder="Meta detallada a alcanzar..."
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Valor Meta (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={objetivoForm.valorMeta}
                      onChange={(e) => setObjetivoForm({ ...objetivoForm, valorMeta: e.target.value })}
                      placeholder="95.00"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold">Periodo Inicio</Label>
                      <Input type="date" value={objetivoForm.periodoInicio} onChange={(e) => setObjetivoForm({ ...objetivoForm, periodoInicio: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Periodo Fin</Label>
                      <Input type="date" value={objetivoForm.periodoFin} onChange={(e) => setObjetivoForm({ ...objetivoForm, periodoFin: e.target.value })} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-4">
                <Button variant="outline" onClick={() => setShowObjetivoDialog(false)} className="rounded-xl">
                  {objetivoDialogMode === 'view' ? 'Cerrar' : 'Cancelar'}
                </Button>
                {objetivoDialogMode !== 'view' && (
                  <Button onClick={handleSaveObjetivo} disabled={savingObjetivo} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold">
                    {savingObjetivo ? (
                      <>
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Guardar Objetivo
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo Seguimiento */}
          <Dialog open={showSeguimientoDialog} onOpenChange={setShowSeguimientoDialog}>
            <DialogContent className="max-w-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <TrendingUp className="h-7 w-7 text-[#2563EB]" /> Registrar Seguimiento
                </DialogTitle>
              </DialogHeader>

              {selectedObjetivo && (
                <div className="space-y-6 py-4">
                  <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                    <p className="text-sm text-[#6B7280]">Objetivo</p>
                    <p className="font-bold text-lg">{selectedObjetivo.codigo} - {selectedObjetivo.descripcion}</p>
                    {selectedObjetivo.valorMeta && <p className="text-sm text-[#2563EB] mt-1">Meta: {selectedObjetivo.valorMeta}%</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold">Periodo <span className="text-red-500">*</span></Label>
                      <Input type="date" value={seguimientoForm.periodo} onChange={(e) => setSeguimientoForm({ ...seguimientoForm, periodo: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Valor Alcanzado <span className="text-red-500">*</span></Label>
                      <Input type="number" step="0.01" value={seguimientoForm.valorAlcanzado} onChange={(e) => setSeguimientoForm({ ...seguimientoForm, valorAlcanzado: e.target.value })} placeholder="85.50" className="rounded-xl" />
                      {seguimientoForm.valorAlcanzado && selectedObjetivo.valorMeta && !isNaN(parseFloat(seguimientoForm.valorAlcanzado as unknown as string)) && Number(selectedObjetivo.valorMeta) > 0 ? (
                        <p className="text-sm text-[#6B7280]">
                          Cumplimiento: {((parseFloat(seguimientoForm.valorAlcanzado as unknown as string) / Number(selectedObjetivo.valorMeta)) * 100).toFixed(1)}%
                        </p>
                      ) : seguimientoForm.valorAlcanzado ? (
                        <p className="text-sm text-[#6B7280]">Cumplimiento: -</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">Observaciones</Label>
                    <Textarea
                      value={seguimientoForm.observaciones}
                      onChange={(e) => setSeguimientoForm({ ...seguimientoForm, observaciones: e.target.value })}
                      rows={4}
                      placeholder="Notas sobre el seguimiento..."
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-4">
                <Button variant="outline" onClick={() => setShowSeguimientoDialog(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={handleSaveSeguimiento} disabled={savingSeguimiento} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold">
                  {savingSeguimiento ? 'Guardando...' : 'Guardar Seguimiento'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AlertDialog Eliminación */}
          <AlertDialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-[#EF4444]" />
                  ¿Eliminar objetivo?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteDialog.objetivo && (
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB] mt-4">
                      <p className="font-bold">{deleteDialog.objetivo.descripcion || 'Sin descripción'}</p>
                      <p className="text-sm text-[#6B7280]">Código: {deleteDialog.objetivo.codigo}</p>
                      <p className="text-sm mt-3 text-[#991B1B] font-medium">
                        Esta acción es permanente y no se podrá deshacer.
                      </p>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-[#EF4444] hover:bg-[#DC2626] rounded-xl">
                  Eliminar Objetivo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </TooltipProvider>
    </div>
  );
};

export default ObjetivosCalidad;
