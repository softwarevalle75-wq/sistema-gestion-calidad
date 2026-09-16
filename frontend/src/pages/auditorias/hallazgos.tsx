import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Calendar, FileText, AlertTriangle, CheckCircle, XCircle,
  Eye, Edit, Trash2, Users, Clock, TrendingUp, ChevronDown, ChevronUp, AlertCircle, X, Activity
} from 'lucide-react';
import { auditoriaService } from '@/services/auditoria.service';
import { toast } from 'sonner';
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAuditoria, datosSGCDesdeHallazgo } from "@/utils/documentosRegistrosSGC";
import type { Auditoria as AuditoriaSGC, HallazgoAuditoria } from "@/services/auditoria.service";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";



// Tipos de datos
interface Auditoria {
  id: string;
  codigo: string;
  nombre?: string;
  tipo?: string;
  objetivo?: string;
  alcance?: string;
  normaReferencia?: string;
  auditorLiderId?: string;
  fechaPlanificada?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  creadoPor?: string;
  creadoEn: string;
  auditorLider?: { id: string; nombre: string; email: string };
  hallazgos?: Hallazgo[];
}

interface Hallazgo {
  id: string;
  codigo?: string;
  auditoriaId: string;
  tipo?: string;
  descripcion?: string;
  clausulaIso?: string;
  procesoId?: string;
  areaId?: string;
  evidencia?: string;
  responsableId?: string;
  creadoEn: string;
  auditoria?: { codigo: string; nombre: string };
}

interface FormData {
  codigo: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  alcance: string;
  normaReferencia: string;
  auditorLiderId: string;
  fechaPlanificada: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  creadoPor: string;
}

interface HallazgoFormData {
  auditoriaId: string;
  tipo: string;
  descripcion: string;
  clausulaIso: string;
  procesoId: string;
  areaId: string;
  evidencia: string;
  responsableId: string;
}

const AuditoriasHallazgosView: React.FC = () => {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [filteredAuditorias, setFilteredAuditorias] = useState<Auditoria[]>([]);
  const [filteredHallazgos, setFilteredHallazgos] = useState<Hallazgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'auditorias' | 'hallazgos'>('auditorias');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHallazgoModal, setShowHallazgoModal] = useState(false);
  const [showDocumentoAuditoria, setShowDocumentoAuditoria] = useState(false);
  const [showDocumentoHallazgo, setShowDocumentoHallazgo] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(null);
  const [selectedHallazgo, setSelectedHallazgo] = useState<Hallazgo | null>(null);
  const [expandedAuditoria, setExpandedAuditoria] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    codigo: '',
    nombre: '',
    tipo: 'interna',
    objetivo: '',
    alcance: '',
    normaReferencia: 'ISO 9001:2015',
    auditorLiderId: '',
    fechaPlanificada: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'planificada',
    creadoPor: ''
  });

  const [hallazgoFormData, setHallazgoFormData] = useState<HallazgoFormData>({
    auditoriaId: '',
    tipo: 'no_conformidad_menor',
    descripcion: '',
    clausulaIso: '',
    procesoId: '',
    areaId: '',
    evidencia: '',
    responsableId: ''
  });
  const codigoAuditoriaAuto = useCodigoAutomatico("auditoria", showModal && modalMode === "create");
  const codigoHallazgoAuto = useCodigoAutomatico("hallazgo", showHallazgoModal && modalMode === "create");

  useEffect(() => {
    if (modalMode === "create" && codigoAuditoriaAuto) {
      setFormData((prev) => ({ ...prev, codigo: codigoAuditoriaAuto }));
    }
  }, [codigoAuditoriaAuto, modalMode]);



  useEffect(() => {
    fetchAuditorias();
    fetchHallazgos();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, filterTipo, filterEstado, auditorias, hallazgos, activeTab]);

  const fetchAuditorias = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/auditorias');
      // Asegurar que manejamos correctamente la estructura de respuesta
      const data = response.data;
      const auditoriasList = Array.isArray(data) ? data : (data.auditorias || []);
      setAuditorias(auditoriasList);
    } catch (error) {
      console.error('Error al cargar auditorías:', error);
      toast.error('Error al cargar auditorías');
    } finally {
      setLoading(false);
    }
  };

  const fetchHallazgos = async () => {
    try {
      const response = await apiClient.get('/hallazgos-auditoria');
      const data = response.data;
      setHallazgos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar hallazgos:', error);
      toast.error('Error al cargar hallazgos');
    }
  };

  const filterData = () => {
    if (activeTab === 'auditorias') {
      let filtered = auditorias;
      if (searchTerm) {
        filtered = filtered.filter(a => matchesTextSearch(searchTerm, a));
      }
      if (filterTipo) {
        filtered = filtered.filter(a => a.tipo === filterTipo);
      }
      if (filterEstado) {
        filtered = filtered.filter(a => a.estado === filterEstado);
      }
      setFilteredAuditorias(filtered);
    } else {
      let filtered = hallazgos;
      if (searchTerm) {
        filtered = filtered.filter(h => matchesTextSearch(searchTerm, h));
      }
      if (filterTipo) {
        filtered = filtered.filter(h => h.tipo === filterTipo);
      }
      setFilteredHallazgos(filtered);
    }
  };

  const handleCreateAuditoria = () => {
    setModalMode('create');
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'interna',
      objetivo: '',
      alcance: '',
      normaReferencia: 'ISO 9001:2015',
      auditorLiderId: '',
      fechaPlanificada: '',
      fechaInicio: '',
      fechaFin: '',
      estado: 'planificada',
      creadoPor: ''
    });
    setShowModal(true);
  };

  const handleEditAuditoria = (auditoria: Auditoria) => {
    setModalMode('edit');
    setSelectedAuditoria(auditoria);
    setFormData({
      codigo: auditoria.codigo || '',
      nombre: auditoria.nombre || '',
      tipo: auditoria.tipo || 'interna',
      objetivo: auditoria.objetivo || '',
      alcance: auditoria.alcance || '',
      normaReferencia: auditoria.normaReferencia || 'ISO 9001:2015',
      auditorLiderId: auditoria.auditorLiderId || '',
      fechaPlanificada: auditoria.fechaPlanificada || '',
      fechaInicio: auditoria.fechaInicio || '',
      fechaFin: auditoria.fechaFin || '',
      estado: auditoria.estado || 'planificada',
      creadoPor: auditoria.creadoPor || ''
    });
    setShowModal(true);
  };

  const handleViewAuditoria = (auditoria: Auditoria) => {
    setSelectedAuditoria(auditoria);
    setShowDocumentoAuditoria(true);
  };

  const handleViewHallazgo = (hallazgo: Hallazgo) => {
    setSelectedHallazgo(hallazgo);
    setShowDocumentoHallazgo(true);
  };

  const handleSubmitAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = modalMode === 'create'
        ? '/auditorias'
        : `/auditorias/${selectedAuditoria?.id}`;

      const method = modalMode === 'create' ? 'post' : 'put';

      const payload: any = { ...formData };

      // Sanitizar datos para enviar al backend
      if (!payload.auditorLiderId) payload.auditorLiderId = null;
      if (!payload.fechaPlanificada) payload.fechaPlanificada = null;
      if (!payload.fechaInicio) payload.fechaInicio = null;
      if (!payload.fechaFin) payload.fechaFin = null;
      if (!payload.normaReferencia) payload.normaReferencia = null;

      // @ts-ignore
      await apiClient[method](url, payload);
      setShowModal(false);
      fetchAuditorias();
      toast.success(modalMode === 'create' ? 'Auditoría creada exitosamente' : 'Auditoría actualizada exitosamente');
    } catch (error) {
      console.error('Error al guardar auditoría:', error);
      toast.error('Error al guardar la auditoría');
    }
  };

  const handleDeleteAuditoria = async (id: string) => {
    try {
      await apiClient.delete(`/auditorias/${id}`);
      fetchAuditorias();
      toast.success('Auditoría eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar auditoría:', error);
      toast.error('Error al eliminar la auditoría');
    }
  };

  const handleCreateHallazgo = (auditoriaId?: string) => {
    setModalMode('create');
    setHallazgoFormData({
      auditoriaId: auditoriaId || '',
      tipo: 'no_conformidad_menor',
      descripcion: '',
      clausulaIso: '',
      procesoId: '',
      areaId: '',
      evidencia: '',
      responsableId: ''
    });
    setShowHallazgoModal(true);
  };

  const handleEditHallazgo = (hallazgo: Hallazgo) => {
    setModalMode('edit');
    setSelectedHallazgo(hallazgo);
    setHallazgoFormData({
      auditoriaId: hallazgo.auditoriaId,
      tipo: hallazgo.tipo || 'no_conformidad_menor',
      descripcion: hallazgo.descripcion || '',
      clausulaIso: hallazgo.clausulaIso || '',
      procesoId: hallazgo.procesoId || '',
      areaId: hallazgo.areaId || '',
      evidencia: hallazgo.evidencia || '',
      responsableId: hallazgo.responsableId || ''
    });
    setShowHallazgoModal(true);
  };

  const handleSubmitHallazgo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        // Validar que haya auditoría seleccionada
        if (!hallazgoFormData.auditoriaId) {
          toast.error('Debe asociar el hallazgo a una auditoría');
          return;
        }

        // Sanitizar payload: convertir strings vacíos a undefined para campos opcionales
        const payload: any = {
          ...hallazgoFormData,
          auditoria_id: hallazgoFormData.auditoriaId, // Compatibilidad con Render (snake_case)
          auditoriaId: hallazgoFormData.auditoriaId,
          codigo: codigoHallazgoAuto || undefined,
        };

        // Limpiar campos opcionales vacíos
        if (!payload.procesoId) delete payload.procesoId;
        if (!payload.areaId) delete payload.areaId;
        if (!payload.responsableId) delete payload.responsableId;
        if (!payload.clausulaIso) delete payload.clausulaIso; // Opcional también

        await auditoriaService.createHallazgo(payload);
        toast.success('Hallazgo registrado exitosamente');
      } else {
        if (!selectedHallazgo?.id) return;

        const payload: any = {
          ...hallazgoFormData,
          auditoria_id: hallazgoFormData.auditoriaId,
          auditoriaId: hallazgoFormData.auditoriaId
        };

        if (!payload.procesoId) delete payload.procesoId;
        if (!payload.areaId) delete payload.areaId;
        if (!payload.responsableId) delete payload.responsableId;
        if (!payload.clausulaIso) delete payload.clausulaIso; // Opcional también

        await auditoriaService.updateHallazgo(selectedHallazgo.id, payload);
        toast.success('Hallazgo actualizado exitosamente');
      }

      setShowHallazgoModal(false);
      fetchHallazgos();
    } catch (error: any) {
      console.error('Error al guardar hallazgo:', error);
      toast.error(error.message || 'Error al guardar el hallazgo');
    }
  };

  const handleDeleteHallazgo = async (id: string) => {
    try {
      await apiClient.delete(`/hallazgos-auditoria/${id}`);
      fetchHallazgos();
      toast.success('Hallazgo eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar hallazgo:', error);
      toast.error('Error al eliminar el hallazgo');
    }
  };

  const getEstadoBadge = (estado?: string) => {
    const badges: Record<string, { color: string; icon: React.FC<any> }> = {
      planificada: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      en_curso: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completada: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelada: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const badge = badges[estado || 'planificada'];
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {estado?.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getTipoHallazgoBadge = (tipo?: string) => {
    const badges: Record<string, { color: string; icon: React.FC<any> }> = {
      no_conformidad_mayor: { color: 'bg-red-100 text-red-800', icon: XCircle },
      no_conformidad_menor: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      observacion: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      oportunidad_mejora: { color: 'bg-green-100 text-green-800', icon: TrendingUp }
    };

    const badge = badges[tipo || 'observacion'];
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {tipo?.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const stats = {
    totalAuditorias: auditorias.length,
    planificadas: auditorias.filter(a => a.estado === 'planificada').length,
    enCurso: auditorias.filter(a => a.estado === 'en_curso').length,
    completadas: auditorias.filter(a => a.estado === 'completada').length,
    totalHallazgos: hallazgos.length,
    noConformidadesMayores: hallazgos.filter(h => h.tipo === 'no_conformidad_mayor').length,
    noConformidadesMenores: hallazgos.filter(h => h.tipo === 'no_conformidad_menor').length,
    observaciones: hallazgos.filter(h => h.tipo === 'observacion').length
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 min-w-0">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-5 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-start sm:items-center gap-3">
                <FileText className="h-7 w-7 sm:h-9 sm:w-9 text-[#2563EB] shrink-0" />
                <span className="break-words">Auditorías y Hallazgos</span>
              </h1>
              <p className="text-[#6B7280] mt-2 text-sm sm:text-lg">
                Consolidado de auditorías realizadas y gestión integral de hallazgos - ISO 9001:2015
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {stats.totalAuditorias} auditorías registradas
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E]">
                  Normatividad: ISO 9001:2015
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Button
                onClick={activeTab === 'auditorias' ? handleCreateAuditoria : () => handleCreateHallazgo()}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold flex items-center justify-center gap-2 w-full md:w-auto"
              >
                <Plus className="w-5 h-5" />
                Nueva {activeTab === 'auditorias' ? 'Auditoría' : 'Hallazgo'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#E0EDFF] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#1E3A8A]">Total Auditorías</CardDescription>
                <FileText className="h-6 w-6 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{stats.totalAuditorias}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-white/50 text-[#2563EB] border-[#2563EB]/20">P: {stats.planificadas}</Badge>
                <Badge variant="outline" className="text-[10px] bg-white/50 text-[#2563EB] border-[#2563EB]/20">E: {stats.enCurso}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#065F46]">Completadas</CardDescription>
                <CheckCircle className="h-6 w-6 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">{stats.completadas}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div
                  className="bg-[#10B981] h-1.5 rounded-full"
                  style={{ width: stats.totalAuditorias > 0 ? `${(stats.completadas / stats.totalAuditorias) * 100}%` : '0%' }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#9A3412]">Total Hallazgos</CardDescription>
                <AlertTriangle className="h-6 w-6 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">{stats.totalHallazgos}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 mt-2">
                <Badge className="bg-[#FEF2F2] text-[#EF4444] border-none text-[10px]">MAY: {stats.noConformidadesMayores}</Badge>
                <Badge className="bg-[#FEFCE8] text-[#854D0E] border-none text-[10px]">MEN: {stats.noConformidadesMenores}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#FEFCE8] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#854D0E]">Observaciones</CardDescription>
                <AlertCircle className="h-6 w-6 text-[#EAB308]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#854D0E]">{stats.observaciones}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-wider">Áreas de Mejora</div>
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

        {/* Tab Interface */}
        <Card className="rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] p-1 flex flex-col sm:flex-row">
            <button
              onClick={() => setActiveTab('auditorias')}
              className={`flex-1 py-3 sm:py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all rounded-xl ${activeTab === 'auditorias'
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1E3A8A]'
                }`}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className="sm:hidden">Auditorías</span>
              <span className="hidden sm:inline">Gestión de Auditorías</span>
            </button>
            <button
              onClick={() => setActiveTab('hallazgos')}
              className={`flex-1 py-3 sm:py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all rounded-xl ${activeTab === 'hallazgos'
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1E3A8A]'
                }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="sm:hidden">Hallazgos</span>
              <span className="hidden sm:inline">Consolidado de Hallazgos</span>
            </button>
          </div>

          <div className="p-4 sm:p-8 min-w-0">
            {/* Buscador y Filtros Dinámicos */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 sm:mb-8">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
                <Input
                  placeholder={SEARCH_ANY_PLACEHOLDER}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-6 border-[#E5E7EB] rounded-xl focus:ring-[#2563EB]/20"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                {activeTab === 'auditorias' ? (
                  <>
                    <select
                      value={filterTipo}
                      onChange={(e) => setFilterTipo(e.target.value)}
                      className="px-4 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] font-bold text-[#1E3A8A] w-full sm:min-w-[160px] outline-none"
                    >
                      <option value="">Tipo</option>
                      <option value="interna">Interna</option>
                      <option value="externa">Externa</option>
                    </select>
                    <select
                      value={filterEstado}
                      onChange={(e) => setFilterEstado(e.target.value)}
                      className="px-4 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] font-bold text-[#1E3A8A] w-full sm:min-w-[160px] outline-none"
                    >
                      <option value="">Estado</option>
                      <option value="planificada">Planificada</option>
                      <option value="en_curso">En Curso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </>
                ) : (
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="px-4 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] font-bold text-[#1E3A8A] w-full sm:min-w-[200px] outline-none"
                  >
                    <option value="">Clasificación</option>
                    <option value="no_conformidad_mayor">NC Mayor</option>
                    <option value="no_conformidad_menor">NC Menor</option>
                    <option value="observacion">Observación</option>
                  </select>
                )}
                <button
                  onClick={() => { setSearchTerm(''); setFilterTipo(''); setFilterEstado(''); }}
                  className="p-3 bg-[#F8FAFC] hover:bg-[#E0EDFF] text-[#2563EB] rounded-xl transition-all border border-[#E5E7EB]"
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Listado Principal */}
            {loading ? (
              <div className="py-20 text-center">
                <Activity className="animate-spin h-12 w-12 text-[#2563EB] mx-auto mb-4" />
                <LoadingSpinner message="Procesando Informacion" />;
              </div>
            ) : activeTab === 'auditorias' ? (
              <div className="space-y-4">
                {filteredAuditorias.length === 0 ? (
                  <div className="py-20 text-center bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E5E7EB]">
                    <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-[#6B7280]">No se encontraron auditorías registradas</p>
                  </div>
                ) : (
                  filteredAuditorias.map((auditoria) => (
                    <div key={auditoria.id} className="group bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden hover:shadow-md transition-all">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className="font-bold text-[#1E3A8A] group-hover:text-[#2563EB] transition-colors break-all">{auditoria.codigo}</span>
                              {getEstadoBadge(auditoria.estado)}
                              <Badge className="bg-[#F1F5F9] text-[#64748B] border-none uppercase">{auditoria.tipo}</Badge>
                            </div>
                            <h3 className="text-lg font-bold text-[#111827]">{auditoria.nombre || 'Auditoría sin título'}</h3>
                            <div className="flex flex-wrap gap-4 text-xs text-[#6B7280] font-medium">
                              <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2 py-1 rounded-lg border border-[#E5E7EB]">
                                <Calendar size={12} className="text-[#2563EB]" />
                                Planificada: {formatDate(auditoria.fechaPlanificada)}
                              </div>
                              <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2 py-1 rounded-lg border border-[#E5E7EB]">
                                <Clock size={12} className="text-[#2563EB]" />
                                Fin: {formatDate(auditoria.fechaFin)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 md:bg-[#F8FAFC] md:p-1 md:rounded-xl">
                            <button onClick={() => setExpandedAuditoria(expandedAuditoria === auditoria.id ? null : auditoria.id)} className="p-2.5 text-[#6B7280] hover:text-[#2563EB] hover:bg-white rounded-lg transition-all">
                              {expandedAuditoria === auditoria.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <button onClick={() => handleViewAuditoria(auditoria)} className="p-2.5 text-[#2563EB] hover:bg-white rounded-lg transition-all shadow-none">
                              <Eye size={20} />
                            </button>
                            <button onClick={() => handleEditAuditoria(auditoria)} className="p-2.5 text-[#10B981] hover:bg-white rounded-lg transition-all shadow-none">
                              <Edit size={20} />
                            </button>
                            <button onClick={() => handleDeleteAuditoria(auditoria.id)} className="p-2.5 text-[#EF4444] hover:bg-white rounded-lg transition-all shadow-none">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedAuditoria === auditoria.id && (
                        <div className="bg-[#F8FAFC] border-t border-[#E5E7EB] p-4 sm:p-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <h4 className="font-bold text-[#1E3A8A] flex items-center gap-2">
                              <AlertTriangle size={18} className="text-[#EAB308] shrink-0" />
                              Hallazgos Registrados
                            </h4>
                            <Button onClick={() => handleCreateHallazgo(auditoria.id)} size="sm" className="bg-[#2563EB] text-white rounded-lg font-bold w-full sm:w-auto">
                              <Plus size={14} className="mr-1" /> Nuevo Hallazgo
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hallazgos.filter(h => h.auditoriaId === auditoria.id).length === 0 ? (
                              <div className="col-span-full py-10 text-center bg-white border border-[#E5E7EB] rounded-xl border-dashed">
                                <p className="text-[#6B7280] text-sm italic">Sin hallazgos en esta auditoría</p>
                              </div>
                            ) : (
                              hallazgos
                                .filter(h => h.auditoriaId === auditoria.id)
                                .map(hallazgo => (
                                  <div key={hallazgo.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                          {getTipoHallazgoBadge(hallazgo.tipo)}
                                          <span className="text-xs text-gray-500">
                                            {formatDate(hallazgo.creadoEn)}
                                          </span>
                                        </div>
                                        <p className="text-gray-900 font-medium">{hallazgo.descripcion}</p>
                                        {hallazgo.clausulaIso && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            Cláusula ISO: <span className="font-medium">{hallazgo.clausulaIso}</span>
                                          </p>
                                        )}
                                        {hallazgo.evidencia && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            Evidencia: <span className="italic">{hallazgo.evidencia}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleViewHallazgo(hallazgo)}
                                          className="p-1 text-[#2563EB] hover:bg-[#EFF6FF] rounded"
                                          title="Ver hallazgo"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleEditHallazgo(hallazgo)}
                                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <button
                                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                                              title="Eliminar Hallazgo"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>¿Eliminar hallazgo?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Esta acción eliminará permanentemente este hallazgo.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteHallazgo(hallazgo.id)} className="bg-red-600 hover:bg-red-700">
                                                Eliminar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                    <p className="text-[#1E3A8A] font-bold text-sm mb-3 leading-relaxed">{hallazgo.descripcion}</p>
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                                      <div className="flex items-center gap-1"><Users size={12} /> Responsable</div>
                                      <div className="flex items-center gap-1"><Calendar size={12} /> {formatDate(hallazgo.creadoEn)}</div>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHallazgos.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E5E7EB]">
                    <AlertTriangle className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-[#6B7280]">No se encontraron hallazgos con los criterios actuales</p>
                  </div>
                ) : (
                  filteredHallazgos.map((hallazgo) => {
                    const auditoria = auditorias.find(a => a.id === hallazgo.auditoriaId);
                    return (
                      <Card key={hallazgo.id} className="rounded-2xl border-[#E5E7EB] shadow-sm hover:shadow-md transition-all bg-white relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${hallazgo.tipo === 'no_conformidad_mayor' ? 'bg-[#EF4444]' :
                          hallazgo.tipo === 'no_conformidad_menor' ? 'bg-[#EAB308]' : 'bg-[#3B82F6]'
                          }`} />
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center mb-2">
                            {getTipoHallazgoBadge(hallazgo.tipo)}
                            <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-1">
                              <button onClick={() => handleViewHallazgo(hallazgo)} className="p-1.5 text-[#2563EB] hover:bg-[#EFF6FF] rounded-md" title="Ver hallazgo"><Eye size={14} /></button>
                              <button onClick={() => handleEditHallazgo(hallazgo)} className="p-1.5 text-[#10B981] hover:bg-[#ECFDF5] rounded-md"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteHallazgo(hallazgo.id)} className="p-1.5 text-[#EF4444] hover:bg-[#FEF2F2] rounded-md"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-[#1E3A8A] font-bold text-sm leading-relaxed min-h-[40px]">{hallazgo.descripcion}</p>
                          <div className="pt-4 border-t border-[#F1F5F9] space-y-2">
                            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                              <FileText size={12} className="text-[#2563EB]" />
                              <span className="font-bold flex-1 truncate">{auditoria?.codigo} - {auditoria?.nombre}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                              <Activity size={12} className="text-[#2563EB]" />
                              <span className="font-bold">Cláusula: {hallazgo.clausulaIso || 'No esp.'}</span>
                            </div>
                            {hallazgo.evidencia && (
                              <p className="text-[10px] text-[#6B7280] bg-[#F8FAFC] p-2 rounded-lg border border-[#E5E7EB] italic">
                                "{hallazgo.evidencia}"
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Card>
      </div >
      <VistaDocumentoSGCDialog
        open={showDocumentoAuditoria}
        onOpenChange={setShowDocumentoAuditoria}
        data={
          selectedAuditoria
            ? datosSGCDesdeAuditoria(
                selectedAuditoria as AuditoriaSGC,
                hallazgos
                  .filter((h) => h.auditoriaId === selectedAuditoria.id)
                  .map((h) => h as unknown as HallazgoAuditoria),
              )
            : null
        }
        title="Auditoría"
        description="Documento controlado con el expediente de la auditoría y sus hallazgos."
        extraActions={
          selectedAuditoria ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setShowDocumentoAuditoria(false);
                handleEditAuditoria(selectedAuditoria);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : null
        }
      />
      <VistaDocumentoSGCDialog
        open={showDocumentoHallazgo}
        onOpenChange={setShowDocumentoHallazgo}
        data={
          selectedHallazgo
            ? datosSGCDesdeHallazgo(
                selectedHallazgo as unknown as HallazgoAuditoria,
                auditorias.find((a) => a.id === selectedHallazgo.auditoriaId) || selectedHallazgo.auditoria,
              )
            : null
        }
        title="Hallazgo de auditoría"
        description="Documento controlado con el detalle, la evidencia y la cláusula del hallazgo."
        extraActions={
          selectedHallazgo ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setShowDocumentoHallazgo(false);
                handleEditHallazgo(selectedHallazgo);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : null
        }
      />
      {/* Modal Auditoría */}
      {
        showModal && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-[#E5E7EB]">
              <div className="sticky top-0 bg-[#F8FAFC] border-b p-4 sm:p-6 flex justify-between items-start gap-3 z-10">
                <h2 className="text-lg sm:text-2xl font-bold text-[#1E3A8A] break-words pr-8">
                  {modalMode === 'view' ? 'Detalles de Auditoría' : modalMode === 'edit' ? 'Editar Auditoría' : 'Nueva Auditoría'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 border border-[#E5E7EB] text-[#6B7280] hover:text-[#2563EB] hover:bg-white rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitAuditoria} className="p-4 sm:p-8 space-y-6">
                {modalMode === 'view' && selectedAuditoria ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div className="space-y-4">
                      <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#E5E7EB]">
                        <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-4">Información General</h4>
                        <p><strong>Nombre:</strong> {selectedAuditoria.nombre}</p>
                        <p><strong>Código:</strong> {selectedAuditoria.codigo}</p>
                        <p><strong>Tipo:</strong> {selectedAuditoria.tipo}</p>
                      </div>
                      <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#E5E7EB]">
                        <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-4">Objetivos y Alcance</h4>
                        <p><strong>Objetivo:</strong> {selectedAuditoria.objetivo}</p>
                        <p><strong>Alcance:</strong> {selectedAuditoria.alcance}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#E5E7EB]">
                        <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-4">Cronograma</h4>
                        <p><strong>Planificada:</strong> {formatDate(selectedAuditoria.fechaPlanificada)}</p>
                        <p><strong>Inicio:</strong> {formatDate(selectedAuditoria.fechaInicio)}</p>
                        <p><strong>Fin:</strong> {formatDate(selectedAuditoria.fechaFin)}</p>
                      </div>
                      <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#E5E7EB]">
                        <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-4">Auditor</h4>
                        <p><strong>Auditor Líder:</strong> {selectedAuditoria.auditorLider?.nombre || 'No asignado'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CampoCodigoAutomatico value={formData.codigo} />
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#6B7280] uppercase">Tipo</label>
                        <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold outline-none">
                          <option value="interna">Interna</option>
                          <option value="externa">Externa</option>
                          <option value="certificacion">Certificación</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase">Nombre de Auditoría</label>
                      <Input placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase">Objetivo</label>
                      <textarea placeholder="Objetivo" value={formData.objetivo} onChange={e => setFormData({ ...formData, objetivo: e.target.value })} rows={3} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl resize-none outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase">Alcance</label>
                      <textarea placeholder="Alcance" value={formData.alcance} onChange={e => setFormData({ ...formData, alcance: e.target.value })} rows={3} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl resize-none outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#6B7280] uppercase">Norma Referencia</label>
                        <Input value={formData.normaReferencia} onChange={e => setFormData({ ...formData, normaReferencia: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#6B7280] uppercase">Estado</label>
                        <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold outline-none">
                          <option value="planificada">Planificada</option>
                          <option value="en_curso">En Curso</option>
                          <option value="completada">Completada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase px-1">Planificada</label>
                        <input type="date" value={formData.fechaPlanificada} onChange={e => setFormData({ ...formData, fechaPlanificada: e.target.value })} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl font-bold bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase px-1">Inicio</label>
                        <input type="date" value={formData.fechaInicio} onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl font-bold bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase px-1">Fin</label>
                        <input type="date" value={formData.fechaFin} onChange={e => setFormData({ ...formData, fechaFin: e.target.value })} className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl font-bold bg-white" />
                      </div>
                    </div>
                  </>
                )}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 sm:pt-8 border-t border-[#E5E7EB]">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 sm:px-8 py-3 sm:py-4 border border-[#E5E7EB] rounded-2xl text-[#6B7280] font-bold hover:bg-[#F8FAFC] transition-all w-full sm:w-auto">
                    {modalMode === 'view' ? 'Cerrar' : 'Cancelar'}
                  </button>
                  {modalMode !== 'view' && (
                    <button type="submit" className="px-6 sm:px-8 py-3 sm:py-4 bg-[#2563EB] text-white rounded-2xl font-bold hover:bg-[#1D4ED8] shadow-lg shadow-blue-200 transition-all w-full sm:w-auto">
                      {modalMode === 'edit' ? 'Actualizar Registro' : 'Crear Auditoría'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Hallazgo */}
      {
        showHallazgoModal && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-[#E5E7EB]">
              <div className="sticky top-0 bg-[#F8FAFC] border-b p-4 sm:p-6 flex justify-between items-start gap-3 z-10">
                <h2 className="text-lg sm:text-2xl font-bold text-[#1E3A8A] break-words pr-8">
                  {modalMode === 'edit' ? 'Editar Hallazgo' : 'Registro de Hallazgo'}
                </h2>
                <button onClick={() => setShowHallazgoModal(false)} className="p-2 border border-[#E5E7EB] text-[#6B7280] hover:text-[#2563EB] hover:bg-white rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitHallazgo} className="p-4 sm:p-8 space-y-6">
                <CampoCodigoAutomatico
                  value={modalMode === "create" ? codigoHallazgoAuto : (selectedHallazgo?.codigo || "")}
                />
                <div className="space-y-4">
                  {/* Selector de Auditoría si no viene preseleccionada */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase">Auditoría Asociada</label>
                    <select
                      value={hallazgoFormData.auditoriaId}
                      onChange={e => setHallazgoFormData({ ...hallazgoFormData, auditoriaId: e.target.value })}
                      className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold outline-none"
                      disabled={modalMode === 'edit'} // No permitir cambiar auditoría en edición
                      required
                    >
                      <option value="">Seleccione una auditoría...</option>
                      {auditorias.map(aud => (
                        <option key={aud.id} value={aud.id}>
                          {aud.codigo} - {aud.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase">Clasificación del Hallazgo</label>
                    <select
                      value={hallazgoFormData.tipo}
                      onChange={e => setHallazgoFormData({ ...hallazgoFormData, tipo: e.target.value })}
                      className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold outline-none"
                    >
                      <option value="no_conformidad_mayor">No Conformidad Mayor</option>
                      <option value="no_conformidad_menor">No Conformidad Menor</option>
                      <option value="observacion">Observación</option>
                      <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#6B7280] uppercase">Descripción Detallada</label>
                  <textarea
                    placeholder="Descripción del hallazgo..."
                    value={hallazgoFormData.descripcion}
                    onChange={e => setHallazgoFormData({ ...hallazgoFormData, descripcion: e.target.value })}
                    rows={4}
                    required
                    className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl resize-none outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#6B7280] uppercase">Cláusula ISO Asociada</label>
                  <Input
                    placeholder="ej: 7.1.3 - Infraestructura"
                    value={hallazgoFormData.clausulaIso}
                    onChange={e => setHallazgoFormData({ ...hallazgoFormData, clausulaIso: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#6B7280] uppercase">Evidencia Objetiva</label>
                  <textarea
                    placeholder="Describa la evidencia encontrada..."
                    value={hallazgoFormData.evidencia}
                    onChange={e => setHallazgoFormData({ ...hallazgoFormData, evidencia: e.target.value })}
                    rows={3}
                    className="w-full min-w-0 px-3 sm:px-5 py-3 border border-[#E5E7EB] rounded-2xl resize-none outline-none italic text-gray-600"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 sm:pt-8 border-t border-[#E5E7EB]">
                  <button type="button" onClick={() => setShowHallazgoModal(false)} className="px-6 sm:px-8 py-3 sm:py-4 border border-[#E5E7EB] rounded-2xl text-[#6B7280] font-bold hover:bg-[#F8FAFC] transition-all w-full sm:w-auto">
                    Descartar
                  </button>
                  <button type="submit" className="px-6 sm:px-8 py-3 sm:py-4 bg-[#2563EB] text-white rounded-2xl font-bold hover:bg-[#1D4ED8] shadow-lg shadow-blue-200 transition-all w-full sm:w-auto">
                    {modalMode === 'edit' ? 'Actualizar Hallazgo' : 'Registrar Hallazgo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AuditoriasHallazgosView;