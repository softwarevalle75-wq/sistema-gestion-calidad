import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Plus, Search, Download, Eye, Edit, Trash2, Users, CheckCircle, AlertCircle, Clock, Loader2, Save, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from "sonner";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAuditoria } from "@/utils/documentosRegistrosSGC";
import type { Auditoria as AuditoriaSGC } from "@/services/auditoria.service";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

// Tipos TypeScript
interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  alcance: string;
  normaReferencia: string;
  auditorLiderId: string;
  procesoId?: string;
  fechaPlanificada: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'planificada' | 'en_curso' | 'completada' | 'cancelada';
  programaId: string;
  creadoPor?: string;
  equipoAuditor?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  primerApellido?: string;
  primer_apellido?: string;
  segundoApellido?: string;
  segundo_apellido?: string;
}

interface AuditoriaFormData {
  codigo: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  alcance: string;
  normaReferencia: string;
  auditorLiderId: string;
  procesoId: string;
  fechaPlanificada: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  programaId: string;
  creadoPor: string;
}

interface ProgramaAuditoria {
  id: string;
  anio: number;
  estado: string;
}

interface Proceso {
  id: string;
  codigo: string;
  nombre: string;
  estado?: string;
}

interface Filters {
  tipo?: string;
  estado?: string;
}

// Configuración de la API
import { API_BASE_URL } from "@/lib/api";

const auditoriaService = {
  async getAll(filters: Filters = {}): Promise<Auditoria[]> {
    const params = new URLSearchParams();
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.estado) params.append('estado', filters.estado);

    const url = `${API_BASE_URL}/auditorias${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al cargar auditorías');
    return response.json();
  },

  async getProgramas(): Promise<ProgramaAuditoria[]> {
    const response = await fetch(`${API_BASE_URL}/programa-auditorias`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al cargar programas de auditoría');
    return response.json();
  },

  async create(data: Record<string, unknown>): Promise<Auditoria> {
    const response = await fetch(`${API_BASE_URL}/auditorias`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail;
      let message = 'Error al crear auditoría';
      if (detail) {
        if (Array.isArray(detail)) {
          message = detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('; ');
        } else if (typeof detail === 'string') {
          message = detail;
        }
      }
      throw new Error(message);
    }
    return response.json();
  },

  async update(id: string, data: Record<string, unknown>): Promise<Auditoria> {
    const response = await fetch(`${API_BASE_URL}/auditorias/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Error al actualizar auditoría');
    return response.json();
  },

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/auditorias/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = (errorData as { detail?: string }).detail;
      throw new Error(typeof detail === "string" ? detail : "Error al eliminar auditoría");
    }
    return true;
  }
};

const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const response = await fetch(`${API_BASE_URL}/usuarios?activo=true&limit=1000`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al cargar usuarios');
    return response.json();
  }
};

const procesoService = {
  async getAll(): Promise<Proceso[]> {
    const response = await fetch(`${API_BASE_URL}/procesos?limit=300`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Error al cargar procesos');
    return response.json();
  }
};

const AuditoriasPlanificacion = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Estados
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [programas, setProgramas] = useState<ProgramaAuditoria[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [auditoriaEditando, setAuditoriaEditando] = useState<Auditoria | null>(null);
  const [showDocumento, setShowDocumento] = useState(false);
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(null);
  const [equipoAuditorIds, setEquipoAuditorIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<AuditoriaFormData>({
    codigo: '',
    nombre: '',
    tipo: 'interna',
    objetivo: '',
    alcance: '',
    normaReferencia: 'ISO 9001:2015',
    auditorLiderId: '',
    procesoId: '',
    fechaPlanificada: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'planificada',
    programaId: '',
    creadoPor: ''
  });
  const codigoAutomatico = useCodigoAutomatico("auditoria", mostrarModal && !auditoriaEditando);

  useEffect(() => {
    if (!auditoriaEditando && codigoAutomatico) {
      setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, auditoriaEditando]);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarAuditorias();
  }, [filtroTipo, filtroEstado]);

  useEffect(() => {
    const accion = searchParams.get('accion');
    if (accion === 'crear' && !mostrarModal) {
      abrirModalCrear();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('accion');
      nextParams.delete('origen');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, mostrarModal]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar usuarios y auditorías en paralelo
      const [usuariosData, programasData, procesosData] = await Promise.all([
        usuarioService.getAll(),
        auditoriaService.getProgramas(),
        procesoService.getAll()
      ]);

      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      const programasValidos = (Array.isArray(programasData) ? programasData : []).filter(
        (programa) => programa.estado === 'aprobado' || programa.estado === 'en_ejecucion'
      );
      setProgramas(programasValidos);
      const procesosActivos = (Array.isArray(procesosData) ? procesosData : []).filter(
        (proceso) => !proceso.estado || proceso.estado === 'activo'
      );
      setProcesos(procesosActivos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-CO');
  };

  const cargarAuditorias = async () => {
    try {
      console.log('📡 Cargando auditorías con filtros:', { tipo: filtroTipo, estado: filtroEstado });
      const data = await auditoriaService.getAll({ tipo: filtroTipo, estado: filtroEstado });
      console.log('✅ Auditorías recibidas:', data);
      setAuditorias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error al cargar auditorías:', err);
      toast.error('Error al cargar auditorías');
    }
  };

  const auditoriasFiltradas = auditorias.filter(aud =>
    matchesTextSearch(busqueda, aud)
  );

  const abrirModalCrear = () => {
    setAuditoriaEditando(null);

    const year = new Date().getFullYear();
    const programaDefault = programas.find((p) => p.anio === year)?.id || programas[0]?.id || '';

    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'interna',
      objetivo: '',
      alcance: '',
      normaReferencia: 'ISO 9001:2015',
      auditorLiderId: '',
      procesoId: '',
      fechaPlanificada: '',
      fechaInicio: '',
      fechaFin: '',
      estado: 'planificada',
      programaId: programaDefault,
      creadoPor: ''
    });
    setEquipoAuditorIds([]);
    setMostrarModal(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (auditoria: Auditoria) => {
    setAuditoriaEditando(auditoria);
    setFormData({
      codigo: auditoria.codigo,
      nombre: auditoria.nombre || '',
      tipo: auditoria.tipo || 'interna',
      objetivo: auditoria.objetivo || '',
      alcance: auditoria.alcance || '',
      normaReferencia: auditoria.normaReferencia || 'ISO 9001:2015',
      auditorLiderId: auditoria.auditorLiderId || '',
      procesoId: auditoria.procesoId || (auditoria as unknown as { proceso_id?: string }).proceso_id || '',
      fechaPlanificada: auditoria.fechaPlanificada?.split('T')[0] || '',
      fechaInicio: auditoria.fechaInicio?.split('T')[0] || '',
      fechaFin: auditoria.fechaFin?.split('T')[0] || '',
      estado: auditoria.estado || 'planificada',
      programaId: auditoria.programaId || (auditoria as unknown as { programa_id?: string }).programa_id || '',
      creadoPor: auditoria.creadoPor || (auditoria as unknown as { creado_por?: string }).creado_por || ''
    });
    const equipoRaw = auditoria.equipoAuditor || (auditoria as unknown as { equipo_auditor?: string }).equipo_auditor || '';
    const equipoIds = equipoRaw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    setEquipoAuditorIds(equipoIds);
    setMostrarModal(true);
  };

  const toggleEquipoAuditor = (usuarioId: string) => {
    setEquipoAuditorIds((prev) =>
      prev.includes(usuarioId)
        ? prev.filter((id) => id !== usuarioId)
        : [...prev, usuarioId]
    );
  };

  // Guardar auditoría
  const guardarAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      if (!formData.programaId) {
        toast.warning('No se ha seleccionado un programa anual. La auditoría se creará sin asociar a un programa.');
      }
      const payload: Record<string, unknown> = {
        ...formData,
        // Limpiar campos vacíos para que no se envíen strings vacías al backend
        auditorLiderId: formData.auditorLiderId || undefined,
        creadoPor: formData.creadoPor || undefined,
        procesoId: formData.procesoId || undefined,
        programaId: formData.programaId || undefined,
        fechaPlanificada: formData.fechaPlanificada || undefined,
        fechaInicio: formData.fechaInicio || undefined,
        fechaFin: formData.fechaFin || undefined,
        equipoAuditor: equipoAuditorIds.length > 0 ? equipoAuditorIds.join(',') : undefined
      };
      if (auditoriaEditando) {
        await auditoriaService.update(auditoriaEditando.id, payload);
      } else {
        await auditoriaService.create(payload);
      }
      setMostrarModal(false);
      await cargarAuditorias();

      // Mostrar mensaje de éxito
      toast.success(auditoriaEditando ? 'Auditoría actualizada exitosamente' : 'Auditoría creada exitosamente');
    } catch (err) {
      console.error('Error al guardar auditoría:', err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar la auditoría');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar auditoría
  const eliminarAuditoria = async () => {
    if (!deleteDialog.id) return;

    try {
      await auditoriaService.delete(deleteDialog.id);
      await cargarAuditorias();
      setDeleteDialog({ open: false, id: null });
    } catch (err) {
      console.error('Error al eliminar auditoría:', err);
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la auditoría');
    }
  };

  // Obtener color de estado
  const getEstadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      planificada: 'bg-blue-100 text-blue-800',
      en_curso: 'bg-yellow-100 text-yellow-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  // Obtener icono de estado
  const getEstadoIcono = (estado: string) => {
    const iconos: Record<string, React.ReactElement> = {
      planificada: <Clock className="w-4 h-4" />,
      en_curso: <AlertCircle className="w-4 h-4" />,
      completada: <CheckCircle className="w-4 h-4" />,
      cancelada: <Trash2 className="w-4 h-4" />
    };
    return iconos[estado] || <Clock className="w-4 h-4" />;
  };

  const getEstadoBadge = (estado: string) => {
    return (
      <Badge className={`${getEstadoColor(estado)} border-none shadow-none flex items-center gap-2 px-3 py-1`}>
        {getEstadoIcono(estado)}
        <span className="capitalize">{estado.replace('_', ' ')}</span>
      </Badge>
    );
  };

  // Formatear fecha
  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return 'No definida';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener nombre completo usuario
  const getNombreUsuario = (id: string) => {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return 'No asignado';
    const apellido = usuario.primerApellido || usuario.primer_apellido || '';
    return `${usuario.nombre} ${apellido}`.trim();
  };

  const toAuditoriaSGC = (auditoria: Auditoria): AuditoriaSGC => ({
    id: auditoria.id,
    codigo: auditoria.codigo,
    nombre: auditoria.nombre,
    tipo: auditoria.tipo,
    objetivo: auditoria.objetivo,
    alcance: auditoria.alcance,
    normaReferencia: auditoria.normaReferencia,
    auditorLiderId: auditoria.auditorLiderId,
    procesoId: auditoria.procesoId,
    fechaPlanificada: auditoria.fechaPlanificada,
    fechaInicio: auditoria.fechaInicio,
    fechaFin: auditoria.fechaFin,
    estado: auditoria.estado,
    programaId: auditoria.programaId,
    creadoPor: auditoria.creadoPor,
    auditorLider: auditoria.auditorLiderId
      ? {
          id: auditoria.auditorLiderId,
          nombre: getNombreUsuario(auditoria.auditorLiderId),
        }
      : undefined,
  });

  const stats = {
    total: auditorias.length,
    planificadas: auditorias.filter(a => a.estado === 'planificada').length,
    enCurso: auditorias.filter(a => a.estado === 'en_curso').length,
    completadas: auditorias.filter(a => a.estado === 'completada').length
  };

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Calendar className="h-9 w-9 text-[#2563EB]" />
                Planificación de Auditorías
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Programa anual de auditorías internas según ISO 9001:2015
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {stats.total} totales
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E] border border-[#22C55E]/30">
                  {stats.completadas} completadas
                </Badge>
              </div>
            </div>
            <Button
              onClick={abrirModalCrear}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nueva Auditoría
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#1E3A8A]">Total</CardDescription>
                <Calendar className="h-8 w-8 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280] font-medium">Programadas</div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#9A3412]">Planificadas</CardDescription>
                <Clock className="h-8 w-8 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{stats.planificadas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                Pendientes
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FEFCE8] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#854D0E]">En Curso</CardDescription>
                <Activity className="h-8 w-8 text-[#EAB308]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#854D0E]">{stats.enCurso}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#EAB308] border-[#EAB308]/20 font-bold uppercase text-[10px]">
                Ejecutándose
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-bold text-[#065F46]">Completadas</CardDescription>
                <CheckCircle className="h-8 w-8 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{stats.completadas}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                Finalizadas
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <CardTitle className="text-lg text-[#1E3A8A]">Proceso de Planificación</CardTitle>
            <CardDescription>Pasos clave según la norma ISO 9001:2015 (Cláusula 9.2)</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <span className="font-bold text-[#1E3A8A] block mb-1">Definir Objetivos</span>
                  <span className="text-[#6B7280]">Establecer alcance y criterios claros.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <span className="font-bold text-[#065F46] block mb-1">Asignar Recursos</span>
                  <span className="text-[#6B7280]">Seleccionar auditor líder y equipo.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <span className="font-bold text-[#9A3412] block mb-1">Programar Fechas</span>
                  <span className="text-[#6B7280]">Definir cronograma y seguimiento.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
              <Input
                placeholder={SEARCH_ANY_PLACEHOLDER}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
              />
            </div>
            <Select value={filtroTipo || "todos"} onValueChange={(value) => setFiltroTipo(value === "todos" ? "" : value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="interna">Interna</SelectItem>
                <SelectItem value="externa">Externa</SelectItem>
                <SelectItem value="certificacion">Certificación</SelectItem>
                <SelectItem value="seguimiento">Seguimiento</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEstado || "todos"} onValueChange={(value) => setFiltroEstado(value === "todos" ? "" : value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="planificada">Planificada</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Programa de Auditorías</h2>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={cargarAuditorias}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                {auditoriasFiltradas.length} resultados
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nombre / Objetivo</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tipo</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Auditor Líder</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha Planificada</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditoriasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                      <div className="flex flex-col items-center">
                        <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No hay auditorías programadas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditoriasFiltradas.map((auditoria) => (
                    <TableRow key={auditoria.id} className="hover:bg-[#F5F3FF] transition-colors">
                      <TableCell className="px-6 py-4 font-mono font-bold">{auditoria.codigo}</TableCell>
                      <TableCell className="px-6 py-4">
                        <p className="font-bold">{auditoria.nombre || 'Sin nombre'}</p>
                        <p className="text-sm text-[#6B7280] line-clamp-1">{auditoria.objetivo || 'Sin objetivo'}</p>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {auditoria.tipo?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">{getEstadoBadge(auditoria.estado)}</TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[#E0EDFF] flex items-center justify-center text-[#2563EB] text-xs font-bold">
                            {getNombreUsuario(auditoria.auditorLiderId).charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{getNombreUsuario(auditoria.auditorLiderId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-[#6B7280]">
                        {formatDate(auditoria.fechaPlanificada)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAuditoria(auditoria);
                              setShowDocumento(true);
                            }}
                            className="rounded-xl"
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => abrirModalEditar(auditoria)} className="rounded-xl">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: auditoria.id })} className="rounded-xl">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <VistaDocumentoSGCDialog
          open={showDocumento}
          onOpenChange={(open) => {
            setShowDocumento(open);
            if (!open) setSelectedAuditoria(null);
          }}
          data={selectedAuditoria ? datosSGCDesdeAuditoria(toAuditoriaSGC(selectedAuditoria)) : null}
          title="Auditoría planificada"
          description="Documento controlado con la planificación de la auditoría."
          extraActions={
            selectedAuditoria ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setShowDocumento(false);
                  abrirModalEditar(selectedAuditoria);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : null
          }
        />

        {/* Modal de crear/editar */}
        <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {auditoriaEditando ? 'Editar Auditoría' : 'Nueva Auditoría'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={guardarAuditoria} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <CampoCodigoAutomatico native value={formData.codigo} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="interna">Interna</option>
                    <option value="externa">Externa</option>
                    <option value="certificacion">Certificación</option>
                    <option value="seguimiento">Seguimiento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auditoría Interna de Procesos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo
                </label>
                <textarea
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Verificar el cumplimiento de los requisitos ISO 9001:2015..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcance
                </label>
                <textarea
                  value={formData.alcance}
                  onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Procesos de gestión de calidad, operaciones..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Norma de Referencia
                  </label>
                  <input
                    type="text"
                    value={formData.normaReferencia}
                    onChange={(e) => setFormData({ ...formData, normaReferencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ISO 9001:2015"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Programa Anual <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.programaId}
                    onChange={(e) => setFormData({ ...formData, programaId: e.target.value })}
                    required
                    disabled={!!auditoriaEditando && formData.estado !== 'planificada'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">Seleccionar programa...</option>
                    {programas.map(programa => (
                      <option key={programa.id} value={programa.id}>
                        {programa.anio} - {programa.estado.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {!!auditoriaEditando && formData.estado !== 'planificada' && (
                    <p className="text-xs text-[#6B7280] mt-1">
                      El programa no se puede cambiar una vez iniciada la auditoría.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auditor Líder
                  </label>
                  <select
                    value={formData.auditorLiderId}
                    onChange={(e) => setFormData({ ...formData, auditorLiderId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar auditor...</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} {usuario.primerApellido || usuario.primer_apellido || ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proceso Auditado
                  </label>
                  <select
                    value={formData.procesoId}
                    onChange={(e) => setFormData({ ...formData, procesoId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar proceso...</option>
                    {procesos.map(proceso => (
                      <option key={proceso.id} value={proceso.id}>
                        {proceso.codigo} - {proceso.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Creado por
                  </label>
                  <select
                    value={formData.creadoPor}
                    onChange={(e) => setFormData({ ...formData, creadoPor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar usuario...</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} {usuario.primerApellido || usuario.primer_apellido || ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipo auditor
                </label>
                <div className="border border-gray-300 rounded-lg p-3 bg-[#F8FAFC]">
                  <div className="flex flex-wrap gap-2">
                    {usuarios.map((usuario) => {
                      const active = equipoAuditorIds.includes(usuario.id);
                      return (
                        <button
                          key={usuario.id}
                          type="button"
                          onClick={() => toggleEquipoAuditor(usuario.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${active
                            ? 'bg-[#E0EDFF] text-[#1E3A8A] border-[#2563EB]'
                            : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F1F5F9]'
                            }`}
                        >
                          {usuario.nombre} {usuario.primerApellido || usuario.primer_apellido || ''}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-2">
                    Seleccionados: {equipoAuditorIds.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Planificada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fechaPlanificada}
                    onChange={(e) => setFormData({ ...formData, fechaPlanificada: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planificada">Planificada</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <DialogFooter className="gap-4">
                <Button variant="outline" type="button" onClick={() => setMostrarModal(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      {auditoriaEditando ? 'Actualizar' : 'Crear'} Auditoría
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-[#EF4444]" />
                ¿Eliminar auditoría?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es permanente y no se podrá deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={eliminarAuditoria} className="bg-[#EF4444] hover:bg-[#DC2626] rounded-xl">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div >
    </div >
  );
}

export default AuditoriasPlanificacion;
