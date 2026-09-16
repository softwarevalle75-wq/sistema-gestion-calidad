import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, Search, Eye, Edit, Trash2,
  Users, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp,
  XCircle, Filter, FileText, Activity, CheckCircle
} from 'lucide-react';
import { auditoriaService, Auditoria, HallazgoAuditoria } from '@/services/auditoria.service';
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from 'sonner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAuditoria } from "@/utils/documentosRegistrosSGC";

// === COMPONENTE: AUDITORÍAS COMPLETADAS ===
const AuditoriasCompletadas: React.FC = () => {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [filteredAuditorias, setFilteredAuditorias] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [showDocumento, setShowDocumento] = useState(false);
  const [hallazgosVista, setHallazgosVista] = useState<HallazgoAuditoria[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarAuditorias();
  }, []);

  const cargarAuditorias = async () => {
    try {
      setLoading(true);
      const data = await auditoriaService.getCompletadas();
      const auditoriasList = Array.isArray(data) ? data : [];
      setAuditorias(auditoriasList);
      setFilteredAuditorias(auditoriasList);
      setLoading(false);
    } catch (err: any) {
      console.error('Error al cargar auditorías completadas:', err);
      // Solo mostramos error, no usamos mocks
      setError('No se pudieron cargar las auditorías.');
      toast.error('Error al cargar auditorías: ' + (err.message || 'Error desconocido'));
      setAuditorias([]);
      setFilteredAuditorias([]);
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    codigo: '',
    tipo: 'interna',
    objetivo: '',
    alcance: '',
    normaReferencia: 'ISO 9001:2015',
    fechaPlanificada: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'completada'
  });



  // === CARGA INICIAL ===
  useEffect(() => {
    cargarAuditorias();
  }, []);

  // === FILTRADO ===
  useEffect(() => {
    let filtered = [...auditorias];
    if (searchTerm) {
      filtered = filtered.filter(a => matchesTextSearch(searchTerm, a));
    }
    if (filterTipo) filtered = filtered.filter(a => a.tipo === filterTipo);
    setFilteredAuditorias(filtered);
  }, [searchTerm, filterTipo, auditorias]);

  // === CRUD (solo edición y vista) ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      toast.success('Auditoría completada actualizada (demo)');
      await cargarAuditorias();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      tipo: 'interna',
      objetivo: '',
      alcance: '',
      normaReferencia: 'ISO 9001:2015',
      fechaPlanificada: '',
      fechaInicio: '',
      fechaFin: '',
      estado: 'completada'
    });
  };

  const openView = async (auditoria: Auditoria) => {
    setSelectedAuditoria(auditoria);
    setShowDocumento(true);
    try {
      const hallazgos = await auditoriaService.getHallazgos(auditoria.id);
      setHallazgosVista(Array.isArray(hallazgos) ? hallazgos : []);
    } catch {
      setHallazgosVista([]);
    }
  };

  const openModal = (mode: 'view' | 'edit', auditoria: Auditoria) => {
    if (mode === 'view') {
      void openView(auditoria);
      return;
    }
    setModalMode(mode);
    setSelectedAuditoria(auditoria);
    setFormData({
      codigo: auditoria.codigo,
      tipo: auditoria.tipo,
      objetivo: auditoria.objetivo || '',
      alcance: auditoria.alcance || '',
      normaReferencia: auditoria.normaReferencia || 'ISO 9001:2015',
      fechaPlanificada: auditoria.fechaPlanificada || '',
      fechaInicio: auditoria.fechaInicio || '',
      fechaFin: auditoria.fechaFin || '',
      estado: 'completada'
    });
    setShowModal(true);
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  // === BADGES ===
  const TipoBadge: React.FC<{ tipo: string }> = ({ tipo }) => {
    const configs: Record<string, { bg: string; text: string; border: string }> = {
      interna: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
      externa: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      certificacion: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      seguimiento: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' }
    };
    const config = configs[tipo] || configs.interna;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // === RENDER ===
  if (loading) {
    return <LoadingSpinner message="Cargando Auditorias Completas" />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Profesional */}
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <CheckCircle className="h-9 w-9 text-[#2563EB]" />
                Auditorías Completadas
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Histórico institucional de auditorías finalizadas y verificadas
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                  {auditorias.length} auditorías cerradas
                </Badge>
                <Badge className="bg-[#ECFDF5] text-[#22C55E]">
                  ISO 9001:2015 Cumplida
                </Badge>
              </div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-sm">
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-1 text-center">Última Auditoría</p>
              <p className="text-[#1E3A8A] font-bold text-lg text-center">
                {auditorias.length > 0 ? formatDate(auditorias[0].fechaFin) : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#E0EDFF] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#1E3A8A]">Total Histórico</CardDescription>
                <CheckCircle2 className="h-6 w-6 text-[#2563EB]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{auditorias.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-[#6B7280]">Auditorías finalizadas con éxito</div>
            </CardContent>
          </Card>

          <Card className="bg-[#ECFDF5] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#065F46]">Certificaciones</CardDescription>
                <FileText className="h-6 w-6 text-[#10B981]" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#065F46]">
                {auditorias.filter(a => a.tipo === 'certificacion').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">Renovaciones Logradas</Badge>
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7ED] border-[#E5E7EB] shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="font-semibold text-[#9A3412]">Seguimientos</CardDescription>
                <Activity className="h-6 w-6 text-[#F97316]/50" />
              </div>
              <CardTitle className="text-4xl font-bold text-[#9A3412]">
                {auditorias.filter(a => a.tipo === 'seguimiento').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">Planes de Acción Cerrados</Badge>
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

        {/* Filtros */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] w-5 h-5" />
            <input
              type="text"
              placeholder={SEARCH_ANY_PLACEHOLDER}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-4 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 outline-none text-[#1E3A8A] font-medium"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-4 py-4 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 outline-none bg-[#F8FAFC] font-bold text-[#1E3A8A] w-full md:w-64 cursor-pointer"
            >
              <option value="">Todos los tipos</option>
              <option value="interna">Interna</option>
              <option value="externa">Externa</option>
              <option value="certificacion">Certificación</option>
              <option value="seguimiento">Seguimiento</option>
            </select>
            <button
              onClick={() => { setSearchTerm(''); setFilterTipo(''); }}
              className="p-4 bg-[#F8FAFC] hover:bg-[#E0EDFF] text-[#2563EB] rounded-xl transition-all border border-[#E5E7EB]"
              title="Limpiar Filtros"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-8 py-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1E3A8A]">Historial de Auditorías</h2>
            <Badge variant="outline" className="bg-white text-[#6B7280]">
              Total: {filteredAuditorias.length}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F1F5F9]">
                <tr>
                  <th className="w-12 px-8 py-4"></th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">Código</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">Tipo</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">Objetivo</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">Fecha Cierre</th>
                  <th className="px-8 py-4 text-right text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredAuditorias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-[#6B7280]">
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-gray-200 mb-4" />
                        <p className="text-lg font-medium">No se encontraron auditorías finalizadas</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAuditorias.map((auditoria) => (
                    <React.Fragment key={auditoria.id}>
                      <tr className="hover:bg-[#EFF6FF] transition-colors group">
                        <td className="px-8 py-4">
                          <button
                            onClick={() => toggleRow(auditoria.id)}
                            className="text-[#6B7280] hover:text-[#2563EB] transition-colors p-1 hover:bg-[#E0EDFF] rounded-lg"
                          >
                            {expandedRows.has(auditoria.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="px-8 py-4">
                          <span className="font-bold text-[#1E3A8A] group-hover:text-[#2563EB] transition-colors uppercase">
                            {auditoria.codigo}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <TipoBadge tipo={auditoria.tipo} />
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-sm text-[#111827] font-medium line-clamp-1">{auditoria.objetivo || 'Sin objetivo'}</p>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center text-sm text-[#6B7280]">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(auditoria.fechaFin)}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openModal('view', auditoria)} className="p-2 text-[#2563EB] hover:bg-[#E0EDFF] rounded-lg transition-colors">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => openModal('edit', auditoria)} className="p-2 text-[#10B981] hover:bg-[#ECFDF5] rounded-lg transition-colors">
                              <Edit className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(auditoria.id) && (
                        <tr className="bg-[#F8FAFC]">
                          <td colSpan={6} className="px-12 py-8 border-l-4 border-l-[#2563EB]">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Alcance Detallado</p>
                                <p className="text-[#1E3A8A] font-medium leading-relaxed">{auditoria.alcance || 'No definido'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Normatividad Aplicada</p>
                                <p className="text-[#1E3A8A] font-medium">{auditoria.normaReferencia}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Equipo Auditor</p>
                                <p className="text-[#1E3A8A] font-medium flex items-center gap-2">
                                  <Users size={14} className="text-[#2563EB]" />
                                  {auditoria.auditorLider?.nombre || 'No asignado'}
                                </p>
                              </div>
                              <div className="space-y-1 pt-4 md:pt-0">
                                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Periodo de Ejecución</p>
                                <p className="text-[#1E3A8A] font-medium italic">
                                  {formatDate(auditoria.fechaInicio)} al {formatDate(auditoria.fechaFin)}
                                </p>
                              </div>
                              <div className="space-y-1 pt-4 md:pt-0">
                                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Autoría / Registro</p>
                                <p className="text-[#1E3A8A] font-medium">
                                  Registrado por: {auditoria.creadoPorUsuario?.nombre || 'Sistema de Calidad'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <VistaDocumentoSGCDialog
          open={showDocumento}
          onOpenChange={(open) => {
            setShowDocumento(open);
            if (!open) {
              setHallazgosVista([]);
            }
          }}
          data={selectedAuditoria ? datosSGCDesdeAuditoria(selectedAuditoria, hallazgosVista) : null}
          title="Auditoría completada"
          description="Documento controlado con el expediente de la auditoría, informe y hallazgos."
          extraActions={
            selectedAuditoria ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setShowDocumento(false);
                  openModal("edit", selectedAuditoria);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : null
          }
        />

        {showModal && selectedAuditoria && modalMode === "edit" && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[#E5E7EB]">
              <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] p-4 sm:p-8 flex justify-between items-center gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#1E3A8A]">Actualizar Registro</h2>
                  <p className="text-[#6B7280] text-sm mt-1">{selectedAuditoria.codigo} • {selectedAuditoria.tipo.toUpperCase()}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 border border-[#E5E7EB] text-[#6B7280] hover:text-[#2563EB] hover:bg-white rounded-xl transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 sm:p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase px-1">Código de Auditoría</label>
                      <input type="text" value={formData.codigo} readOnly className="w-full px-5 py-4 border border-[#E5E7EB] rounded-2xl bg-[#F8FAFC] text-[#1E3A8A] font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase px-1">Tipo de Auditoría</label>
                      <select
                        value={formData.tipo}
                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        className="w-full px-5 py-4 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                      >
                        <option value="interna">Interna</option>
                        <option value="externa">Externa</option>
                        <option value="certificacion">Certificación</option>
                        <option value="seguimiento">Seguimiento</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#6B7280] uppercase px-1">Objetivo del Programa</label>
                    <textarea
                      value={formData.objetivo}
                      onChange={e => setFormData({ ...formData, objetivo: e.target.value })}
                      rows={3}
                      className="w-full px-5 py-4 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-medium focus:ring-2 focus:ring-[#2563EB]/20 outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase px-1">Fecha de Inicio</label>
                      <input type="date" value={formData.fechaInicio} onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })} className="w-full px-5 py-4 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#6B7280] uppercase px-1">Fecha de Cierre</label>
                      <input type="date" value={formData.fechaFin} onChange={e => setFormData({ ...formData, fechaFin: e.target.value })} className="w-full px-5 py-4 border border-[#E5E7EB] rounded-2xl bg-white text-[#1E3A8A] font-bold" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-8 border-t border-[#E5E7EB]">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 border border-[#E5E7EB] rounded-2xl text-[#6B7280] font-bold hover:bg-[#F8FAFC] transition-all">
                      Descartar
                    </button>
                    <button type="submit" className="px-8 py-4 bg-[#2563EB] text-white rounded-2xl font-bold hover:bg-[#1D4ED8] shadow-lg shadow-blue-200 transition-all">
                      Guardar Registro
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditoriasCompletadas;